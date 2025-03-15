# Terraform and provider requirements
terraform {
  required_version = "~> 1.4"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.9"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# Variables
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "region" {
  description = "Region where the Kubernetes cluster will be deployed"
  type        = string
}

variable "cloud_provider" {
  description = "Cloud provider where the Kubernetes cluster will be deployed (aws or azure)"
  type        = string
  validation {
    condition     = contains(["aws", "azure"], var.cloud_provider)
    error_message = "Cloud provider must be one of: aws, azure"
  }
}

variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version to use"
  type        = string
  default     = "1.27"
}

variable "vpc_id" {
  description = "ID of the VPC where the Kubernetes cluster will be deployed (AWS only)"
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = "List of subnet IDs where the Kubernetes cluster will be deployed"
  type        = list(string)
  default     = []
}

variable "resource_group_name" {
  description = "Name of the resource group where the Kubernetes cluster will be deployed (Azure only)"
  type        = string
  default     = ""
}

variable "vnet_id" {
  description = "ID of the virtual network where the Kubernetes cluster will be deployed (Azure only)"
  type        = string
  default     = ""
}

variable "node_pools" {
  description = "Configuration for Kubernetes node pools"
  type        = map(object({}))
  default     = {}
}

variable "enable_cluster_autoscaler" {
  description = "Whether to enable the Kubernetes Cluster Autoscaler"
  type        = bool
  default     = true
}

variable "enable_metrics_server" {
  description = "Whether to enable the Kubernetes Metrics Server"
  type        = bool
  default     = true
}

variable "enable_prometheus" {
  description = "Whether to enable Prometheus for monitoring"
  type        = bool
  default     = true
}

variable "enable_grafana" {
  description = "Whether to enable Grafana for visualization"
  type        = bool
  default     = true
}

variable "enable_istio" {
  description = "Whether to enable Istio service mesh"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Data sources
data "aws_eks_cluster_auth" "cluster" {
  count = var.cloud_provider == "aws" ? 1 : 0
  name  = aws_eks_cluster.eks[0].name
}

data "azurerm_kubernetes_cluster" "cluster" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = azurerm_kubernetes_cluster.aks[0].name
  resource_group_name = var.resource_group_name
}

# Local variables
locals {
  kubeconfig = var.cloud_provider == "aws" ? {
    host                   = aws_eks_cluster.eks[0].endpoint
    cluster_ca_certificate = base64decode(aws_eks_cluster.eks[0].certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster[0].token
  } : {
    host                   = azurerm_kubernetes_cluster.aks[0].kube_config[0].host
    cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.aks[0].kube_config[0].cluster_ca_certificate)
    client_certificate     = base64decode(azurerm_kubernetes_cluster.aks[0].kube_config[0].client_certificate)
    client_key             = base64decode(azurerm_kubernetes_cluster.aks[0].kube_config[0].client_key)
  }
}

# Provider configurations
provider "kubernetes" {
  host                   = local.kubeconfig.host
  cluster_ca_certificate = local.kubeconfig.cluster_ca_certificate
  token                  = var.cloud_provider == "aws" ? local.kubeconfig.token : null
  client_certificate     = var.cloud_provider == "azure" ? local.kubeconfig.client_certificate : null
  client_key             = var.cloud_provider == "azure" ? local.kubeconfig.client_key : null
}

provider "helm" {
  kubernetes {
    host                   = local.kubeconfig.host
    cluster_ca_certificate = local.kubeconfig.cluster_ca_certificate
    token                  = var.cloud_provider == "aws" ? local.kubeconfig.token : null
    client_certificate     = var.cloud_provider == "azure" ? local.kubeconfig.client_certificate : null
    client_key             = var.cloud_provider == "azure" ? local.kubeconfig.client_key : null
  }
}

# AWS Resources
resource "aws_eks_cluster" "eks" {
  count    = var.cloud_provider == "aws" ? 1 : 0
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster[0].arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = [aws_security_group.eks_cluster[0].id]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  tags = merge(var.tags, {
    Name = var.cluster_name
    Environment = var.environment
    ManagedBy = "Terraform"
  })
}

