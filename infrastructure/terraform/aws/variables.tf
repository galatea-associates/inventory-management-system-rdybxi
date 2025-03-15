# General configuration variables
variable "aws_region" {
  description = "AWS region where resources will be deployed"
  type        = string
  default     = "us-east-1"
  
  validation {
    condition     = can(regex("^(us|eu|ap|sa|ca|me|af)-[a-z]+-\\d+$", var.aws_region))
    error_message = "The aws_region value must be a valid AWS region name."
  }
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "The environment value must be one of: dev, staging, prod."
  }
}

# Networking configuration
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
  
  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "The vpc_cidr value must be a valid CIDR block."
  }
}

variable "availability_zones" {
  description = "List of availability zones to use for the subnets in the VPC"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnets" {
  description = "List of private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets" {
  description = "List of public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnets" {
  description = "List of database subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

# Kubernetes configuration
variable "kubernetes_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.27"
}

variable "eks_node_groups" {
  description = "Configuration for EKS node groups including instance types and scaling settings"
  type = map(object({
    instance_types = list(string)
    scaling_config = object({
      desired_size = number
      max_size     = number
      min_size     = number
    })
  }))
  
  default = {
    app = {
      instance_types = ["m5.2xlarge"]
      scaling_config = {
        desired_size = 3
        max_size     = 10
        min_size     = 3
      }
    }
    calculation = {
      instance_types = ["c5.4xlarge"]
      scaling_config = {
        desired_size = 3
        max_size     = 20
        min_size     = 3
      }
    }
    data = {
      instance_types = ["r5.2xlarge"]
      scaling_config = {
        desired_size = 3
        max_size     = 10
        min_size     = 3
      }
    }
  }
}

# Database configuration
variable "db_instance_class" {
  description = "Instance class for the PostgreSQL RDS instance"
  type        = string
  default     = "db.r5.2xlarge"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB for the PostgreSQL RDS instance"
  type        = number
  default     = 500
}

variable "db_multi_az" {
  description = "Whether to enable multi-AZ deployment for the PostgreSQL RDS instance"
  type        = bool
  default     = true
}

variable "db_backup_retention" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 30
}

variable "db_deletion_protection" {
  description = "Whether to enable deletion protection for the PostgreSQL RDS instance"
  type        = bool
  default     = true
}

variable "timescaledb_instance_class" {
  description = "Instance class for the TimescaleDB RDS instance"
  type        = string
  default     = "db.r5.4xlarge"
}

# Caching configuration
variable "cache_node_type" {
  description = "Node type for the ElastiCache Redis cluster"
  type        = string
  default     = "cache.r5.xlarge"
}

variable "cache_num_nodes" {
  description = "Number of nodes in the ElastiCache Redis cluster"
  type        = number
  default     = 3
}

# Messaging configuration
variable "kafka_broker_instance_type" {
  description = "Instance type for the MSK Kafka brokers"
  type        = string
  default     = "kafka.m5.2xlarge"
}

variable "kafka_broker_count" {
  description = "Number of broker nodes in the MSK Kafka cluster"
  type        = number
  default     = 3
}

# NoSQL database configuration
variable "cassandra_instance_type" {
  description = "Instance type for Cassandra nodes"
  type        = string
  default     = "i3.2xlarge"
}

variable "cassandra_node_count" {
  description = "Number of nodes in the Cassandra cluster"
  type        = number
  default     = 6
}

# Time-series database configuration
variable "influxdb_instance_type" {
  description = "Instance type for InfluxDB nodes"
  type        = string
  default     = "r5.2xlarge"
}

variable "influxdb_node_count" {
  description = "Number of nodes in the InfluxDB cluster"
  type        = number
  default     = 3
}

# Storage configuration
variable "s3_lifecycle_rules" {
  description = "Lifecycle rules for S3 buckets to implement tiered storage strategy"
  type = list(object({
    id      = string
    prefix  = string
    enabled = bool
    transitions = list(object({
      days          = number
      storage_class = string
    }))
    expiration = object({
      days = number
    })
  }))
  
  default = [
    {
      id      = "market-data-lifecycle"
      prefix  = "market-data/"
      enabled = true
      transitions = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        },
        {
          days          = 365
          storage_class = "DEEP_ARCHIVE"
        }
      ]
      expiration = {
        days = 2555  # 7 years
      }
    },
    {
      id      = "position-data-lifecycle"
      prefix  = "position-data/"
      enabled = true
      transitions = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]
      expiration = {
        days = 2555  # 7 years
      }
    }
  ]
}

# Access and security configuration
variable "ssh_key_name" {
  description = "Name of the SSH key pair for EC2 instances"
  type        = string
  default     = "ims-key"
}

# Monitoring and logging configuration
variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 90
}

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = "alerts@example.com"
}

# Security service configuration
variable "enable_waf" {
  description = "Whether to enable AWS WAF for the API Gateway"
  type        = bool
  default     = true
}

variable "enable_shield" {
  description = "Whether to enable AWS Shield for DDoS protection"
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Whether to enable AWS GuardDuty for threat detection"
  type        = bool
  default     = true
}

variable "enable_config" {
  description = "Whether to enable AWS Config for configuration compliance"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Whether to enable AWS CloudTrail for API activity logging"
  type        = bool
  default     = true
}