# Terraform configuration for AWS infrastructure deployment of the Inventory Management System (IMS)
# This file orchestrates various infrastructure components through specialized modules

terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
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
  
  backend "s3" {
    bucket         = "ims-terraform-state-${var.environment}"
    key            = "aws/terraform.tfstate"
    region         = "var.aws_region"
    encrypt        = true
    dynamodb_table = "ims-terraform-locks"
    kms_key_id     = "alias/ims-terraform-state-key"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "IMS"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

# Local variables
locals {
  common_tags = {
    Project     = "IMS"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
  
  account_id = data.aws_caller_identity.current.account_id
}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"
  
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  private_subnets    = var.private_subnets
  public_subnets     = var.public_subnets
  database_subnets   = var.database_subnets
  tags               = local.common_tags
}

# EKS Cluster
module "eks" {
  source = "./modules/eks"
  
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  kubernetes_version = var.kubernetes_version
  eks_node_groups    = var.eks_node_groups
  tags               = local.common_tags
}

# RDS PostgreSQL Database
module "rds" {
  source = "./modules/database"
  
  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.database_subnet_ids
  security_group_ids     = [module.vpc.database_security_group_id]
  db_instance_class      = var.db_instance_class
  db_allocated_storage   = var.db_allocated_storage
  db_multi_az            = var.db_multi_az
  db_backup_retention    = var.db_backup_retention
  db_deletion_protection = var.db_deletion_protection
  tags                   = local.common_tags
}

# ElastiCache Redis Cluster
module "elasticache" {
  source = "./modules/elasticache"
  
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.database_subnet_ids
  security_group_ids = [module.vpc.elasticache_security_group_id]
  cache_node_type    = var.cache_node_type
  cache_num_nodes    = var.cache_num_nodes
  tags               = local.common_tags
}

# MSK Kafka Cluster
module "msk" {
  source = "./modules/msk"
  
  environment                = var.environment
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.private_subnet_ids
  security_group_ids         = [module.vpc.kafka_security_group_id]
  kafka_broker_instance_type = var.kafka_broker_instance_type
  kafka_broker_count         = var.kafka_broker_count
  tags                       = local.common_tags
}

# S3 Storage Buckets
module "s3" {
  source = "./modules/s3"
  
  environment        = var.environment
  s3_lifecycle_rules = var.s3_lifecycle_rules
  tags               = local.common_tags
}

# IAM Roles and Policies
module "iam" {
  source = "./modules/iam"
  
  environment      = var.environment
  eks_cluster_name = module.eks.cluster_name
  tags             = local.common_tags
}

# CloudWatch Monitoring
module "cloudwatch" {
  source = "./modules/monitoring"
  
  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  eks_cluster_name       = module.eks.cluster_name
  rds_instance_id        = module.rds.instance_id
  elasticache_cluster_id = module.elasticache.cluster_id
  msk_cluster_name       = module.msk.cluster_name
  log_retention_days     = var.log_retention_days
  alarm_email            = var.alarm_email
  tags                   = local.common_tags
}

# Security Services
module "security" {
  source = "./modules/security"
  
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  enable_waf        = var.enable_waf
  enable_shield     = var.enable_shield
  enable_guardduty  = var.enable_guardduty
  enable_config     = var.enable_config
  enable_cloudtrail = var.enable_cloudtrail
  tags              = local.common_tags
}

# Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_name" {
  description = "The name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "The endpoint for the EKS cluster API server"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "The connection endpoint for the PostgreSQL RDS instance"
  value       = module.rds.endpoint
}

output "elasticache_endpoint" {
  description = "The connection endpoint for the Redis ElastiCache cluster"
  value       = module.elasticache.endpoint
}

output "msk_bootstrap_brokers" {
  description = "The connection string for the Kafka brokers"
  value       = module.msk.bootstrap_brokers
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket for data storage"
  value       = module.s3.bucket_name
}

output "account_id" {
  description = "The AWS account ID"
  value       = local.account_id
}

output "region" {
  description = "The AWS region where resources are deployed"
  value       = data.aws_region.current.name
}