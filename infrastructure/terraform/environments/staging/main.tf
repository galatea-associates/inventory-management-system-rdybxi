# Define the required Terraform version and providers
terraform {
  required_version = ">= 1.0.0"

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
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket         = "ims-terraform-state"
    key            = "environments/staging/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "ims-terraform-locks"
    encrypt        = true
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Environment = "staging"
      Project     = "IMS"
      ManagedBy   = "Terraform"
    }
  }
}

# Configure the Azure Provider
provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
  tags = {
    Environment = "staging"
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Define local values that can be reused across the configuration
locals {
  common_tags = {
    Project     = "Inventory Management System"
    Environment = "staging"
    Owner       = "DevOps Team"
    ManagedBy   = "Terraform"
  }

  aws_regions = {
    us = "us-east-1"
    eu = "eu-west-1"
    ap = "ap-northeast-1"
  }

  azure_regions = {
    us = "eastus"
    eu = "westeurope"
    ap = "japaneast"
  }
}

# Retrieve current AWS account ID and region information
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Retrieve current Azure client configuration and subscription
data "azurerm_client_config" "current" {}
data "azurerm_subscription" "current" {}

# ----- Variables -----

variable "aws_region" {
  type        = string
  description = "AWS region for deploying resources"
  default     = "us-east-1"
}

variable "azure_subscription_id" {
  type        = string
  description = "Azure subscription ID"
  sensitive   = true
}

variable "azure_tenant_id" {
  type        = string
  description = "Azure tenant ID"
  sensitive   = true
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones to use"
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnets" {
  type        = list(string)
  description = "List of private subnet CIDR blocks"
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets" {
  type        = list(string)
  description = "List of public subnet CIDR blocks"
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnets" {
  type        = list(string)
  description = "List of database subnet CIDR blocks"
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version to use"
  default     = "1.27"
}

variable "eks_node_groups" {
  type = map(object({
    instance_types = list(string)
    disk_size      = number
    min_size       = number
    max_size       = number
    desired_size   = number
    labels         = map(string)
    taints         = list(string)
  }))
  description = "Configuration for EKS node groups"
  default = {
    app = {
      instance_types = ["m5.2xlarge"]
      disk_size      = 100
      min_size       = 3
      max_size       = 10
      desired_size   = 3
      labels         = { role = "app" }
      taints         = []
    }
    calculation = {
      instance_types = ["c5.4xlarge"]
      disk_size      = 100
      min_size       = 3
      max_size       = 15
      desired_size   = 5
      labels         = { role = "calculation" }
      taints         = ["dedicated=calculation:NoSchedule"]
    }
    data = {
      instance_types = ["r5.2xlarge"]
      disk_size      = 200
      min_size       = 3
      max_size       = 10
      desired_size   = 3
      labels         = { role = "data" }
      taints         = ["dedicated=data:NoSchedule"]
    }
  }
}

variable "db_instance_class" {
  type        = string
  description = "Instance class for RDS instances"
  default     = "db.r5.2xlarge"
}

variable "db_allocated_storage" {
  type        = number
  description = "Allocated storage for RDS instances in GB"
  default     = 500
}

variable "db_multi_az" {
  type        = bool
  description = "Whether to enable multi-AZ for RDS instances"
  default     = true
}

variable "db_backup_retention" {
  type        = number
  description = "Backup retention period in days"
  default     = 14
}

variable "db_deletion_protection" {
  type        = bool
  description = "Whether to enable deletion protection for RDS instances"
  default     = true
}

variable "cache_node_type" {
  type        = string
  description = "Node type for ElastiCache instances"
  default     = "cache.r5.large"
}

variable "cache_num_nodes" {
  type        = number
  description = "Number of cache nodes"
  default     = 3
}

variable "kafka_broker_instance_type" {
  type        = string
  description = "Instance type for Kafka brokers"
  default     = "kafka.m5.2xlarge"
}

variable "kafka_broker_count" {
  type        = number
  description = "Number of Kafka brokers"
  default     = 3
}

variable "s3_lifecycle_rules" {
  type = list(object({
    id         = string
    enabled    = bool
    prefix     = string
    expiration = object({
      days = number
    })
    transition = optional(list(object({
      days          = number
      storage_class = string
    })))
  }))
  description = "Lifecycle rules for S3 buckets"
  default = [
    {
      id         = "log-expiration"
      enabled    = true
      prefix     = "logs/"
      expiration = {
        days = 60
      }
    },
    {
      id         = "data-transition"
      enabled    = true
      prefix     = "data/"
      transition = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]
    }
  ]
}

