# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local variables
locals {
  account_id = data.aws_caller_identity.current.account_id
  common_tags = {
    Project     = "IMS"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

#--------------------------------------------------------------
# KMS Keys
#--------------------------------------------------------------

# Main encryption key for IMS data
resource "aws_kms_key" "ims_encryption_key" {
  description             = "KMS key for encrypting IMS data"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid = "Enable IAM User Permissions",
        Effect = "Allow",
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        },
        Action = "kms:*",
        Resource = "*"
      },
      {
        Sid = "Allow use of the key for EKS",
        Effect = "Allow",
        Principal = {
          AWS = aws_iam_role.eks_cluster_role.arn
        },
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ],
        Resource = "*"
      },
      {
        Sid = "Allow use of the key for RDS",
        Effect = "Allow",
        Principal = {
          Service = "rds.amazonaws.com"
        },
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ],
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Name = "ims-${var.environment}-encryption-key"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "ims_encryption_key_alias" {
  name          = "alias/ims-${var.environment}-encryption-key"
  target_key_id = aws_kms_key.ims_encryption_key.key_id
}

# KMS key for S3 encryption
resource "aws_kms_key" "ims_s3_encryption_key" {
  description             = "KMS key for encrypting IMS S3 data"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid = "Enable IAM User Permissions",
        Effect = "Allow",
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        },
        Action = "kms:*",
        Resource = "*"
      },
      {
        Sid = "Allow use of the key for S3",
        Effect = "Allow",
        Principal = {
          Service = "s3.amazonaws.com"
        },
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ],
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Name = "ims-${var.environment}-s3-encryption-key"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "ims_s3_encryption_key_alias" {
  name          = "alias/ims-${var.environment}-s3-encryption-key"
  target_key_id = aws_kms_key.ims_s3_encryption_key.key_id
}

# KMS key for CloudWatch logs encryption
resource "aws_kms_key" "ims_cloudwatch_encryption_key" {
  description             = "KMS key for encrypting IMS CloudWatch logs"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid = "Enable IAM User Permissions",
        Effect = "Allow",
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        },
        Action = "kms:*",
        Resource = "*"
      },
      {
        Sid = "Allow CloudWatch to use the key",
        Effect = "Allow",
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        },
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ],
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Name = "ims-${var.environment}-cloudwatch-encryption-key"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "ims_cloudwatch_encryption_key_alias" {
  name          = "alias/ims-${var.environment}-cloudwatch-encryption-key"
  target_key_id = aws_kms_key.ims_cloudwatch_encryption_key.key_id
}

#--------------------------------------------------------------
# IAM Roles and Policies
#--------------------------------------------------------------

