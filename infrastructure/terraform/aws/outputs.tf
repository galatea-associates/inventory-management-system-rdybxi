# General AWS Account Information
output "account_id" {
  description = "The AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "region" {
  description = "The AWS region where resources are deployed"
  value       = data.aws_region.current.name
}

output "environment" {
  description = "The deployment environment (dev, staging, prod)"
  value       = var.environment
}

# Networking Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "List of database subnet IDs"
  value       = module.vpc.database_subnet_ids
}

output "nat_gateway_ips" {
  description = "List of NAT Gateway Elastic IPs"
  value       = module.vpc.nat_gateway_ips
}

output "transit_gateway_id" {
  description = "ID of the Transit Gateway for cross-region communication"
  value       = module.transit_gateway.transit_gateway_id
}

output "api_gateway_endpoint" {
  description = "Endpoint URL for the API Gateway"
  value       = module.api_gateway.api_endpoint
}

output "load_balancer_dns" {
  description = "DNS name of the Application Load Balancer"
  value       = module.load_balancer.dns_name
}

output "load_balancer_arn" {
  description = "ARN of the Application Load Balancer"
  value       = module.load_balancer.arn
}

output "default_security_group_id" {
  description = "ID of the default security group"
  value       = module.vpc.default_security_group_id
}

# Compute Outputs - EKS
output "eks_cluster_endpoint" {
  description = "Endpoint for the EKS Kubernetes API server"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_arn" {
  description = "ARN of the EKS cluster"
  value       = module.eks.cluster_arn
}

output "eks_cluster_id" {
  description = "Name/ID of the EKS cluster"
  value       = module.eks.cluster_id
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "eks_worker_security_group_id" {
  description = "Security group ID attached to the EKS workers"
  value       = module.eks.worker_security_group_id
}

output "eks_node_groups" {
  description = "Map of EKS node groups and their attributes"
  value       = module.eks.node_groups
}

output "eks_fargate_profiles" {
  description = "Map of EKS Fargate profiles"
  value       = module.eks.fargate_profiles
}

output "eks_oidc_provider_arn" {
  description = "ARN of the OIDC Provider for EKS"
  value       = module.eks.oidc_provider_arn
}

# Compute Outputs - EC2
output "bastion_host_public_ip" {
  description = "Public IP address of the bastion host"
  value       = module.bastion.public_ip
}

output "specialized_compute_ids" {
  description = "IDs of specialized compute instances for high-performance calculations"
  value       = module.specialized_compute.instance_ids
}

# Compute Outputs - Lambda
output "lambda_function_arns" {
  description = "ARNs of Lambda functions used in the system"
  value       = module.lambda_functions.function_arns
}

# Database Outputs - RDS
output "rds_instance_endpoint" {
  description = "Connection endpoint for the RDS instance"
  value       = module.postgres_rds.endpoint
  sensitive   = true
}

output "rds_instance_address" {
  description = "The hostname of the RDS instance"
  value       = module.postgres_rds.address
  sensitive   = true
}

output "rds_instance_port" {
  description = "The port the RDS instance is listening on"
  value       = module.postgres_rds.port
}

output "rds_instance_id" {
  description = "The ID of the RDS instance"
  value       = module.postgres_rds.id
}

output "rds_instance_resource_id" {
  description = "The RDS Resource ID of this instance"
  value       = module.postgres_rds.resource_id
}

output "rds_security_group_id" {
  description = "Security group ID of the RDS instance"
  value       = module.postgres_rds.security_group_id
}

# Database Outputs - DynamoDB
output "dynamodb_table_names" {
  description = "Names of DynamoDB tables"
  value       = module.dynamodb.table_names
}

output "dynamodb_table_arns" {
  description = "ARNs of DynamoDB tables"
  value       = module.dynamodb.table_arns
}

# Database Outputs - ElastiCache
output "elasticache_redis_endpoint" {
  description = "Redis endpoint address"
  value       = module.redis.endpoint
  sensitive   = true
}

output "elasticache_redis_port" {
  description = "Redis endpoint port"
  value       = module.redis.port
}

output "elasticache_redis_security_group_id" {
  description = "Security group ID of the Redis cluster"
  value       = module.redis.security_group_id
}

# Storage Outputs - S3
output "s3_bucket_names" {
  description = "Names of S3 buckets"
  value       = module.s3_buckets.bucket_names
}

output "s3_bucket_arns" {
  description = "ARNs of S3 buckets"
  value       = module.s3_buckets.bucket_arns
}

output "s3_bucket_domain_names" {
  description = "Domain names of S3 buckets"
  value       = module.s3_buckets.bucket_domain_names
}

# Storage Outputs - EFS
output "efs_file_system_id" {
  description = "ID of the EFS file system"
  value       = module.efs.file_system_id
}

output "efs_mount_targets" {
  description = "Mount targets of the EFS file system"
  value       = module.efs.mount_targets
}

# Security Outputs - KMS
output "kms_key_arns" {
  description = "ARNs of KMS keys used for encryption"
  value       = module.kms.key_arns
}

# Security Outputs - IAM
output "iam_role_arns" {
  description = "ARNs of IAM roles created for the system"
  value       = module.iam_roles.role_arns
}

output "eks_admin_role_arn" {
  description = "ARN of the EKS admin role"
  value       = module.iam_roles.eks_admin_role_arn
}

# Security Outputs - ACM
output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = module.acm.certificate_arn
}

