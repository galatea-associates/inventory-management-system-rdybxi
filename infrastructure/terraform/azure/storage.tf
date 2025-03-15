# Azure Storage resources for the Inventory Management System (IMS)
# This file defines storage accounts, containers, and lifecycle management policies
# to implement tiered storage strategy according to data access patterns and retention requirements.

# Local variables for common tags
locals {
  common_tags = {
    Project     = "IMS"
    Environment = "${var.environment}"
    ManagedBy   = "Terraform"
  }
}

# Get current Azure client configuration for Key Vault access policies
data "azurerm_client_config" "current" {}

# Customer-managed key for storage encryption
resource "azurerm_key_vault_key" "storage_cmk" {
  name         = "ims-${var.environment}-storage-cmk"
  key_vault_id = "${module.key_vault.id}"
  key_type     = "RSA"
  key_size     = 2048
  key_opts     = ["decrypt", "encrypt", "sign", "unwrapKey", "verify", "wrapKey"]
  
  rotation_policy {
    automatic {
      time_before_expiry = "P30D"
    }
    expire_after        = "P90D"
    notify_before_expiry = "P29D"
  }
}

# Primary Storage Account
# Used for market data, position data, reference data, etc.
resource "azurerm_storage_account" "primary" {
  name                     = "ims${var.environment}primary"
  resource_group_name      = "${azurerm_resource_group.main.name}"
  location                 = "${var.location}"
  account_tier             = "Standard"
  account_replication_type = "GRS"
  account_kind             = "StorageV2"
  access_tier              = "Hot"
  enable_https_traffic_only = true
  min_tls_version          = "TLS1_2"
  shared_access_key_enabled = true
  is_hns_enabled           = true
  nfsv3_enabled            = false
  large_file_share_enabled = true
  
  blob_properties {
    versioning_enabled       = true
    change_feed_enabled      = true
    container_delete_retention_policy {
      days = 7
    }
    delete_retention_policy {
      days = 30
    }
  }
  
  identity {
    type = "SystemAssigned"
  }
  
  network_rules {
    default_action              = "Deny"
    bypass                      = ["AzureServices"]
    ip_rules                    = []
    virtual_network_subnet_ids  = ["${module.networking.subnet_ids["app"]}"]
  }
  
  tags = {
    Name        = "ims-${var.environment}-primary-storage"
    Environment = "${var.environment}"
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Configure CMK encryption for primary storage
resource "azurerm_storage_account_customer_managed_key" "primary" {
  storage_account_id = "${azurerm_storage_account.primary.id}"
  key_vault_id       = "${module.key_vault.id}"
  key_name           = "${azurerm_key_vault_key.storage_cmk.name}"
}

# Create containers in primary storage account
resource "azurerm_storage_container" "primary_containers" {
  count                = "${length(var.storage_containers)}"
  name                 = "${var.storage_containers[count.index]}"
  storage_account_name = "${azurerm_storage_account.primary.name}"
  container_access_type = "private"
}

# Lifecycle management policy for primary storage account
resource "azurerm_storage_management_policy" "primary" {
  storage_account_id = "${azurerm_storage_account.primary.id}"
  
  rule {
    name    = "market-data-lifecycle"
    enabled = true
    filters {
      prefix_match = ["market-data/"]
      blob_types   = ["blockBlob"]
    }
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 30
        tier_to_archive_after_days_since_modification_greater_than = 90
        delete_after_days_since_modification_greater_than          = 365
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 30
      }
      version {
        delete_after_days_since_creation = 90
      }
    }
  }
}

# Backup Storage Account
# Used for database backups and snapshots
resource "azurerm_storage_account" "backup" {
  name                     = "ims${var.environment}backup"
  resource_group_name      = "${azurerm_resource_group.main.name}"
  location                 = "${var.location}"
  account_tier             = "Standard"
  account_replication_type = "GRS"
  account_kind             = "StorageV2"
  access_tier              = "Hot"
  enable_https_traffic_only = true
  min_tls_version          = "TLS1_2"
  shared_access_key_enabled = true
  is_hns_enabled           = true
  nfsv3_enabled            = false
  
  blob_properties {
    versioning_enabled       = true
    change_feed_enabled      = true
    container_delete_retention_policy {
      days = 7
    }
    delete_retention_policy {
      days = 30
    }
  }
  
  identity {
    type = "SystemAssigned"
  }
  
  network_rules {
    default_action              = "Deny"
    bypass                      = ["AzureServices"]
    ip_rules                    = []
    virtual_network_subnet_ids  = ["${module.networking.subnet_ids["app"]}"]
  }
  
  tags = {
    Name        = "ims-${var.environment}-backup-storage"
    Environment = "${var.environment}"
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Configure CMK encryption for backup storage
resource "azurerm_storage_account_customer_managed_key" "backup" {
  storage_account_id = "${azurerm_storage_account.backup.id}"
  key_vault_id       = "${module.key_vault.id}"
  key_name           = "${azurerm_key_vault_key.storage_cmk.name}"
}

# Create backup containers with different retention periods
resource "azurerm_storage_container" "backup_containers" {
  for_each             = {
    daily   = "daily"
    weekly  = "weekly"
    monthly = "monthly"
  }
  name                 = "${each.key}-backups"
  storage_account_name = "${azurerm_storage_account.backup.name}"
  container_access_type = "private"
}

# Lifecycle management policy for backup storage account
resource "azurerm_storage_management_policy" "backup" {
  storage_account_id = "${azurerm_storage_account.backup.id}"
  
  rule {
    name    = "daily-backup-lifecycle"
    enabled = true
    filters {
      prefix_match = ["daily-backups/"]
      blob_types   = ["blockBlob"]
    }
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 30
        tier_to_archive_after_days_since_modification_greater_than = 90
        delete_after_days_since_modification_greater_than          = 365
      }
    }
  }
  
  rule {
    name    = "weekly-backup-lifecycle"
    enabled = true
    filters {
      prefix_match = ["weekly-backups/"]
      blob_types   = ["blockBlob"]
    }
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 90
        tier_to_archive_after_days_since_modification_greater_than = 180
        delete_after_days_since_modification_greater_than          = 730
      }
    }
  }
  
  rule {
    name    = "monthly-backup-lifecycle"
    enabled = true
    filters {
      prefix_match = ["monthly-backups/"]
      blob_types   = ["blockBlob"]
    }
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 180
        tier_to_archive_after_days_since_modification_greater_than = 365
        delete_after_days_since_modification_greater_than          = 2555
      }
    }
  }
}

