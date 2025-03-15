# Azure Security Resources for IMS

# Get current client configuration
data "azurerm_client_config" "current" {}

# Get subnet information for NSG associations
data "azurerm_subnet" "aks" {
  name                 = "aks"
  resource_group_name  = local.resource_group_name
  virtual_network_name = module.networking.vnet_name
}

data "azurerm_subnet" "database" {
  name                 = "database"
  resource_group_name  = local.resource_group_name
  virtual_network_name = module.networking.vnet_name
}

data "azurerm_subnet" "app" {
  name                 = "app"
  resource_group_name  = local.resource_group_name
  virtual_network_name = module.networking.vnet_name
}

data "azurerm_subnet" "gateway" {
  name                 = "gateway"
  resource_group_name  = local.resource_group_name
  virtual_network_name = module.networking.vnet_name
}

# Key Vault
resource "azurerm_key_vault" "ims_key_vault" {
  name                       = "ims-${var.environment}-kv"
  location                   = var.location
  resource_group_name        = local.resource_group_name
  tenant_id                  = var.tenant_id
  sku_name                   = "Premium"
  soft_delete_retention_days = 90
  purge_protection_enabled   = true
  enabled_for_disk_encryption = true
  enabled_for_deployment      = true
  enabled_for_template_deployment = true

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
    ip_rules       = [var.admin_cidr_blocks]
    virtual_network_subnet_ids = [
      data.azurerm_subnet.aks.id,
      data.azurerm_subnet.app.id
    ]
  }

  tags = local.common_tags
}

# Key Vault Access Policies
resource "azurerm_key_vault_access_policy" "terraform_access" {
  key_vault_id = azurerm_key_vault.ims_key_vault.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  key_permissions = [
    "Create", "Delete", "Get", "List", "Purge", "Recover", "Update",
    "GetRotationPolicy", "SetRotationPolicy"
  ]

  secret_permissions = [
    "Set", "Get", "Delete", "List", "Purge", "Recover"
  ]

  certificate_permissions = [
    "Create", "Delete", "Get", "List", "Purge", "Recover", "Update"
  ]

  storage_permissions = [
    "Get", "List", "Set", "Delete", "Purge", "Recover"
  ]
}

resource "azurerm_key_vault_access_policy" "aks_access" {
  key_vault_id = azurerm_key_vault.ims_key_vault.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = module.aks.kubelet_identity_object_id

  key_permissions = [
    "Get", "List"
  ]

  secret_permissions = [
    "Get", "List"
  ]

  certificate_permissions = [
    "Get", "List"
  ]

  storage_permissions = []
}

# Store secrets in Key Vault
resource "azurerm_key_vault_secret" "db_admin_password" {
  name         = "db-admin-password"
  value        = random_password.db_password.result
  key_vault_id = azurerm_key_vault.ims_key_vault.id
  content_type = "password"
  expiration_date = "2025-12-31T23:59:59Z"
  tags = local.common_tags
}

# Generate JWT signing secret
resource "random_password" "jwt_secret" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*()-_=+[]{}<>:?"
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  value        = random_password.jwt_secret.result
  key_vault_id = azurerm_key_vault.ims_key_vault.id
  content_type = "password"
  expiration_date = "2025-12-31T23:59:59Z"
  tags = local.common_tags
}

# Data encryption key
resource "azurerm_key_vault_key" "encryption_key" {
  name         = "data-encryption-key"
  key_vault_id = azurerm_key_vault.ims_key_vault.id
  key_type     = "RSA"
  key_size     = 2048
  key_opts     = ["decrypt", "encrypt", "sign", "verify", "wrapKey", "unwrapKey"]

  rotation_policy {
    automatic {
      time_before_expiry = "P30D"
      time_after_creation = "P90D"
    }
    expire_after = "P180D"
    notify_before_expiry = "P29D"
  }

  tags = local.common_tags
}

# Network Security Groups
resource "azurerm_network_security_group" "aks_nsg" {
  name                = "ims-${var.environment}-aks-nsg"
  location            = var.location
  resource_group_name = local.resource_group_name
  tags                = local.common_tags
}

resource "azurerm_network_security_rule" "aks_allow_api_server" {
  name                        = "AllowAPIServer"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "AzureCloud"
  destination_address_prefix  = "*"
  resource_group_name         = local.resource_group_name
  network_security_group_name = azurerm_network_security_group.aks_nsg.name
}

resource "azurerm_network_security_rule" "aks_allow_admin_access" {
  name                        = "AllowAdminAccess"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = var.admin_cidr_blocks
  destination_address_prefix  = "*"
  resource_group_name         = local.resource_group_name
  network_security_group_name = azurerm_network_security_group.aks_nsg.name
}

resource "azurerm_network_security_rule" "aks_deny_all_inbound" {
  name                        = "DenyAllInbound"
  priority                    = 4096
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = local.resource_group_name
  network_security_group_name = azurerm_network_security_group.aks_nsg.name
}

