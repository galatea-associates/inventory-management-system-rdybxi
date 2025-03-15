package com.ims.workflow;

import com.ims.workflow.config.CamundaConfig; // version: N/A
import com.ims.workflow.config.KafkaConfig; // version: N/A
import com.ims.workflow.config.SecurityConfig; // version: N/A
import lombok.extern.slf4j.Slf4j; // version: 1.18.26
import org.springframework.boot.SpringApplication; // version: 3.1.0
import org.springframework.boot.autoconfigure.SpringBootApplication; // version: 3.1.0
import org.springframework.context.annotation.Import; // version: 6.0.9
import org.springframework.scheduling.annotation.EnableAsync; // version: 6.0.9
import org.springframework.scheduling.annotation.EnableScheduling; // version: 6.0.9

/**
 * Main application class for the Workflow Service in the Inventory Management System. This service
 * is responsible for managing locate approval and short sell approval workflows, ensuring
 * compliance with regulatory requirements across different markets. It provides high-performance
 * workflow processing with strict SLAs, particularly for short sell validations which must
 * complete within 150ms.
 *
 * <p>Requirements Addressed:
 *
 * <ul>
 *   <li>{@link Technical Specifications/2.1.3/F-301 Locate Approval Workflow}: Process locate
 *       requests with auto-approval rules and manual review capabilities
 *   <li>{@link Technical Specifications/2.1.3/F-302 Short Sell Approval Workflow}: Validate and
 *       approve short sell orders against client and aggregation unit limits
 *   <li>{@link Technical Specifications/2.2.4/F-302-RQ-006 Performance Requirement}: Complete
 *       workflow in under 150ms
 *   <li>{@link Technical Specifications/1.2.2/High-Level Description Workflow Management
 *       Services}: Workflow management for locate approvals and short sell authorizations
 * </ul>
 */
@SpringBootApplication
@EnableAsync // Enable asynchronous method execution
@EnableScheduling // Enable scheduled tasks
@Import({
  CamundaConfig.class,
  KafkaConfig.class,
  SecurityConfig.class
}) // Import configuration classes
@Slf4j // Provide logging capabilities
public class WorkflowServiceApplication {

  /**
   * Default constructor for the WorkflowServiceApplication
   *
   * <p>Steps:
   *
   * <ul>
   *   <li>Initialize the application
   * </ul>
   */
  public WorkflowServiceApplication() {
    super();
  }

  /**
   * Main entry point for the Workflow Service application
   *
   * @param args Command line arguments
   *     <p>Steps:
   *
   *     <ul>
   *       <li>Log application startup
   *       <li>Call SpringApplication.run to start the Spring Boot application
   *       <li>Pass WorkflowServiceApplication.class and args to the run method
   *     </ul>
   */
  public static void main(String[] args) {
    log.info("Starting WorkflowServiceApplication...");
    SpringApplication.run(WorkflowServiceApplication.class, args);
    log.info("WorkflowServiceApplication started successfully.");
  }
}