# Security Outputs - WAF
output "waf_web_acl_arn" {
  description = "ARN of the WAF web ACL"
  value       = module.waf.web_acl_arn
}

# Monitoring Outputs - CloudWatch
output "cloudwatch_log_group_arns" {
  description = "ARNs of CloudWatch log groups"
  value       = module.cloudwatch.log_group_arns
}

output "cloudwatch_dashboard_arns" {
  description = "ARNs of CloudWatch dashboards"
  value       = module.cloudwatch.dashboard_arns
}

output "cloudwatch_alarm_arns" {
  description = "ARNs of CloudWatch alarms"
  value       = module.cloudwatch.alarm_arns
}

# Monitoring Outputs - CloudTrail
output "cloudtrail_trail_arn" {
  description = "ARN of the CloudTrail trail"
  value       = module.cloudtrail.trail_arn
}

# Monitoring Outputs - AWS Config
output "aws_config_recorder_name" {
  description = "Name of the AWS Config recorder"
  value       = module.aws_config.config_recorder_name
}

# Region-specific outputs - Americas region
output "americas_vpc_id" {
  description = "The ID of the VPC in Americas region"
  value       = module.americas_vpc.vpc_id
}

output "americas_eks_cluster_endpoint" {
  description = "Endpoint for the EKS Kubernetes API server in Americas region"
  value       = module.americas_eks.cluster_endpoint
}

output "americas_rds_instance_endpoint" {
  description = "Connection endpoint for the RDS instance in Americas region"
  value       = module.americas_postgres_rds.endpoint
  sensitive   = true
}

# Region-specific outputs - Europe region
output "europe_vpc_id" {
  description = "The ID of the VPC in Europe region"
  value       = module.europe_vpc.vpc_id
}

output "europe_eks_cluster_endpoint" {
  description = "Endpoint for the EKS Kubernetes API server in Europe region"
  value       = module.europe_eks.cluster_endpoint
}

output "europe_rds_instance_endpoint" {
  description = "Connection endpoint for the RDS instance in Europe region"
  value       = module.europe_postgres_rds.endpoint
  sensitive   = true
}

# Region-specific outputs - Asia-Pacific region
output "asia_pacific_vpc_id" {
  description = "The ID of the VPC in Asia-Pacific region"
  value       = module.asia_pacific_vpc.vpc_id
}

output "asia_pacific_eks_cluster_endpoint" {
  description = "Endpoint for the EKS Kubernetes API server in Asia-Pacific region"
  value       = module.asia_pacific_eks.cluster_endpoint
}

output "asia_pacific_rds_instance_endpoint" {
  description = "Connection endpoint for the RDS instance in Asia-Pacific region"
  value       = module.asia_pacific_postgres_rds.endpoint
  sensitive   = true
}

# Integration endpoints for application components
output "kafka_bootstrap_servers" {
  description = "List of Kafka bootstrap servers for event streaming"
  value       = module.msk.bootstrap_brokers
  sensitive   = true
}

output "service_discovery_namespace" {
  description = "The service discovery namespace for internal service communication"
  value       = module.service_discovery.namespace_name
}

output "prometheus_endpoint" {
  description = "Endpoint for the Prometheus monitoring service"
  value       = module.prometheus.endpoint
}

output "grafana_endpoint" {
  description = "Endpoint for the Grafana monitoring dashboard"
  value       = module.grafana.endpoint
}

output "opensearch_endpoint" {
  description = "Endpoint for the OpenSearch service for log analytics"
  value       = module.opensearch.endpoint
  sensitive   = true
}

output "vault_endpoint" {
  description = "Endpoint for the HashiCorp Vault service for secrets management"
  value       = module.vault.endpoint
  sensitive   = true
}