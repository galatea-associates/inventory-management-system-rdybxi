# AWS Monitoring Infrastructure for Inventory Management System (IMS)
# This file defines CloudWatch resources, alarms, dashboards, and log groups
# for comprehensive monitoring and observability of the IMS application.

# Use the monitoring module to create core monitoring resources
module "cloudwatch" {
  source                   = "../modules/monitoring"
  environment              = var.environment
  cloud_provider           = "aws"
  region                   = var.aws_region
  vpc_id                   = module.vpc.vpc_id
  eks_cluster_name         = module.eks.cluster_name
  rds_instance_id          = module.rds.instance_id
  elasticache_cluster_id   = module.elasticache.cluster_id
  msk_cluster_name         = module.msk.cluster_name
  log_retention_days       = var.log_retention_days
  alarm_email              = var.alarm_email
  enable_dashboard         = true
  enable_detailed_monitoring = true
  
  # Performance thresholds for alarms and monitoring
  performance_thresholds = {
    api_latency_ms = 500
    calculation_latency_ms = 200
    short_sell_latency_ms = 150
    cpu_utilization_percent = 80
    memory_utilization_percent = 80
    disk_utilization_percent = 80
    error_rate_threshold = 0.1
  }
  
  # List of services to be monitored
  monitored_services = [
    "data-ingestion",
    "calculation",
    "workflow",
    "api-gateway",
    "websocket"
  ]
  
  tags = local.common_tags
}

# CloudWatch Log Group for CloudTrail
resource "aws_cloudwatch_log_group" "cloudtrail" {
  count = var.enable_cloudtrail ? 1 : 0
  
  name              = "/aws/cloudtrail/ims-${var.environment}"
  retention_in_days = var.log_retention_days
  kms_key_id        = module.cloudwatch.kms_key_arn
  
  tags = merge(local.common_tags, {
    Name = "ims-${var.environment}-cloudtrail-logs"
  })
}

# CloudWatch Log Group for EKS Cluster
resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/ims-${var.environment}/cluster"
  retention_in_days = var.log_retention_days
  kms_key_id        = module.cloudwatch.kms_key_arn
  
  tags = merge(local.common_tags, {
    Name = "ims-${var.environment}-eks-cluster-logs"
  })
}

# CloudWatch Dashboard for System Overview
resource "aws_cloudwatch_dashboard" "ims_overview" {
  dashboard_name = "IMS-${var.environment}-Overview"
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        x = 0
        y = 0
        width = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", module.vpc.alb_arn_suffix, { "stat": "p99" }]
          ]
          view = "timeSeries"
          stacked = false
          region = var.aws_region
          title = "API Gateway Response Time (p99)"
          period = 60
          annotations = {
            horizontal = [
              {
                value = 0.5
                label = "SLA Threshold (500ms)"
                color = "#ff0000"
              }
            ]
          }
        }
      },
      {
        type = "metric"
        x = 12
        y = 0
        width = 12
        height = 6
        properties = {
          metrics = [
            ["IMS/Calculation", "CalculationLatency", { "stat": "p99" }]
          ]
          view = "timeSeries"
          stacked = false
          region = var.aws_region
          title = "Position Calculation Latency (p99)"
          period = 60
          annotations = {
            horizontal = [
              {
                value = 0.2
                label = "SLA Threshold (200ms)"
                color = "#ff0000"
              }
            ]
          }
        }
      },
      {
        type = "metric"
        x = 0
        y = 6
        width = 12
        height = 6
        properties = {
          metrics = [
            ["IMS/Workflow", "ShortSellApprovalLatency", { "stat": "p99" }]
          ]
          view = "timeSeries"
          stacked = false
          region = var.aws_region
          title = "Short Sell Approval Latency (p99)"
          period = 60
          annotations = {
            horizontal = [
              {
                value = 0.15
                label = "SLA Threshold (150ms)"
                color = "#ff0000"
              }
            ]
          }
        }
      },
      {
        type = "metric"
        x = 12
        y = 6
        width = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/Kafka", "BytesInPerSec", "Cluster Name", module.msk.cluster_name, { "stat": "Sum" }],
            ["AWS/Kafka", "BytesOutPerSec", "Cluster Name", module.msk.cluster_name, { "stat": "Sum" }]
          ]
          view = "timeSeries"
          stacked = false
          region = var.aws_region
          title = "Kafka Throughput"
          period = 60
        }
      },
      {
        type = "metric"
        x = 0
        y = 12
        width = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", module.rds.instance_id, { "stat": "Average" }]
          ]
          view = "timeSeries"
          stacked = false
          region = var.aws_region
          title = "RDS CPU Utilization"
          period = 60
          annotations = {
            horizontal = [
              {
                value = 80
                label = "Warning Threshold"
                color = "#ff9900"
              }
            ]
          }
        }
      },
      {
        type = "metric"
        x = 8
        y = 12
        width = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "ReplicationGroupId", module.elasticache.cluster_id, { "stat": "Average" }]
          ]
          view = "timeSeries"
          stacked = false
          region = var.aws_region
          title = "ElastiCache CPU Utilization"
          period = 60
          annotations = {
            horizontal = [
              {
                value = 80
                label = "Warning Threshold"
                color = "#ff9900"
              }
            ]
          }
        }
      },
      {
        type = "metric"
        x = 16
        y = 12
        width = 8
        height = 6
        properties = {
          metrics = [
            ["ContainerInsights", "node_cpu_utilization", "ClusterName", module.eks.cluster_name, { "stat": "Average" }]
          ]
          view = "timeSeries"
          stacked = false
          region = var.aws_region
          title = "EKS Node CPU Utilization"
          period = 60
          annotations = {
            horizontal = [
              {
                value = 80
                label = "Warning Threshold"
                color = "#ff9900"
              }
            ]
          }
        }
      }
    ]
  })
}

