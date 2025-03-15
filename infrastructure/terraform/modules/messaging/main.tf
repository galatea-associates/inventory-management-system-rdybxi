# Terraform module for messaging infrastructure (AWS MSK and Azure Event Hubs)
# This module supports the high-throughput messaging requirements of the IMS,
# capable of processing 300,000+ events per second with low latency.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Variables
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "region" {
  description = "Region where the messaging infrastructure will be deployed"
  type        = string
}

variable "cloud_provider" {
  description = "Cloud provider where the messaging infrastructure will be deployed (aws or azure)"
  type        = string
  validation {
    condition     = contains(["aws", "azure"], var.cloud_provider)
    error_message = "Cloud provider must be one of: aws, azure"
  }
}

variable "vpc_id" {
  description = "ID of the VPC where the messaging infrastructure will be deployed (AWS only)"
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = "List of subnet IDs where the messaging infrastructure will be deployed"
  type        = list(string)
  default     = []
}

variable "security_group_ids" {
  description = "List of security group IDs to associate with the messaging infrastructure (AWS only)"
  type        = list(string)
  default     = []
}

variable "resource_group_name" {
  description = "Name of the resource group where the messaging infrastructure will be deployed (Azure only)"
  type        = string
  default     = ""
}

variable "broker_instance_type" {
  description = "Instance type for Kafka brokers (AWS only)"
  type        = string
  default     = "kafka.m5.4xlarge"
}

variable "broker_count" {
  description = "Number of Kafka brokers"
  type        = number
  default     = 3
}

variable "broker_storage_gb" {
  description = "Storage size in GB for Kafka brokers"
  type        = number
  default     = 1000
}

variable "kafka_version" {
  description = "Kafka version to use"
  type        = string
  default     = "2.8.1"
}

variable "eventhub_sku" {
  description = "SKU for Event Hubs (Azure only)"
  type        = string
  default     = "Standard"
}

variable "eventhub_capacity" {
  description = "Throughput units for Event Hubs (Azure only)"
  type        = number
  default     = 20
}

variable "eventhub_partition_count" {
  description = "Number of partitions for Event Hubs (Azure only)"
  type        = number
  default     = 32
}

variable "eventhub_retention_days" {
  description = "Message retention in days for Event Hubs (Azure only)"
  type        = number
  default     = 7
}

variable "enable_encryption" {
  description = "Whether to enable encryption for messaging resources"
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Whether to enable monitoring for messaging resources"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Local variables
locals {
  common_tags = {
    Project     = "IMS"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# AWS Resources
resource "aws_security_group" "kafka" {
  count       = var.cloud_provider == "aws" ? 1 : 0
  name        = "ims-${var.environment}-kafka-sg"
  description = "Security group for Kafka MSK cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 9092
    to_port         = 9092
    protocol        = "tcp"
    security_groups = var.security_group_ids
    description     = "Kafka plaintext"
  }

  ingress {
    from_port       = 9094
    to_port         = 9094
    protocol        = "tcp"
    security_groups = var.security_group_ids
    description     = "Kafka TLS"
  }

  ingress {
    from_port       = 2181
    to_port         = 2181
    protocol        = "tcp"
    security_groups = var.security_group_ids
    description     = "Zookeeper"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-kafka-sg"
    Environment = var.environment
  })
}

resource "aws_msk_cluster" "kafka" {
  count         = var.cloud_provider == "aws" ? 1 : 0
  cluster_name  = "ims-${var.environment}-kafka"
  kafka_version = var.kafka_version
  number_of_broker_nodes = var.broker_count

  broker_node_group_info {
    instance_type   = var.broker_instance_type
    client_subnets  = var.subnet_ids
    security_groups = [aws_security_group.kafka[0].id]
    storage_info {
      ebs_storage_info {
        volume_size = var.broker_storage_gb
      }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
    encryption_at_rest_kms_key_arn = var.enable_encryption ? aws_kms_key.kafka[0].arn : null
  }

  configuration_info {
    arn      = aws_msk_configuration.kafka[0].arn
    revision = aws_msk_configuration.kafka[0].latest_revision
  }

  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = var.enable_monitoring
      }
      node_exporter {
        enabled_in_broker = var.enable_monitoring
      }
    }
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = var.enable_monitoring
        log_group = aws_cloudwatch_log_group.kafka_broker_logs[0].name
      }
      s3 {
        enabled = var.enable_monitoring
        bucket  = aws_s3_bucket.kafka_logs[0].id
        prefix  = "logs/msk-"
      }
    }
  }

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-kafka"
    Environment = var.environment
  })
}

