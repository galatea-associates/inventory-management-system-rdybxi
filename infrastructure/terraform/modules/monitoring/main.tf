# Terraform module for monitoring resources in the Inventory Management System (IMS)

# External provider dependencies
# AWS provider for managing CloudWatch and monitoring resources - version ~> 4.0
# AzureRM provider for managing Azure Monitor resources - version ~> 3.0

# Local variables
locals {
  monitoring_tags = {
    Component = "Monitoring"
    ManagedBy = "Terraform"
  }

  # System dashboard definition
  system_dashboard_definition = {
    widgets = [
      # API Gateway Response Time
      {
        type       = "metric"
        x          = 0
        y          = 0
        width      = 12
        height     = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "${data.aws_lb.api_gateway[0].arn_suffix}", {"stat": "p99"}]
          ]
          view     = "timeSeries"
          stacked  = false
          region   = var.region
          title    = "API Gateway Response Time (p99)"
          period   = 60
          annotations = {
            horizontal = [
              {
                value = var.performance_thresholds.api_latency_ms / 1000
                label = "SLA Threshold (${var.performance_thresholds.api_latency_ms}ms)"
                color = "#ff0000"
              }
            ]
          }
        }
      },
      # Position Calculation Latency
      {
        type       = "metric"
        x          = 12
        y          = 0
        width      = 12
        height     = 6
        properties = {
          metrics = [
            ["IMS/Calculation", "CalculationLatency", {"stat": "p99"}]
          ]
          view     = "timeSeries"
          stacked  = false
          region   = var.region
          title    = "Position Calculation Latency (p99)"
          period   = 60
          annotations = {
            horizontal = [
              {
                value = var.performance_thresholds.calculation_latency_ms / 1000
                label = "SLA Threshold (${var.performance_thresholds.calculation_latency_ms}ms)"
                color = "#ff0000"
              }
            ]
          }
        }
      },
      # Short Sell Approval Latency
      {
        type       = "metric"
        x          = 0
        y          = 6
        width      = 12
        height     = 6
        properties = {
          metrics = [
            ["IMS/Workflow", "ShortSellApprovalLatency", {"stat": "p99"}]
          ]
          view     = "timeSeries"
          stacked  = false
          region   = var.region
          title    = "Short Sell Approval Latency (p99)"
          period   = 60
          annotations = {
            horizontal = [
              {
                value = var.performance_thresholds.short_sell_latency_ms / 1000
                label = "SLA Threshold (${var.performance_thresholds.short_sell_latency_ms}ms)"
                color = "#ff0000"
              }
            ]
          }
        }
      },
      # Event Processing Throughput
      {
        type       = "metric"
        x          = 12
        y          = 6
        width      = 12
        height     = 6
        properties = {
          metrics = [
            ["IMS/EventProcessing", "EventsProcessedPerSecond", {"stat": "Average"}]
          ]
          view     = "timeSeries"
          stacked  = false
          region   = var.region
          title    = "Event Processing Throughput"
          period   = 60
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
      # EKS Pod CPU Utilization
      {
        type       = "metric"
        x          = 0
        y          = 12
        width      = 8
        height     = 6
        properties = {
          metrics = [
            ["AWS/EKS", "pod_cpu_utilization", "ClusterName", var.eks_cluster_name, {"stat": "Average"}]
          ]
          view     = "timeSeries"
          stacked  = false
          region   = var.region
          title    = "EKS Pod CPU Utilization"
          period   = 60
          annotations = {
            horizontal = [
              {
                value = var.performance_thresholds.cpu_utilization_percent
                label = "Warning Threshold (${var.performance_thresholds.cpu_utilization_percent}%)"
                color = "#ff9900"
              }
            ]
          }
        }
      },
      # EKS Pod Memory Utilization
      {
        type       = "metric"
        x          = 8
        y          = 12
        width      = 8
        height     = 6
        properties = {
          metrics = [
            ["AWS/EKS", "pod_memory_utilization", "ClusterName", var.eks_cluster_name, {"stat": "Average"}]
          ]
          view     = "timeSeries"
          stacked  = false
          region   = var.region
          title    = "EKS Pod Memory Utilization"
          period   = 60
          annotations = {
            horizontal = [
              {
                value = var.performance_thresholds.memory_utilization_percent
                label = "Warning Threshold (${var.performance_thresholds.memory_utilization_percent}%)"
                color = "#ff9900"
              }
            ]
          }
        }
      },
      # Service Unavailability Events
      {
        type       = "metric"
        x          = 16
        y          = 12
        width      = 8
        height     = 6
        properties = {
          metrics = [
            ["IMS/Availability", "ServiceUnavailableErrors", {"stat": "Sum"}]
          ]
          view     = "timeSeries"
          stacked  = false
          region   = var.region
          title    = "Service Unavailability Events"
          period   = 60
        }
      }
    ]
  }

  # SLA dashboard definition
  sla_dashboard_definition = {
    widgets = [
      # SLA Performance - Latency
      {
        type       = "metric"
        x          = 0
        y          = 0
        width      = 24
        height     = 6
        properties = {
          metrics = [
            ["IMS/EventProcessing", "EventProcessingLatency", {"stat": "p99"}],
            ["IMS/Calculation", "CalculationLatency", {"stat": "p99"}],
            ["IMS/Workflow", "ShortSellApprovalLatency", {"stat": "p99"}]
          ]
          view     = "timeSeries"
          stacked  = false
          region   = var.region
          title    = "SLA Performance - Latency (p99)"
          period   = 60
          annotations = {
            horizontal = [
              {
                value = var.performance_thresholds.calculation_latency_ms / 1000
                label = "Event Processing SLA (${var.performance_thresholds.calculation_latency_ms}ms)"
                color = "#ff0000"
              },
              {
                value = var.performance_thresholds.short_sell_latency_ms / 1000
                label = "Short Sell SLA (${var.performance_thresholds.short_sell_latency_ms}ms)"
                color = "#ff9900"
              }
            ]
          }
        }
      },
      # Event Processing Throughput
      {
        type       = "metric"
        x          = 0
        y          = 6
        width      = 12
        height     = 6
        properties = {
          metrics = [
            ["IMS/EventProcessing", "EventsProcessedPerSecond", {"stat": "Average"}]
          ]
          view     = "timeSeries"
          stacked  = false
          region   = var.region
          title    = "Event Processing Throughput"
          period   = 60
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
      # Service Unavailability Events
      {
        type       = "metric"
        x          = 12
        y          = 6
        width      = 12
        height     = 6
        properties = {
          metrics = [
            ["IMS/Availability", "ServiceUnavailableErrors", {"stat": "Sum"}]
          ]
          view     = "timeSeries"
          stacked  = false
          region   = var.region
          title    = "Service Unavailability Events"
          period   = 60
        }
      },
      # SLA Requirements Text
      {
        type       = "text"
        x          = 0
        y          = 12
        width      = 24
        height     = 3
        properties = {
          markdown = "## SLA Requirements\n* System Availability: 99.999% uptime during operational hours (24x6)\n* Event Processing: Process 300,000+ events per second with end-to-end latency under 200ms\n* Short Sell Approval: Complete workflow in under 150ms\n* UI Response: Dashboard load time under 3 seconds"
        }
      }
    ]
  }
}

# Data sources
data "aws_lb" "api_gateway" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  tags = {
    Name = "ims-${var.environment}-api-gateway"
  }
}

