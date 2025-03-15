# Azure networking infrastructure for the Inventory Management System
# This file defines all networking components to support the high-throughput,
# globally distributed architecture required for the system.

locals {
  common_tags = {
    Project     = "IMS"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Main virtual network for the IMS application
resource "azurerm_virtual_network" "main" {
  name                = "ims-${var.environment}-vnet"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  address_space       = var.vnet_address_space
  tags = {
    Name        = "ims-${var.environment}-vnet"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Subnets for different components of the IMS application
resource "azurerm_subnet" "subnets" {
  count                = length(var.subnet_names)
  name                 = "ims-${var.environment}-${var.subnet_names[count.index]}-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.subnet_prefixes[var.subnet_names[count.index]]]
  
  # Service endpoints for Azure services
  service_endpoints = [
    "Microsoft.Sql",
    "Microsoft.Storage",
    "Microsoft.EventHub",
    "Microsoft.AzureCosmosDB",
    "Microsoft.KeyVault"
  ]
  
  # Database subnet delegation for PostgreSQL Flexible Server
  dynamic "delegation" {
    for_each = var.subnet_names[count.index] == "database" ? [1] : []
    content {
      name = "fs"
      service_delegation {
        name    = "Microsoft.DBforPostgreSQL/flexibleServers"
        actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
      }
    }
  }
}

# Network security group for AKS subnet
resource "azurerm_network_security_group" "aks" {
  name                = "ims-${var.environment}-aks-nsg"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  tags = {
    Name        = "ims-${var.environment}-aks-nsg"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Allow inbound traffic to AKS API server and services
resource "azurerm_network_security_rule" "aks_inbound" {
  name                        = "ims-${var.environment}-aks-inbound"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.aks.name
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_ranges     = ["443", "9000-9999"]
  source_address_prefix       = var.admin_cidr_blocks
  destination_address_prefix  = "*"
}

# Allow all outbound traffic from AKS
resource "azurerm_network_security_rule" "aks_outbound" {
  name                        = "ims-${var.environment}-aks-outbound"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.aks.name
  priority                    = 100
  direction                   = "Outbound"
  access                      = "Allow"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
}

# Network security group for database subnet
resource "azurerm_network_security_group" "database" {
  name                = "ims-${var.environment}-database-nsg"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  tags = {
    Name        = "ims-${var.environment}-database-nsg"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Allow PostgreSQL traffic from application subnets
resource "azurerm_network_security_rule" "postgres_inbound" {
  name                        = "ims-${var.environment}-postgres-inbound"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.database.name
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "5432"
  source_address_prefixes     = [var.subnet_prefixes["aks"], var.subnet_prefixes["app"]]
  destination_address_prefix  = var.subnet_prefixes["database"]
}

# Deny all other inbound traffic to database subnet
resource "azurerm_network_security_rule" "database_deny_inbound" {
  name                        = "ims-${var.environment}-database-deny-inbound"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.database.name
  priority                    = 4096
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
}

# Network security group for cache subnet
resource "azurerm_network_security_group" "cache" {
  name                = "ims-${var.environment}-cache-nsg"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  tags = {
    Name        = "ims-${var.environment}-cache-nsg"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Allow Redis traffic from application subnets
resource "azurerm_network_security_rule" "redis_inbound" {
  name                        = "ims-${var.environment}-redis-inbound"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.cache.name
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "6379"
  source_address_prefixes     = [var.subnet_prefixes["aks"], var.subnet_prefixes["app"]]
  destination_address_prefix  = var.subnet_prefixes["cache"]
}

# Deny all other inbound traffic to cache subnet
resource "azurerm_network_security_rule" "cache_deny_inbound" {
  name                        = "ims-${var.environment}-cache-deny-inbound"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.cache.name
  priority                    = 4096
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
}

# Network security group for application subnet
resource "azurerm_network_security_group" "app" {
  name                = "ims-${var.environment}-app-nsg"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  tags = {
    Name        = "ims-${var.environment}-app-nsg"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Allow HTTP/HTTPS traffic from gateway subnet
resource "azurerm_network_security_rule" "app_inbound" {
  name                        = "ims-${var.environment}-app-inbound"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.app.name
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_ranges     = ["8080", "8443"]
  source_address_prefix       = var.subnet_prefixes["gateway"]
  destination_address_prefix  = var.subnet_prefixes["app"]
}

# Network security group for gateway subnet
resource "azurerm_network_security_group" "gateway" {
  name                = "ims-${var.environment}-gateway-nsg"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  tags = {
    Name        = "ims-${var.environment}-gateway-nsg"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Allow HTTP/HTTPS traffic to gateway subnet
resource "azurerm_network_security_rule" "gateway_inbound" {
  name                        = "ims-${var.environment}-gateway-inbound"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.gateway.name
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_ranges     = ["80", "443"]
  source_address_prefix       = "*"
  destination_address_prefix  = var.subnet_prefixes["gateway"]
}

# Associate AKS subnet with AKS NSG
resource "azurerm_subnet_network_security_group_association" "aks" {
  subnet_id                 = azurerm_subnet.subnets[index(var.subnet_names, "aks")].id
  network_security_group_id = azurerm_network_security_group.aks.id
}

# Associate database subnet with database NSG
resource "azurerm_subnet_network_security_group_association" "database" {
  subnet_id                 = azurerm_subnet.subnets[index(var.subnet_names, "database")].id
  network_security_group_id = azurerm_network_security_group.database.id
}

# Associate cache subnet with cache NSG
resource "azurerm_subnet_network_security_group_association" "cache" {
  subnet_id                 = azurerm_subnet.subnets[index(var.subnet_names, "cache")].id
  network_security_group_id = azurerm_network_security_group.cache.id
}

# Associate app subnet with app NSG
resource "azurerm_subnet_network_security_group_association" "app" {
  subnet_id                 = azurerm_subnet.subnets[index(var.subnet_names, "app")].id
  network_security_group_id = azurerm_network_security_group.app.id
}

# Associate gateway subnet with gateway NSG
resource "azurerm_subnet_network_security_group_association" "gateway" {
  subnet_id                 = azurerm_subnet.subnets[index(var.subnet_names, "gateway")].id
  network_security_group_id = azurerm_network_security_group.gateway.id
}

# Route table for controlling network traffic
resource "azurerm_route_table" "main" {
  name                          = "ims-${var.environment}-route-table"
  resource_group_name           = azurerm_resource_group.main.name
  location                      = var.location
  disable_bgp_route_propagation = false
  tags = {
    Name        = "ims-${var.environment}-route-table"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Default route to internet
resource "azurerm_route" "internet" {
  name                = "ims-${var.environment}-internet-route"
  resource_group_name = azurerm_resource_group.main.name
  route_table_name    = azurerm_route_table.main.name
  address_prefix      = "0.0.0.0/0"
  next_hop_type       = "Internet"
}

# Associate subnets with route table
resource "azurerm_subnet_route_table_association" "associations" {
  count          = length(var.subnet_names)
  subnet_id      = azurerm_subnet.subnets[count.index].id
  route_table_id = azurerm_route_table.main.id
}

# Network watcher for monitoring network traffic
resource "azurerm_network_watcher" "main" {
  name                = "ims-${var.environment}-network-watcher"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  tags = {
    Name        = "ims-${var.environment}-network-watcher"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Flow logs for network traffic analysis
resource "azurerm_network_watcher_flow_log" "main" {
  network_watcher_name      = azurerm_network_watcher.main.name
  resource_group_name       = azurerm_resource_group.main.name
  network_security_group_id = azurerm_network_security_group.aks.id
  storage_account_id        = azurerm_storage_account.flow_logs.id
  enabled                   = true
  
  retention_policy {
    enabled = true
    days    = 90
  }
  
  traffic_analytics {
    enabled               = true
    workspace_id          = azurerm_log_analytics_workspace.main.workspace_id
    workspace_region      = var.location
    workspace_resource_id = azurerm_log_analytics_workspace.main.id
    interval_in_minutes   = 10
  }
}

# Storage account for network flow logs
resource "azurerm_storage_account" "flow_logs" {
  name                     = "ims${var.environment}flowlogs"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags = {
    Name        = "ims-${var.environment}-flow-logs"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Log analytics workspace for network monitoring
resource "azurerm_log_analytics_workspace" "main" {
  name                = "ims-${var.environment}-logs"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  sku                 = "PerGB2018"
  retention_in_days   = 90
  tags = {
    Name        = "ims-${var.environment}-logs"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Private DNS zone for PostgreSQL
resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name
  tags = {
    Name        = "ims-${var.environment}-postgres-dns"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Link private DNS zone to virtual network
resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "ims-${var.environment}-postgres-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.main.id
  registration_enabled  = false
  tags = {
    Name        = "ims-${var.environment}-postgres-link"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Private DNS zone for Redis
resource "azurerm_private_dns_zone" "redis" {
  name                = "privatelink.redis.cache.windows.net"
  resource_group_name = azurerm_resource_group.main.name
  tags = {
    Name        = "ims-${var.environment}-redis-dns"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Link private DNS zone to virtual network
resource "azurerm_private_dns_zone_virtual_network_link" "redis" {
  name                  = "ims-${var.environment}-redis-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.redis.name
  virtual_network_id    = azurerm_virtual_network.main.id
  registration_enabled  = false
  tags = {
    Name        = "ims-${var.environment}-redis-link"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Private DNS zone for Event Hubs
resource "azurerm_private_dns_zone" "eventhub" {
  name                = "privatelink.servicebus.windows.net"
  resource_group_name = azurerm_resource_group.main.name
  tags = {
    Name        = "ims-${var.environment}-eventhub-dns"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Link private DNS zone to virtual network
resource "azurerm_private_dns_zone_virtual_network_link" "eventhub" {
  name                  = "ims-${var.environment}-eventhub-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.eventhub.name
  virtual_network_id    = azurerm_virtual_network.main.id
  registration_enabled  = false
  tags = {
    Name        = "ims-${var.environment}-eventhub-link"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Outputs
output "vnet_id" {
  description = "The ID of the virtual network"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "The name of the virtual network"
  value       = azurerm_virtual_network.main.name
}

output "subnet_ids" {
  description = "Map of subnet names to subnet IDs"
  value       = {for i, name in var.subnet_names : name => azurerm_subnet.subnets[i].id}
}

output "network_security_group_ids" {
  description = "Map of NSG names to NSG IDs"
  value       = {
    "aks"      = azurerm_network_security_group.aks.id
    "database" = azurerm_network_security_group.database.id
    "cache"    = azurerm_network_security_group.cache.id
    "app"      = azurerm_network_security_group.app.id
    "gateway"  = azurerm_network_security_group.gateway.id
  }
}

output "route_table_ids" {
  description = "Map of route table names to route table IDs"
  value       = {
    "main" = azurerm_route_table.main.id
  }
}

output "private_dns_zone_ids" {
  description = "Map of private DNS zone names to zone IDs"
  value       = {
    "postgres" = azurerm_private_dns_zone.postgres.id
    "redis"    = azurerm_private_dns_zone.redis.id
    "eventhub" = azurerm_private_dns_zone.eventhub.id
  }
}