# Azure database infrastructure for the Inventory Management System (IMS)
# This file provisions and configures various database services including
# PostgreSQL, TimescaleDB, Redis Cache, Cosmos DB with Cassandra API, and
# Event Hubs to support the high-throughput, low-latency data processing
# requirements of the IMS.

locals {
  common_tags = {
    Project     = "IMS"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# --------------------------------------------------
# Random Passwords for Database Services
# --------------------------------------------------
resource "random_password" "postgresql_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_numeric      = 2
  min_upper        = 2
  min_lower        = 2
  min_special      = 2
}

resource "random_password" "timescaledb_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_numeric      = 2
  min_upper        = 2
  min_lower        = 2
  min_special      = 2
}

resource "random_password" "redis_password" {
  length      = 32
  special     = false
  min_numeric = 5
  min_upper   = 5
  min_lower   = 5
}

resource "random_password" "cassandra_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_numeric      = 2
  min_upper        = 2
  min_lower        = 2
  min_special      = 2
}

# --------------------------------------------------
# PostgreSQL Flexible Server (for Reference Data)
# --------------------------------------------------
module "postgresql" {
  source = "../modules/database"

  resource_group_name    = azurerm_resource_group.main.name
  location               = var.location
  environment            = var.environment
  cloud_provider         = "azure"
  server_name            = "ims-${var.environment}-postgres"
  database_name          = "ims_${var.environment}"
  subnet_id              = lookup(module.networking.subnet_ids, "database", null)
  sku_name               = var.db_sku_name
  storage_mb             = var.db_storage_mb
  backup_retention_days  = var.db_backup_retention_days
  geo_redundant_backup   = var.db_geo_redundant_backup
  administrator_login    = var.db_admin_username
  administrator_password = random_password.postgresql_password.result
  tags                   = local.common_tags
}

# --------------------------------------------------
# TimescaleDB (for Time-Series Data)
# --------------------------------------------------
resource "azurerm_postgresql_flexible_server" "timescaledb" {
  name                         = "ims-${var.environment}-timescaledb"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = var.location
  version                      = "15"
  administrator_login          = var.db_admin_username
  administrator_password       = random_password.timescaledb_password.result
  storage_mb                   = var.db_storage_mb * 2
  sku_name                     = "GP_Standard_D16s_v3"
  backup_retention_days        = var.db_backup_retention_days
  geo_redundant_backup_enabled = var.db_geo_redundant_backup
  delegated_subnet_id          = lookup(module.networking.subnet_ids, "database", null)
  private_dns_zone_id          = lookup(module.networking.private_dns_zone_ids, "postgres", null)
  
  high_availability {
    mode = "ZoneRedundant"
  }
  
  maintenance_window {
    day_of_week  = 0
    start_hour   = 3
    start_minute = 0
  }
  
  tags = local.common_tags
}

resource "azurerm_postgresql_flexible_server_database" "timescaledb_database" {
  name      = "ims_timeseries"
  server_id = azurerm_postgresql_flexible_server.timescaledb.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_configuration" "timescaledb_extension" {
  name      = "shared_preload_libraries"
  server_id = azurerm_postgresql_flexible_server.timescaledb.id
  value     = "timescaledb"
}

resource "azurerm_postgresql_flexible_server_configuration" "timescaledb_max_connections" {
  name      = "max_connections"
  server_id = azurerm_postgresql_flexible_server.timescaledb.id
  value     = "1000"
}

resource "azurerm_postgresql_flexible_server_configuration" "timescaledb_shared_buffers" {
  name      = "shared_buffers"
  server_id = azurerm_postgresql_flexible_server.timescaledb.id
  value     = "16GB"
}

# --------------------------------------------------
# Redis Cache (for Caching and Pub/Sub)
# --------------------------------------------------
module "redis" {
  source = "../modules/database"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  cloud_provider      = "azure"
  subnet_id           = lookup(module.networking.subnet_ids, "cache", null)
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku_name
  redis_password      = random_password.redis_password.result
  tags                = local.common_tags
}

# --------------------------------------------------
# Cosmos DB with Cassandra API (for Position Data)
# --------------------------------------------------
resource "azurerm_cosmosdb_account" "cassandra" {
  name                      = "ims-${var.environment}-cassandra"
  resource_group_name       = azurerm_resource_group.main.name
  location                  = var.location
  offer_type                = "Standard"
  kind                      = "GlobalDocumentDB"
  enable_automatic_failover = true
  
  capabilities {
    name = "EnableCassandra"
  }
  
  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }
  
  geo_location {
    location          = var.location
    failover_priority = 0
  }
  
  geo_location {
    location          = var.location == "eastus" ? "westus" : "eastus"
    failover_priority = 1
  }
  
  is_virtual_network_filter_enabled = true
  
  virtual_network_rule {
    id = lookup(module.networking.subnet_ids, "database", null)
  }
  
  virtual_network_rule {
    id = lookup(module.networking.subnet_ids, "aks", null)
  }
  
  backup {
    type                = "Periodic"
    interval_in_minutes = 240
    retention_in_hours  = 8
    storage_redundancy  = "Geo"
  }
  
  tags = local.common_tags
}

resource "azurerm_cosmosdb_cassandra_keyspace" "ims_keyspace" {
  name                = "ims_${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.cassandra.name
  throughput          = 4000
}