resource "aws_eks_node_group" "app" {
  count           = var.cloud_provider == "aws" ? 1 : 0
  cluster_name    = aws_eks_cluster.eks[0].name
  node_group_name = "${var.cluster_name}-app-nodes"
  node_role_arn   = aws_iam_role.eks_node[0].arn
  subnet_ids      = var.subnet_ids
  instance_types  = lookup(var.node_pools.app, "instance_types", ["m5.4xlarge"])
  disk_size       = lookup(var.node_pools.app, "disk_size", 100)

  scaling_config {
    desired_size = lookup(var.node_pools.app, "desired_size", 3)
    min_size     = lookup(var.node_pools.app, "min_size", 3)
    max_size     = lookup(var.node_pools.app, "max_size", 10)
  }

  labels = lookup(var.node_pools.app, "labels", { role = "app" })

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-app-nodes"
    Environment = var.environment
    ManagedBy = "Terraform"
  })
}

resource "aws_eks_node_group" "calculation" {
  count           = var.cloud_provider == "aws" ? 1 : 0
  cluster_name    = aws_eks_cluster.eks[0].name
  node_group_name = "${var.cluster_name}-calculation-nodes"
  node_role_arn   = aws_iam_role.eks_node[0].arn
  subnet_ids      = var.subnet_ids
  instance_types  = lookup(var.node_pools.calculation, "instance_types", ["c5.9xlarge"])
  disk_size       = lookup(var.node_pools.calculation, "disk_size", 100)

  scaling_config {
    desired_size = lookup(var.node_pools.calculation, "desired_size", 5)
    min_size     = lookup(var.node_pools.calculation, "min_size", 3)
    max_size     = lookup(var.node_pools.calculation, "max_size", 20)
  }

  labels = lookup(var.node_pools.calculation, "labels", { role = "calculation" })
  taints = lookup(var.node_pools.calculation, "taints", [{ key = "dedicated", value = "calculation", effect = "NO_SCHEDULE" }])

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-calculation-nodes"
    Environment = var.environment
    ManagedBy = "Terraform"
  })
}

resource "aws_eks_node_group" "data" {
  count           = var.cloud_provider == "aws" ? 1 : 0
  cluster_name    = aws_eks_cluster.eks[0].name
  node_group_name = "${var.cluster_name}-data-nodes"
  node_role_arn   = aws_iam_role.eks_node[0].arn
  subnet_ids      = var.subnet_ids
  instance_types  = lookup(var.node_pools.data, "instance_types", ["r5.4xlarge"])
  disk_size       = lookup(var.node_pools.data, "disk_size", 200)

  scaling_config {
    desired_size = lookup(var.node_pools.data, "desired_size", 3)
    min_size     = lookup(var.node_pools.data, "min_size", 3)
    max_size     = lookup(var.node_pools.data, "max_size", 10)
  }

  labels = lookup(var.node_pools.data, "labels", { role = "data" })
  taints = lookup(var.node_pools.data, "taints", [{ key = "dedicated", value = "data", effect = "NO_SCHEDULE" }])

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-data-nodes"
    Environment = var.environment
    ManagedBy = "Terraform"
  })
}

resource "aws_iam_role" "eks_cluster" {
  count = var.cloud_provider == "aws" ? 1 : 0
  name  = "${var.cluster_name}-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  role       = aws_iam_role.eks_cluster[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_role" "eks_node" {
  count = var.cloud_provider == "aws" ? 1 : 0
  name  = "${var.cluster_name}-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  role       = aws_iam_role.eks_node[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  role       = aws_iam_role.eks_node[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  role       = aws_iam_role.eks_node[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_security_group" "eks_cluster" {
  count       = var.cloud_provider == "aws" ? 1 : 0
  name        = "${var.cluster_name}-cluster-sg"
  description = "Security group for EKS cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Kubernetes API server"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-cluster-sg"
    Environment = var.environment
    ManagedBy = "Terraform"
  })
}

# Azure Resources
resource "azurerm_kubernetes_cluster" "aks" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = var.cluster_name
  location            = var.region
  resource_group_name = var.resource_group_name
  dns_prefix          = var.cluster_name
  kubernetes_version  = var.kubernetes_version
  sku_tier            = "Standard"

  default_node_pool {
    name                = "system"
    vm_size             = "Standard_D4s_v3"
    node_count          = 3
    max_pods            = 30
    os_disk_size_gb     = 100
    vnet_subnet_id      = var.subnet_ids[0]
    enable_auto_scaling = true
    min_count           = 3
    max_count           = 5
    availability_zones  = [1, 2, 3]
    type                = "VirtualMachineScaleSets"
    node_labels = {
      role = "system"
    }
    tags = merge(var.tags, {
      Environment = var.environment
      ManagedBy = "Terraform"
    })
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

  tags = merge(var.tags, {
    Name = var.cluster_name
    Environment = var.environment
    ManagedBy = "Terraform"
  })
}