# Archive Storage Account
# Used for long-term data archives with cool tier by default
resource "azurerm_storage_account" "archive" {
  name                     = "ims${var.environment}archive"
  resource_group_name      = "${azurerm_resource_group.main.name}"
  location                 = "${var.location}"
  account_tier             = "Standard"
  account_replication_type = "GRS"
  account_kind             = "StorageV2"
  access_tier              = "Cool"
  enable_https_traffic_only = true
  min_tls_version          = "TLS1_2"
  shared_access_key_enabled = true
  is_hns_enabled           = true
  nfsv3_enabled            = false
  
  blob_properties {
    versioning_enabled       = true
    change_feed_enabled      = true
    container_delete_retention_policy {
      days = 7
    }
    delete_retention_policy {
      days = 30
    }
  }
  
  identity {
    type = "SystemAssigned"
  }
  
  network_rules {
    default_action              = "Deny"
    bypass                      = ["AzureServices"]
    ip_rules                    = []
    virtual_network_subnet_ids  = ["${module.networking.subnet_ids["app"]}"]
  }
  
  tags = {
    Name        = "ims-${var.environment}-archive-storage"
    Environment = "${var.environment}"
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Configure CMK encryption for archive storage
resource "azurerm_storage_account_customer_managed_key" "archive" {
  storage_account_id = "${azurerm_storage_account.archive.id}"
  key_vault_id       = "${module.key_vault.id}"
  key_name           = "${azurerm_key_vault_key.storage_cmk.name}"
}

# Create archive container
resource "azurerm_storage_container" "archive_container" {
  name                 = "archives"
  storage_account_name = "${azurerm_storage_account.archive.name}"
  container_access_type = "private"
}

# Lifecycle management policy for archive storage account
resource "azurerm_storage_management_policy" "archive" {
  storage_account_id = "${azurerm_storage_account.archive.id}"
  
  rule {
    name    = "archive-lifecycle"
    enabled = true
    filters {
      prefix_match = ["archives/"]
      blob_types   = ["blockBlob"]
    }
    actions {
      base_blob {
        tier_to_archive_after_days_since_modification_greater_than = 0
        delete_after_days_since_modification_greater_than          = 2555
      }
    }
  }
}

# Logs Storage Account
# Used for access logs and audit logs
resource "azurerm_storage_account" "logs" {
  name                     = "ims${var.environment}logs"
  resource_group_name      = "${azurerm_resource_group.main.name}"
  location                 = "${var.location}"
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"
  access_tier              = "Hot"
  enable_https_traffic_only = true
  min_tls_version          = "TLS1_2"
  shared_access_key_enabled = true
  is_hns_enabled           = true
  nfsv3_enabled            = false
  
  blob_properties {
    versioning_enabled       = true
    change_feed_enabled      = true
    container_delete_retention_policy {
      days = 7
    }
    delete_retention_policy {
      days = 30
    }
  }
  
  identity {
    type = "SystemAssigned"
  }
  
  network_rules {
    default_action              = "Deny"
    bypass                      = ["AzureServices"]
    ip_rules                    = []
    virtual_network_subnet_ids  = ["${module.networking.subnet_ids["app"]}"]
  }
  
  tags = {
    Name        = "ims-${var.environment}-logs-storage"
    Environment = "${var.environment}"
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Configure CMK encryption for logs storage
resource "azurerm_storage_account_customer_managed_key" "logs" {
  storage_account_id = "${azurerm_storage_account.logs.id}"
  key_vault_id       = "${module.key_vault.id}"
  key_name           = "${azurerm_key_vault_key.storage_cmk.name}"
}

# Create logs containers
resource "azurerm_storage_container" "logs_containers" {
  for_each             = {
    access = "access-logs"
    audit  = "audit-logs"
  }
  name                 = "${each.value}"
  storage_account_name = "${azurerm_storage_account.logs.name}"
  container_access_type = "private"
}

# Lifecycle management policy for logs storage account
resource "azurerm_storage_management_policy" "logs" {
  storage_account_id = "${azurerm_storage_account.logs.id}"
  
  rule {
    name    = "access-logs-lifecycle"
    enabled = true
    filters {
      prefix_match = ["access-logs/"]
      blob_types   = ["blockBlob"]
    }
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 30
        tier_to_archive_after_days_since_modification_greater_than = 90
        delete_after_days_since_modification_greater_than          = 365
      }
    }
  }
  
  rule {
    name    = "audit-logs-lifecycle"
    enabled = true
    filters {
      prefix_match = ["audit-logs/"]
      blob_types   = ["blockBlob"]
    }
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 30
        tier_to_archive_after_days_since_modification_greater_than = 90
        delete_after_days_since_modification_greater_than          = 2555
      }
    }
  }
}

