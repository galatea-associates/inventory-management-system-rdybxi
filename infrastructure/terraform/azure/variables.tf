# --------------------------------------------------
# Azure Subscription and Environment
# --------------------------------------------------
variable "subscription_id" {
  type        = string
  description = "The Azure subscription ID"
  sensitive   = true
}

variable "tenant_id" {
  type        = string
  description = "The Azure tenant ID"
  sensitive   = true
}

variable "location" {
  type        = string
  description = "The Azure region where resources will be created"
  default     = "eastus"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
  default     = "dev"
}

# --------------------------------------------------
# Networking
# --------------------------------------------------
variable "vnet_address_space" {
  type        = list(string)
  description = "Address space for the virtual network"
  default     = ["10.0.0.0/16"]
}

variable "subnet_prefixes" {
  type        = map(string)
  description = "CIDR blocks for each subnet in the virtual network"
  default     = {
    aks      = "10.0.0.0/22"
    database = "10.0.4.0/24"
    cache    = "10.0.5.0/24"
    app      = "10.0.6.0/24"
    gateway  = "10.0.7.0/24"
  }
}

variable "subnet_names" {
  type        = list(string)
  description = "Names of subnets to create in the virtual network"
  default     = ["aks", "database", "cache", "app", "gateway"]
}

# --------------------------------------------------
# AKS Configuration
# --------------------------------------------------
variable "kubernetes_version" {
  type        = string
  description = "Version of Kubernetes to use for AKS cluster"
  default     = "1.25.5"
}

variable "aks_node_pools" {
  type = map(object({
    vm_size         = string
    node_count      = number
    max_pods        = number
    os_disk_size_gb = number
    auto_scaling    = bool
    min_count       = number
    max_count       = number
  }))
  description = "Configuration for AKS node pools"
  default     = {
    app = {
      vm_size         = "Standard_D4s_v3"
      node_count      = 3
      max_pods        = 30
      os_disk_size_gb = 128
      auto_scaling    = true
      min_count       = 3
      max_count       = 10
    }
    calculation = {
      vm_size         = "Standard_E8s_v3"
      node_count      = 3
      max_pods        = 30
      os_disk_size_gb = 256
      auto_scaling    = true
      min_count       = 3
      max_count       = 20
    }
    data = {
      vm_size         = "Standard_E16s_v3"
      node_count      = 3
      max_pods        = 30
      os_disk_size_gb = 512
      auto_scaling    = true
      min_count       = 3
      max_count       = 10
    }
  }
}

variable "aks_admin_group_id" {
  type        = string
  description = "Object ID of the Azure AD group for AKS admin access"
}

# --------------------------------------------------
# PostgreSQL Flexible Server
# --------------------------------------------------
variable "db_sku_name" {
  type        = string
  description = "SKU name for the PostgreSQL database"
  default     = "GP_Standard_D4s_v3"
}

variable "db_storage_mb" {
  type        = number
  description = "Storage size in MB for the PostgreSQL database"
  default     = 102400
}

variable "db_backup_retention_days" {
  type        = number
  description = "Backup retention period in days for the PostgreSQL database"
  default     = 30
}

variable "db_geo_redundant_backup" {
  type        = bool
  description = "Enable geo-redundant backups for the PostgreSQL database"
  default     = true
}

variable "db_admin_username" {
  type        = string
  description = "Administrator username for the PostgreSQL database"
  default     = "imsadmin"
}

variable "db_admin_password" {
  type        = string
  description = "Administrator password for the PostgreSQL database"
  sensitive   = true
}

# --------------------------------------------------
# Redis Cache
# --------------------------------------------------
variable "redis_capacity" {
  type        = number
  description = "Capacity of the Redis cache"
  default     = 2
}

variable "redis_family" {
  type        = string
  description = "Family of the Redis cache"
  default     = "P"
}

variable "redis_sku_name" {
  type        = string
  description = "SKU name for the Redis cache"
  default     = "Premium"
}

# --------------------------------------------------
# Event Hub
# --------------------------------------------------
variable "eventhub_capacity" {
  type        = number
  description = "Throughput units for the Event Hubs namespace"
  default     = 20
}

variable "event_hubs_config" {
  type = map(object({
    partition_count   = number
    message_retention = number
  }))
  description = "Configuration for Event Hubs"
  default     = {
    reference_data = {
      partition_count   = 8
      message_retention = 7
    }
    market_data = {
      partition_count   = 32
      message_retention = 3
    }
    trade_data = {
      partition_count   = 16
      message_retention = 7
    }
    position_data = {
      partition_count   = 16
      message_retention = 7
    }
    inventory_data = {
      partition_count   = 16
      message_retention = 7
    }
    locate_data = {
      partition_count   = 8
      message_retention = 7
    }
  }
}

# --------------------------------------------------
# Storage
# --------------------------------------------------
variable "storage_containers" {
  type        = list(string)
  description = "List of storage containers to create"
  default     = ["reference-data", "market-data", "trade-data", "position-data", "inventory-data", "locate-data", "backups", "archives"]
}

variable "storage_lifecycle_rules" {
  type = list(object({
    name                 = string
    prefix_match         = list(string)
    tier_to_cool_days    = number
    tier_to_archive_days = number
    delete_after_days    = number
  }))
  description = "Lifecycle management rules for storage accounts"
  default     = [
    {
      name                 = "market-data-lifecycle"
      prefix_match         = ["market-data/"]
      tier_to_cool_days    = 30
      tier_to_archive_days = 90
      delete_after_days    = 365
    },
    {
      name                 = "backup-lifecycle"
      prefix_match         = ["backups/"]
      tier_to_cool_days    = 30
      tier_to_archive_days = 90
      delete_after_days    = 365
    }
  ]
}

# --------------------------------------------------
# Monitoring and Alerting
# --------------------------------------------------
variable "log_retention_days" {
  type        = number
  description = "Number of days to retain logs"
  default     = 90
}

variable "alert_email" {
  type        = string
  description = "Email address for alert notifications"
  default     = "alerts@example.com"
}

# --------------------------------------------------
# Security and Access
# --------------------------------------------------
variable "ssh_public_key_path" {
  type        = string
  description = "Path to SSH public key for VM authentication"
  default     = "~/.ssh/id_rsa.pub"
}

variable "admin_cidr_blocks" {
  type        = string
  description = "CIDR blocks allowed for administrative access"
  default     = "0.0.0.0/0"
}

# --------------------------------------------------
# Additional Infrastructure
# --------------------------------------------------
variable "cassandra_node_count" {
  type        = number
  description = "Number of Cassandra nodes in the cluster"
  default     = 6
}

variable "influxdb_node_count" {
  type        = number
  description = "Number of InfluxDB nodes"
  default     = 3
}