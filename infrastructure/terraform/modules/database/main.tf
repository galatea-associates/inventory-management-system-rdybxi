# Provider requirements
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Local variables
locals {
  common_tags = {
    Project     = "IMS"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Generate secure random passwords for database instances
resource "random_password" "postgresql" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
  min_special      = 2
}

resource "random_password" "timescaledb" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
  min_special      = 2
}

resource "random_password" "redis" {
  length      = 32
  special     = false
  min_upper   = 5
  min_lower   = 5
  min_numeric = 5
}

# Data sources
data "aws_ami" "amazon_linux_2" {
  count = var.cloud_provider == "aws" ? 1 : 0

  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "azurerm_subnet" "database" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                 = "database"
  resource_group_name  = var.resource_group_name
  virtual_network_name = data.azurerm_virtual_network.vnet[0].name
}

data "azurerm_virtual_network" "vnet" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "ims-${var.environment}-vnet"
  resource_group_name = var.resource_group_name
}

data "azurerm_key_vault" "secrets" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "ims-${var.environment}-kv"
  resource_group_name = var.resource_group_name
}

#################################################
# AWS Resources
#################################################

# AWS RDS PostgreSQL for reference data
resource "aws_db_parameter_group" "postgresql" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name        = "ims-${var.environment}-postgresql-params"
  family      = "postgres15"
  description = "Parameter group for PostgreSQL RDS instances"

  parameter {
    name  = "max_connections"
    value = "1000"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  parameter {
    name  = "work_mem"
    value = "16384"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "2097152"
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-postgresql-params"
    Environment = var.environment
  })
}

resource "aws_db_instance" "postgresql" {
  count = var.cloud_provider == "aws" ? 1 : 0

  identifier                  = "ims-${var.environment}-postgresql"
  engine                      = "postgres"
  engine_version              = "15.3"
  instance_class              = var.db_instance_class
  allocated_storage           = var.db_storage_gb
  storage_type                = "gp3"
  storage_encrypted           = var.enable_encryption
  db_name                     = "ims"
  username                    = "ims_admin"
  password                    = random_password.postgresql.result
  parameter_group_name        = aws_db_parameter_group.postgresql[0].name
  db_subnet_group_name        = aws_db_subnet_group.database[0].name
  vpc_security_group_ids      = var.security_group_ids
  backup_retention_period     = var.db_backup_retention_days
  backup_window               = "03:00-04:00"
  maintenance_window          = "sun:04:30-sun:05:30"
  multi_az                    = var.db_multi_az
  publicly_accessible         = false
  skip_final_snapshot         = false
  final_snapshot_identifier   = "ims-${var.environment}-postgresql-final"
  deletion_protection         = var.db_deletion_protection
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]
  auto_minor_version_upgrade  = true
  apply_immediately           = false
  monitoring_interval         = 30
  monitoring_role_arn         = aws_iam_role.rds_monitoring[0].arn

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-postgresql"
    Environment = var.environment
  })
}

# AWS RDS TimescaleDB for time-series data
resource "aws_db_parameter_group" "timescaledb" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name        = "ims-${var.environment}-timescaledb-params"
  family      = "postgres15"
  description = "Parameter group for TimescaleDB RDS instances"

  parameter {
    name  = "max_connections"
    value = "1000"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  parameter {
    name  = "work_mem"
    value = "16384"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "2097152"
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "timescaledb"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-timescaledb-params"
    Environment = var.environment
  })
}

resource "aws_db_instance" "timescaledb" {
  count = var.cloud_provider == "aws" ? 1 : 0

  identifier                  = "ims-${var.environment}-timescaledb"
  engine                      = "postgres"
  engine_version              = "15.3"
  instance_class              = var.db_instance_class
  allocated_storage           = var.db_storage_gb * 2
  storage_type                = "gp3"
  storage_encrypted           = var.enable_encryption
  db_name                     = "ims_timeseries"
  username                    = "ims_admin"
  password                    = random_password.timescaledb.result
  parameter_group_name        = aws_db_parameter_group.timescaledb[0].name
  db_subnet_group_name        = aws_db_subnet_group.database[0].name
  vpc_security_group_ids      = var.security_group_ids
  backup_retention_period     = var.db_backup_retention_days
  backup_window               = "03:00-04:00"
  maintenance_window          = "sun:04:30-sun:05:30"
  multi_az                    = var.db_multi_az
  publicly_accessible         = false
  skip_final_snapshot         = false
  final_snapshot_identifier   = "ims-${var.environment}-timescaledb-final"
  deletion_protection         = var.db_deletion_protection
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]
  auto_minor_version_upgrade  = true
  apply_immediately           = false
  monitoring_interval         = 30
  monitoring_role_arn         = aws_iam_role.rds_monitoring[0].arn

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-timescaledb"
    Environment = var.environment
  })
}

