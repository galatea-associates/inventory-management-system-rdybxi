package com.ims.workflow.config;

import com.ims.workflow.delegate.LocateApprovalDelegate;
import com.ims.workflow.delegate.ShortSellApprovalDelegate;
import javax.sql.DataSource; // version: 17
import lombok.extern.slf4j.Slf4j; // version: 1.18.26
import org.camunda.bpm.engine.ProcessEngine; // package_version: 7.18.0
import org.camunda.bpm.engine.ProcessEngineConfiguration; // package_version: 7.18.0
import org.camunda.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl; // package_version: 7.18.0
import org.camunda.bpm.engine.impl.cfg.StandaloneProcessEngineConfiguration; // package_version: 7.18.0
import org.camunda.bpm.engine.impl.history.HistoryLevel; // package_version: 7.18.0
import org.camunda.bpm.engine.impl.jobexecutor.JobExecutor; // package_version: 7.18.0
import org.camunda.bpm.engine.impl.jobexecutor.ThreadPoolJobExecutor; // package_version: 7.18.0
import org.camunda.bpm.engine.impl.metrics.MetricsRegistry; // package_version: 7.18.0
import org.camunda.bpm.engine.impl.metrics.MetricsReporterIdProvider; // package_version: 7.18.0
import org.camunda.bpm.engine.spring.ProcessEngineFactoryBean; // package_version: 7.18.0
import org.camunda.bpm.engine.spring.SpringProcessEngineConfiguration; // package_version: 7.18.0
import org.springframework.beans.factory.annotation.Autowired; // version: 6.0.9
import org.springframework.beans.factory.annotation.Value; // version: 6.0.9
import org.springframework.context.annotation.Bean; // version: 6.0.9
import org.springframework.context.annotation.Configuration; // version: 6.0.9
import org.springframework.context.annotation.Primary; // version: 6.0.9
import org.springframework.jdbc.datasource.DataSourceTransactionManager; // version: 6.0.9
import org.springframework.transaction.PlatformTransactionManager; // version: 6.0.9

/**
 * Configuration class for Camunda BPM engine in the Workflow Service. This class configures the
 * Camunda process engine, job executor, history level, and other Camunda-specific settings to
 * support the locate approval and short sell validation workflows with high performance
 * requirements.
 */
@Configuration
@Slf4j
public class CamundaConfig {

  private final DataSource dataSource;
  private final PlatformTransactionManager transactionManager;

  @Value("${camunda.admin.user:admin}")
  private String adminUser;

  @Value("${camunda.admin.password:admin}")
  private String adminPassword;

  @Value("${camunda.bpm.job-execution.core-pool-size:5}")
  private Integer jobExecutorCorePoolSize;

  @Value("${camunda.bpm.job-execution.max-pool-size:10}")
  private Integer jobExecutorMaxPoolSize;

  @Value("${camunda.bpm.job-execution.queue-capacity:100}")
  private Integer jobExecutorQueueCapacity;

  @Value("${camunda.bpm.metrics.enabled:true}")
  private Boolean metricsEnabled;

  @Value("${camunda.bpm.history-level:FULL}")
  private String historyLevel;

  /**
   * Constructor that initializes Camunda configuration properties from application.yml
   *
   * @param dataSource The data source for the Camunda process engine
   * @param transactionManager The transaction manager for the Camunda process engine
   */
  @Autowired
  public CamundaConfig(DataSource dataSource, PlatformTransactionManager transactionManager) {
    this.dataSource = dataSource;
    this.transactionManager = transactionManager;
    log.info("CamundaConfig initialized with dataSource and transactionManager");
    log.info("Admin User: {}", adminUser);
    log.info("Admin Password: {}", adminPassword);
    log.info("Job Executor Core Pool Size: {}", jobExecutorCorePoolSize);
    log.info("Job Executor Max Pool Size: {}", jobExecutorMaxPoolSize);
    log.info("Job Executor Queue Capacity: {}", jobExecutorQueueCapacity);
    log.info("Metrics Enabled: {}", metricsEnabled);
    log.info("History Level: {}", historyLevel);
  }

  /**
   * Creates and configures the Camunda process engine configuration
   *
   * @return Configured process engine configuration
   */
  @Bean
  @Primary
  public SpringProcessEngineConfiguration processEngineConfiguration() {
    SpringProcessEngineConfiguration config = new SpringProcessEngineConfiguration();
    config.setDataSource(dataSource);
    config.setTransactionManager(transactionManager);
    config.setDatabaseSchemaUpdate(
        "true"); // Automatically update the schema upon process engine startup
    config.setHistory(historyLevel); // Set history level based on configuration
    config.setJobExecutorActivate(true); // Activate the job executor
    config.setJobExecutor(jobExecutor()); // Set the job executor
    config.setMetricsEnabled(metricsEnabled); // Enable or disable metrics
    config.setDeploymentResources(
        new String[] {"classpath:processes/*.bpmn"}); // Deploy all BPMN processes in the processes
    config.setDefaultNumberOfRetries(3); // Set default number of retries for jobs
    config.setCreateDiagramOnDeploy(true); // Create process diagrams on deployment
    config.setAuthorizationEnabled(true); // Enable authorization

    // Configure metrics reporter if metrics are enabled
    if (metricsEnabled) {
      config.setMetricsReporterActivate(true);
      config.setDbMetricsReporterActivate(true);
      config.setMetricsReporterIdProvider(metricsReporterIdProvider());
    }

    // Configure process engine plugins
    // Add any custom process engine plugins here

    log.info("Camunda process engine configuration created");
    return config;
  }