resource "azurerm_network_security_group" "db_nsg" {
  name                = "ims-${var.environment}-db-nsg"
  location            = var.location
  resource_group_name = local.resource_group_name
  tags                = local.common_tags
}

resource "azurerm_network_security_rule" "db_allow_postgres" {
  name                        = "AllowPostgres"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "5432"
  source_address_prefix       = var.subnet_prefixes.aks
  destination_address_prefix  = "*"
  resource_group_name         = local.resource_group_name
  network_security_group_name = azurerm_network_security_group.db_nsg.name
}

resource "azurerm_network_security_rule" "db_allow_cassandra" {
  name                        = "AllowCassandra"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "9042"
  source_address_prefix       = var.subnet_prefixes.aks
  destination_address_prefix  = "*"
  resource_group_name         = local.resource_group_name
  network_security_group_name = azurerm_network_security_group.db_nsg.name
}

resource "azurerm_network_security_rule" "db_deny_all_inbound" {
  name                        = "DenyAllInbound"
  priority                    = 4096
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = local.resource_group_name
  network_security_group_name = azurerm_network_security_group.db_nsg.name
}

resource "azurerm_network_security_group" "app_nsg" {
  name                = "ims-${var.environment}-app-nsg"
  location            = var.location
  resource_group_name = local.resource_group_name
  tags                = local.common_tags
}

resource "azurerm_network_security_rule" "app_allow_http" {
  name                        = "AllowHTTP"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "80"
  source_address_prefix       = var.subnet_prefixes.gateway
  destination_address_prefix  = "*"
  resource_group_name         = local.resource_group_name
  network_security_group_name = azurerm_network_security_group.app_nsg.name
}

resource "azurerm_network_security_rule" "app_allow_https" {
  name                        = "AllowHTTPS"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = var.subnet_prefixes.gateway
  destination_address_prefix  = "*"
  resource_group_name         = local.resource_group_name
  network_security_group_name = azurerm_network_security_group.app_nsg.name
}

resource "azurerm_network_security_rule" "app_deny_all_inbound" {
  name                        = "DenyAllInbound"
  priority                    = 4096
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = local.resource_group_name
  network_security_group_name = azurerm_network_security_group.app_nsg.name
}

resource "azurerm_network_security_group" "gateway_nsg" {
  name                = "ims-${var.environment}-gateway-nsg"
  location            = var.location
  resource_group_name = local.resource_group_name
  tags                = local.common_tags
}

resource "azurerm_network_security_rule" "gateway_allow_http" {
  name                        = "AllowHTTP"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "80"
  source_address_prefix       = "Internet"
  destination_address_prefix  = "*"
  resource_group_name         = local.resource_group_name
  network_security_group_name = azurerm_network_security_group.gateway_nsg.name
}

resource "azurerm_network_security_rule" "gateway_allow_https" {
  name                        = "AllowHTTPS"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "Internet"
  destination_address_prefix  = "*"
  resource_group_name         = local.resource_group_name
  network_security_group_name = azurerm_network_security_group.gateway_nsg.name
}

resource "azurerm_network_security_rule" "gateway_deny_all_inbound" {
  name                        = "DenyAllInbound"
  priority                    = 4096
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = local.resource_group_name
  network_security_group_name = azurerm_network_security_group.gateway_nsg.name
}

# NSG Association with Subnets
resource "azurerm_subnet_network_security_group_association" "aks_nsg_association" {
  subnet_id                 = data.azurerm_subnet.aks.id
  network_security_group_id = azurerm_network_security_group.aks_nsg.id
}

resource "azurerm_subnet_network_security_group_association" "db_nsg_association" {
  subnet_id                 = data.azurerm_subnet.database.id
  network_security_group_id = azurerm_network_security_group.db_nsg.id
}

resource "azurerm_subnet_network_security_group_association" "app_nsg_association" {
  subnet_id                 = data.azurerm_subnet.app.id
  network_security_group_id = azurerm_network_security_group.app_nsg.id
}

resource "azurerm_subnet_network_security_group_association" "gateway_nsg_association" {
  subnet_id                 = data.azurerm_subnet.gateway.id
  network_security_group_id = azurerm_network_security_group.gateway_nsg.id
}

# Azure Security Center
resource "azurerm_security_center_subscription_pricing" "security_center_vms" {
  tier          = "Standard"
  resource_type = "VirtualMachines"
}

resource "azurerm_security_center_subscription_pricing" "security_center_sql" {
  tier          = "Standard"
  resource_type = "SqlServers"
}

resource "azurerm_security_center_subscription_pricing" "security_center_app_services" {
  tier          = "Standard"
  resource_type = "AppServices"
}

resource "azurerm_security_center_subscription_pricing" "security_center_storage" {
  tier          = "Standard"
  resource_type = "StorageAccounts"
}

