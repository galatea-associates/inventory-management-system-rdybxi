# Azure provider is implicitly imported from main.tf or provider.tf

# Data source to get information about the current Azure subscription
data "azurerm_subscription" "current" {}

# -----------------------------------------------------------------------------
# Log Analytics Workspace - Central repository for logs and metrics
# -----------------------------------------------------------------------------
resource "azurerm_log_analytics_workspace" "ims" {
  name                = "ims-${var.environment}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_retention_days
  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# -----------------------------------------------------------------------------
# Application Insights - Application monitoring and distributed tracing
# -----------------------------------------------------------------------------
resource "azurerm_application_insights" "ims" {
  name                = "ims-${var.environment}-appinsights"
  location            = var.location
  resource_group_name = var.resource_group_name
  application_type    = "web"
  workspace_id        = azurerm_log_analytics_workspace.ims.id
  retention_in_days   = var.log_retention_days
  sampling_percentage = 100
  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# -----------------------------------------------------------------------------
# Monitor Action Groups - Alert notification channels with different severities
# -----------------------------------------------------------------------------

# Critical severity alerts - 15-minute response SLA
resource "azurerm_monitor_action_group" "critical" {
  name                = "ims-${var.environment}-critical-alerts"
  resource_group_name = var.resource_group_name
  short_name          = "ims-crit"

  email_receiver {
    name                    = "DevOps Team"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }

  sms_receiver {
    name         = "On-Call Engineer"
    country_code = "1"
    phone_number = "5555555555"
  }

  webhook_receiver {
    name                    = "PagerDuty"
    service_uri             = "https://events.pagerduty.com/integration/abcdef12345/enqueue"
    use_common_alert_schema = true
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# High severity alerts - 30-minute response SLA
resource "azurerm_monitor_action_group" "high" {
  name                = "ims-${var.environment}-high-alerts"
  resource_group_name = var.resource_group_name
  short_name          = "ims-high"

  email_receiver {
    name                    = "DevOps Team"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }

  webhook_receiver {
    name                    = "Slack"
    service_uri             = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
    use_common_alert_schema = true
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Medium severity alerts - 4-hour response SLA
resource "azurerm_monitor_action_group" "medium" {
  name                = "ims-${var.environment}-medium-alerts"
  resource_group_name = var.resource_group_name
  short_name          = "ims-med"

  email_receiver {
    name                    = "DevOps Team"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Low severity alerts - 24-hour response SLA
resource "azurerm_monitor_action_group" "low" {
  name                = "ims-${var.environment}-low-alerts"
  resource_group_name = var.resource_group_name
  short_name          = "ims-low"

  email_receiver {
    name                    = "DevOps Team"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# -----------------------------------------------------------------------------
# Diagnostic Settings - Send logs and metrics to Log Analytics
# -----------------------------------------------------------------------------

# Diagnostic settings for AKS
resource "azurerm_monitor_diagnostic_setting" "aks" {
  name                       = "aks-diagnostics"
  target_resource_id         = module.aks.cluster_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.ims.id

  log {
    category = "kube-apiserver"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }

  log {
    category = "kube-controller-manager"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }

  log {
    category = "kube-scheduler"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }

  log {
    category = "kube-audit"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }

  log {
    category = "cluster-autoscaler"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }
}

# Diagnostic settings for PostgreSQL
resource "azurerm_monitor_diagnostic_setting" "postgresql" {
  name                       = "postgresql-diagnostics"
  target_resource_id         = module.postgresql.server_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.ims.id

  log {
    category = "PostgreSQLLogs"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }

  log {
    category = "PostgreSQLFlexDatabaseXacts"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }
}

# Diagnostic settings for Redis Cache
resource "azurerm_monitor_diagnostic_setting" "redis" {
  name                       = "redis-diagnostics"
  target_resource_id         = module.redis.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.ims.id

  log {
    category = "ConnectedClientList"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }
}

# Diagnostic settings for Event Hubs namespace
resource "azurerm_monitor_diagnostic_setting" "event_hubs" {
  name                       = "event-hubs-diagnostics"
  target_resource_id         = module.event_hubs.namespace_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.ims.id

  log {
    category = "ArchiveLogs"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }

  log {
    category = "OperationalLogs"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }

  log {
    category = "AutoScaleLogs"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }

  log {
    category = "KafkaCoordinatorLogs"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.log_retention_days
    }
  }
}

# -----------------------------------------------------------------------------
# Metric Alerts - Monitor key metrics and alert on thresholds
# -----------------------------------------------------------------------------

# Alert for AKS CPU utilization > 80%
resource "azurerm_monitor_metric_alert" "aks_cpu_utilization" {
  name                = "ims-${var.environment}-aks-cpu-utilization"
  resource_group_name = var.resource_group_name
  scopes              = [module.aks.cluster_id]
  description         = "Alert when AKS node CPU utilization exceeds 80%"
  severity            = 2  # High
  frequency           = "PT5M"  # 5 minutes
  window_size         = "PT15M"  # 15 minutes

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_cpu_usage_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.high.id
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Alert for AKS memory utilization > 80%
resource "azurerm_monitor_metric_alert" "aks_memory_utilization" {
  name                = "ims-${var.environment}-aks-memory-utilization"
  resource_group_name = var.resource_group_name
  scopes              = [module.aks.cluster_id]
  description         = "Alert when AKS node memory utilization exceeds 80%"
  severity            = 2  # High
  frequency           = "PT5M"  # 5 minutes
  window_size         = "PT15M"  # 15 minutes

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_memory_working_set_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.high.id
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Alert for pod restarts > 5 in 30 min
resource "azurerm_monitor_metric_alert" "aks_pod_restart" {
  name                = "ims-${var.environment}-aks-pod-restart"
  resource_group_name = var.resource_group_name
  scopes              = [module.aks.cluster_id]
  description         = "Alert when pods are restarting frequently"
  severity            = 2  # High
  frequency           = "PT5M"  # 5 minutes
  window_size         = "PT30M"  # 30 minutes

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "pod_restart_count"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 5
  }

  action {
    action_group_id = azurerm_monitor_action_group.high.id
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Alert for PostgreSQL CPU utilization > 80%
resource "azurerm_monitor_metric_alert" "postgresql_cpu_utilization" {
  name                = "ims-${var.environment}-postgresql-cpu-utilization"
  resource_group_name = var.resource_group_name
  scopes              = [module.postgresql.server_id]
  description         = "Alert when PostgreSQL CPU utilization exceeds 80%"
  severity            = 2  # High
  frequency           = "PT5M"  # 5 minutes
  window_size         = "PT15M"  # 15 minutes

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "cpu_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.high.id
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Alert for PostgreSQL storage utilization > 80%
resource "azurerm_monitor_metric_alert" "postgresql_storage" {
  name                = "ims-${var.environment}-postgresql-storage"
  resource_group_name = var.resource_group_name
  scopes              = [module.postgresql.server_id]
  description         = "Alert when PostgreSQL storage utilization exceeds 80%"
  severity            = 2  # High
  frequency           = "PT5M"  # 5 minutes
  window_size         = "PT15M"  # 15 minutes

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "storage_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.high.id
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Alert for Redis CPU utilization > 80%
resource "azurerm_monitor_metric_alert" "redis_cpu_utilization" {
  name                = "ims-${var.environment}-redis-cpu-utilization"
  resource_group_name = var.resource_group_name
  scopes              = [module.redis.id]
  description         = "Alert when Redis CPU utilization exceeds 80%"
  severity            = 2  # High
  frequency           = "PT5M"  # 5 minutes
  window_size         = "PT15M"  # 15 minutes

  criteria {
    metric_namespace = "Microsoft.Cache/redis"
    metric_name      = "percentProcessorTime"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.high.id
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Alert for Redis memory utilization > 80%
resource "azurerm_monitor_metric_alert" "redis_memory_utilization" {
  name                = "ims-${var.environment}-redis-memory-utilization"
  resource_group_name = var.resource_group_name
  scopes              = [module.redis.id]
  description         = "Alert when Redis memory utilization exceeds 80%"
  severity            = 2  # High
  frequency           = "PT5M"  # 5 minutes
  window_size         = "PT15M"  # 15 minutes

  criteria {
    metric_namespace = "Microsoft.Cache/redis"
    metric_name      = "usedmemorypercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.high.id
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Alert for Event Hubs throttled requests
resource "azurerm_monitor_metric_alert" "event_hubs_throughput" {
  name                = "ims-${var.environment}-event-hubs-throughput"
  resource_group_name = var.resource_group_name
  scopes              = [module.event_hubs.namespace_id]
  description         = "Alert when Event Hubs throughput exceeds 80% of quota"
  severity            = 2  # High
  frequency           = "PT5M"  # 5 minutes
  window_size         = "PT15M"  # 15 minutes

  criteria {
    metric_namespace = "Microsoft.EventHub/namespaces"
    metric_name      = "ThrottledRequests"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10
  }

  action {
    action_group_id = azurerm_monitor_action_group.high.id
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# -----------------------------------------------------------------------------
# Log Query Alerts - Complex alert scenarios based on log queries
# -----------------------------------------------------------------------------

# Alert for position calculation latency exceeding 200ms SLA
resource "azurerm_monitor_scheduled_query_rules_alert" "calculation_latency" {
  name                = "ims-${var.environment}-calculation-latency"
  resource_group_name = var.resource_group_name
  location            = var.location
  data_source_id      = azurerm_log_analytics_workspace.ims.id
  description         = "Alert when position calculation latency exceeds 200ms SLA"
  enabled             = true
  frequency           = 5
  time_window         = 15
  severity            = 1  # Critical
  throttling          = 60

  action {
    action_group = [azurerm_monitor_action_group.critical.id]
    email_subject = "IMS Calculation Latency SLA Breach"
  }

  query = <<-QUERY
    AppEvents 
    | where ServiceName == "PositionCalculation" 
    | where LatencyMs > 200 
    | summarize LatencyCount = count() by bin(TimeGenerated, 5m) 
    | where LatencyCount > 10
  QUERY

  trigger {
    operator  = "GreaterThan"
    threshold = 0
    metric_trigger {
      operator            = "GreaterThan"
      threshold           = 0
      metric_column       = "LatencyCount"
      metric_trigger_type = "Consecutive"
      metric_column_aggregation = "Sum"
    }
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Alert for short sell approval latency exceeding 150ms SLA
resource "azurerm_monitor_scheduled_query_rules_alert" "short_sell_latency" {
  name                = "ims-${var.environment}-short-sell-latency"
  resource_group_name = var.resource_group_name
  location            = var.location
  data_source_id      = azurerm_log_analytics_workspace.ims.id
  description         = "Alert when short sell approval latency exceeds 150ms SLA"
  enabled             = true
  frequency           = 5
  time_window         = 15
  severity            = 1  # Critical
  throttling          = 60

  action {
    action_group = [azurerm_monitor_action_group.critical.id]
    email_subject = "IMS Short Sell Latency SLA Breach"
  }

  query = <<-QUERY
    AppEvents 
    | where ServiceName == "ShortSellService" 
    | where LatencyMs > 150 
    | summarize LatencyCount = count() by bin(TimeGenerated, 5m) 
    | where LatencyCount > 10
  QUERY

  trigger {
    operator  = "GreaterThan"
    threshold = 0
    metric_trigger {
      operator            = "GreaterThan"
      threshold           = 0
      metric_column       = "LatencyCount"
      metric_trigger_type = "Consecutive"
      metric_column_aggregation = "Sum"
    }
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Alert for event processing rate falling below 300,000 events per second
resource "azurerm_monitor_scheduled_query_rules_alert" "event_processing_rate" {
  name                = "ims-${var.environment}-event-processing-rate"
  resource_group_name = var.resource_group_name
  location            = var.location
  data_source_id      = azurerm_log_analytics_workspace.ims.id
  description         = "Alert when event processing rate falls below 300,000 events per second"
  enabled             = true
  frequency           = 5
  time_window         = 15
  severity            = 1  # Critical
  throttling          = 60

  action {
    action_group = [azurerm_monitor_action_group.critical.id]
    email_subject = "IMS Event Processing Rate Below Threshold"
  }

  query = <<-QUERY
    AppMetrics 
    | where MetricName == "EventProcessingRate" 
    | where MetricValue < 300000 
    | summarize AggregatedValue = avg(MetricValue) by bin(TimeGenerated, 5m) 
    | where AggregatedValue < 300000
  QUERY

  trigger {
    operator  = "GreaterThan"
    threshold = 0
    metric_trigger {
      operator            = "GreaterThan"
      threshold           = 0
      metric_column       = "AggregatedValue"
      metric_trigger_type = "Consecutive"
      metric_column_aggregation = "Average"
    }
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Alert for API error rate > 1%
resource "azurerm_monitor_scheduled_query_rules_alert" "api_error_rate" {
  name                = "ims-${var.environment}-api-error-rate"
  resource_group_name = var.resource_group_name
  location            = var.location
  data_source_id      = azurerm_log_analytics_workspace.ims.id
  description         = "Alert when API error rate exceeds 1%"
  enabled             = true
  frequency           = 5
  time_window         = 15
  severity            = 2  # High
  throttling          = 60

  action {
    action_group = [azurerm_monitor_action_group.high.id]
    email_subject = "IMS API Error Rate Above Threshold"
  }

  query = <<-QUERY
    AppRequests 
    | where ResultCode >= 500 
    | summarize ErrorCount = count() by bin(TimeGenerated, 5m) 
    | join kind=inner (
        AppRequests 
        | summarize TotalCount = count() by bin(TimeGenerated, 5m)
    ) on TimeGenerated 
    | extend ErrorRate = ErrorCount * 100.0 / TotalCount 
    | where ErrorRate > 1
  QUERY

  trigger {
    operator  = "GreaterThan"
    threshold = 0
    metric_trigger {
      operator            = "GreaterThan"
      threshold           = 0
      metric_column       = "ErrorRate"
      metric_trigger_type = "Consecutive"
      metric_column_aggregation = "Average"
    }
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# -----------------------------------------------------------------------------
# Dashboards - Visualize system performance, health, and business metrics
# -----------------------------------------------------------------------------

# System overview dashboard
resource "azurerm_dashboard" "system_overview" {
  name                = "ims-${var.environment}-system-overview"
  resource_group_name = var.resource_group_name
  location            = var.location
  dashboard_properties = templatefile("${path.module}/templates/dashboards/system-overview.json", {
    subscription_id = data.azurerm_subscription.current.subscription_id
    resource_group = var.resource_group_name
    aks_id = module.aks.cluster_id
    postgresql_id = module.postgresql.server_id
    redis_id = module.redis.id
    event_hubs_id = module.event_hubs.namespace_id
    workspace_id = azurerm_log_analytics_workspace.ims.id
    environment = var.environment
  })
  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Calculation performance dashboard
resource "azurerm_dashboard" "calculation_performance" {
  name                = "ims-${var.environment}-calculation-performance"
  resource_group_name = var.resource_group_name
  location            = var.location
  dashboard_properties = templatefile("${path.module}/templates/dashboards/calculation-performance.json", {
    subscription_id = data.azurerm_subscription.current.subscription_id
    resource_group = var.resource_group_name
    workspace_id = azurerm_log_analytics_workspace.ims.id
    app_insights_id = azurerm_application_insights.ims.id
    environment = var.environment
    calculation_sla_ms = 200
    short_sell_sla_ms = 150
  })
  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Data ingestion dashboard
resource "azurerm_dashboard" "data_ingestion" {
  name                = "ims-${var.environment}-data-ingestion"
  resource_group_name = var.resource_group_name
  location            = var.location
  dashboard_properties = templatefile("${path.module}/templates/dashboards/data-ingestion.json", {
    subscription_id = data.azurerm_subscription.current.subscription_id
    resource_group = var.resource_group_name
    workspace_id = azurerm_log_analytics_workspace.ims.id
    app_insights_id = azurerm_application_insights.ims.id
    event_hubs_id = module.event_hubs.namespace_id
    environment = var.environment
  })
  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Database performance dashboard
resource "azurerm_dashboard" "database_performance" {
  name                = "ims-${var.environment}-database-performance"
  resource_group_name = var.resource_group_name
  location            = var.location
  dashboard_properties = templatefile("${path.module}/templates/dashboards/database-performance.json", {
    subscription_id = data.azurerm_subscription.current.subscription_id
    resource_group = var.resource_group_name
    workspace_id = azurerm_log_analytics_workspace.ims.id
    postgresql_id = module.postgresql.server_id
    redis_id = module.redis.id
    environment = var.environment
  })
  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# -----------------------------------------------------------------------------
# Data Collection Rules - Configure what data gets collected and where it's sent
# -----------------------------------------------------------------------------

# Data collection rule for container logs from AKS cluster
resource "azurerm_monitor_data_collection_rule" "ims_app_logs" {
  name                = "ims-${var.environment}-app-logs"
  resource_group_name = var.resource_group_name
  location            = var.location

  destinations {
    log_analytics {
      workspace_resource_id = azurerm_log_analytics_workspace.ims.id
      name                  = "ims-logs"
    }
  }

  data_flow {
    streams      = ["Microsoft-ContainerInsights-Group-Default"]
    destinations = ["ims-logs"]
  }

  data_sources {
    extension {
      extension_name = "ContainerInsights"
      streams        = ["Microsoft-ContainerInsights-Group-Default"]
      extension_settings = {
        dataCollectionSettings = {
          interval   = "1m"
          namespaces = ["ims-*"]
        }
      }
    }
  }

  tags = {
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "log_analytics_workspace_id" {
  description = "The ID of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.ims.id
}

output "application_insights_instrumentation_key" {
  description = "The instrumentation key for Application Insights"
  value       = azurerm_application_insights.ims.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "The connection string for Application Insights"
  value       = azurerm_application_insights.ims.connection_string
  sensitive   = true
}

output "action_groups" {
  description = "The IDs of the Monitor Action Groups"
  value       = {
    critical = azurerm_monitor_action_group.critical.id
    high = azurerm_monitor_action_group.high.id
    medium = azurerm_monitor_action_group.medium.id
    low = azurerm_monitor_action_group.low.id
  }
}

output "dashboard_ids" {
  description = "The IDs of the Azure Dashboards"
  value       = {
    system_overview = azurerm_dashboard.system_overview.id
    calculation_performance = azurerm_dashboard.calculation_performance.id
    data_ingestion = azurerm_dashboard.data_ingestion.id
    database_performance = azurerm_dashboard.database_performance.id
  }
}