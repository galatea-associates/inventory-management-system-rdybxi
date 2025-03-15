terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
  
  backend "azurerm" {
    # These values must be provided via backend configuration when running terraform init
    # terraform init -backend-config="resource_group_name=ims-terraform-state-dev" -backend-config="storage_account_name=imstfstatedev" ...
    container_name = "tfstate"
    key            = "azure/terraform.tfstate"
  }
}

provider "azurerm" {
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}

provider "kubernetes" {
  host                   = module.aks.cluster_endpoint
  client_certificate     = base64decode(module.aks.client_certificate)
  client_key             = base64decode(module.aks.client_key)
  cluster_ca_certificate = base64decode(module.aks.cluster_ca_certificate)
}

data "azurerm_client_config" "current" {}
data "azurerm_subscription" "current" {}

locals {
  common_tags = {
    Project     = "IMS"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
  
  resource_group_name = "ims-${var.environment}"
}

resource "azurerm_resource_group" "main" {
  name     = local.resource_group_name
  location = var.location
  tags     = local.common_tags
}

resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

module "networking" {
  source = "./modules/networking"
  
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  vnet_address_space  = var.vnet_address_space
  subnet_prefixes     = var.subnet_prefixes
  subnet_names        = var.subnet_names
  tags                = local.common_tags
}

module "aks" {
  source = "../modules/kubernetes"
  
  cluster_name              = "ims-${var.environment}-aks"
  kubernetes_version        = var.kubernetes_version
  environment               = var.environment
  region                    = var.location
  cloud_provider            = "azure"
  resource_group_name       = azurerm_resource_group.main.name
  vnet_subnet_id            = module.networking.subnet_ids["aks"]
  node_pools                = var.aks_node_pools
  tags                      = local.common_tags
  enable_cluster_autoscaler = true
  enable_metrics_server     = true
  enable_prometheus         = true
  enable_grafana            = true
  enable_istio              = true
}

module "postgresql" {
  source = "./modules/database"
  
  resource_group_name    = azurerm_resource_group.main.name
  location               = var.location
  environment            = var.environment
  server_name            = "ims-${var.environment}-postgres"
  database_name          = "ims_${var.environment}"
  subnet_id              = module.networking.subnet_ids["database"]
  sku_name               = var.db_sku_name
  storage_mb             = var.db_storage_mb
  backup_retention_days  = var.db_backup_retention_days
  geo_redundant_backup   = var.db_geo_redundant_backup
  administrator_login    = var.db_admin_username
  administrator_password = random_password.db_password.result
  tags                   = local.common_tags
}

module "redis" {
  source = "./modules/redis"
  
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  subnet_id           = module.networking.subnet_ids["cache"]
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku_name
  tags                = local.common_tags
}

module "event_hubs" {
  source = "./modules/event_hubs"
  
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  namespace_name      = "ims-${var.environment}-eventhubs"
  sku                 = "Standard"
  capacity            = var.eventhub_capacity
  event_hubs_config   = var.event_hubs_config
  tags                = local.common_tags
}

module "storage" {
  source = "./modules/storage"
  
  resource_group_name      = azurerm_resource_group.main.name
  location                 = var.location
  environment              = var.environment
  account_name             = "ims${var.environment}storage"
  account_tier             = "Standard"
  account_replication_type = "GRS"
  containers               = var.storage_containers
  lifecycle_rules          = var.storage_lifecycle_rules
  tags                     = local.common_tags
}

module "key_vault" {
  source = "./modules/key_vault"
  
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  tenant_id           = data.azurerm_client_config.current.tenant_id
  object_id           = data.azurerm_client_config.current.object_id
  sku_name            = "standard"
  tags                = local.common_tags
}

module "monitor" {
  source = "./modules/monitoring"
  
  resource_group_name      = azurerm_resource_group.main.name
  location                 = var.location
  environment              = var.environment
  aks_cluster_id           = module.aks.cluster_id
  postgresql_server_id     = module.postgresql.server_id
  redis_id                 = module.redis.id
  event_hubs_namespace_id  = module.event_hubs.namespace_id
  storage_account_id       = module.storage.account_id
  log_retention_days       = var.log_retention_days
  alert_email              = var.alert_email
  tags                     = local.common_tags
}

output "resource_group_name" {
  description = "The name of the Azure Resource Group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "The ID of the Azure Resource Group"
  value       = azurerm_resource_group.main.id
}

output "vnet_id" {
  description = "The ID of the Virtual Network"
  value       = module.networking.vnet_id
}

output "vnet_name" {
  description = "The name of the Virtual Network"
  value       = module.networking.vnet_name
}

output "subnet_ids" {
  description = "Map of subnet names to subnet IDs"
  value       = module.networking.subnet_ids
}

output "aks_cluster_name" {
  description = "Name of the AKS cluster"
  value       = module.aks.cluster_name
}

output "aks_cluster_id" {
  description = "ID of the AKS cluster"
  value       = module.aks.cluster_id
}

output "postgresql_server_name" {
  description = "The name of the PostgreSQL server"
  value       = module.postgresql.server_name
}

output "postgresql_server_fqdn" {
  description = "The FQDN of the PostgreSQL server"
  value       = module.postgresql.server_fqdn
}

output "redis_name" {
  description = "The name of the Redis cache"
  value       = module.redis.name
}

output "redis_hostname" {
  description = "The hostname of the Redis cache"
  value       = module.redis.hostname
}

output "event_hubs_namespace_name" {
  description = "The name of the Event Hubs namespace"
  value       = module.event_hubs.namespace_name
}

output "storage_account_name" {
  description = "The name of the Storage Account"
  value       = module.storage.account_name
}

output "key_vault_id" {
  description = "The ID of the Key Vault"
  value       = module.key_vault.id
}

output "key_vault_uri" {
  description = "The URI of the Key Vault"
  value       = module.key_vault.vault_uri
}

output "subscription_id" {
  description = "The Azure subscription ID"
  value       = data.azurerm_subscription.current.subscription_id
}

output "tenant_id" {
  description = "The Azure tenant ID"
  value       = data.azurerm_client_config.current.tenant_id
}

output "location" {
  description = "The Azure region where resources are deployed"
  value       = var.location
}