resource "aws_db_subnet_group" "database" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name        = "ims-${var.environment}-db-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for IMS database instances"

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-db-subnet-group"
    Environment = var.environment
  })
}

# AWS ElastiCache Redis for caching
resource "aws_elasticache_parameter_group" "redis" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name        = "ims-${var.environment}-redis-params"
  family      = "redis7"
  description = "Parameter group for Redis ElastiCache clusters"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  parameter {
    name  = "cluster-enabled"
    value = "yes"
  }

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-redis-params"
    Environment = var.environment
  })
}

resource "aws_elasticache_subnet_group" "redis" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name        = "ims-${var.environment}-redis-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for IMS Redis clusters"

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-redis-subnet-group"
    Environment = var.environment
  })
}

resource "aws_elasticache_replication_group" "redis" {
  count = var.cloud_provider == "aws" ? 1 : 0

  replication_group_id       = "ims-${var.environment}-redis"
  description                = "Redis cluster for IMS caching and pub/sub"
  node_type                  = var.redis_node_type
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.redis[0].name
  subnet_group_name          = aws_elasticache_subnet_group.redis[0].name
  security_group_ids         = var.security_group_ids
  automatic_failover_enabled = true
  multi_az_enabled           = var.db_multi_az
  num_node_groups            = var.redis_num_shards
  replicas_per_node_group    = var.redis_replicas_per_shard
  at_rest_encryption_enabled = var.enable_encryption
  transit_encryption_enabled = var.enable_encryption
  auth_token                 = var.enable_encryption ? random_password.redis.result : null
  snapshot_retention_limit   = var.db_backup_retention_days
  snapshot_window            = "03:00-04:00"
  maintenance_window         = "sun:04:30-sun:05:30"
  auto_minor_version_upgrade = true
  apply_immediately          = false

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-redis"
    Environment = var.environment
  })
}

# AWS Keyspaces (Managed Cassandra) for position data
resource "aws_keyspaces_keyspace" "ims" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name = "ims_${var.environment}"

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-keyspace"
    Environment = var.environment
  })
}

resource "aws_keyspaces_table" "positions" {
  count = var.cloud_provider == "aws" ? 1 : 0

  keyspace_name = aws_keyspaces_keyspace.ims[0].name
  table_name    = "positions"

  schema_definition {
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

    partition_key = ["book_id", "security_id", "business_date"]
  }

  capacity_specification {
    throughput_mode = "PAY_PER_REQUEST"
  }

  encryption_specification {
    type = var.enable_encryption ? "CUSTOMER_MANAGED_KMS_KEY" : "AWS_OWNED_KMS_KEY"
  }

  point_in_time_recovery {
    status = "ENABLED"
  }

  ttl {
    status = "ENABLED"
  }

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-positions-table"
    Environment = var.environment
  })
}

resource "aws_keyspaces_table" "settlement_ladder" {
  count = var.cloud_provider == "aws" ? 1 : 0

  keyspace_name = aws_keyspaces_keyspace.ims[0].name
  table_name    = "settlement_ladder"

  schema_definition {
    column {
      name = "book_id"
      type = "text"
    }
    column {
      name = "security_id"
      type = "text"
    }
    column {
      name = "settlement_date"
      type = "date"
    }
    column {
      name = "deliver_qty"
      type = "decimal"
    }
    column {
      name = "receipt_qty"
      type = "decimal"
    }
    column {
      name = "updated_at"
      type = "timestamp"
    }

    partition_key = ["book_id", "security_id", "settlement_date"]
  }

  capacity_specification {
    throughput_mode = "PAY_PER_REQUEST"
  }

  encryption_specification {
    type = var.enable_encryption ? "CUSTOMER_MANAGED_KMS_KEY" : "AWS_OWNED_KMS_KEY"
  }

  point_in_time_recovery {
    status = "ENABLED"
  }

  ttl {
    status = "ENABLED"
  }

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-settlement-ladder-table"
    Environment = var.environment
  })
}