resource "azurerm_kubernetes_cluster_node_pool" "app" {
  count                = var.cloud_provider == "azure" ? 1 : 0
  name                 = "app"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks[0].id
  vm_size              = lookup(var.node_pools.app, "vm_size", "Standard_D16s_v3")
  node_count           = lookup(var.node_pools.app, "node_count", 3)
  max_pods             = 30
  os_disk_size_gb      = lookup(var.node_pools.app, "disk_size_gb", 100)
  vnet_subnet_id       = var.subnet_ids[0]
  enable_auto_scaling  = true
  min_count            = lookup(var.node_pools.app, "min_count", 3)
  max_count            = lookup(var.node_pools.app, "max_count", 10)
  availability_zones   = [1, 2, 3]
  node_labels          = lookup(var.node_pools.app, "labels", { role = "app" })

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-app-nodes"
    Environment = var.environment
    ManagedBy = "Terraform"
  })
}

resource "azurerm_kubernetes_cluster_node_pool" "calculation" {
  count                = var.cloud_provider == "azure" ? 1 : 0
  name                 = "calculation"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks[0].id
  vm_size              = lookup(var.node_pools.calculation, "vm_size", "Standard_F32s_v2")
  node_count           = lookup(var.node_pools.calculation, "node_count", 5)
  max_pods             = 30
  os_disk_size_gb      = lookup(var.node_pools.calculation, "disk_size_gb", 100)
  vnet_subnet_id       = var.subnet_ids[0]
  enable_auto_scaling  = true
  min_count            = lookup(var.node_pools.calculation, "min_count", 3)
  max_count            = lookup(var.node_pools.calculation, "max_count", 20)
  availability_zones   = [1, 2, 3]
  node_labels          = lookup(var.node_pools.calculation, "labels", { role = "calculation" })
  node_taints          = lookup(var.node_pools.calculation, "taints", ["dedicated=calculation:NoSchedule"])

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-calculation-nodes"
    Environment = var.environment
    ManagedBy = "Terraform"
  })
}

resource "azurerm_kubernetes_cluster_node_pool" "data" {
  count                = var.cloud_provider == "azure" ? 1 : 0
  name                 = "data"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks[0].id
  vm_size              = lookup(var.node_pools.data, "vm_size", "Standard_E16s_v3")
  node_count           = lookup(var.node_pools.data, "node_count", 3)
  max_pods             = 30
  os_disk_size_gb      = lookup(var.node_pools.data, "disk_size_gb", 200)
  vnet_subnet_id       = var.subnet_ids[0]
  enable_auto_scaling  = true
  min_count            = lookup(var.node_pools.data, "min_count", 3)
  max_count            = lookup(var.node_pools.data, "max_count", 10)
  availability_zones   = [1, 2, 3]
  node_labels          = lookup(var.node_pools.data, "labels", { role = "data" })
  node_taints          = lookup(var.node_pools.data, "taints", ["dedicated=data:NoSchedule"])

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-data-nodes"
    Environment = var.environment
    ManagedBy = "Terraform"
  })
}

# Kubernetes Resources
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
    labels = {
      name        = "monitoring"
      environment = var.environment
    }
  }
}

resource "kubernetes_namespace" "istio_system" {
  count = var.enable_istio ? 1 : 0
  metadata {
    name = "istio-system"
    labels = {
      name        = "istio-system"
      environment = var.environment
    }
  }
}