# CloudWatch Alarm for Event Processing SLA
resource "aws_cloudwatch_metric_alarm" "event_processing_sla" {
  alarm_name          = "ims-${var.environment}-event-processing-sla"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "EventProcessingLatency"
  namespace           = "IMS/EventProcessing"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 0.2  # 200ms
  alarm_description   = "This alarm monitors for event processing latency exceeding the 200ms SLA"
  alarm_actions       = [module.cloudwatch.notification_endpoint]
  ok_actions          = [module.cloudwatch.notification_endpoint]
  
  tags = merge(local.common_tags, {
    Name = "ims-${var.environment}-event-processing-sla-alarm"
  })
}

# CloudWatch Alarm for Event Processing Throughput
resource "aws_cloudwatch_metric_alarm" "event_throughput" {
  alarm_name          = "ims-${var.environment}-event-throughput"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "EventsProcessedPerSecond"
  namespace           = "IMS/EventProcessing"
  period              = 300  # 5 minutes
  statistic           = "Average"
  threshold           = 250000  # Warning at 250k (target is 300k)
  alarm_description   = "This alarm monitors for event processing throughput below the required 300,000 events per second (warning at 250,000)"
  alarm_actions       = [module.cloudwatch.notification_endpoint]
  ok_actions          = [module.cloudwatch.notification_endpoint]
  
  tags = merge(local.common_tags, {
    Name = "ims-${var.environment}-event-throughput-alarm"
  })
}

# CloudWatch Log Metric Filter for Event Processing Latency
resource "aws_cloudwatch_log_metric_filter" "event_processing_latency" {
  name           = "EventProcessingLatency"
  pattern        = "[timestamp, level, service=EventProcessing, latency=*ms, message]"
  log_group_name = module.cloudwatch.log_group_names.service_logs["data-ingestion"]
  
  metric_transformation {
    name      = "EventProcessingLatency"
    namespace = "IMS/EventProcessing"
    value     = "$latency / 1000"  # Convert ms to seconds
    default_value = "0"
  }
}

# CloudWatch Log Metric Filter for Event Processing Throughput
resource "aws_cloudwatch_log_metric_filter" "event_throughput_filter" {
  name           = "EventThroughput"
  pattern        = "[timestamp, level, service=EventProcessing, throughput=*eps, message]"
  log_group_name = module.cloudwatch.log_group_names.service_logs["data-ingestion"]
  
  metric_transformation {
    name      = "EventsProcessedPerSecond"
    namespace = "IMS/EventProcessing"
    value     = "$throughput"
    default_value = "0"
  }
}