# AWS EC2 instances for InfluxDB
resource "aws_instance" "influxdb" {
  count = var.cloud_provider == "aws" ? var.influxdb_node_count : 0

  ami                    = data.aws_ami.amazon_linux_2[0].id
  instance_type          = "m5.2xlarge"
  subnet_id              = element(var.subnet_ids, count.index % length(var.subnet_ids))
  vpc_security_group_ids = var.security_group_ids
  key_name               = aws_key_pair.influxdb[0].key_name

  root_block_device {
    volume_size = 100
    volume_type = "gp3"
    encrypted   = var.enable_encryption
  }

  ebs_block_device {
    device_name           = "/dev/sdf"
    volume_size           = 500
    volume_type           = "gp3"
    encrypted             = var.enable_encryption
    delete_on_termination = true
  }

  user_data = file("${path.module}/scripts/influxdb-setup.sh")

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-influxdb-${count.index + 1}"
    Environment = var.environment
  })
}

resource "aws_key_pair" "influxdb" {
  count = var.cloud_provider == "aws" ? 1 : 0

  key_name   = "ims-${var.environment}-influxdb"
  public_key = tls_private_key.influxdb[0].public_key_openssh

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-influxdb-key"
    Environment = var.environment
  })
}

resource "tls_private_key" "influxdb" {
  count = var.cloud_provider == "aws" ? 1 : 0

  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_secretsmanager_secret" "influxdb_key" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name                    = "ims/${var.environment}/influxdb/ssh_key"
  description             = "SSH private key for InfluxDB instances"
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-influxdb-key"
    Environment = var.environment
  })
}

resource "aws_secretsmanager_secret_version" "influxdb_key" {
  count = var.cloud_provider == "aws" ? 1 : 0

  secret_id     = aws_secretsmanager_secret.influxdb_key[0].id
  secret_string = tls_private_key.influxdb[0].private_key_pem
}

# IAM role for RDS monitoring
resource "aws_iam_role" "rds_monitoring" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name = "ims-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-rds-monitoring-role"
    Environment = var.environment
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count = var.cloud_provider == "aws" ? 1 : 0

  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

#################################################
# Azure Resources
#################################################

# Azure PostgreSQL for reference data
resource "azurerm_postgresql_flexible_server" "postgresql" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                   = "ims-${var.environment}-postgresql"
  resource_group_name    = var.resource_group_name
  location               = var.region
  version                = "15"
  administrator_login    = "ims_admin"
  administrator_password = random_password.postgresql.result
  storage_mb             = var.db_storage_gb * 1024
  sku_name               = "GP_Standard_D4s_v3"
  backup_retention_days  = var.db_backup_retention_days
  geo_redundant_backup_enabled = var.db_multi_az
  zone                   = "1"
  
  high_availability {
    mode = var.db_multi_az ? "ZoneRedundant" : "Disabled"
  }
  
  maintenance_window {
    day_of_week  = 0
    start_hour   = 4
    start_minute = 30
  }

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-postgresql"
    Environment = var.environment
  })
}

resource "azurerm_postgresql_flexible_server_database" "ims" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name      = "ims"
  server_id = azurerm_postgresql_flexible_server.postgresql[0].id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Azure PostgreSQL for TimescaleDB
resource "azurerm_postgresql_flexible_server" "timescaledb" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                   = "ims-${var.environment}-timescaledb"
  resource_group_name    = var.resource_group_name
  location               = var.region
  version                = "15"
  administrator_login    = "ims_admin"
  administrator_password = random_password.timescaledb.result
  storage_mb             = var.db_storage_gb * 2 * 1024
  sku_name               = "GP_Standard_D8s_v3"
  backup_retention_days  = var.db_backup_retention_days
  geo_redundant_backup_enabled = var.db_multi_az
  zone                   = "1"
  
  high_availability {
    mode = var.db_multi_az ? "ZoneRedundant" : "Disabled"
  }
  
  maintenance_window {
    day_of_week  = 0
    start_hour   = 4
    start_minute = 30
  }

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-timescaledb"
    Environment = var.environment
  })
}

resource "azurerm_postgresql_flexible_server_database" "ims_timeseries" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name      = "ims_timeseries"
  server_id = azurerm_postgresql_flexible_server.timescaledb[0].id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_configuration" "timescaledb_extension" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name      = "shared_preload_libraries"
  server_id = azurerm_postgresql_flexible_server.timescaledb[0].id
  value     = "timescaledb"
}

# Azure Redis Cache for caching
resource "azurerm_redis_cache" "redis" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                = "ims-${var.environment}-redis"
  resource_group_name = var.resource_group_name
  location            = var.region
  capacity            = 4
  family              = "P"
  sku_name            = "Premium"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
  shard_count         = var.redis_num_shards

  redis_configuration {
    maxmemory_policy          = "volatile-lru"
    maxfragmentationmemory_reserved = "50"
    maxmemory_reserved              = "50"
  }

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-redis"
    Environment = var.environment
  })
}