# Create private endpoints for storage accounts for secure access
resource "azurerm_private_endpoint" "primary_blob" {
  name                = "pe-${azurerm_storage_account.primary.name}-blob"
  resource_group_name = "${azurerm_resource_group.main.name}"
  location            = "${var.location}"
  subnet_id           = "${module.networking.subnet_ids["app"]}"

  private_service_connection {
    name                           = "psc-${azurerm_storage_account.primary.name}-blob"
    is_manual_connection           = false
    private_connection_resource_id = "${azurerm_storage_account.primary.id}"
    subresource_names              = ["blob"]
  }
  
  tags = {
    Environment = "${var.environment}"
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

resource "azurerm_private_endpoint" "backup_blob" {
  name                = "pe-${azurerm_storage_account.backup.name}-blob"
  resource_group_name = "${azurerm_resource_group.main.name}"
  location            = "${var.location}"
  subnet_id           = "${module.networking.subnet_ids["app"]}"

  private_service_connection {
    name                           = "psc-${azurerm_storage_account.backup.name}-blob"
    is_manual_connection           = false
    private_connection_resource_id = "${azurerm_storage_account.backup.id}"
    subresource_names              = ["blob"]
  }
  
  tags = {
    Environment = "${var.environment}"
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

resource "azurerm_private_endpoint" "archive_blob" {
  name                = "pe-${azurerm_storage_account.archive.name}-blob"
  resource_group_name = "${azurerm_resource_group.main.name}"
  location            = "${var.location}"
  subnet_id           = "${module.networking.subnet_ids["app"]}"

  private_service_connection {
    name                           = "psc-${azurerm_storage_account.archive.name}-blob"
    is_manual_connection           = false
    private_connection_resource_id = "${azurerm_storage_account.archive.id}"
    subresource_names              = ["blob"]
  }
  
  tags = {
    Environment = "${var.environment}"
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

resource "azurerm_private_endpoint" "logs_blob" {
  name                = "pe-${azurerm_storage_account.logs.name}-blob"
  resource_group_name = "${azurerm_resource_group.main.name}"
  location            = "${var.location}"
  subnet_id           = "${module.networking.subnet_ids["app"]}"

  private_service_connection {
    name                           = "psc-${azurerm_storage_account.logs.name}-blob"
    is_manual_connection           = false
    private_connection_resource_id = "${azurerm_storage_account.logs.id}"
    subresource_names              = ["blob"]
  }
  
  tags = {
    Environment = "${var.environment}"
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Outputs
output "primary_storage_account_name" {
  description = "The name of the primary Azure Storage Account"
  value       = "${azurerm_storage_account.primary.name}"
}

output "primary_storage_account_id" {
  description = "The ID of the primary Azure Storage Account"
  value       = "${azurerm_storage_account.primary.id}"
}

output "backup_storage_account_name" {
  description = "The name of the Azure Storage Account for database backups"
  value       = "${azurerm_storage_account.backup.name}"
}

output "backup_storage_account_id" {
  description = "The ID of the Azure Storage Account for database backups"
  value       = "${azurerm_storage_account.backup.id}"
}

output "archive_storage_account_name" {
  description = "The name of the Azure Storage Account for long-term data archives"
  value       = "${azurerm_storage_account.archive.name}"
}

output "archive_storage_account_id" {
  description = "The ID of the Azure Storage Account for long-term data archives"
  value       = "${azurerm_storage_account.archive.id}"
}

output "log_storage_account_name" {
  description = "The name of the Azure Storage Account for access logs and audit logs"
  value       = "${azurerm_storage_account.logs.name}"
}

output "log_storage_account_id" {
  description = "The ID of the Azure Storage Account for access logs and audit logs"
  value       = "${azurerm_storage_account.logs.id}"
}

output "storage_cmk_id" {
  description = "The ID of the customer-managed key used for storage encryption"
  value       = "${azurerm_key_vault_key.storage_cmk.id}"
}