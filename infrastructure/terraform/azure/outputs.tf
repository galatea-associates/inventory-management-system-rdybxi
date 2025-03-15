# Outputs for the Azure Infrastructure deployment of the Inventory Management System (IMS)
# This file consolidates outputs from various infrastructure components to provide a unified
# interface for accessing resource identifiers and connection information.

# ------------------------------------------------------
# Resource Group and Subscription Outputs
# ------------------------------------------------------
output "resource_group_name" {
  description = "The name of the Azure Resource Group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "The ID of the Azure Resource Group"
  value       = azurerm_resource_group.main.id
}

output "location" {
  description = "The Azure region where resources are deployed"
  value       = var.location
}

output "subscription_id" {
  description = "The Azure subscription ID"
  value       = data.azurerm_subscription.current.subscription_id
}

output "tenant_id" {
  description = "The Azure tenant ID"
  value       = data.azurerm_client_config.current.tenant_id
}

# ------------------------------------------------------
# Networking Outputs
# ------------------------------------------------------
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

# ------------------------------------------------------
# AKS Cluster Outputs
# ------------------------------------------------------
output "aks_cluster_name" {
  description = "Name of the AKS cluster"
  value       = module.aks.cluster_name
}

output "aks_cluster_id" {
  description = "ID of the AKS cluster"
  value       = module.aks.cluster_id
}

output "aks_cluster_fqdn" {
  description = "FQDN of the AKS cluster"
  value       = module.aks.cluster_fqdn
}

output "aks_node_resource_group" {
  description = "The auto-generated resource group which contains the resources for this managed Kubernetes cluster"
  value       = module.aks.node_resource_group
}

output "aks_kubeconfig" {
  description = "Kubeconfig for accessing the AKS cluster"
  value       = module.aks.kubeconfig
  sensitive   = true
}

# ------------------------------------------------------
# Database Outputs
# ------------------------------------------------------
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
  value       = module.postgresql.timescaledb_server_name
}

output "timescaledb_server_fqdn" {
  description = "The FQDN of the TimescaleDB server"
  value       = module.postgresql.timescaledb_server_fqdn
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
  value       = module.database.cassandra_account_name
}

output "cassandra_endpoint" {
  description = "The endpoint of the Cosmos DB account with Cassandra API"
  value       = module.database.cassandra_endpoint
}

# ------------------------------------------------------
# Event Hub Outputs
# ------------------------------------------------------
output "eventhub_namespace_name" {
  description = "The name of the Event Hubs namespace"
  value       = module.event_hubs.namespace_name
}

output "eventhub_connection_string" {
  description = "The connection string for the Event Hubs namespace"
  value       = module.event_hubs.connection_string
  sensitive   = true
}

# ------------------------------------------------------
# Storage Account Outputs
# ------------------------------------------------------
output "data_storage_account_name" {
  description = "The name of the Storage Account for IMS data"
  value       = module.storage.data_storage_account_name
}

output "backup_storage_account_name" {
  description = "The name of the Storage Account for IMS backups"
  value       = module.storage.backup_storage_account_name
}

output "archive_storage_account_name" {
  description = "The name of the Storage Account for IMS archives"
  value       = module.storage.archive_storage_account_name
}

output "data_storage_primary_blob_endpoint" {
  description = "The primary blob endpoint for the data storage account"
  value       = module.storage.data_storage_primary_blob_endpoint
}

# ------------------------------------------------------
# Security Outputs
# ------------------------------------------------------
output "key_vault_id" {
  description = "The ID of the Key Vault"
  value       = module.key_vault.id
}

output "key_vault_uri" {
  description = "The URI of the Key Vault"
  value       = module.key_vault.vault_uri
}

output "aks_identity_id" {
  description = "The ID of the AKS managed identity"
  value       = module.security.aks_identity_id
}

output "app_identity_id" {
  description = "The ID of the app managed identity"
  value       = module.security.app_identity_id
}

# ------------------------------------------------------
# Monitoring Outputs
# ------------------------------------------------------
output "log_analytics_workspace_id" {
  description = "The ID of the Log Analytics workspace"
  value       = module.monitoring.log_analytics_workspace_id
}

output "application_insights_instrumentation_key" {
  description = "The instrumentation key for Application Insights"
  value       = module.monitoring.application_insights_instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "The connection string for Application Insights"
  value       = module.monitoring.application_insights_connection_string
  sensitive   = true
}

# ------------------------------------------------------
# Additional Infrastructure Outputs
# ------------------------------------------------------
output "container_registry_login_server" {
  description = "The login server URL for the container registry"
  value       = module.compute.container_registry_login_server
}

output "bastion_public_ip" {
  description = "The public IP address of the bastion host"
  value       = module.compute.bastion_public_ip
}

output "app_gateway_ip" {
  description = "The public IP address of the Application Gateway"
  value       = module.compute.app_gateway_ip
}

output "waf_policy_id" {
  description = "The ID of the Web Application Firewall policy"
  value       = module.security.waf_policy_id
}

output "dashboard_ids" {
  description = "The IDs of the Azure dashboards"
  value       = module.monitoring.dashboard_ids
}