resource "aws_msk_configuration" "kafka" {
  count = var.cloud_provider == "aws" ? 1 : 0
  name = "ims-${var.environment}-kafka-config"
  kafka_versions = [var.kafka_version]
  server_properties = <<EOF
auto.create.topics.enable=true
default.replication.factor=3
min.insync.replicas=2
num.io.threads=8
num.network.threads=5
num.partitions=32
num.replica.fetchers=2
replica.lag.time.max.ms=30000
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600
socket.send.buffer.bytes=102400
unclean.leader.election.enable=true
zookeeper.session.timeout.ms=18000
log.retention.hours=168
compression.type=producer
message.max.bytes=10485760
EOF
}

resource "aws_kms_key" "kafka" {
  count                   = var.cloud_provider == "aws" && var.enable_encryption ? 1 : 0
  description             = "KMS key for MSK encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-kafka-kms"
    Environment = var.environment
  })
}

resource "aws_cloudwatch_log_group" "kafka_broker_logs" {
  count             = var.cloud_provider == "aws" && var.enable_monitoring ? 1 : 0
  name              = "/ims/${var.environment}/kafka/broker-logs"
  retention_in_days = 30
  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-kafka-logs"
    Environment = var.environment
  })
}

resource "random_string" "bucket_suffix" {
  count   = var.cloud_provider == "aws" && var.enable_monitoring ? 1 : 0
  length  = 8
  special = false
  lower   = true
  upper   = false
}

resource "aws_s3_bucket" "kafka_logs" {
  count  = var.cloud_provider == "aws" && var.enable_monitoring ? 1 : 0
  bucket = "ims-${var.environment}-kafka-logs-${random_string.bucket_suffix[0].result}"
  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-kafka-logs"
    Environment = var.environment
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "kafka_logs" {
  count  = var.cloud_provider == "aws" && var.enable_monitoring ? 1 : 0
  bucket = aws_s3_bucket.kafka_logs[0].id

  rule {
    id     = "log-expiration"
    status = "Enabled"

    expiration {
      days = 90
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "kafka_logs" {
  count  = var.cloud_provider == "aws" && var.enable_monitoring && var.enable_encryption ? 1 : 0
  bucket = aws_s3_bucket.kafka_logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Azure Resources
resource "azurerm_eventhub_namespace" "eventhub" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "ims-${var.environment}-eventhub"
  resource_group_name = var.resource_group_name
  location            = var.region
  sku                 = var.eventhub_sku
  capacity            = var.eventhub_capacity
  auto_inflate_enabled = true
  maximum_throughput_units = var.eventhub_capacity * 2
  zone_redundant     = true

  network_rulesets {
    default_action = "Deny"
    virtual_network_rule {
      subnet_id = var.subnet_ids[0]
      ignore_missing_virtual_network_service_endpoint = false
    }
  }

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-eventhub"
    Environment = var.environment
  })
}

# Create Event Hubs for different data types
resource "azurerm_eventhub" "reference_data" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "reference-data"
  namespace_name      = azurerm_eventhub_namespace.eventhub[0].name
  resource_group_name = var.resource_group_name
  partition_count     = var.eventhub_partition_count
  message_retention   = var.eventhub_retention_days
  status              = "Active"
}

resource "azurerm_eventhub" "market_data" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "market-data"
  namespace_name      = azurerm_eventhub_namespace.eventhub[0].name
  resource_group_name = var.resource_group_name
  partition_count     = var.eventhub_partition_count
  message_retention   = var.eventhub_retention_days
  status              = "Active"
}

resource "azurerm_eventhub" "trade_data" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "trade-data"
  namespace_name      = azurerm_eventhub_namespace.eventhub[0].name
  resource_group_name = var.resource_group_name
  partition_count     = var.eventhub_partition_count
  message_retention   = var.eventhub_retention_days
  status              = "Active"
}

resource "azurerm_eventhub" "position_data" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "position-data"
  namespace_name      = azurerm_eventhub_namespace.eventhub[0].name
  resource_group_name = var.resource_group_name
  partition_count     = var.eventhub_partition_count
  message_retention   = var.eventhub_retention_days
  status              = "Active"
}

resource "azurerm_eventhub" "inventory_data" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "inventory-data"
  namespace_name      = azurerm_eventhub_namespace.eventhub[0].name
  resource_group_name = var.resource_group_name
  partition_count     = var.eventhub_partition_count
  message_retention   = var.eventhub_retention_days
  status              = "Active"
}

resource "azurerm_eventhub" "locate_data" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "locate-data"
  namespace_name      = azurerm_eventhub_namespace.eventhub[0].name
  resource_group_name = var.resource_group_name
  partition_count     = var.eventhub_partition_count
  message_retention   = var.eventhub_retention_days
  status              = "Active"
}

