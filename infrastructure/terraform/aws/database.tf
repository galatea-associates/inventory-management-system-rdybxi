# AWS Database Infrastructure for IMS
# Implementation of polyglot persistence approach with specialized databases for different data types

# Generate secure random passwords for database access
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

# Common tags to apply to all resources
locals {
  common_tags = {
    Project     = "IMS"
    Environment = "${var.environment}"
    ManagedBy   = "Terraform"
  }
}

# Parameter group for PostgreSQL RDS with optimized settings
resource "aws_db_parameter_group" "postgresql" {
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
  
  tags = {
    Name        = "ims-${var.environment}-postgresql-params"
    Environment = "${var.environment}"
  }
}

# PostgreSQL RDS instance for reference data and transactional data
resource "aws_db_instance" "postgresql" {
  identifier                  = "ims-${var.environment}-postgresql"
  engine                      = "postgres"
  engine_version              = "15.3"
  instance_class              = "${var.db_instance_class}"
  allocated_storage           = "${var.db_allocated_storage}"
  storage_type                = "gp3"
  storage_encrypted           = true
  db_name                     = "ims"
  username                    = "ims_admin"
  password                    = "${random_password.postgresql.result}"
  parameter_group_name        = "${aws_db_parameter_group.postgresql.name}"
  db_subnet_group_name        = "${database_subnet_group_name}"
  vpc_security_group_ids      = ["${database_security_group_id}"]
  backup_retention_period     = "${var.db_backup_retention}"
  backup_window               = "03:00-04:00"
  maintenance_window          = "sun:04:30-sun:05:30"
  multi_az                    = "${var.db_multi_az}"
  publicly_accessible         = false
  skip_final_snapshot         = false
  final_snapshot_identifier   = "ims-${var.environment}-postgresql-final"
  deletion_protection         = "${var.db_deletion_protection}"
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  auto_minor_version_upgrade  = true
  apply_immediately           = false
  monitoring_interval         = 30
  monitoring_role_arn         = "${aws_iam_role.rds_monitoring.arn}"
  
  tags = {
    Name        = "ims-${var.environment}-postgresql"
    Environment = "${var.environment}"
  }
}

# Parameter group for TimescaleDB RDS with optimized settings
resource "aws_db_parameter_group" "timescaledb" {
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
  
  tags = {
    Name        = "ims-${var.environment}-timescaledb-params"
    Environment = "${var.environment}"
  }
}

# TimescaleDB RDS instance for time-series market data
resource "aws_db_instance" "timescaledb" {
  identifier                  = "ims-${var.environment}-timescaledb"
  engine                      = "postgres"
  engine_version              = "15.3"
  instance_class              = "${var.timescaledb_instance_class}"
  allocated_storage           = "${var.db_allocated_storage * 2}"
  storage_type                = "gp3"
  storage_encrypted           = true
  db_name                     = "ims_timeseries"
  username                    = "ims_admin"
  password                    = "${random_password.timescaledb.result}"
  parameter_group_name        = "${aws_db_parameter_group.timescaledb.name}"
  db_subnet_group_name        = "${database_subnet_group_name}"
  vpc_security_group_ids      = ["${database_security_group_id}"]
  backup_retention_period     = "${var.db_backup_retention}"
  backup_window               = "03:00-04:00"
  maintenance_window          = "sun:04:30-sun:05:30"
  multi_az                    = "${var.db_multi_az}"
  publicly_accessible         = false
  skip_final_snapshot         = false
  final_snapshot_identifier   = "ims-${var.environment}-timescaledb-final"
  deletion_protection         = "${var.db_deletion_protection}"
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  auto_minor_version_upgrade  = true
  apply_immediately           = false
  monitoring_interval         = 30
  monitoring_role_arn         = "${aws_iam_role.rds_monitoring.arn}"
  
  tags = {
    Name        = "ims-${var.environment}-timescaledb"
    Environment = "${var.environment}"
  }
}

# Parameter group for Redis ElastiCache with optimized settings
resource "aws_elasticache_parameter_group" "redis" {
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
  
  tags = {
    Name        = "ims-${var.environment}-redis-params"
    Environment = "${var.environment}"
  }
}

# Redis ElastiCache cluster for caching and pub/sub messaging
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id        = "ims-${var.environment}-redis"
  description                 = "Redis cluster for IMS caching and pub/sub"
  node_type                   = "${var.cache_node_type}"
  port                        = 6379
  parameter_group_name        = "${aws_elasticache_parameter_group.redis.name}"
  subnet_group_name           = "${elasticache_subnet_group_name}"
  security_group_ids          = ["${elasticache_security_group_id}"]
  automatic_failover_enabled  = true
  multi_az_enabled            = true
  num_node_groups             = 3
  replicas_per_node_group     = 2
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token                  = "${random_password.redis.result}"
  snapshot_retention_limit    = 7
  snapshot_window             = "03:00-04:00"
  maintenance_window          = "sun:04:30-sun:05:30"
  auto_minor_version_upgrade  = true
  apply_immediately           = false
  
  tags = {
    Name        = "ims-${var.environment}-redis"
    Environment = "${var.environment}"
  }
}

# Configuration for MSK Kafka cluster
resource "aws_msk_configuration" "kafka_config" {
  name           = "ims-${var.environment}-kafka-config"
  kafka_versions = ["3.4.0"]
  
  server_properties = <<EOF
auto.create.topics.enable=false
default.replication.factor=3
min.insync.replicas=2
num.io.threads=8
num.network.threads=5
num.partitions=8
num.replica.fetchers=2
replica.lag.time.max.ms=30000
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600
socket.send.buffer.bytes=102400
unclean.leader.election.enable=false
zookeeper.session.timeout.ms=18000
log.retention.hours=168
EOF
}

