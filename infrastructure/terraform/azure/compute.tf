# Azure compute infrastructure for the Inventory Management System (IMS)
# This file defines the AKS clusters, virtual machines for specialized workloads,
# and related compute resources to support the high-throughput, low-latency requirements.

locals {
  common_tags = {
    Project     = "IMS"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
  subnet_ids = var.subnet_ids
  app_nsg_id = var.app_nsg_id
}

# Log Analytics Workspace for AKS monitoring
resource "azurerm_log_analytics_workspace" "main" {
  name                = "ims-${var.environment}-logs"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags = {
    Environment = var.environment
    Project     = "IMS",
    ManagedBy   = "Terraform"
  }
}

# AKS cluster for running containerized IMS services
resource "azurerm_kubernetes_cluster" "main" {
  name                = "ims-${var.environment}-aks"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "ims-${var.environment}"
  kubernetes_version  = var.kubernetes_version
  sku_tier            = "Standard"

  # System node pool for Kubernetes system components
  default_node_pool {
    name                = "system"
    vm_size             = "Standard_D4s_v3"
    node_count          = 3
    max_pods            = 30
    os_disk_size_gb     = 100
    vnet_subnet_id      = local.subnet_ids.aks
    enable_auto_scaling = true
    min_count           = 3
    max_count           = 5
    availability_zones  = [1, 2, 3]
    type                = "VirtualMachineScaleSets"
    node_labels = {
      role = "system"
    }
    tags = {
      Environment = var.environment
      Project     = "IMS"
      ManagedBy   = "Terraform"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin     = "azure"
    network_policy     = "calico"
    load_balancer_sku  = "standard"
    service_cidr       = "10.0.0.0/16"
    dns_service_ip     = "10.0.0.10"
    docker_bridge_cidr = "172.17.0.1/16"
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  azure_policy_enabled = true

  azure_active_directory_role_based_access_control {
    managed                = true
    admin_group_object_ids = [var.aks_admin_group_id]
  }

  tags = {
    Name        = "ims-${var.environment}-aks"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Application node pool for general application services
resource "azurerm_kubernetes_cluster_node_pool" "app" {
  name                  = "app"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.aks_node_pools.app.vm_size
  node_count            = var.aks_node_pools.app.node_count
  max_pods              = 30
  os_disk_size_gb       = var.aks_node_pools.app.os_disk_size_gb
  vnet_subnet_id        = local.subnet_ids.aks
  enable_auto_scaling   = var.aks_node_pools.app.auto_scaling
  min_count             = var.aks_node_pools.app.min_count
  max_count             = var.aks_node_pools.app.max_count
  availability_zones    = [1, 2, 3]
  node_labels = {
    role = "app"
  }
  tags = {
    Name        = "ims-${var.environment}-app-nodes"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Calculation node pool for intensive computation workloads
resource "azurerm_kubernetes_cluster_node_pool" "calculation" {
  name                  = "calculation"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.aks_node_pools.calculation.vm_size
  node_count            = var.aks_node_pools.calculation.node_count
  max_pods              = 30
  os_disk_size_gb       = var.aks_node_pools.calculation.os_disk_size_gb
  vnet_subnet_id        = local.subnet_ids.aks
  enable_auto_scaling   = var.aks_node_pools.calculation.auto_scaling
  min_count             = var.aks_node_pools.calculation.min_count
  max_count             = var.aks_node_pools.calculation.max_count
  availability_zones    = [1, 2, 3]
  node_labels = {
    role = "calculation"
  }
  node_taints = ["dedicated=calculation:NoSchedule"]
  tags = {
    Name        = "ims-${var.environment}-calculation-nodes"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Data node pool for data processing workloads
resource "azurerm_kubernetes_cluster_node_pool" "data" {
  name                  = "data"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.aks_node_pools.data.vm_size
  node_count            = var.aks_node_pools.data.node_count
  max_pods              = 30
  os_disk_size_gb       = var.aks_node_pools.data.os_disk_size_gb
  vnet_subnet_id        = local.subnet_ids.aks
  enable_auto_scaling   = var.aks_node_pools.data.auto_scaling
  min_count             = var.aks_node_pools.data.min_count
  max_count             = var.aks_node_pools.data.max_count
  availability_zones    = [1, 2, 3]
  node_labels = {
    role = "data"
  }
  node_taints = ["dedicated=data:NoSchedule"]
  tags = {
    Name        = "ims-${var.environment}-data-nodes"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Virtual Machine Scale Set for Cassandra cluster
resource "azurerm_linux_virtual_machine_scale_set" "cassandra" {
  name                = "ims-${var.environment}-cassandra-vmss"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  sku                 = "Standard_E8s_v3"
  instances           = var.cassandra_node_count
  admin_username      = "azureadmin"
  
  admin_ssh_key {
    username   = "azureadmin"
    public_key = file(var.ssh_public_key_path)
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "UbuntuServer"
    sku       = "18.04-LTS"
    version   = "latest"
  }

  os_disk {
    storage_account_type = "Premium_LRS"
    caching              = "ReadWrite"
    disk_size_gb         = 100
  }

  data_disk {
    lun                  = 0
    caching              = "ReadOnly"
    create_option        = "Empty"
    disk_size_gb         = 1000
    storage_account_type = "Premium_LRS"
  }

  network_interface {
    name    = "cassandra-nic"
    primary = true

    ip_configuration {
      name                          = "internal"
      primary                       = true
      subnet_id                     = local.subnet_ids.app
      application_security_group_ids = [local.app_nsg_id]
    }
  }

  custom_data = base64encode(templatefile("${path.module}/templates/cassandra-cloud-init.yaml", {
      cluster_name = "ims-${var.environment}-cassandra"
      environment = var.environment
    }))

  identity {
    type = "SystemAssigned"
  }

  zone_balance = true
  zones        = [1, 2, 3]

  tags = {
    Name        = "ims-${var.environment}-cassandra"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Virtual Machine Scale Set for InfluxDB
resource "azurerm_linux_virtual_machine_scale_set" "influxdb" {
  name                = "ims-${var.environment}-influxdb-vmss"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  sku                 = "Standard_E8s_v3"
  instances           = var.influxdb_node_count
  admin_username      = "azureadmin"
  
  admin_ssh_key {
    username   = "azureadmin"
    public_key = file(var.ssh_public_key_path)
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "UbuntuServer"
    sku       = "18.04-LTS"
    version   = "latest"
  }

  os_disk {
    storage_account_type = "Premium_LRS"
    caching              = "ReadWrite"
    disk_size_gb         = 100
  }

  data_disk {
    lun                  = 0
    caching              = "ReadOnly"
    create_option        = "Empty"
    disk_size_gb         = 500
    storage_account_type = "Premium_LRS"
  }

  network_interface {
    name    = "influxdb-nic"
    primary = true

    ip_configuration {
      name                          = "internal"
      primary                       = true
      subnet_id                     = local.subnet_ids.app
      application_security_group_ids = [local.app_nsg_id]
    }
  }

  custom_data = base64encode(templatefile("${path.module}/templates/influxdb-cloud-init.yaml", {
      cluster_name = "ims-${var.environment}-influxdb"
      environment = var.environment
    }))

  identity {
    type = "SystemAssigned"
  }

  zone_balance = true
  zones        = [1, 2, 3]

  tags = {
    Name        = "ims-${var.environment}-influxdb"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Assign Reader role to Cassandra VMSS for discovery
resource "azurerm_role_assignment" "cassandra_vmss_reader" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Reader"
  principal_id         = azurerm_linux_virtual_machine_scale_set.cassandra.identity[0].principal_id
}

# Assign Reader role to InfluxDB VMSS for discovery
resource "azurerm_role_assignment" "influxdb_vmss_reader" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Reader"
  principal_id         = azurerm_linux_virtual_machine_scale_set.influxdb.identity[0].principal_id
}

# Data source to fetch AKS cluster for Kubernetes provider configuration
data "azurerm_kubernetes_cluster" "main" {
  name                = azurerm_kubernetes_cluster.main.name
  resource_group_name = azurerm_resource_group.main.name
}

# Outputs
output "aks_cluster_id" {
  description = "The ID of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.id
}

output "aks_cluster_name" {
  description = "The name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.name
}

output "aks_cluster_endpoint" {
  description = "The endpoint for the AKS cluster API server"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].host
}

output "aks_cluster_certificate_authority_data" {
  description = "The certificate authority data for the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate
  sensitive   = true
}

output "aks_node_pools" {
  description = "The AKS node pools"
  value       = {
    app = azurerm_kubernetes_cluster_node_pool.app.id
    calculation = azurerm_kubernetes_cluster_node_pool.calculation.id
    data = azurerm_kubernetes_cluster_node_pool.data.id
  }
}

output "cassandra_vmss_id" {
  description = "The ID of the Cassandra Virtual Machine Scale Set"
  value       = azurerm_linux_virtual_machine_scale_set.cassandra.id
}

output "influxdb_vmss_id" {
  description = "The ID of the InfluxDB Virtual Machine Scale Set"
  value       = azurerm_linux_virtual_machine_scale_set.influxdb.id
}

output "kubeconfig" {
  description = "Kubernetes configuration for connecting to the cluster"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}