resource "azurerm_cosmosdb_cassandra_table" "positions" {
  name                = "positions"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.cassandra.name
  keyspace_name       = azurerm_cosmosdb_cassandra_keyspace.ims_keyspace.name
  
  schema {
    column {
      name = "book_id"
      type = "text"
    }
    
    column {
      name = "security_id"
      type = "text"
    }
    
    column {
      name = "business_date"
      type = "date"
    }
    
    column {
      name = "contractual_qty"
      type = "decimal"
    }
    
    column {
      name = "settled_qty"
      type = "decimal"
    }
    
    column {
      name = "sd0_deliver"
      type = "decimal"
    }
    
    column {
      name = "sd0_receipt"
      type = "decimal"
    }
    
    column {
      name = "sd1_deliver"
      type = "decimal"
    }
    
    column {
      name = "sd1_receipt"
      type = "decimal"
    }
    
    column {
      name = "sd2_deliver"
      type = "decimal"
    }
    
    column {
      name = "sd2_receipt"
      type = "decimal"
    }
    
    column {
      name = "sd3_deliver"
      type = "decimal"
    }
    
    column {
      name = "sd3_receipt"
      type = "decimal"
    }
    
    column {
      name = "sd4_deliver"
      type = "decimal"
    }
    
    column {
      name = "sd4_receipt"
      type = "decimal"
    }
    
    column {
      name = "updated_at"
      type = "timestamp"
    }
    
    partition_key {
      name = "book_id"
    }
    
    partition_key {
      name = "security_id"
    }
    
    partition_key {
      name = "business_date"
    }
  }
  
  throughput = 4000
}

resource "azurerm_cosmosdb_cassandra_table" "inventory" {
  name                = "inventory"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.cassandra.name
  keyspace_name       = azurerm_cosmosdb_cassandra_keyspace.ims_keyspace.name
  
  schema {
    column {
      name = "security_id"
      type = "text"
    }
    
    column {
      name = "business_date"
      type = "date"
    }
    
    column {
      name = "calculation_type"
      type = "text"
    }
    
    column {
      name = "available_quantity"
      type = "decimal"
    }
    
    column {
      name = "updated_at"
      type = "timestamp"
    }
    
    partition_key {
      name = "security_id"
    }
    
    partition_key {
      name = "business_date"
    }
    
    partition_key {
      name = "calculation_type"
    }
  }
  
  throughput = 4000
}

# --------------------------------------------------
# Event Hubs (for Messaging)
# --------------------------------------------------
module "event_hubs" {
  source = "../modules/event_hubs"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  namespace_name      = "ims-${var.environment}-eventhubs"
  sku                 = "Standard"
  capacity            = var.eventhub_capacity
  event_hubs_config   = var.event_hubs_config
  subnet_id           = lookup(module.networking.subnet_ids, "app", null)
  tags                = local.common_tags
}

# --------------------------------------------------
# Store Credentials in Key Vault
# --------------------------------------------------
resource "azurerm_key_vault_secret" "postgresql_password" {
  name            = "postgresql-password"
  value           = random_password.postgresql_password.result
  key_vault_id    = module.key_vault.id
  content_type    = "text/plain"
  expiration_date = timeadd(timestamp(), "8760h")  # 1 year
}

resource "azurerm_key_vault_secret" "timescaledb_password" {
  name            = "timescaledb-password"
  value           = random_password.timescaledb_password.result
  key_vault_id    = module.key_vault.id
  content_type    = "text/plain"
  expiration_date = timeadd(timestamp(), "8760h")  # 1 year
}

resource "azurerm_key_vault_secret" "redis_password" {
  name            = "redis-password"
  value           = random_password.redis_password.result
  key_vault_id    = module.key_vault.id
  content_type    = "text/plain"
  expiration_date = timeadd(timestamp(), "8760h")  # 1 year
}

resource "azurerm_key_vault_secret" "cassandra_password" {
  name            = "cassandra-password"
  value           = random_password.cassandra_password.result
  key_vault_id    = module.key_vault.id
  content_type    = "text/plain"
  expiration_date = timeadd(timestamp(), "8760h")  # 1 year
}

resource "azurerm_key_vault_secret" "eventhub_connection_string" {
  name            = "eventhub-connection-string"
  value           = module.event_hubs.connection_string
  key_vault_id    = module.key_vault.id
  content_type    = "text/plain"
  expiration_date = timeadd(timestamp(), "8760h")  # 1 year
}

# --------------------------------------------------
# Outputs
# --------------------------------------------------
output "postgresql_server_name" {
  description = "The name of the PostgreSQL server"
  value       = module.postgresql.server_name
}

output "postgresql_server_fqdn" {
  description = "The FQDN of the PostgreSQL server"
  value       = module.postgresql.server_fqdn
}

output "timescaledb_server_name" {
  description = "The name of the TimescaleDB server"
  value       = azurerm_postgresql_flexible_server.timescaledb.name
}

output "timescaledb_server_fqdn" {
  description = "The FQDN of the TimescaleDB server"
  value       = azurerm_postgresql_flexible_server.timescaledb.fqdn
}

output "redis_name" {
  description = "The name of the Redis cache"
  value       = module.redis.name
}

output "redis_hostname" {
  description = "The hostname of the Redis cache"
  value       = module.redis.hostname
}

output "redis_primary_connection_string" {
  description = "The primary connection string for the Redis cache"
  value       = module.redis.primary_connection_string
  sensitive   = true
}

output "cassandra_account_name" {
  description = "The name of the Cosmos DB account with Cassandra API"
  value       = azurerm_cosmosdb_account.cassandra.name
}

output "cassandra_endpoint" {
  description = "The endpoint of the Cosmos DB account with Cassandra API"
  value       = azurerm_cosmosdb_account.cassandra.endpoint
}

output "eventhub_namespace_name" {
  description = "The name of the Event Hubs namespace"
  value       = module.event_hubs.namespace_name
}

output "eventhub_connection_string" {
  description = "The connection string for the Event Hubs namespace"
  value       = module.event_hubs.connection_string
  sensitive   = true
}