variable "log_retention_days" {
  type        = number
  description = "Log retention period in days"
  default     = 90
}

variable "alarm_email" {
  type        = string
  description = "Email address for alarm notifications"
  default     = "devops@example.com"
}

variable "azure_location" {
  type        = string
  description = "Azure region for deploying resources"
  default     = "eastus"
}

variable "vnet_address_space" {
  type        = list(string)
  description = "Address space for Azure VNet"
  default     = ["10.1.0.0/16"]
}

variable "subnet_prefixes" {
  type        = map(string)
  description = "Map of subnet names to CIDR prefixes"
  default = {
    app      = "10.1.1.0/24"
    aks      = "10.1.2.0/24"
    database = "10.1.3.0/24"
    cache    = "10.1.4.0/24"
  }
}

variable "aks_node_pools" {
  type = map(object({
    vm_size      = string
    disk_size_gb = number
    min_count    = number
    max_count    = number
    node_count   = number
    labels       = map(string)
    taints       = list(string)
  }))
  description = "Configuration for AKS node pools"
  default = {
    app = {
      vm_size      = "Standard_D8s_v3"
      disk_size_gb = 100
      min_count    = 3
      max_count    = 10
      node_count   = 3
      labels       = { role = "app" }
      taints       = []
    }
    calculation = {
      vm_size      = "Standard_F16s_v2"
      disk_size_gb = 100
      min_count    = 3
      max_count    = 15
      node_count   = 5
      labels       = { role = "calculation" }
      taints       = ["dedicated=calculation:NoSchedule"]
    }
    data = {
      vm_size      = "Standard_E8s_v3"
      disk_size_gb = 200
      min_count    = 3
      max_count    = 10
      node_count   = 3
      labels       = { role = "data" }
      taints       = ["dedicated=data:NoSchedule"]
    }
  }
}

variable "db_sku_name" {
  type        = string
  description = "SKU name for Azure Database for PostgreSQL"
  default     = "GP_Standard_D8s_v3"
}

variable "db_storage_mb" {
  type        = number
  description = "Storage size in MB for Azure Database for PostgreSQL"
  default     = 512000
}

variable "db_backup_retention_days" {
  type        = number
  description = "Backup retention period in days for Azure Database for PostgreSQL"
  default     = 14
}

variable "db_geo_redundant_backup" {
  type        = bool
  description = "Whether to enable geo-redundant backups for Azure Database for PostgreSQL"
  default     = true
}

variable "db_admin_username" {
  type        = string
  description = "Admin username for Azure Database for PostgreSQL"
  default     = "ims_admin"
  sensitive   = true
}

variable "db_admin_password" {
  type        = string
  description = "Admin password for Azure Database for PostgreSQL"
  sensitive   = true
}

variable "redis_capacity" {
  type        = number
  description = "Capacity for Azure Cache for Redis"
  default     = 2
}

variable "redis_family" {
  type        = string
  description = "Family for Azure Cache for Redis"
  default     = "P"
}

variable "redis_sku_name" {
  type        = string
  description = "SKU name for Azure Cache for Redis"
  default     = "Premium"
}

variable "eventhub_capacity" {
  type        = number
  description = "Throughput capacity for Azure Event Hubs"
  default     = 8
}

variable "event_hubs_config" {
  type = map(object({
    partition_count   = number
    message_retention = number
  }))
  description = "Configuration for Azure Event Hubs"
  default = {
    "reference-data" = {
      partition_count   = 8
      message_retention = 5
    }
    "market-data" = {
      partition_count   = 32
      message_retention = 2
    }
    "position-data" = {
      partition_count   = 16
      message_retention = 5
    }
    "inventory-data" = {
      partition_count   = 16
      message_retention = 5
    }
  }
}

variable "storage_containers" {
  type        = list(string)
  description = "List of storage containers to create"
  default     = ["data", "logs", "backups", "exports", "archive"]
}

variable "storage_lifecycle_rules" {
  type = list(object({
    name                 = string
    enabled              = bool
    prefix_match         = list(string)
    expiry_days          = optional(number)
    tier_to_cool_days    = optional(number)
    tier_to_archive_days = optional(number)
  }))
  description = "Lifecycle rules for Azure Storage"
  default = [
    {
      name         = "log-expiration"
      enabled      = true
      prefix_match = ["logs/"]
      expiry_days  = 60
    },
    {
      name                 = "data-transition"
      enabled              = true
      prefix_match         = ["data/"]
      tier_to_cool_days    = 30
      tier_to_archive_days = 90
    }
  ]
}