# CloudWatch Log Metric Filter for System Availability
resource "aws_cloudwatch_log_metric_filter" "system_availability" {
  name           = "SystemAvailability"
  pattern        = "[timestamp, level=ERROR, service=*, message=*Service unavailable*]"
  log_group_name = module.cloudwatch.log_group_names.application
  
  metric_transformation {
    name      = "ServiceUnavailableErrors"
    namespace = "IMS/Availability"
    value     = "1"
    default_value = "0"
  }
}

# CloudWatch Alarm for System Availability (99.999% SLA)
resource "aws_cloudwatch_metric_alarm" "system_availability" {
  alarm_name          = "ims-${var.environment}-system-availability"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ServiceUnavailableErrors"
  namespace           = "IMS/Availability"
  period              = 60
  statistic           = "Sum"
  threshold           = 0  # Any unavailability is alertable
  alarm_description   = "This alarm monitors for service unavailability to ensure 99.999% uptime SLA"
  alarm_actions       = [module.cloudwatch.notification_endpoint]
  ok_actions          = [module.cloudwatch.notification_endpoint]
  
  tags = merge(local.common_tags, {
    Name = "ims-${var.environment}-system-availability-alarm"
  })
}

# CloudWatch Dashboard for SLA Compliance
resource "aws_cloudwatch_dashboard" "sla_compliance" {
  dashboard_name = "IMS-${var.environment}-SLA-Compliance"
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        x = 0
        y = 0
        width = 24
        height = 6
        properties = {
          metrics = [
            ["IMS/EventProcessing", "EventProcessingLatency", { "stat": "p99" }],
            ["IMS/Calculation", "CalculationLatency", { "stat": "p99" }],
            ["IMS/Workflow", "ShortSellApprovalLatency", { "stat": "p99" }]
          ]
          view = "timeSeries"
          stacked = false
          region = var.aws_region
          title = "SLA Performance - Latency (p99)"
          period = 60
          annotations = {
            horizontal = [
              {
                value = 0.2
                label = "Event Processing SLA (200ms)"
                color = "#ff0000"
              },
              {
                value = 0.15
                label = "Short Sell SLA (150ms)"
                color = "#ff9900"
              }
            ]
          }
        }
      },
      {
        type = "metric"
        x = 0
        y = 6
        width = 12
        height = 6
        properties = {
          metrics = [
            ["IMS/EventProcessing", "EventsProcessedPerSecond", { "stat": "Average" }]
          ]
          view = "timeSeries"
          stacked = false
          region = var.aws_region
          title = "Event Processing Throughput"
          period = 60
          annotations = {
            horizontal = [
              {
                value = 300000
                label = "Required Throughput (300,000 eps)"
                color = "#ff0000"
              },
              {
                value = 250000
                label = "Warning Threshold (250,000 eps)"
                color = "#ff9900"
              }
            ]
          }
        }
      },
      {
        type = "metric"
        x = 12
        y = 6
        width = 12
        height = 6
        properties = {
          metrics = [
            ["IMS/Availability", "ServiceUnavailableErrors", { "stat": "Sum" }]
          ]
          view = "timeSeries"
          stacked = false
          region = var.aws_region
          title = "Service Unavailability Events"
          period = 60
        }
      },
      {
        type = "text"
        x = 0
        y = 12
        width = 24
        height = 3
        properties = {
          markdown = "## SLA Requirements\n* System Availability: 99.999% uptime during operational hours (24x6)\n* Event Processing: Process 300,000+ events per second with end-to-end latency under 200ms\n* Short Sell Approval: Complete workflow in under 150ms\n* UI Response: Dashboard load time under 3 seconds"
        }
      }
    ]
  })
}

# Data sources for account and region information
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Define monitoring-specific tags
locals {
  monitoring_tags = {
    Component = "Monitoring"
    ManagedBy = "Terraform"
  }
}