# Azure Cosmos DB with Cassandra API for position data
resource "azurerm_cosmosdb_account" "cassandra" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                = "ims-${var.environment}-cassandra"
  resource_group_name = var.resource_group_name
  location            = var.region
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }

  geo_location {
    location          = var.region
    failover_priority = 0
  }

  capabilities {
    name = "EnableCassandra"
  }

  enable_automatic_failover      = var.db_multi_az
  enable_multiple_write_locations = var.db_multi_az
  is_virtual_network_filter_enabled = true

  virtual_network_rule {
    id = data.azurerm_subnet.database[0].id
  }

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-cassandra"
    Environment = var.environment
  })
}

resource "azurerm_cosmosdb_cassandra_keyspace" "ims" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                = "ims_${var.environment}"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.cassandra[0].name
  throughput          = 4000
}

resource "azurerm_cosmosdb_cassandra_table" "positions" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                = "positions"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.cassandra[0].name
  keyspace_name       = azurerm_cosmosdb_cassandra_keyspace.ims[0].name
  throughput          = 4000

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

    clustering_key {
    }
  }
}

resource "azurerm_cosmosdb_cassandra_table" "settlement_ladder" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                = "settlement_ladder"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.cassandra[0].name
  keyspace_name       = azurerm_cosmosdb_cassandra_keyspace.ims[0].name
  throughput          = 4000

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
      name = "settlement_date"
      type = "date"
    }
    column {
      name = "deliver_qty"
      type = "decimal"
    }
    column {
      name = "receipt_qty"
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
      name = "settlement_date"
    }

    clustering_key {
    }
  }
}

# Azure VMs for InfluxDB
resource "tls_private_key" "influxdb_azure" {
  count = var.cloud_provider == "azure" ? 1 : 0

  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "azurerm_key_vault_secret" "influxdb_ssh_key" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name         = "ims-${var.environment}-influxdb-ssh-key"
  value        = tls_private_key.influxdb_azure[0].private_key_pem
  key_vault_id = data.azurerm_key_vault.secrets[0].id
  content_type = "text/plain"

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-influxdb-ssh-key"
    Environment = var.environment
  })
}

resource "azurerm_network_interface" "influxdb" {
  count = var.cloud_provider == "azure" ? var.influxdb_node_count : 0

  name                = "ims-${var.environment}-influxdb-nic-${count.index + 1}"
  resource_group_name = var.resource_group_name
  location            = var.region

  ip_configuration {
    name                          = "internal"
    subnet_id                     = data.azurerm_subnet.database[0].id
    private_ip_address_allocation = "Dynamic"
  }

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-influxdb-nic-${count.index + 1}"
    Environment = var.environment
  })
}

resource "azurerm_linux_virtual_machine" "influxdb" {
  count = var.cloud_provider == "azure" ? var.influxdb_node_count : 0

  name                = "ims-${var.environment}-influxdb-${count.index + 1}"
  resource_group_name = var.resource_group_name
  location            = var.region
  size                = "Standard_D8s_v3"
  admin_username      = "ims_admin"
  
  admin_ssh_key {
    username   = "ims_admin"
    public_key = tls_private_key.influxdb_azure[0].public_key_openssh
  }

  network_interface_ids = [
    azurerm_network_interface.influxdb[count.index].id,
  ]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 100
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "UbuntuServer"
    sku       = "18.04-LTS"
    version   = "latest"
  }

  custom_data = base64encode(file("${path.module}/scripts/influxdb-setup.sh"))

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-influxdb-${count.index + 1}"
    Environment = var.environment
  })
}

resource "azurerm_managed_disk" "influxdb_data" {
  count = var.cloud_provider == "azure" ? var.influxdb_node_count : 0

  name                 = "ims-${var.environment}-influxdb-data-${count.index + 1}"
  resource_group_name  = var.resource_group_name
  location             = var.region
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 500

  tags = merge(var.tags, {
    Name        = "ims-${var.environment}-influxdb-data-${count.index + 1}"
    Environment = var.environment
  })
}

resource "azurerm_virtual_machine_data_disk_attachment" "influxdb_data" {
  count = var.cloud_provider == "azure" ? var.influxdb_node_count : 0

  managed_disk_id    = azurerm_managed_disk.influxdb_data[count.index].id
  virtual_machine_id = azurerm_linux_virtual_machine.influxdb[count.index].id
  lun                = 0
  caching            = "ReadWrite"
}

# Kafka / Event Hub infrastructure via messaging module
module "messaging" {
  count  = 1
  source = "../messaging"