data "azurerm_application_gateway" "api_gateway" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "ims-${var.environment}-api-gateway"
  resource_group_name = "ims-${var.environment}-networking"
}

# AWS Resources
# KMS Key for log encryption
resource "aws_kms_key" "logs_key" {
  count                   = var.cloud_provider == "aws" ? 1 : 0
  description             = "KMS key for encrypting CloudWatch logs"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = merge(var.tags, local.monitoring_tags)
}

resource "aws_kms_alias" "logs_key_alias" {
  count         = var.cloud_provider == "aws" ? 1 : 0
  name          = "alias/ims-${var.environment}-logs-key"
  target_key_id = aws_kms_key.logs_key[0].key_id
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application_logs" {
  count             = var.cloud_provider == "aws" ? 1 : 0
  name              = "/ims/${var.environment}/application"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.cloud_provider == "aws" ? aws_kms_key.logs_key[0].arn : null
  tags              = merge(var.tags, local.monitoring_tags)
}

resource "aws_cloudwatch_log_group" "infrastructure_logs" {
  count             = var.cloud_provider == "aws" ? 1 : 0
  name              = "/ims/${var.environment}/infrastructure"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.cloud_provider == "aws" ? aws_kms_key.logs_key[0].arn : null
  tags              = merge(var.tags, local.monitoring_tags)
}