# Create consumer groups for different services
resource "azurerm_eventhub_consumer_group" "reference_data_calculation" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "calculation-service"
  namespace_name      = azurerm_eventhub_namespace.eventhub[0].name
  eventhub_name       = azurerm_eventhub.reference_data[0].name
  resource_group_name = var.resource_group_name
  user_metadata       = "Consumer group for calculation service"
}

resource "azurerm_eventhub_consumer_group" "market_data_calculation" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "calculation-service"
  namespace_name      = azurerm_eventhub_namespace.eventhub[0].name
  eventhub_name       = azurerm_eventhub.market_data[0].name
  resource_group_name = var.resource_group_name
  user_metadata       = "Consumer group for calculation service"
}

resource "azurerm_eventhub_consumer_group" "trade_data_calculation" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "calculation-service"
  namespace_name      = azurerm_eventhub_namespace.eventhub[0].name
  eventhub_name       = azurerm_eventhub.trade_data[0].name
  resource_group_name = var.resource_group_name
  user_metadata       = "Consumer group for calculation service"
}

resource "azurerm_eventhub_consumer_group" "position_data_workflow" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "workflow-service"
  namespace_name      = azurerm_eventhub_namespace.eventhub[0].name
  eventhub_name       = azurerm_eventhub.position_data[0].name
  resource_group_name = var.resource_group_name
  user_metadata       = "Consumer group for workflow service"
}

resource "azurerm_eventhub_consumer_group" "inventory_data_workflow" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "workflow-service"
  namespace_name      = azurerm_eventhub_namespace.eventhub[0].name
  eventhub_name       = azurerm_eventhub.inventory_data[0].name
  resource_group_name = var.resource_group_name
  user_metadata       = "Consumer group for workflow service"
}

resource "azurerm_eventhub_consumer_group" "websocket_service" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "websocket-service"
  namespace_name      = azurerm_eventhub_namespace.eventhub[0].name
  eventhub_name       = azurerm_eventhub.position_data[0].name
  resource_group_name = var.resource_group_name
  user_metadata       = "Consumer group for websocket service"
}

# Monitoring for Azure
resource "azurerm_log_analytics_workspace" "messaging" {
  count               = var.cloud_provider == "azure" && var.enable_monitoring ? 1 : 0
  name                = "ims-${var.environment}-messaging-logs"
  resource_group_name = var.resource_group_name
  location            = var.region
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-messaging-logs"
    Environment = var.environment
  })
}

resource "azurerm_monitor_diagnostic_setting" "eventhub" {
  count                      = var.cloud_provider == "azure" && var.enable_monitoring ? 1 : 0
  name                       = "eventhub-diagnostics"
  target_resource_id         = azurerm_eventhub_namespace.eventhub[0].id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.messaging[0].id

  log {
    category = "ArchiveLogs"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }

  log {
    category = "OperationalLogs"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }

  log {
    category = "AutoScaleLogs"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }

  log {
    category = "KafkaCoordinatorLogs"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }
}

# Outputs
output "kafka_bootstrap_servers" {
  description = "The connection string for Kafka brokers"
  value       = var.cloud_provider == "aws" ? aws_msk_cluster.kafka[0].bootstrap_brokers_tls : null
}

output "kafka_zookeeper_connect_string" {
  description = "The connection string for Zookeeper"
  value       = var.cloud_provider == "aws" ? aws_msk_cluster.kafka[0].zookeeper_connect_string : null
}

output "kafka_security_group_id" {
  description = "The ID of the Kafka security group"
  value       = var.cloud_provider == "aws" ? aws_security_group.kafka[0].id : null
}

output "eventhub_namespace_name" {
  description = "The name of the Event Hubs namespace"
  value       = var.cloud_provider == "azure" ? azurerm_eventhub_namespace.eventhub[0].name : null
}

output "eventhub_connection_string" {
  description = "The connection string for Event Hubs"
  value       = var.cloud_provider == "azure" ? azurerm_eventhub_namespace.eventhub[0].default_primary_connection_string : null
  sensitive   = true
}

output "eventhub_ids" {
  description = "Map of Event Hub names to IDs"
  value = var.cloud_provider == "azure" ? {
    reference_data = azurerm_eventhub.reference_data[0].id
    market_data    = azurerm_eventhub.market_data[0].id
    trade_data     = azurerm_eventhub.trade_data[0].id
    position_data  = azurerm_eventhub.position_data[0].id
    inventory_data = azurerm_eventhub.inventory_data[0].id
    locate_data    = azurerm_eventhub.locate_data[0].id
  } : null
}