  environment         = var.environment
  region              = var.region
  cloud_provider      = var.cloud_provider
  vpc_id              = var.vpc_id
  subnet_ids          = var.subnet_ids
  security_group_ids  = var.security_group_ids
  resource_group_name = var.resource_group_name
  broker_instance_type = var.kafka_broker_type
  broker_count        = var.kafka_broker_count
  broker_storage_gb   = 1000
  enable_encryption   = var.enable_encryption
  enable_monitoring   = true
  tags                = var.tags
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
  description = "Region where the database infrastructure will be deployed"
  type        = string
}

variable "cloud_provider" {
  description = "Cloud provider where the database infrastructure will be deployed (aws or azure)"
  type        = string
  validation {
    condition     = contains(["aws", "azure"], var.cloud_provider)
    error_message = "Cloud provider must be one of: aws, azure"
  }
}

variable "vpc_id" {
  description = "ID of the VPC where the database infrastructure will be deployed (AWS only)"
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = "List of subnet IDs where the database infrastructure will be deployed"
  type        = list(string)
  default     = []
}

variable "security_group_ids" {
  description = "List of security group IDs to associate with the database infrastructure (AWS only)"
  type        = list(string)
  default     = []
}

variable "resource_group_name" {
  description = "Name of the resource group where the database infrastructure will be deployed (Azure only)"
  type        = string
  default     = ""
}

variable "db_instance_class" {
  description = "Instance class for RDS instances (AWS only)"
  type        = string
  default     = "db.r5.large"
}

variable "db_storage_gb" {
  description = "Storage size in GB for database instances"
  type        = number
  default     = 100
}

variable "db_backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "db_multi_az" {
  description = "Whether to enable multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

variable "db_deletion_protection" {
  description = "Whether to enable deletion protection for database instances"
  type        = bool
  default     = true
}

variable "redis_node_type" {
  description = "Node type for Redis cache (AWS only)"
  type        = string
  default     = "cache.r5.large"
}

variable "redis_num_shards" {
  description = "Number of shards for Redis cluster"
  type        = number
  default     = 3
}

variable "redis_replicas_per_shard" {
  description = "Number of replicas per shard for Redis cluster"
  type        = number
  default     = 2
}

variable "cassandra_node_count" {
  description = "Number of nodes for Cassandra cluster"
  type        = number
  default     = 3
}

variable "influxdb_node_count" {
  description = "Number of nodes for InfluxDB cluster"
  type        = number
  default     = 3
}

variable "kafka_broker_type" {
  description = "Instance type for Kafka brokers (AWS only)"
  type        = string
  default     = "kafka.m5.large"
}

variable "kafka_broker_count" {
  description = "Number of Kafka brokers"
  type        = number
  default     = 3
}

variable "enable_encryption" {
  description = "Whether to enable encryption for database resources"
  type        = bool
  default     = true
}

variable "enable_performance_insights" {
  description = "Whether to enable performance insights for RDS instances (AWS only)"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Outputs
output "postgresql_endpoint" {
  description = "The connection endpoint for the PostgreSQL database"
  value       = var.cloud_provider == "aws" ? aws_db_instance.postgresql[0].endpoint : azurerm_postgresql_flexible_server.postgresql[0].fqdn
  sensitive   = false
}

output "timescaledb_endpoint" {
  description = "The connection endpoint for the TimescaleDB database"
  value       = var.cloud_provider == "aws" ? aws_db_instance.timescaledb[0].endpoint : azurerm_postgresql_flexible_server.timescaledb[0].fqdn
  sensitive   = false
}

output "redis_endpoint" {
  description = "The connection endpoint for the Redis cache"
  value       = var.cloud_provider == "aws" ? aws_elasticache_replication_group.redis[0].primary_endpoint_address : azurerm_redis_cache.redis[0].hostname
  sensitive   = false
}

output "cassandra_keyspace_name" {
  description = "The name of the Cassandra keyspace"
  value       = var.cloud_provider == "aws" ? aws_keyspaces_keyspace.ims[0].name : azurerm_cosmosdb_cassandra_keyspace.ims[0].name
  sensitive   = false
}

output "influxdb_endpoints" {
  description = "The endpoints of the InfluxDB instances"
  value       = var.cloud_provider == "aws" ? aws_instance.influxdb[*].private_ip : azurerm_linux_virtual_machine.influxdb[*].private_ip_address
  sensitive   = false
}

output "kafka_endpoint" {
  description = "The endpoint for the Kafka cluster"
  value       = var.cloud_provider == "aws" ? module.messaging[0].kafka_bootstrap_servers : module.messaging[0].eventhub_connection_string
  sensitive   = true
}