resource "aws_cloudwatch_log_group" "service_logs" {
  for_each          = var.cloud_provider == "aws" ? toset(var.monitored_services) : toset([])
  name              = "/ims/${var.environment}/services/${each.key}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.cloud_provider == "aws" ? aws_kms_key.logs_key[0].arn : null
  tags              = merge(var.tags, local.monitoring_tags, { Service = each.key })
}

# SNS Topic for Alarm Notifications
resource "aws_sns_topic" "alarm_notifications" {
  count             = var.cloud_provider == "aws" ? 1 : 0
  name              = "ims-${var.environment}-alarm-notifications"
  kms_master_key_id = var.cloud_provider == "aws" ? aws_kms_key.logs_key[0].arn : null
  tags              = merge(var.tags, local.monitoring_tags)
}

resource "aws_sns_topic_subscription" "email_subscription" {
  count      = var.cloud_provider == "aws" && var.alarm_email != "" ? 1 : 0
  topic_arn  = aws_sns_topic.alarm_notifications[0].arn
  protocol   = "email"
  endpoint   = var.alarm_email
}

# CloudWatch Alarms
# API Latency Alarm
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  count               = var.cloud_provider == "aws" ? 1 : 0
  alarm_name          = "ims-${var.environment}-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "p99"
  threshold           = var.performance_thresholds.api_latency_ms / 1000 # Convert ms to seconds
  alarm_description   = "This alarm monitors for API Gateway response time exceeding the threshold"
  alarm_actions       = [aws_sns_topic.alarm_notifications[0].arn]
  ok_actions          = [aws_sns_topic.alarm_notifications[0].arn]
  dimensions = {
    LoadBalancer = data.aws_lb.api_gateway[0].arn_suffix
  }
  tags = merge(var.tags, local.monitoring_tags)
}

# Calculation Latency Alarm
resource "aws_cloudwatch_metric_alarm" "calculation_latency" {
  count               = var.cloud_provider == "aws" ? 1 : 0
  alarm_name          = "ims-${var.environment}-calculation-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CalculationLatency"
  namespace           = "IMS/Calculation"
  period              = 60
  statistic           = "p99"
  threshold           = var.performance_thresholds.calculation_latency_ms / 1000 # Convert ms to seconds
  alarm_description   = "This alarm monitors for calculation latency exceeding the threshold"
  alarm_actions       = [aws_sns_topic.alarm_notifications[0].arn]
  ok_actions          = [aws_sns_topic.alarm_notifications[0].arn]
  tags                = merge(var.tags, local.monitoring_tags)
}

# Short Sell Latency Alarm
resource "aws_cloudwatch_metric_alarm" "short_sell_latency" {
  count               = var.cloud_provider == "aws" ? 1 : 0
  alarm_name          = "ims-${var.environment}-short-sell-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ShortSellApprovalLatency"
  namespace           = "IMS/Workflow"
  period              = 60
  statistic           = "p99"
  threshold           = var.performance_thresholds.short_sell_latency_ms / 1000 # Convert ms to seconds
  alarm_description   = "This alarm monitors for short sell approval latency exceeding the threshold"
  alarm_actions       = [aws_sns_topic.alarm_notifications[0].arn]
  ok_actions          = [aws_sns_topic.alarm_notifications[0].arn]
  tags                = merge(var.tags, local.monitoring_tags)
}