# Random password for Grafana admin
resource "random_password" "grafana_admin" {
  count            = var.enable_grafana ? 1 : 0
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Helm Releases
resource "helm_release" "metrics_server" {
  count      = var.enable_metrics_server ? 1 : 0
  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"
  namespace  = "kube-system"
  version    = "3.10.0"

  set {
    name  = "args[0]"
    value = "--kubelet-preferred-address-types=InternalIP"
  }
}

resource "helm_release" "cluster_autoscaler" {
  count      = var.enable_cluster_autoscaler ? 1 : 0
  name       = "cluster-autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  namespace  = "kube-system"
  version    = "9.29.0"

  set {
    name  = "autoDiscovery.clusterName"
    value = var.cloud_provider == "aws" ? aws_eks_cluster.eks[0].name : azurerm_kubernetes_cluster.aks[0].name
  }

  set {
    name  = "awsRegion"
    value = var.cloud_provider == "aws" ? var.region : ""
  }

  set {
    name  = "cloudProvider"
    value = var.cloud_provider
  }
}

resource "helm_release" "prometheus" {
  count      = var.enable_prometheus ? 1 : 0
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "prometheus"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = "15.18.0"

  values = [
    file("${path.module}/templates/prometheus-values.yaml")
  ]
}

resource "helm_release" "grafana" {
  count      = var.enable_grafana ? 1 : 0
  name       = "grafana"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "grafana"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = "6.52.4"

  values = [
    file("${path.module}/templates/grafana-values.yaml")
  ]

  set {
    name  = "adminPassword"
    value = random_password.grafana_admin[0].result
  }
}

resource "helm_release" "istio_base" {
  count      = var.enable_istio ? 1 : 0
  name       = "istio-base"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "base"
  namespace  = kubernetes_namespace.istio_system[0].metadata[0].name
  version    = "1.17.2"
}

resource "helm_release" "istiod" {
  count      = var.enable_istio ? 1 : 0
  name       = "istiod"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "istiod"
  namespace  = kubernetes_namespace.istio_system[0].metadata[0].name
  version    = "1.17.2"

  depends_on = [helm_release.istio_base]
}

resource "helm_release" "istio_ingress" {
  count      = var.enable_istio ? 1 : 0
  name       = "istio-ingress"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "gateway"
  namespace  = kubernetes_namespace.istio_system[0].metadata[0].name
  version    = "1.17.2"

  depends_on = [helm_release.istiod]
}

# Outputs
output "cluster_id" {
  description = "The ID of the Kubernetes cluster"
  value       = var.cloud_provider == "aws" ? aws_eks_cluster.eks[0].id : azurerm_kubernetes_cluster.aks[0].id
}

output "cluster_name" {
  description = "The name of the Kubernetes cluster"
  value       = var.cloud_provider == "aws" ? aws_eks_cluster.eks[0].name : azurerm_kubernetes_cluster.aks[0].name
}

output "cluster_endpoint" {
  description = "The endpoint for the Kubernetes cluster API server"
  value       = var.cloud_provider == "aws" ? aws_eks_cluster.eks[0].endpoint : azurerm_kubernetes_cluster.aks[0].kube_config[0].host
}

output "cluster_ca_certificate" {
  description = "The certificate authority data for the Kubernetes cluster"
  value       = var.cloud_provider == "aws" ? aws_eks_cluster.eks[0].certificate_authority[0].data : azurerm_kubernetes_cluster.aks[0].kube_config[0].cluster_ca_certificate
  sensitive   = true
}

output "node_pools" {
  description = "The Kubernetes node pools"
  value       = var.cloud_provider == "aws" ? {
    app = aws_eks_node_group.app[0].id
    calculation = aws_eks_node_group.calculation[0].id
    data = aws_eks_node_group.data[0].id
  } : {
    app = azurerm_kubernetes_cluster_node_pool.app[0].id
    calculation = azurerm_kubernetes_cluster_node_pool.calculation[0].id
    data = azurerm_kubernetes_cluster_node_pool.data[0].id
  }
}

output "kubeconfig" {
  description = "Kubernetes configuration for connecting to the cluster"
  value       = var.cloud_provider == "aws" ? {
    host                   = aws_eks_cluster.eks[0].endpoint
    cluster_ca_certificate = base64decode(aws_eks_cluster.eks[0].certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster[0].token
  } : azurerm_kubernetes_cluster.aks[0].kube_config_raw
  sensitive = true
}

output "grafana_admin_password" {
  description = "The admin password for Grafana"
  value       = var.enable_grafana ? random_password.grafana_admin[0].result : null
  sensitive   = true
}

output "monitoring_namespace" {
  description = "The namespace where monitoring tools are installed"
  value       = kubernetes_namespace.monitoring.metadata[0].name
}

output "istio_namespace" {
  description = "The namespace where Istio is installed"
  value       = var.enable_istio ? kubernetes_namespace.istio_system[0].metadata[0].name : null
}