variable "enable_waf" {
  type        = bool
  description = "Whether to enable Web Application Firewall"
  default     = true
}

variable "enable_ddos_protection" {
  type        = bool
  description = "Whether to enable DDoS Protection"
  default     = true
}

variable "enable_cross_region_replication" {
  type        = bool
  description = "Whether to enable cross-region replication for databases"
  default     = true
}

variable "performance_thresholds" {
  type = object({
    api_latency_ms             = number
    calculation_latency_ms     = number
    short_sell_latency_ms      = number
    cpu_utilization_percent    = number
    memory_utilization_percent = number
    disk_utilization_percent   = number
    error_rate_threshold       = number
  })
  description = "Performance thresholds for monitoring and alerting"
  default = {
    api_latency_ms             = 500
    calculation_latency_ms     = 200
    short_sell_latency_ms      = 150
    cpu_utilization_percent    = 80
    memory_utilization_percent = 80
    disk_utilization_percent   = 80
    error_rate_threshold       = 0.1
  }
}

# ----- Modules -----

# AWS infrastructure module for staging environment
module "aws_infrastructure" {
  source = "../../aws"

  environment            = "staging"
  aws_region             = var.aws_region
  vpc_cidr               = var.vpc_cidr
  availability_zones     = var.availability_zones
  private_subnets        = var.private_subnets
  public_subnets         = var.public_subnets
  database_subnets       = var.database_subnets
  kubernetes_version     = var.kubernetes_version
  eks_node_groups        = var.eks_node_groups
  db_instance_class      = var.db_instance_class
  db_allocated_storage   = var.db_allocated_storage
  db_multi_az            = var.db_multi_az
  db_backup_retention    = var.db_backup_retention
  db_deletion_protection = var.db_deletion_protection
  cache_node_type        = var.cache_node_type
  cache_num_nodes        = var.cache_num_nodes
  kafka_broker_instance_type = var.kafka_broker_instance_type
  kafka_broker_count     = var.kafka_broker_count
  s3_lifecycle_rules     = var.s3_lifecycle_rules
  log_retention_days     = var.log_retention_days
  alarm_email            = var.alarm_email
  enable_waf             = var.enable_waf
  enable_shield          = true
  enable_guardduty       = true
  enable_config          = true
  enable_cloudtrail      = true
}

# Azure infrastructure module for staging environment
module "azure_infrastructure" {
  source = "../../azure"

  environment             = "staging"
  location                = var.azure_location
  subscription_id         = var.azure_subscription_id
  tenant_id               = var.azure_tenant_id
  vnet_address_space      = var.vnet_address_space
  subnet_prefixes         = var.subnet_prefixes
  kubernetes_version      = var.kubernetes_version
  aks_node_pools          = var.aks_node_pools
  db_sku_name             = var.db_sku_name
  db_storage_mb           = var.db_storage_mb
  db_backup_retention_days = var.db_backup_retention_days
  db_geo_redundant_backup = var.db_geo_redundant_backup
  db_admin_username       = var.db_admin_username
  db_admin_password       = var.db_admin_password
  redis_capacity          = var.redis_capacity
  redis_family            = var.redis_family
  redis_sku_name          = var.redis_sku_name
  eventhub_capacity       = var.eventhub_capacity
  event_hubs_config       = var.event_hubs_config
  storage_containers      = var.storage_containers
  storage_lifecycle_rules = var.storage_lifecycle_rules
  log_retention_days      = var.log_retention_days
  alert_email             = var.alarm_email
}

# Kubernetes resources module
module "kubernetes_resources" {
  source = "../../modules/kubernetes"

  environment             = "staging"
  region                  = var.aws_region
  cloud_provider          = "aws"
  cluster_name            = "ims-staging"
  kubernetes_version      = var.kubernetes_version
  vpc_id                  = module.aws_infrastructure.vpc_id
  subnet_ids              = module.aws_infrastructure.private_subnet_ids
  node_pools              = var.eks_node_groups
  enable_cluster_autoscaler = true
  enable_metrics_server   = true
  enable_prometheus       = true
  enable_grafana          = true
  enable_istio            = true
  tags                    = local.common_tags
}

# Database resources module
module "database_resources" {
  source = "../../modules/database"