# Event Processing Throughput Alarm
resource "aws_cloudwatch_metric_alarm" "event_processing_throughput" {
  count               = var.cloud_provider == "aws" ? 1 : 0
  alarm_name          = "ims-${var.environment}-event-processing-throughput"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "EventsProcessedPerSecond"
  namespace           = "IMS/EventProcessing"
  period              = 300 # 5 minutes
  statistic           = "Average"
  threshold           = 250000 # Warning at 250,000, requirement is 300,000
  alarm_description   = "This alarm monitors for event processing throughput below the required 300,000 events per second (warning at 250,000)"
  alarm_actions       = [aws_sns_topic.alarm_notifications[0].arn]
  ok_actions          = [aws_sns_topic.alarm_notifications[0].arn]
  tags                = merge(var.tags, local.monitoring_tags)
}

# System Availability Alarm
resource "aws_cloudwatch_metric_alarm" "system_availability" {
  count               = var.cloud_provider == "aws" ? 1 : 0
  alarm_name          = "ims-${var.environment}-system-availability"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ServiceUnavailableErrors"
  namespace           = "IMS/Availability"
  period              = 60
  statistic           = "Sum"
  threshold           = 0 # Any service unavailability is a concern
  alarm_description   = "This alarm monitors for service unavailability to ensure 99.999% uptime SLA"
  alarm_actions       = [aws_sns_topic.alarm_notifications[0].arn]
  ok_actions          = [aws_sns_topic.alarm_notifications[0].arn]
  tags                = merge(var.tags, local.monitoring_tags)
}

# CloudWatch Log Metric Filters
# Event Processing Latency Filter
resource "aws_cloudwatch_log_metric_filter" "event_processing_latency" {
  count           = var.cloud_provider == "aws" && contains(var.monitored_services, "data-ingestion") ? 1 : 0
  name            = "EventProcessingLatency"
  pattern         = "[timestamp, level, service=EventProcessing, latency=*ms, message]"
  log_group_name  = var.cloud_provider == "aws" ? aws_cloudwatch_log_group.service_logs["data-ingestion"].name : ""

  metric_transformation {
    name      = "EventProcessingLatency"
    namespace = "IMS/EventProcessing"
    value     = "$latency / 1000" # Convert ms to seconds
    default_value = "0"
  }
}

# Event Throughput Filter
resource "aws_cloudwatch_log_metric_filter" "event_throughput" {
  count           = var.cloud_provider == "aws" && contains(var.monitored_services, "data-ingestion") ? 1 : 0
  name            = "EventThroughput"
  pattern         = "[timestamp, level, service=EventProcessing, throughput=*eps, message]"
  log_group_name  = var.cloud_provider == "aws" ? aws_cloudwatch_log_group.service_logs["data-ingestion"].name : ""

  metric_transformation {
    name      = "EventsProcessedPerSecond"
    namespace = "IMS/EventProcessing"
    value     = "$throughput"
    default_value = "0"
  }
}

# Calculation Latency Filter
resource "aws_cloudwatch_log_metric_filter" "calculation_latency" {
  count           = var.cloud_provider == "aws" && contains(var.monitored_services, "calculation") ? 1 : 0
  name            = "CalculationLatency"
  pattern         = "[timestamp, level, service=Calculation, latency=*ms, message]"
  log_group_name  = var.cloud_provider == "aws" ? aws_cloudwatch_log_group.service_logs["calculation"].name : ""

  metric_transformation {
    name      = "CalculationLatency"
    namespace = "IMS/Calculation"
    value     = "$latency / 1000" # Convert ms to seconds
    default_value = "0"
  }
}

# Short Sell Latency Filter
resource "aws_cloudwatch_log_metric_filter" "short_sell_latency" {
  count           = var.cloud_provider == "aws" && contains(var.monitored_services, "workflow") ? 1 : 0
  name            = "ShortSellApprovalLatency"
  pattern         = "[timestamp, level, service=Workflow, operation=ShortSellApproval, latency=*ms, message]"
  log_group_name  = var.cloud_provider == "aws" ? aws_cloudwatch_log_group.service_logs["workflow"].name : ""

  metric_transformation {
    name      = "ShortSellApprovalLatency"
    namespace = "IMS/Workflow"
    value     = "$latency / 1000" # Convert ms to seconds
    default_value = "0"
  }
}

