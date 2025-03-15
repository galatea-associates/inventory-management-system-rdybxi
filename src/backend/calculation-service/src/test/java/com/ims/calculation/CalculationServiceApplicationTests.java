package com.ims.calculation;

import com.ims.calculation.CalculationServiceApplication; // Spring Boot 3.1.0
import com.ims.calculation.service.InventoryCalculationService; // Adjust the package name as necessary
import com.ims.calculation.service.LimitCalculationService; // Adjust the package name as necessary
import com.ims.calculation.service.PositionCalculationService; // Adjust the package name as necessary
import com.ims.calculation.service.RuleEngineService; // Adjust the package name as necessary
import org.junit.jupiter.api.Test; // JUnit 5
import org.springframework.beans.factory.annotation.Autowired; // Spring 6.0.9
import org.springframework.boot.test.context.SpringBootTest; // Spring Boot 3.1.0
import org.springframework.context.ApplicationContext; // Spring 6.0.9
import org.springframework.test.context.ActiveProfiles; // Spring 6.0.9

import static org.junit.jupiter.api.Assertions.assertNotNull; // JUnit 5

/**
 * Integration test class for the Calculation Service application. This class verifies that the
 * Spring application context loads correctly with all required beans and configurations for the
 * calculation service, ensuring that the core components for position calculations, inventory
 * availability calculations, and limit calculations are properly initialized.
 */
@SpringBootTest(classes = CalculationServiceApplication.class)
@ActiveProfiles("test")
public class CalculationServiceApplicationTests {

  @Autowired private ApplicationContext applicationContext;

  @Autowired private PositionCalculationService positionCalculationService;

  @Autowired private InventoryCalculationService inventoryCalculationService;

  @Autowired private LimitCalculationService limitCalculationService;

  @Autowired private RuleEngineService ruleEngineService;

  /** Default constructor */
  public CalculationServiceApplicationTests() {}

  /** Verifies that the Spring application context loads successfully */
  @Test
  public void contextLoads() {
    assertNotNull(
        applicationContext, "The application context should be loaded successfully"); // Assert that
                                                                                       // applicationContext
                                                                                       // is not null
  }

  /** Verifies that the PositionCalculationService bean is properly initialized */
  @Test
  public void positionCalculationServiceLoads() {
    assertNotNull(
        positionCalculationService,
        "The PositionCalculationService should be properly initialized"); // Assert that
                                                                           // positionCalculationService
                                                                           // is not null
  }

  /** Verifies that the InventoryCalculationService bean is properly initialized */
  @Test
  public void inventoryCalculationServiceLoads() {
    assertNotNull(
        inventoryCalculationService,
        "The InventoryCalculationService should be properly initialized"); // Assert that
                                                                             // inventoryCalculationService
                                                                             // is not null
  }

  /** Verifies that the LimitCalculationService bean is properly initialized */
  @Test
  public void limitCalculationServiceLoads() {
    assertNotNull(
        limitCalculationService,
        "The LimitCalculationService should be properly initialized"); // Assert that
                                                                         // limitCalculationService
                                                                         // is not null
  }

  /** Verifies that the RuleEngineService bean is properly initialized */
  @Test
  public void ruleEngineServiceLoads() {
    assertNotNull(
        ruleEngineService,
        "The RuleEngineService should be properly initialized"); // Assert that ruleEngineService is
                                                                   // not null
  }
}