# MSK Kafka cluster for high-throughput event streaming
resource "aws_msk_cluster" "kafka" {
  cluster_name           = "ims-${var.environment}-kafka"
  kafka_version          = "3.4.0"
  number_of_broker_nodes = "${var.kafka_broker_count}"
  
  broker_node_group_info {
    instance_type   = "${var.kafka_broker_instance_type}"
    client_subnets  = database_subnet_ids
    security_groups = ["${kafka_security_group_id}"]
    
    storage_info {
      ebs_storage_info {
        volume_size = 1000
        provisioned_throughput {
          enabled           = true
          volume_throughput = 250
        }
      }
    }
  }
  
  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }
  
  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = true
      }
      node_exporter {
        enabled_in_broker = true
      }
    }
  }
  
  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled = true
      }
      s3 {
        enabled = true
        prefix  = "kafka/broker-logs/"
      }
    }
  }
  
  tags = {
    Name        = "ims-${var.environment}-kafka"
    Environment = "${var.environment}"
  }
}

# Amazon Keyspaces (Cassandra) keyspace for position data storage
resource "aws_keyspaces_keyspace" "ims" {
  name = "ims_${var.environment}"
  
  tags = {
    Name        = "ims-${var.environment}-keyspace"
    Environment = "${var.environment}"
  }
}

# Amazon Keyspaces table for positions
resource "aws_keyspaces_table" "positions" {
  keyspace_name = "${aws_keyspaces_keyspace.ims.name}"
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
    
    partition_key {
      name = "book_id"
    }
    partition_key {
      name = "security_id"
    }
    partition_key {
      name = "business_date"
    }
  }
  
  capacity_specification {
    throughput_mode = "PAY_PER_REQUEST"
  }
  
  encryption_specification {
    type = "CUSTOMER_MANAGED_KMS_KEY"
  }
  
  point_in_time_recovery {
    status = "ENABLED"
  }
  
  ttl {
    status = "ENABLED"
  }
  
  tags = {
    Name        = "ims-${var.environment}-positions-table"
    Environment = "${var.environment}"
  }
}

# Amazon Keyspaces table for settlement ladder
resource "aws_keyspaces_table" "settlement_ladder" {
  keyspace_name = "${aws_keyspaces_keyspace.ims.name}"
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
    
    partition_key {
      name = "book_id"
    }
    partition_key {
      name = "security_id"
    }
    partition_key {
      name = "settlement_date"
    }
  }
  
  capacity_specification {
    throughput_mode = "PAY_PER_REQUEST"
  }
  
  encryption_specification {
    type = "CUSTOMER_MANAGED_KMS_KEY"
  }
  
  point_in_time_recovery {
    status = "ENABLED"
  }
  
  ttl {
    status = "ENABLED"
  }
  
  tags = {
    Name        = "ims-${var.environment}-settlement-ladder-table"
    Environment = "${var.environment}"
  }
}

# Find latest Amazon Linux 2 AMI for InfluxDB instances
data "aws_ami" "amazon_linux_2" {
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

# Reference to IAM role for RDS enhanced monitoring
data "aws_iam_role" "rds_monitoring" {
  name = "ims-${var.environment}-rds-monitoring-role"
}

# EC2 instances for InfluxDB time-series database for market data
resource "aws_instance" "influxdb" {
  count                  = "${var.influxdb_node_count}"
  ami                    = "${data.aws_ami.amazon_linux_2.id}"
  instance_type          = "${var.influxdb_instance_type}"
  subnet_id              = "${element(database_subnet_ids, count.index % length(database_subnet_ids))}"
  vpc_security_group_ids = ["${database_security_group_id}"]
  key_name               = "${var.ssh_key_name}"
  
  root_block_device {
    volume_size           = 100
    volume_type           = "gp3"
    encrypted             = true
  }
  
  ebs_block_device {
    device_name           = "/dev/sdf"
    volume_size           = 500
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }
  
  user_data = "${file("${path.module}/scripts/influxdb-setup.sh")}"
  
  tags = {
    Name        = "ims-${var.environment}-influxdb-${count.index + 1}"
    Environment = "${var.environment}"
  }
}

# Outputs for database endpoints and connection information
output "postgresql_endpoint" {
  description = "The connection endpoint for the PostgreSQL RDS instance"
  value       = "${aws_db_instance.postgresql.endpoint}"
}

output "timescaledb_endpoint" {
  description = "The connection endpoint for the TimescaleDB RDS instance"
  value       = "${aws_db_instance.timescaledb.endpoint}"
}

output "redis_endpoint" {
  description = "The connection endpoint for the Redis ElastiCache cluster"
  value       = "${aws_elasticache_replication_group.redis.primary_endpoint_address}"
}

output "redis_reader_endpoint" {
  description = "The reader endpoint for the Redis ElastiCache cluster"
  value       = "${aws_elasticache_replication_group.redis.reader_endpoint_address}"
}

output "cassandra_keyspace_name" {
  description = "The name of the Cassandra keyspace in Amazon Keyspaces"
  value       = "${aws_keyspaces_keyspace.ims.name}"
}

output "kafka_bootstrap_brokers" {
  description = "The bootstrap broker string for the MSK Kafka cluster"
  value       = "${aws_msk_cluster.kafka.bootstrap_brokers_tls}"
  sensitive   = true
}

output "influxdb_endpoints" {
  description = "The private IP addresses of the InfluxDB instances"
  value       = "${aws_instance.influxdb.*.private_ip}"
}

output "postgresql_username" {
  description = "The master username for the PostgreSQL RDS instance"
  value       = "ims_admin"
  sensitive   = true
}

output "timescaledb_username" {
  description = "The master username for the TimescaleDB RDS instance"
  value       = "ims_admin"
  sensitive   = true
}