# Service Unavailable Filter
resource "aws_cloudwatch_log_metric_filter" "service_unavailable" {
  count           = var.cloud_provider == "aws" ? 1 : 0
  name            = "ServiceUnavailable"
  pattern         = "[timestamp, level=ERROR, service=*, message=*Service unavailable*]"
  log_group_name  = var.cloud_provider == "aws" ? aws_cloudwatch_log_group.application_logs[0].name : ""

  metric_transformation {
    name      = "ServiceUnavailableErrors"
    namespace = "IMS/Availability"
    value     = "1"
    default_value = "0"
  }
}

# CloudWatch Dashboards
resource "aws_cloudwatch_dashboard" "system_overview" {
  count           = var.cloud_provider == "aws" ? 1 : 0
  dashboard_name  = "IMS-${var.environment}-System-Overview"
  dashboard_body  = jsonencode(local.system_dashboard_definition)
}

resource "aws_cloudwatch_dashboard" "sla_compliance" {
  count           = var.cloud_provider == "aws" ? 1 : 0
  dashboard_name  = "IMS-${var.environment}-SLA-Compliance"
  dashboard_body  = jsonencode(local.sla_dashboard_definition)
}

# Azure Resources
resource "azurerm_resource_group" "monitoring" {
  count    = var.cloud_provider == "azure" ? 1 : 0
  name     = "ims-${var.environment}-monitoring"
  location = var.region
  tags     = var.tags
}

resource "azurerm_log_analytics_workspace" "ims" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "ims-${var.environment}-logs"
  resource_group_name = azurerm_resource_group.monitoring[0].name
  location            = var.region
  sku                 = "PerGB2018"
  retention_in_days   = var.log_retention_days
  tags                = merge(var.tags, local.monitoring_tags)
}

resource "azurerm_monitor_action_group" "critical" {
  count               = var.cloud_provider == "azure" && var.alarm_email != "" ? 1 : 0
  name                = "ims-${var.environment}-critical-alerts"
  resource_group_name = azurerm_resource_group.monitoring[0].name
  short_name          = "ims-critical"

  email_receiver {
    name                    = "ops-team"
    email_address           = var.alarm_email
    use_common_alert_schema = true
  }

  tags = merge(var.tags, local.monitoring_tags)
}

# Azure Metric Alerts
resource "azurerm_monitor_metric_alert" "api_latency" {
  count               = var.cloud_provider == "azure" && var.alarm_email != "" ? 1 : 0
  name                = "ims-${var.environment}-api-latency"
  resource_group_name = azurerm_resource_group.monitoring[0].name
  scopes              = [data.azurerm_application_gateway.api_gateway[0].id]
  description         = "This alert monitors for API Gateway response time exceeding the threshold"
  severity            = 1
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Network/applicationGateways"
    metric_name      = "BackendResponseLatency"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = var.performance_thresholds.api_latency_ms
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical[0].id
  }

  tags = merge(var.tags, local.monitoring_tags)
}

# Module outputs
output "log_group_names" {
  description = "Map of log group names created by the module"
  value = {
    service_logs = var.cloud_provider == "aws" ? { for service in var.monitored_services : service => aws_cloudwatch_log_group.service_logs[service].name } : {}
    application = var.cloud_provider == "aws" ? aws_cloudwatch_log_group.application_logs[0].name : var.cloud_provider == "azure" ? azurerm_log_analytics_workspace.ims[0].name : ""
    infrastructure = var.cloud_provider == "aws" ? aws_cloudwatch_log_group.infrastructure_logs[0].name : var.cloud_provider == "azure" ? azurerm_log_analytics_workspace.ims[0].name : ""
  }
}

output "notification_endpoint" {
  description = "The endpoint for alarm notifications"
  value = var.cloud_provider == "aws" ? aws_sns_topic.alarm_notifications[0].arn : var.cloud_provider == "azure" && var.alarm_email != "" ? azurerm_monitor_action_group.critical[0].id : ""
}

output "dashboard_names" {
  description = "List of dashboard names created by the module"
  value = var.cloud_provider == "aws" ? [aws_cloudwatch_dashboard.system_overview[0].dashboard_name, aws_cloudwatch_dashboard.sla_compliance[0].dashboard_name] : []
}

output "kms_key_arn" {
  description = "The ARN of the KMS key used for log encryption"
  value = var.cloud_provider == "aws" ? aws_kms_key.logs_key[0].arn : ""
}