  environment              = "staging"
  region                   = var.aws_region
  cloud_provider           = "aws"
  vpc_id                   = module.aws_infrastructure.vpc_id
  subnet_ids               = module.aws_infrastructure.database_subnet_ids
  security_group_ids       = module.aws_infrastructure.security_group_ids
  db_instance_class        = var.db_instance_class
  db_storage_gb            = var.db_allocated_storage
  db_backup_retention_days = var.db_backup_retention
  db_multi_az              = var.db_multi_az
  db_deletion_protection   = var.db_deletion_protection
  redis_node_type          = var.cache_node_type
  redis_num_shards         = 3
  redis_replicas_per_shard = 1
  kafka_broker_type        = var.kafka_broker_instance_type
  kafka_broker_count       = var.kafka_broker_count
  enable_encryption        = true
  enable_performance_insights = true
  tags                     = local.common_tags
}

# Monitoring resources module
module "monitoring_resources" {
  source = "../../modules/monitoring"

  environment               = "staging"
  region                    = var.aws_region
  cloud_provider            = "aws"
  vpc_id                    = module.aws_infrastructure.vpc_id
  subnet_ids                = module.aws_infrastructure.private_subnet_ids
  eks_cluster_name          = module.kubernetes_resources.cluster_name
  log_retention_days        = var.log_retention_days
  alarm_email               = var.alarm_email
  enable_dashboard          = true
  enable_detailed_monitoring = true
  performance_thresholds    = var.performance_thresholds
  monitored_services        = ["data-ingestion", "calculation", "workflow", "api-gateway", "websocket"]
  tags                      = local.common_tags
}

# Disaster recovery module (conditionally created)
module "disaster_recovery" {
  source = "../../modules/dr"
  count  = var.enable_cross_region_replication ? 1 : 0

  environment                  = "staging"
  primary_region               = var.aws_region
  secondary_region             = local.aws_regions.eu
  vpc_id                       = module.aws_infrastructure.vpc_id
  database_snapshot_frequency  = "daily"
  replication_regions          = [local.aws_regions.eu]
  enable_cross_region_replication = var.enable_cross_region_replication
  backup_retention_days        = var.db_backup_retention
  tags                         = local.common_tags
}

# ----- Outputs -----

# AWS outputs
output "aws_vpc_id" {
  description = "The ID of the AWS VPC"
  value       = module.aws_infrastructure.vpc_id
}

output "aws_eks_cluster_name" {
  description = "The name of the AWS EKS cluster"
  value       = module.kubernetes_resources.cluster_name
}

output "aws_eks_cluster_endpoint" {
  description = "The endpoint of the AWS EKS cluster"
  value       = module.kubernetes_resources.cluster_endpoint
}

output "aws_rds_postgresql_endpoint" {
  description = "The endpoint of the AWS RDS PostgreSQL instance"
  value       = module.database_resources.postgresql_endpoint
}

output "aws_rds_timescaledb_endpoint" {
  description = "The endpoint of the AWS RDS TimescaleDB instance"
  value       = module.database_resources.timescaledb_endpoint
}

output "aws_elasticache_redis_endpoint" {
  description = "The endpoint of the AWS ElastiCache Redis cluster"
  value       = module.database_resources.redis_endpoint
}

output "aws_msk_kafka_endpoint" {
  description = "The endpoint of the AWS MSK Kafka cluster"
  value       = module.database_resources.kafka_endpoint
  sensitive   = true
}

# Azure outputs
output "azure_resource_group_name" {
  description = "The name of the Azure resource group"
  value       = module.azure_infrastructure.resource_group_name
}

output "azure_vnet_id" {
  description = "The ID of the Azure VNet"
  value       = module.azure_infrastructure.vnet_id
}

output "azure_aks_cluster_name" {
  description = "The name of the Azure AKS cluster"
  value       = module.azure_infrastructure.aks_cluster_name
}

output "azure_postgresql_endpoint" {
  description = "The endpoint of the Azure PostgreSQL server"
  value       = module.azure_infrastructure.postgresql_server_fqdn
}

output "azure_redis_endpoint" {
  description = "The endpoint of the Azure Redis cache"
  value       = module.azure_infrastructure.redis_hostname
}

output "azure_eventhub_namespace" {
  description = "The name of the Azure Event Hub namespace"
  value       = module.azure_infrastructure.event_hubs_namespace_name
}

# Kubernetes and monitoring outputs
output "kubeconfig" {
  description = "Kubernetes configuration for connecting to the cluster"
  value       = module.kubernetes_resources.kubeconfig
  sensitive   = true
}

output "monitoring_dashboard_url" {
  description = "URL for the monitoring dashboard"
  value       = module.monitoring_resources.grafana_url
}

# Disaster recovery outputs
output "dr_status" {
  description = "Status of disaster recovery configuration"
  value       = var.enable_cross_region_replication ? module.disaster_recovery[0].status : null
}