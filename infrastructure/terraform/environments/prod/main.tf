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
    key            = "environments/prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "ims-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = "prod"
      Project     = "IMS"
      ManagedBy   = "Terraform"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
  
  tags = {
    Environment = "prod"
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "azurerm_client_config" "current" {}
data "azurerm_subscription" "current" {}

# Local variables
locals {
  common_tags = {
    Project     = "Inventory Management System"
    Environment = "prod"
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

# AWS US Region Infrastructure
module "aws_us_infrastructure" {
  source = "../../aws"
  
  environment          = "prod"
  aws_region           = local.aws_regions.us
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  private_subnets      = var.private_subnets
  public_subnets       = var.public_subnets
  database_subnets     = var.database_subnets
  
  kubernetes_version   = var.kubernetes_version
  eks_node_groups      = var.eks_node_groups
  
  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  db_multi_az          = var.db_multi_az
  db_backup_retention  = var.db_backup_retention
  db_deletion_protection = var.db_deletion_protection
  
  cache_node_type      = var.cache_node_type
  cache_num_nodes      = var.cache_num_nodes
  
  kafka_broker_instance_type = var.kafka_broker_instance_type
  kafka_broker_count   = var.kafka_broker_count
  
  s3_lifecycle_rules   = var.s3_lifecycle_rules
  log_retention_days   = var.log_retention_days
  alarm_email          = var.alarm_email
  
  enable_waf           = var.enable_waf
  enable_shield        = var.enable_shield
  enable_guardduty     = var.enable_guardduty
  enable_config        = var.enable_config
  enable_cloudtrail    = var.enable_cloudtrail
}

# AWS EU Region Infrastructure
module "aws_eu_infrastructure" {
  source = "../../aws"
  count  = var.enable_multi_region ? 1 : 0
  
  environment          = "prod-eu"
  aws_region           = local.aws_regions.eu
  vpc_cidr             = var.vpc_cidr
  availability_zones   = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
  private_subnets      = var.private_subnets
  public_subnets       = var.public_subnets
  database_subnets     = var.database_subnets
  
  kubernetes_version   = var.kubernetes_version
  eks_node_groups      = var.eks_node_groups
  
  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  db_multi_az          = var.db_multi_az
  db_backup_retention  = var.db_backup_retention
  db_deletion_protection = var.db_deletion_protection
  
  cache_node_type      = var.cache_node_type
  cache_num_nodes      = var.cache_num_nodes
  
  kafka_broker_instance_type = var.kafka_broker_instance_type
  kafka_broker_count   = var.kafka_broker_count
  
  s3_lifecycle_rules   = var.s3_lifecycle_rules
  log_retention_days   = var.log_retention_days
  alarm_email          = var.alarm_email
  
  enable_waf           = var.enable_waf
  enable_shield        = var.enable_shield
  enable_guardduty     = var.enable_guardduty
  enable_config        = var.enable_config
  enable_cloudtrail    = var.enable_cloudtrail
}

# AWS Asia-Pacific Region Infrastructure
module "aws_ap_infrastructure" {
  source = "../../aws"
  count  = var.enable_multi_region ? 1 : 0
  
  environment          = "prod-ap"
  aws_region           = local.aws_regions.ap
  vpc_cidr             = var.vpc_cidr
  availability_zones   = ["ap-northeast-1a", "ap-northeast-1c", "ap-northeast-1d"]
  private_subnets      = var.private_subnets
  public_subnets       = var.public_subnets
  database_subnets     = var.database_subnets
  
  kubernetes_version   = var.kubernetes_version
  eks_node_groups      = var.eks_node_groups
  
  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  db_multi_az          = var.db_multi_az
  db_backup_retention  = var.db_backup_retention
  db_deletion_protection = var.db_deletion_protection
  
  cache_node_type      = var.cache_node_type
  cache_num_nodes      = var.cache_num_nodes
  
  kafka_broker_instance_type = var.kafka_broker_instance_type
  kafka_broker_count   = var.kafka_broker_count
  
  s3_lifecycle_rules   = var.s3_lifecycle_rules
  log_retention_days   = var.log_retention_days
  alarm_email          = var.alarm_email
  
  enable_waf           = var.enable_waf
  enable_shield        = var.enable_shield
  enable_guardduty     = var.enable_guardduty
  enable_config        = var.enable_config
  enable_cloudtrail    = var.enable_cloudtrail
}

# Azure US Region Infrastructure
module "azure_us_infrastructure" {
  source = "../../azure"
  
  environment          = "prod"
  location             = local.azure_regions.us
  subscription_id      = var.azure_subscription_id
  tenant_id            = var.azure_tenant_id
  
  vnet_address_space   = var.vnet_address_space
  subnet_prefixes      = var.subnet_prefixes
  
  kubernetes_version   = var.kubernetes_version
  aks_node_pools       = var.aks_node_pools
  
  db_sku_name          = var.db_sku_name
  db_storage_mb        = var.db_storage_mb
  db_backup_retention_days = var.db_backup_retention_days
  db_geo_redundant_backup = var.db_geo_redundant_backup
  db_admin_username    = var.db_admin_username
  db_admin_password    = var.db_admin_password
  
  redis_capacity       = var.redis_capacity
  redis_family         = var.redis_family
  redis_sku_name       = var.redis_sku_name
  
  eventhub_capacity    = var.eventhub_capacity
  event_hubs_config    = var.event_hubs_config
  
  storage_containers   = var.storage_containers
  storage_lifecycle_rules = var.storage_lifecycle_rules
  
  log_retention_days   = var.log_retention_days
  alert_email          = var.alarm_email
}

# Azure EU Region Infrastructure
module "azure_eu_infrastructure" {
  source = "../../azure"
  count  = var.enable_multi_region ? 1 : 0
  
  environment          = "prod-eu"
  location             = local.azure_regions.eu
  subscription_id      = var.azure_subscription_id
  tenant_id            = var.azure_tenant_id
  
  vnet_address_space   = var.vnet_address_space
  subnet_prefixes      = var.subnet_prefixes
  
  kubernetes_version   = var.kubernetes_version
  aks_node_pools       = var.aks_node_pools
  
  db_sku_name          = var.db_sku_name
  db_storage_mb        = var.db_storage_mb
  db_backup_retention_days = var.db_backup_retention_days
  db_geo_redundant_backup = var.db_geo_redundant_backup
  db_admin_username    = var.db_admin_username
  db_admin_password    = var.db_admin_password
  
  redis_capacity       = var.redis_capacity
  redis_family         = var.redis_family
  redis_sku_name       = var.redis_sku_name
  
  eventhub_capacity    = var.eventhub_capacity
  event_hubs_config    = var.event_hubs_config
  
  storage_containers   = var.storage_containers
  storage_lifecycle_rules = var.storage_lifecycle_rules
  
  log_retention_days   = var.log_retention_days
  alert_email          = var.alarm_email
}

# Azure Asia-Pacific Region Infrastructure
module "azure_ap_infrastructure" {
  source = "../../azure"
  count  = var.enable_multi_region ? 1 : 0
  
  environment          = "prod-ap"
  location             = local.azure_regions.ap
  subscription_id      = var.azure_subscription_id
  tenant_id            = var.azure_tenant_id
  
  vnet_address_space   = var.vnet_address_space
  subnet_prefixes      = var.subnet_prefixes
  
  kubernetes_version   = var.kubernetes_version
  aks_node_pools       = var.aks_node_pools
  
  db_sku_name          = var.db_sku_name
  db_storage_mb        = var.db_storage_mb
  db_backup_retention_days = var.db_backup_retention_days
  db_geo_redundant_backup = var.db_geo_redundant_backup
  db_admin_username    = var.db_admin_username
  db_admin_password    = var.db_admin_password
  
  redis_capacity       = var.redis_capacity
  redis_family         = var.redis_family
  redis_sku_name       = var.redis_sku_name
  
  eventhub_capacity    = var.eventhub_capacity
  event_hubs_config    = var.event_hubs_config
  
  storage_containers   = var.storage_containers
  storage_lifecycle_rules = var.storage_lifecycle_rules
  
  log_retention_days   = var.log_retention_days
  alert_email          = var.alarm_email
}

# Kubernetes US Resources
module "kubernetes_us_resources" {
  source = "../../modules/kubernetes"
  
  environment        = "prod"
  region             = local.aws_regions.us
  cloud_provider     = "aws"
  cluster_name       = "ims-prod-us"
  kubernetes_version = var.kubernetes_version
  vpc_id             = module.aws_us_infrastructure.vpc_id
  subnet_ids         = module.aws_us_infrastructure.private_subnet_ids
  node_pools         = var.eks_node_groups
  
  enable_cluster_autoscaler = true
  enable_metrics_server     = true
  enable_prometheus         = true
  enable_grafana            = true
  enable_istio              = true
  
  tags                      = local.common_tags
}

# Kubernetes EU Resources
module "kubernetes_eu_resources" {
  source = "../../modules/kubernetes"
  count  = var.enable_multi_region ? 1 : 0
  
  environment        = "prod"
  region             = local.aws_regions.eu
  cloud_provider     = "aws"
  cluster_name       = "ims-prod-eu"
  kubernetes_version = var.kubernetes_version
  vpc_id             = module.aws_eu_infrastructure[0].vpc_id
  subnet_ids         = module.aws_eu_infrastructure[0].private_subnet_ids
  node_pools         = var.eks_node_groups
  
  enable_cluster_autoscaler = true
  enable_metrics_server     = true
  enable_prometheus         = true
  enable_grafana            = true
  enable_istio              = true
  
  tags                      = local.common_tags
}

# Kubernetes AP Resources
module "kubernetes_ap_resources" {
  source = "../../modules/kubernetes"
  count  = var.enable_multi_region ? 1 : 0
  
  environment        = "prod"
  region             = local.aws_regions.ap
  cloud_provider     = "aws"
  cluster_name       = "ims-prod-ap"
  kubernetes_version = var.kubernetes_version
  vpc_id             = module.aws_ap_infrastructure[0].vpc_id
  subnet_ids         = module.aws_ap_infrastructure[0].private_subnet_ids
  node_pools         = var.eks_node_groups
  
  enable_cluster_autoscaler = true
  enable_metrics_server     = true
  enable_prometheus         = true
  enable_grafana            = true
  enable_istio              = true
  
  tags                      = local.common_tags
}

# Database US Resources
module "database_us_resources" {
  source = "../../modules/database"
  
  environment          = "prod"
  region               = local.aws_regions.us
  cloud_provider       = "aws"
  vpc_id               = module.aws_us_infrastructure.vpc_id
  subnet_ids           = module.aws_us_infrastructure.database_subnet_ids
  security_group_ids   = module.aws_us_infrastructure.security_group_ids
  
  db_instance_class    = var.db_instance_class
  db_storage_gb        = var.db_allocated_storage
  db_backup_retention_days = var.db_backup_retention
  db_multi_az          = var.db_multi_az
  db_deletion_protection = var.db_deletion_protection
  
  redis_node_type      = var.cache_node_type
  redis_num_shards     = 3
  redis_replicas_per_shard = 2
  
  cassandra_node_count = 6
  influxdb_node_count  = 6
  
  kafka_broker_type    = var.kafka_broker_instance_type
  kafka_broker_count   = var.kafka_broker_count
  
  enable_encryption    = true
  enable_performance_insights = true
  
  tags                 = local.common_tags
}

# Database EU Resources
module "database_eu_resources" {
  source = "../../modules/database"
  count  = var.enable_multi_region ? 1 : 0
  
  environment          = "prod-eu"
  region               = local.aws_regions.eu
  cloud_provider       = "aws"
  vpc_id               = module.aws_eu_infrastructure[0].vpc_id
  subnet_ids           = module.aws_eu_infrastructure[0].database_subnet_ids
  security_group_ids   = module.aws_eu_infrastructure[0].security_group_ids
  
  db_instance_class    = var.db_instance_class
  db_storage_gb        = var.db_allocated_storage
  db_backup_retention_days = var.db_backup_retention
  db_multi_az          = var.db_multi_az
  db_deletion_protection = var.db_deletion_protection
  
  redis_node_type      = var.cache_node_type
  redis_num_shards     = 3
  redis_replicas_per_shard = 2
  
  cassandra_node_count = 6
  influxdb_node_count  = 6
  
  kafka_broker_type    = var.kafka_broker_instance_type
  kafka_broker_count   = var.kafka_broker_count
  
  enable_encryption    = true
  enable_performance_insights = true
  
  tags                 = local.common_tags
}

# Database AP Resources
module "database_ap_resources" {
  source = "../../modules/database"
  count  = var.enable_multi_region ? 1 : 0
  
  environment          = "prod-ap"
  region               = local.aws_regions.ap
  cloud_provider       = "aws"
  vpc_id               = module.aws_ap_infrastructure[0].vpc_id
  subnet_ids           = module.aws_ap_infrastructure[0].database_subnet_ids
  security_group_ids   = module.aws_ap_infrastructure[0].security_group_ids
  
  db_instance_class    = var.db_instance_class
  db_storage_gb        = var.db_allocated_storage
  db_backup_retention_days = var.db_backup_retention
  db_multi_az          = var.db_multi_az
  db_deletion_protection = var.db_deletion_protection
  
  redis_node_type      = var.cache_node_type
  redis_num_shards     = 3
  redis_replicas_per_shard = 2
  
  cassandra_node_count = 6
  influxdb_node_count  = 6
  
  kafka_broker_type    = var.kafka_broker_instance_type
  kafka_broker_count   = var.kafka_broker_count
  
  enable_encryption    = true
  enable_performance_insights = true
  
  tags                 = local.common_tags
}

# Monitoring US Resources
module "monitoring_us_resources" {
  source = "../../modules/monitoring"
  
  environment        = "prod"
  region             = local.aws_regions.us
  cloud_provider     = "aws"
  vpc_id             = module.aws_us_infrastructure.vpc_id
  subnet_ids         = module.aws_us_infrastructure.private_subnet_ids
  eks_cluster_name   = module.kubernetes_us_resources.cluster_name
  
  log_retention_days = var.log_retention_days
  alarm_email        = var.alarm_email
  enable_dashboard   = true
  enable_detailed_monitoring = true
  performance_thresholds = var.performance_thresholds
  
  monitored_services = [
    "data-ingestion",
    "calculation",
    "workflow",
    "api-gateway",
    "websocket",
    "database",
    "messaging"
  ]
  
  tags               = local.common_tags
}

# Monitoring EU Resources
module "monitoring_eu_resources" {
  source = "../../modules/monitoring"
  count  = var.enable_multi_region ? 1 : 0
  
  environment        = "prod-eu"
  region             = local.aws_regions.eu
  cloud_provider     = "aws"
  vpc_id             = module.aws_eu_infrastructure[0].vpc_id
  subnet_ids         = module.aws_eu_infrastructure[0].private_subnet_ids
  eks_cluster_name   = module.kubernetes_eu_resources[0].cluster_name
  
  log_retention_days = var.log_retention_days
  alarm_email        = var.alarm_email
  enable_dashboard   = true
  enable_detailed_monitoring = true
  performance_thresholds = var.performance_thresholds
  
  monitored_services = [
    "data-ingestion",
    "calculation",
    "workflow",
    "api-gateway",
    "websocket",
    "database",
    "messaging"
  ]
  
  tags               = local.common_tags
}

# Monitoring AP Resources
module "monitoring_ap_resources" {
  source = "../../modules/monitoring"
  count  = var.enable_multi_region ? 1 : 0
  
  environment        = "prod-ap"
  region             = local.aws_regions.ap
  cloud_provider     = "aws"
  vpc_id             = module.aws_ap_infrastructure[0].vpc_id
  subnet_ids         = module.aws_ap_infrastructure[0].private_subnet_ids
  eks_cluster_name   = module.kubernetes_ap_resources[0].cluster_name
  
  log_retention_days = var.log_retention_days
  alarm_email        = var.alarm_email
  enable_dashboard   = true
  enable_detailed_monitoring = true
  performance_thresholds = var.performance_thresholds
  
  monitored_services = [
    "data-ingestion",
    "calculation",
    "workflow",
    "api-gateway",
    "websocket",
    "database",
    "messaging"
  ]
  
  tags               = local.common_tags
}

# Global Monitoring Resources
module "global_monitoring" {
  source = "../../modules/global-monitoring"
  
  environment         = "prod"
  primary_region      = local.aws_regions.us
  secondary_regions   = var.enable_multi_region ? [local.aws_regions.eu, local.aws_regions.ap] : []
  
  us_monitoring_endpoint = module.monitoring_us_resources.monitoring_endpoint
  eu_monitoring_endpoint = var.enable_multi_region ? module.monitoring_eu_resources[0].monitoring_endpoint : null
  ap_monitoring_endpoint = var.enable_multi_region ? module.monitoring_ap_resources[0].monitoring_endpoint : null
  
  alarm_email         = var.alarm_email
  performance_thresholds = var.performance_thresholds
  
  tags                = local.common_tags
}

# Disaster Recovery Resources
module "disaster_recovery" {
  source = "../../modules/dr"
  
  environment         = "prod"
  primary_region      = local.aws_regions.us
  secondary_regions   = var.enable_multi_region ? [local.aws_regions.eu, local.aws_regions.ap] : []
  
  vpc_id              = module.aws_us_infrastructure.vpc_id
  database_snapshot_frequency = "hourly"
  replication_regions = var.enable_multi_region ? [local.aws_regions.eu, local.aws_regions.ap] : []
  
  enable_cross_region_replication = true
  backup_retention_days = var.db_backup_retention
  rto_minutes         = 15
  rpo_minutes         = 5
  
  tags                = local.common_tags
}

# Compliance Resources
module "compliance" {
  source = "../../modules/compliance"
  
  environment         = "prod"
  primary_region      = local.aws_regions.us
  secondary_regions   = var.enable_multi_region ? [local.aws_regions.eu, local.aws_regions.ap] : []
  
  vpc_id              = module.aws_us_infrastructure.vpc_id
  enable_audit_logging = true
  log_retention_days  = var.log_retention_days
  
  compliance_standards = [
    "SOX",
    "GDPR",
    "MiFID II",
    "PCI DSS"
  ]
  
  tags                = local.common_tags
}

# Variables definition
variable "aws_region" {
  description = "AWS region for deploying resources"
  type        = string
  default     = "us-east-1"
}

variable "azure_subscription_id" {
  description = "Azure subscription ID"
  type        = string
  sensitive   = true
}

variable "azure_tenant_id" {
  description = "Azure tenant ID"
  type        = string
  sensitive   = true
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnets" {
  description = "List of private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets" {
  description = "List of public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnets" {
  description = "List of database subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

variable "kubernetes_version" {
  description = "Kubernetes version to use"
  type        = string
  default     = "1.27"
}

variable "eks_node_groups" {
  description = "Configuration for EKS node groups"
  type        = map(object({
    instance_types = list(string)
    disk_size      = number
    min_size       = number
    max_size       = number
    desired_size   = number
    labels         = map(string)
    taints         = list(string)
  }))
  default = {
    app = {
      instance_types = ["m5.4xlarge"]
      disk_size      = 100
      min_size       = 5
      max_size       = 20
      desired_size   = 10
      labels         = { role = "app" }
      taints         = []
    }
    calculation = {
      instance_types = ["c5.9xlarge"]
      disk_size      = 100
      min_size       = 5
      max_size       = 30
      desired_size   = 12
      labels         = { role = "calculation" }
      taints         = ["dedicated=calculation:NoSchedule"]
    }
    data = {
      instance_types = ["r5.4xlarge"]
      disk_size      = 500
      min_size       = 5
      max_size       = 20
      desired_size   = 8
      labels         = { role = "data" }
      taints         = ["dedicated=data:NoSchedule"]
    }
  }
}

variable "db_instance_class" {
  description = "Instance class for RDS instances"
  type        = string
  default     = "db.r5.4xlarge"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS instances in GB"
  type        = number
  default     = 1000
}

variable "db_multi_az" {
  description = "Whether to enable multi-AZ for RDS instances"
  type        = bool
  default     = true
}

variable "db_backup_retention" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

variable "db_deletion_protection" {
  description = "Whether to enable deletion protection for RDS instances"
  type        = bool
  default     = true
}

variable "cache_node_type" {
  description = "Node type for ElastiCache instances"
  type        = string
  default     = "cache.r5.2xlarge"
}

variable "cache_num_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 6
}

variable "kafka_broker_instance_type" {
  description = "Instance type for Kafka brokers"
  type        = string
  default     = "kafka.m5.4xlarge"
}

variable "kafka_broker_count" {
  description = "Number of Kafka brokers"
  type        = number
  default     = 6
}

variable "s3_lifecycle_rules" {
  description = "Lifecycle rules for S3 buckets"
  type        = list(object({
    id         = string
    enabled    = bool
    prefix     = string
    expiration = object({
      days = number
    })
  }))
  default = [
    {
      id        = "log-expiration"
      enabled   = true
      prefix    = "logs/"
      expiration = {
        days = 90
      }
    },
    {
      id        = "data-transition"
      enabled   = true
      prefix    = "data/"
      transition = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        },
        {
          days          = 365
          storage_class = "DEEP_ARCHIVE"
        }
      ]
    }
  ]
}

variable "log_retention_days" {
  description = "Log retention period in days"
  type        = number
  default     = 365
}

variable "alarm_email" {
  description = "Email address for alarm notifications"
  type        = string
  default     = "ops-team@example.com"
}

variable "azure_location" {
  description = "Azure region for deploying resources"
  type        = string
  default     = "eastus"
}

variable "vnet_address_space" {
  description = "Address space for Azure VNet"
  type        = list(string)
  default     = ["10.1.0.0/16"]
}

variable "subnet_prefixes" {
  description = "Map of subnet names to CIDR prefixes"
  type        = map(string)
  default     = {
    app      = "10.1.1.0/24"
    aks      = "10.1.2.0/24"
    database = "10.1.3.0/24"
    cache    = "10.1.4.0/24"
  }
}

variable "aks_node_pools" {
  description = "Configuration for AKS node pools"
  type        = map(object({
    vm_size      = string
    disk_size_gb = number
    min_count    = number
    max_count    = number
    node_count   = number
    labels       = map(string)
    taints       = list(string)
  }))
  default = {
    app = {
      vm_size      = "Standard_D16s_v3"
      disk_size_gb = 100
      min_count    = 5
      max_count    = 20
      node_count   = 10
      labels       = { role = "app" }
      taints       = []
    }
    calculation = {
      vm_size      = "Standard_F32s_v2"
      disk_size_gb = 100
      min_count    = 5
      max_count    = 30
      node_count   = 12
      labels       = { role = "calculation" }
      taints       = ["dedicated=calculation:NoSchedule"]
    }
    data = {
      vm_size      = "Standard_E16s_v3"
      disk_size_gb = 500
      min_count    = 5
      max_count    = 20
      node_count   = 8
      labels       = { role = "data" }
      taints       = ["dedicated=data:NoSchedule"]
    }
  }
}

variable "db_sku_name" {
  description = "SKU name for Azure Database for PostgreSQL"
  type        = string
  default     = "GP_Standard_D16s_v3"
}

variable "db_storage_mb" {
  description = "Storage size in MB for Azure Database for PostgreSQL"
  type        = number
  default     = 1024000
}

variable "db_backup_retention_days" {
  description = "Backup retention period in days for Azure Database for PostgreSQL"
  type        = number
  default     = 30
}

variable "db_geo_redundant_backup" {
  description = "Whether to enable geo-redundant backups for Azure Database for PostgreSQL"
  type        = bool
  default     = true
}

variable "db_admin_username" {
  description = "Admin username for Azure Database for PostgreSQL"
  type        = string
  default     = "ims_admin"
  sensitive   = true
}

variable "db_admin_password" {
  description = "Admin password for Azure Database for PostgreSQL"
  type        = string
  sensitive   = true
}

variable "redis_capacity" {
  description = "Capacity for Azure Cache for Redis"
  type        = number
  default     = 4
}

variable "redis_family" {
  description = "Family for Azure Cache for Redis"
  type        = string
  default     = "P"
}

variable "redis_sku_name" {
  description = "SKU name for Azure Cache for Redis"
  type        = string
  default     = "Premium"
}

variable "eventhub_capacity" {
  description = "Throughput capacity for Azure Event Hubs"
  type        = number
  default     = 20
}

variable "event_hubs_config" {
  description = "Configuration for Azure Event Hubs"
  type        = map(object({
    partition_count  = number
    message_retention = number
  }))
  default = {
    "reference-data" = {
      partition_count  = 16
      message_retention = 7
    }
    "market-data" = {
      partition_count  = 64
      message_retention = 3
    }
    "position-data" = {
      partition_count  = 32
      message_retention = 7
    }
    "inventory-data" = {
      partition_count  = 32
      message_retention = 7
    }
  }
}

variable "storage_containers" {
  description = "List of storage containers to create"
  type        = list(string)
  default     = ["data", "logs", "backups", "exports", "archive", "compliance"]
}

variable "storage_lifecycle_rules" {
  description = "Lifecycle rules for Azure Storage"
  type        = list(object({
    name         = string
    enabled      = bool
    prefix_match = list(string)
    expiry_days  = number
  }))
  default = [
    {
      name         = "log-expiration"
      enabled      = true
      prefix_match = ["logs/"]
      expiry_days  = 90
    },
    {
      name         = "data-transition"
      enabled      = true
      prefix_match = ["data/"]
      tier_to_cool_days     = 30
      tier_to_archive_days  = 90
    }
  ]
}

variable "enable_waf" {
  description = "Whether to enable Web Application Firewall"
  type        = bool
  default     = true
}

variable "enable_shield" {
  description = "Whether to enable AWS Shield Advanced for DDoS protection"
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Whether to enable AWS GuardDuty for threat detection"
  type        = bool
  default     = true
}

variable "enable_config" {
  description = "Whether to enable AWS Config for configuration compliance"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Whether to enable AWS CloudTrail for API auditing"
  type        = bool
  default     = true
}

variable "enable_multi_region" {
  description = "Whether to enable multi-region deployment"
  type        = bool
  default     = true
}

variable "performance_thresholds" {
  description = "Performance thresholds for monitoring and alerting"
  type        = object({
    api_latency_ms           = number
    calculation_latency_ms   = number
    short_sell_latency_ms    = number
    cpu_utilization_percent  = number
    memory_utilization_percent = number
    disk_utilization_percent = number
    error_rate_threshold     = number
  })
  default = {
    api_latency_ms           = 200
    calculation_latency_ms   = 150
    short_sell_latency_ms    = 100
    cpu_utilization_percent  = 70
    memory_utilization_percent = 70
    disk_utilization_percent = 70
    error_rate_threshold     = 0.01
  }
}

# Output values
output "aws_us_vpc_id" {
  description = "The ID of the AWS VPC in US region"
  value       = module.aws_us_infrastructure.vpc_id
}

output "aws_us_eks_cluster_name" {
  description = "The name of the AWS EKS cluster in US region"
  value       = module.kubernetes_us_resources.cluster_name
}

output "aws_us_eks_cluster_endpoint" {
  description = "The endpoint of the AWS EKS cluster in US region"
  value       = module.kubernetes_us_resources.cluster_endpoint
}

output "aws_us_rds_postgresql_endpoint" {
  description = "The endpoint of the AWS RDS PostgreSQL instance in US region"
  value       = module.database_us_resources.postgresql_endpoint
}

output "aws_us_rds_timescaledb_endpoint" {
  description = "The endpoint of the AWS RDS TimescaleDB instance in US region"
  value       = module.database_us_resources.timescaledb_endpoint
}

output "aws_us_elasticache_redis_endpoint" {
  description = "The endpoint of the AWS ElastiCache Redis cluster in US region"
  value       = module.database_us_resources.redis_endpoint
}

output "aws_us_msk_kafka_endpoint" {
  description = "The endpoint of the AWS MSK Kafka cluster in US region"
  value       = module.database_us_resources.kafka_endpoint
  sensitive   = true
}

output "aws_eu_vpc_id" {
  description = "The ID of the AWS VPC in EU region"
  value       = var.enable_multi_region ? module.aws_eu_infrastructure[0].vpc_id : null
}

output "aws_eu_eks_cluster_name" {
  description = "The name of the AWS EKS cluster in EU region"
  value       = var.enable_multi_region ? module.kubernetes_eu_resources[0].cluster_name : null
}

output "aws_ap_vpc_id" {
  description = "The ID of the AWS VPC in AP region"
  value       = var.enable_multi_region ? module.aws_ap_infrastructure[0].vpc_id : null
}

output "aws_ap_eks_cluster_name" {
  description = "The name of the AWS EKS cluster in AP region"
  value       = var.enable_multi_region ? module.kubernetes_ap_resources[0].cluster_name : null
}

output "azure_us_resource_group_name" {
  description = "The name of the Azure resource group in US region"
  value       = module.azure_us_infrastructure.resource_group_name
}

output "azure_us_vnet_id" {
  description = "The ID of the Azure VNet in US region"
  value       = module.azure_us_infrastructure.vnet_id
}

output "azure_us_aks_cluster_name" {
  description = "The name of the Azure AKS cluster in US region"
  value       = module.azure_us_infrastructure.aks_cluster_name
}

output "azure_us_postgresql_endpoint" {
  description = "The endpoint of the Azure PostgreSQL server in US region"
  value       = module.azure_us_infrastructure.postgresql_server_fqdn
}

output "azure_us_redis_endpoint" {
  description = "The endpoint of the Azure Redis cache in US region"
  value       = module.azure_us_infrastructure.redis_hostname
}

output "azure_us_eventhub_namespace" {
  description = "The name of the Azure Event Hub namespace in US region"
  value       = module.azure_us_infrastructure.event_hubs_namespace_name
}

output "azure_eu_resource_group_name" {
  description = "The name of the Azure resource group in EU region"
  value       = var.enable_multi_region ? module.azure_eu_infrastructure[0].resource_group_name : null
}

output "azure_ap_resource_group_name" {
  description = "The name of the Azure resource group in AP region"
  value       = var.enable_multi_region ? module.azure_ap_infrastructure[0].resource_group_name : null
}

output "us_kubeconfig" {
  description = "Kubernetes configuration for connecting to the US cluster"
  value       = module.kubernetes_us_resources.kubeconfig
  sensitive   = true
}

output "eu_kubeconfig" {
  description = "Kubernetes configuration for connecting to the EU cluster"
  value       = var.enable_multi_region ? module.kubernetes_eu_resources[0].kubeconfig : null
  sensitive   = true
}

output "ap_kubeconfig" {
  description = "Kubernetes configuration for connecting to the AP cluster"
  value       = var.enable_multi_region ? module.kubernetes_ap_resources[0].kubeconfig : null
  sensitive   = true
}

output "global_monitoring_dashboard_url" {
  description = "URL for the global monitoring dashboard"
  value       = module.global_monitoring.dashboard_url
}

output "dr_status" {
  description = "Status of disaster recovery configuration"
  value       = module.disaster_recovery.status
}

output "compliance_status" {
  description = "Status of compliance controls"
  value       = module.compliance.status
}