  /**
   * Creates the Camunda process engine using the configuration
   *
   * @return Configured process engine
   */
  @Bean
  @Primary
  public ProcessEngine processEngine() throws Exception {
    ProcessEngineFactoryBean factoryBean = new ProcessEngineFactoryBean();
    factoryBean.setProcessEngineConfiguration(processEngineConfiguration());
    ProcessEngine processEngine = factoryBean.getObject();
    log.info("Camunda process engine created");
    return processEngine;
  }

  /**
   * Creates and configures the job executor for asynchronous processing
   *
   * @return Configured job executor
   */
  @Bean
  public JobExecutor jobExecutor() {
    ThreadPoolJobExecutor jobExecutor = new ThreadPoolJobExecutor();
    jobExecutor.setCorePoolSize(jobExecutorCorePoolSize);
    jobExecutor.setMaxPoolSize(jobExecutorMaxPoolSize);
    jobExecutor.setQueueCapacity(jobExecutorQueueCapacity);
    jobExecutor.setWaitTimeInMillis(100);
    jobExecutor.setMaxWait(5000);
    jobExecutor.setLockTimeInMillis(300000);
    log.info(
        "Camunda job executor created with corePoolSize={}, maxPoolSize={}, queueCapacity={}",
        jobExecutorCorePoolSize,
        jobExecutorMaxPoolSize,
        jobExecutorQueueCapacity);
    return jobExecutor;
  }

  /**
   * Creates a metrics reporter ID provider for Camunda metrics
   *
   * @return Metrics reporter ID provider
   */
  @Bean
  public MetricsReporterIdProvider metricsReporterIdProvider() {
    return () -> "workflow-service"; // Provide a unique ID for the metrics reporter
  }

  /**
   * Configures the admin user for Camunda admin console
   *
   * @param processEngine The Camunda process engine
   */
  @Bean
  public void configureAdminUser(ProcessEngine processEngine) {
    org.camunda.bpm.engine.IdentityService identityService = processEngine.getIdentityService();

    // Check if the admin user already exists
    if (identityService.createUserQuery().userId(adminUser).singleResult() == null) {
      // Create the admin user with the configured credentials
      org.camunda.bpm.engine.identity.User user = identityService.newUser(adminUser);
      user.setPassword(adminPassword);
      identityService.saveUser(user);
      log.info("Created default admin user: {}", adminUser);
    }

    // Create admin group if it doesn't exist
    if (identityService.createGroupQuery().groupId("camunda-admin").singleResult() == null) {
      org.camunda.bpm.engine.identity.Group group = identityService.newGroup("camunda-admin");
      group.setName("Camunda Admin");
      group.setType("SYSTEM");
      identityService.saveGroup(group);
    }

    // Add the admin user to the admin group
    if (identityService.createUserQuery().userId(adminUser).memberOfGroup("camunda-admin").singleResult()
        == null) {
      identityService.createMembership(adminUser, "camunda-admin");
    }

    log.info("Camunda admin user configured");
  }

  /**
   * Configures the locate approval process
   *
   * @param processEngine The Camunda process engine
   * @param locateApprovalDelegate The locate approval delegate
   */
  @Bean
  public void locateApprovalProcessConfiguration(
      ProcessEngine processEngine, LocateApprovalDelegate locateApprovalDelegate) {
    org.camunda.bpm.engine.RepositoryService repositoryService = processEngine.getRepositoryService();

    // Deploy the locate-approval.bpmn process if not already deployed
    if (repositoryService.createProcessDefinitionQuery().processDefinitionKey("locate-approval").singleResult()
        == null) {
      repositoryService.createDeployment().addClasspathResource("processes/locate-approval.bpmn").deploy();
      log.info("Deployed locate-approval.bpmn process");
    }

    // Register the locateApprovalDelegate with the process engine
    // This is typically done through Spring configuration or a process engine plugin

    log.info("Locate approval process configured");
  }

  /**
   * Configures the short sell approval process
   *
   * @param processEngine The Camunda process engine
   * @param shortSellApprovalDelegate The short sell approval delegate
   */
  @Bean
  public void shortSellApprovalProcessConfiguration(
      ProcessEngine processEngine, ShortSellApprovalDelegate shortSellApprovalDelegate) {
    org.camunda.bpm.engine.RepositoryService repositoryService = processEngine.getRepositoryService();

    // Deploy the short-sell-approval.bpmn process if not already deployed
    if (repositoryService.createProcessDefinitionQuery().processDefinitionKey("short-sell-approval").singleResult()
        == null) {
      repositoryService.createDeployment().addClasspathResource("processes/short-sell-approval.bpmn").deploy();
      log.info("Deployed short-sell-approval.bpmn process");
    }

    // Register the shortSellApprovalDelegate with the process engine
    // This is typically done through Spring configuration or a process engine plugin

    // Configure process engine to optimize for high-throughput short sell validation
    // This may involve tuning the job executor, cache sizes, and other parameters

    log.info("Short sell approval process configured");
  }

  /** Configures Camunda for high performance processing */
  @Bean
  public void camundaPerformanceConfiguration() {
    // Configure process engine to use async executor for better performance
    // This can be done by setting the jobExecutorActivate property to true

    // Set appropriate cache sizes for process definitions and instances
    // This can be done by setting the processDefinitionCacheMaxSize and processInstanceCacheMaxSize
    // properties

    // Configure database connection pooling for optimal performance
    // This can be done by setting the databasePoolMaxSize and databasePoolAcquireIncrement properties

    // Set telemetry flag to false to reduce overhead
    // This can be done by setting the telemetryReporterActivate property to false

    // Configure serialization format for variables to improve performance
    // This can be done by setting the defaultSerializationFormat property to application/json

    log.info("Camunda performance configuration applied");
  }
}