resource "azurerm_security_center_subscription_pricing" "security_center_containers" {
  tier          = "Standard"
  resource_type = "Containers"
}

resource "azurerm_security_center_subscription_pricing" "security_center_key_vaults" {
  tier          = "Standard"
  resource_type = "KeyVaults"
}

resource "azurerm_security_center_contact" "security_center_contact" {
  email = var.alert_email
  phone = "+1-555-555-5555"
  alert_notifications = true
  alerts_to_admins    = true
}

resource "azurerm_security_center_setting" "security_center_auto_provisioning" {
  setting_name = "MCAS"
  enabled      = true
}

resource "azurerm_security_center_auto_provisioning" "security_center_auto_provisioning" {
  auto_provision = "On"
}

# Log Analytics for Security Monitoring
resource "azurerm_log_analytics_workspace" "security_analytics" {
  name                = "ims-${var.environment}-security-analytics"
  location            = var.location
  resource_group_name = local.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 90
  tags                = local.common_tags
}

resource "azurerm_log_analytics_solution" "security_analytics_solution" {
  solution_name         = "SecurityInsights"
  workspace_resource_id = azurerm_log_analytics_workspace.security_analytics.id
  workspace_name        = azurerm_log_analytics_workspace.security_analytics.name
  location              = var.location
  resource_group_name   = local.resource_group_name
  
  plan {
    publisher = "Microsoft"
    product   = "OMSGallery/SecurityInsights"
  }
  
  tags = local.common_tags
}

# Diagnostic Settings
resource "azurerm_monitor_diagnostic_setting" "key_vault_diagnostics" {
  name                       = "key-vault-diagnostics"
  target_resource_id         = azurerm_key_vault.ims_key_vault.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.security_analytics.id

  log {
    category = "AuditEvent"
    enabled  = true
    
    retention_policy {
      enabled = true
      days    = 90
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 90
    }
  }
}

resource "azurerm_monitor_diagnostic_setting" "nsg_diagnostics" {
  name                       = "nsg-diagnostics"
  target_resource_id         = azurerm_network_security_group.gateway_nsg.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.security_analytics.id

  log {
    category = "NetworkSecurityGroupEvent"
    enabled  = true
    
    retention_policy {
      enabled = true
      days    = 90
    }
  }

  log {
    category = "NetworkSecurityGroupRuleCounter"
    enabled  = true
    
    retention_policy {
      enabled = true
      days    = 90
    }
  }
}

# Azure AD Integration
resource "azurerm_role_assignment" "aks_admin_role" {
  scope                = module.aks.cluster_id
  role_definition_name = "Azure Kubernetes Service Cluster Admin Role"
  principal_id         = var.aks_admin_group_id
}

# Private Endpoint for Key Vault
resource "azurerm_private_dns_zone" "keyvault_dns" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = local.resource_group_name
  tags                = local.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "keyvault_dns_link" {
  name                  = "keyvault-dns-link"
  resource_group_name   = local.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.keyvault_dns.name
  virtual_network_id    = module.networking.vnet_id
  tags                  = local.common_tags
}

resource "azurerm_private_endpoint" "keyvault_private_endpoint" {
  name                = "ims-${var.environment}-kv-pe"
  location            = var.location
  resource_group_name = local.resource_group_name
  subnet_id           = data.azurerm_subnet.app.id

  private_service_connection {
    name                           = "ims-${var.environment}-kv-psc"
    is_manual_connection           = false
    private_connection_resource_id = azurerm_key_vault.ims_key_vault.id
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name                 = "keyvault-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.keyvault_dns.id]
  }

  tags = local.common_tags
}

# Storage account customer-managed keys
resource "azurerm_storage_account_customer_managed_key" "storage_cmk" {
  storage_account_id = module.storage.account_id
  key_vault_id       = azurerm_key_vault.ims_key_vault.id
  key_name           = azurerm_key_vault_key.encryption_key.name
}

# Outputs
output "key_vault_id" {
  description = "The ID of the Key Vault"
  value       = azurerm_key_vault.ims_key_vault.id
}

output "key_vault_uri" {
  description = "The URI of the Key Vault"
  value       = azurerm_key_vault.ims_key_vault.vault_uri
}

output "encryption_key_id" {
  description = "The ID of the encryption key"
  value       = azurerm_key_vault_key.encryption_key.id
}

output "security_analytics_workspace_id" {
  description = "The ID of the Log Analytics workspace for security analytics"
  value       = azurerm_log_analytics_workspace.security_analytics.id
}

output "network_security_groups" {
  description = "Map of network security group names to IDs"
  value       = {
    aks = azurerm_network_security_group.aks_nsg.id
    database = azurerm_network_security_group.db_nsg.id
    app = azurerm_network_security_group.app_nsg.id
    gateway = azurerm_network_security_group.gateway_nsg.id
  }
}