# EKS Cluster Role
resource "aws_iam_role" "eks_cluster_role" {
  name = "ims-${var.environment}-eks-cluster-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "eks.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
  
  tags = {
    Name = "ims-${var.environment}-eks-cluster-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource_controller" {
  role       = aws_iam_role.eks_cluster_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
}

# EKS Node Role
resource "aws_iam_role" "eks_node_role" {
  name = "ims-${var.environment}-eks-node-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "ec2.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
  
  tags = {
    Name = "ims-${var.environment}-eks-node-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  role       = aws_iam_role.eks_node_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  role       = aws_iam_role.eks_node_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "ecr_read_only" {
  role       = aws_iam_role.eks_node_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# VPC Flow Logs Role
resource "aws_iam_role" "flow_logs" {
  name = "ims-${var.environment}-flow-logs-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
  
  tags = {
    Name = "ims-${var.environment}-flow-logs-role"
    Environment = var.environment
  }
}

resource "aws_iam_policy" "flow_logs_policy" {
  name        = "ims-${var.environment}-flow-logs-policy"
  description = "Policy for VPC flow logs"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ],
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Name = "ims-${var.environment}-flow-logs-policy"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "flow_logs_attachment" {
  role       = aws_iam_role.flow_logs.name
  policy_arn = aws_iam_policy.flow_logs_policy.arn
}

# CloudTrail Role
resource "aws_iam_role" "cloudtrail" {
  name = "ims-${var.environment}-cloudtrail-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
  
  tags = {
    Name = "ims-${var.environment}-cloudtrail-role"
    Environment = var.environment
  }
}

resource "aws_iam_policy" "cloudtrail_policy" {
  name        = "ims-${var.environment}-cloudtrail-policy"
  description = "Policy for CloudTrail"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ],
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Name = "ims-${var.environment}-cloudtrail-policy"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "cloudtrail_attachment" {
  role       = aws_iam_role.cloudtrail.name
  policy_arn = aws_iam_policy.cloudtrail_policy.arn
}

# AWS Config Role
resource "aws_iam_role" "config" {
  name = "ims-${var.environment}-config-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "config.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
  
  tags = {
    Name = "ims-${var.environment}-config-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "config_policy" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
}

# HashiCorp Vault Role
resource "aws_iam_role" "vault" {
  name = "ims-${var.environment}-vault-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "ec2.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      },
      {
        Effect = "Allow",
        Principal = {
          Federated = "arn:aws:iam::${local.account_id}:oidc-provider/oidc.eks.${var.aws_region}.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE"
        },
        Action = "sts:AssumeRoleWithWebIdentity",
        Condition = {
          StringEquals = {
            "oidc.eks.${var.aws_region}.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE:sub": "system:serviceaccount:vault:vault"
          }
        }
      }
    ]
  })
  
  tags = {
    Name = "ims-${var.environment}-vault-role"
    Environment = var.environment
  }
}

resource "aws_iam_policy" "vault_policy" {
  name        = "ims-${var.environment}-vault-policy"
  description = "Policy for HashiCorp Vault"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ],
        Resource = [
          aws_kms_key.ims_encryption_key.arn,
          aws_kms_key.ims_s3_encryption_key.arn
        ]
      },
      {
        Effect = "Allow",
        Action = [
          "dynamodb:DescribeLimits",
          "dynamodb:DescribeTimeToLive",
          "dynamodb:ListTagsOfResource",
          "dynamodb:DescribeReservedCapacityOfferings",
          "dynamodb:DescribeReservedCapacity",
          "dynamodb:ListTables",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:CreateTable",
          "dynamodb:DeleteItem",
          "dynamodb:GetItem",
          "dynamodb:GetRecords",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
          "dynamodb:Scan",
          "dynamodb:DescribeTable"
        ],
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${local.account_id}:table/vault-data",
          "arn:aws:dynamodb:${var.aws_region}:${local.account_id}:table/vault-data/*"
        ]
      }
    ]
  })
  
  tags = {
    Name = "ims-${var.environment}-vault-policy"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "vault_attachment" {
  role       = aws_iam_role.vault.name
  policy_arn = aws_iam_policy.vault_policy.arn
}

#--------------------------------------------------------------
# WAF Web ACL
#--------------------------------------------------------------

resource "aws_wafv2_web_acl" "ims_web_acl" {
  count = var.enable_waf ? 1 : 0
  
  name        = "ims-${var.environment}-web-acl"
  description = "Web ACL for IMS application"
  scope       = "REGIONAL"
  
  default_action {
    allow {}
  }
  
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }
  
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }
  
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSet"
      sampled_requests_enabled   = true
    }
  }
  
  rule {
    name     = "RateBasedRule"
    priority = 4
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = 3000
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateBasedRule"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ims-${var.environment}-web-acl"
    sampled_requests_enabled   = true
  }
  
  tags = {
    Name = "ims-${var.environment}-web-acl"
    Environment = var.environment
  }
}

resource "aws_wafv2_web_acl_association" "api_gateway_association" {
  count = var.enable_waf ? 1 : 0
  
  resource_arn = aws_apigatewayv2_api.ims_api.arn
  web_acl_arn  = aws_wafv2_web_acl.ims_web_acl[0].arn
}

#--------------------------------------------------------------
# AWS Shield
#--------------------------------------------------------------

resource "aws_shield_protection" "api_gateway_protection" {
  count = var.enable_shield ? 1 : 0
  
  name         = "ims-${var.environment}-api-gateway-protection"
  resource_arn = aws_apigatewayv2_api.ims_api.arn
  
  tags = {
    Name = "ims-${var.environment}-api-gateway-protection"
    Environment = var.environment
  }
}

resource "aws_shield_protection" "alb_protection" {
  count = var.enable_shield ? 1 : 0
  
  name         = "ims-${var.environment}-alb-protection"
  resource_arn = aws_lb.ims_alb.arn
  
  tags = {
    Name = "ims-${var.environment}-alb-protection"
    Environment = var.environment
  }
}

#--------------------------------------------------------------
# AWS GuardDuty
#--------------------------------------------------------------

resource "aws_guardduty_detector" "ims_detector" {
  count = var.enable_guardduty ? 1 : 0
  
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"
  
  tags = {
    Name = "ims-${var.environment}-guardduty-detector"
    Environment = var.environment
  }
}

#--------------------------------------------------------------
# AWS Config
#--------------------------------------------------------------

