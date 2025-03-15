# Data sources for region and account ID
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# Local variables
locals {
  account_id = data.aws_caller_identity.current.account_id
  common_tags = {
    Project     = "IMS"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# KMS key for S3 bucket encryption
resource "aws_kms_key" "s3_encryption" {
  description             = "KMS key for S3 bucket encryption"
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
      }
    ]
  })
  
  tags = {
    Name        = "ims-${var.environment}-s3-encryption-key"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "s3_encryption" {
  name          = "alias/ims-${var.environment}-s3-encryption-key"
  target_key_id = aws_kms_key.s3_encryption.key_id
}

# Primary data bucket
resource "aws_s3_bucket" "data" {
  bucket = "ims-${var.environment}-data"
  
  tags = {
    Name        = "ims-${var.environment}-data"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_encryption.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  
  rule = var.s3_lifecycle_rules
}

# Backup bucket
resource "aws_s3_bucket" "backup" {
  bucket = "ims-${var.environment}-backup"
  
  tags = {
    Name        = "ims-${var.environment}-backup"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "backup" {
  bucket = aws_s3_bucket.backup.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_encryption.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id
  
  rule = [
    {
      id      = "daily-backup-lifecycle"
      status  = "Enabled"
      filter  = {
        prefix = "daily/"
      }
      transition = [
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
        days = 365
      }
    },
    {
      id      = "weekly-backup-lifecycle"
      status  = "Enabled"
      filter  = {
        prefix = "weekly/"
      }
      transition = [
        {
          days          = 90
          storage_class = "STANDARD_IA"
        },
        {
          days          = 180
          storage_class = "GLACIER"
        }
      ]
      expiration = {
        days = 730
      }
    },
    {
      id      = "monthly-backup-lifecycle"
      status  = "Enabled"
      filter  = {
        prefix = "monthly/"
      }
      transition = [
        {
          days          = 180
          storage_class = "STANDARD_IA"
        },
        {
          days          = 365
          storage_class = "GLACIER"
        },
        {
          days          = 730
          storage_class = "DEEP_ARCHIVE"
        }
      ]
      expiration = {
        days = 2555  # 7 years
      }
    }
  ]
}

# Archive bucket
resource "aws_s3_bucket" "archive" {
  bucket = "ims-${var.environment}-archive"
  
  tags = {
    Name        = "ims-${var.environment}-archive"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "archive" {
  bucket = aws_s3_bucket.archive.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "archive" {
  bucket = aws_s3_bucket.archive.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_encryption.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "archive" {
  bucket = aws_s3_bucket.archive.id
  
  rule = [
    {
      id      = "archive-lifecycle"
      status  = "Enabled"
      filter  = {
        prefix = ""
      }
      transition = [
        {
          days          = 0
          storage_class = "DEEP_ARCHIVE"
        }
      ]
      expiration = {
        days = 2555  # 7 years
      }
    }
  ]
}

# Logs bucket
resource "aws_s3_bucket" "logs" {
  bucket = "ims-${var.environment}-logs"
  
  tags = {
    Name        = "ims-${var.environment}-logs"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_encryption.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  
  rule = [
    {
      id      = "access-logs-lifecycle"
      status  = "Enabled"
      filter  = {
        prefix = "access-logs/"
      }
      transition = [
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
        days = 365
      }
    },
    {
      id      = "audit-logs-lifecycle"
      status  = "Enabled"
      filter  = {
        prefix = "audit-logs/"
      }
      transition = [
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
    }
  ]
}

# Set up bucket logging
resource "aws_s3_bucket_logging" "data" {
  bucket = aws_s3_bucket.data.id
  
  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "access-logs/data/"
}

resource "aws_s3_bucket_logging" "backup" {
  bucket = aws_s3_bucket.backup.id
  
  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "access-logs/backup/"
}

resource "aws_s3_bucket_logging" "archive" {
  bucket = aws_s3_bucket.archive.id
  
  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "access-logs/archive/"
}

# Block public access for all buckets
resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "backup" {
  bucket = aws_s3_bucket.backup.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "archive" {
  bucket = aws_s3_bucket.archive.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# VPC endpoint for S3
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = vpc_id
  service_name = "com.amazonaws.${data.aws_region.current.name}.s3"
  
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = "*",
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ],
        Resource = [
          "${aws_s3_bucket.data.arn}",
          "${aws_s3_bucket.data.arn}/*",
          "${aws_s3_bucket.backup.arn}",
          "${aws_s3_bucket.backup.arn}/*",
          "${aws_s3_bucket.archive.arn}",
          "${aws_s3_bucket.archive.arn}/*",
          "${aws_s3_bucket.logs.arn}",
          "${aws_s3_bucket.logs.arn}/*"
        ]
      }
    ]
  })
  
  tags = {
    Name        = "ims-${var.environment}-s3-endpoint"
    Environment = var.environment
  }
}

# Outputs
output "data_bucket_name" {
  description = "The name of the S3 bucket for data storage"
  value       = aws_s3_bucket.data.id
}

output "backup_bucket_name" {
  description = "The name of the S3 bucket for database backups"
  value       = aws_s3_bucket.backup.id
}

output "archive_bucket_name" {
  description = "The name of the S3 bucket for long-term data archives"
  value       = aws_s3_bucket.archive.id
}

output "log_bucket_name" {
  description = "The name of the S3 bucket for access logs and audit logs"
  value       = aws_s3_bucket.logs.id
}

output "s3_kms_key_arn" {
  description = "The ARN of the KMS key used for S3 bucket encryption"
  value       = aws_kms_key.s3_encryption.arn
}