resource "aws_config_configuration_recorder" "ims_recorder" {
  count = var.enable_config ? 1 : 0
  
  name     = "ims-${var.environment}-config-recorder"
  role_arn = aws_iam_role.config.arn
  
  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "ims_delivery_channel" {
  count = var.enable_config ? 1 : 0
  
  name           = "ims-${var.environment}-config-delivery-channel"
  s3_bucket_name = aws_s3_bucket.config_bucket[0].bucket
  s3_key_prefix  = "config"
  
  snapshot_delivery_properties {
    delivery_frequency = "Six_Hours"
  }
}

resource "aws_s3_bucket" "config_bucket" {
  count = var.enable_config ? 1 : 0
  
  bucket = "ims-${var.environment}-config-${local.account_id}"
  
  tags = {
    Name = "ims-${var.environment}-config-bucket"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "config_bucket_encryption" {
  count = var.enable_config ? 1 : 0
  
  bucket = aws_s3_bucket.config_bucket[0].bucket
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.ims_s3_encryption_key.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "config_bucket_public_access_block" {
  count = var.enable_config ? 1 : 0
  
  bucket                  = aws_s3_bucket.config_bucket[0].bucket
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

#--------------------------------------------------------------
# AWS CloudTrail
#--------------------------------------------------------------

resource "aws_cloudtrail" "ims_trail" {
  count = var.enable_cloudtrail ? 1 : 0
  
  name                          = "ims-${var.environment}-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail_bucket[0].bucket
  s3_key_prefix                 = "cloudtrail"
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  cloud_watch_logs_group_arn    = aws_cloudwatch_log_group.cloudtrail_log_group[0].arn
  cloud_watch_logs_role_arn     = aws_iam_role.cloudtrail.arn
  kms_key_id                    = aws_kms_key.ims_cloudwatch_encryption_key.arn
  
  tags = {
    Name = "ims-${var.environment}-trail"
    Environment = var.environment
  }
}

resource "aws_s3_bucket" "cloudtrail_bucket" {
  count = var.enable_cloudtrail ? 1 : 0
  
  bucket = "ims-${var.environment}-cloudtrail-${local.account_id}"
  
  tags = {
    Name = "ims-${var.environment}-cloudtrail-bucket"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail_bucket_encryption" {
  count = var.enable_cloudtrail ? 1 : 0
  
  bucket = aws_s3_bucket.cloudtrail_bucket[0].bucket
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.ims_s3_encryption_key.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "cloudtrail_bucket_public_access_block" {
  count = var.enable_cloudtrail ? 1 : 0
  
  bucket                  = aws_s3_bucket.cloudtrail_bucket[0].bucket
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudwatch_log_group" "cloudtrail_log_group" {
  count = var.enable_cloudtrail ? 1 : 0
  
  name              = "/aws/cloudtrail/ims-${var.environment}-trail"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.ims_cloudwatch_encryption_key.arn
  
  tags = {
    Name = "ims-${var.environment}-cloudtrail-log-group"
    Environment = var.environment
  }
}

#--------------------------------------------------------------
# Security Group Rules
#--------------------------------------------------------------

resource "aws_security_group_rule" "api_gateway_https_ingress" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.api_gateway.id
  description       = "HTTPS from anywhere"
}

resource "aws_security_group_rule" "api_gateway_http_ingress" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.api_gateway.id
  description       = "HTTP from anywhere (for redirects)"
}

resource "aws_security_group_rule" "api_gateway_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.api_gateway.id
  description       = "Allow all outbound traffic"
}

#--------------------------------------------------------------
# Outputs
#--------------------------------------------------------------

output "kms_key_arns" {
  description = "ARNs of KMS keys"
  value = {
    encryption_key            = aws_kms_key.ims_encryption_key.arn
    s3_encryption_key         = aws_kms_key.ims_s3_encryption_key.arn
    cloudwatch_encryption_key = aws_kms_key.ims_cloudwatch_encryption_key.arn
  }
}

output "iam_role_arns" {
  description = "ARNs of IAM roles"
  value = {
    eks_cluster_role = aws_iam_role.eks_cluster_role.arn
    eks_node_role    = aws_iam_role.eks_node_role.arn
    flow_logs_role   = aws_iam_role.flow_logs.arn
    cloudtrail_role  = aws_iam_role.cloudtrail.arn
    config_role      = aws_iam_role.config.arn
    vault_role       = aws_iam_role.vault.arn
  }
}

output "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = var.enable_waf ? aws_wafv2_web_acl.ims_web_acl[0].arn : null
}

output "cloudtrail_log_group_arn" {
  description = "ARN of the CloudTrail log group"
  value       = var.enable_cloudtrail ? aws_cloudwatch_log_group.cloudtrail_log_group[0].arn : null
}