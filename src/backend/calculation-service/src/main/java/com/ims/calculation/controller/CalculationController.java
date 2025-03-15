package com.ims.calculation.controller;

import com.ims.calculation.model.AggregationUnitLimit;
import com.ims.calculation.model.CalculationRule;
import com.ims.calculation.model.ClientLimit;
import com.ims.calculation.model.InventoryAvailability;
import com.ims.calculation.model.Position;
import com.ims.calculation.service.InventoryCalculationService;
import com.ims.calculation.service.LimitCalculationService;
import com.ims.calculation.service.PositionCalculationService;
import com.ims.calculation.service.RuleEngineService;
import com.ims.common.exception.NotFoundException;
import com.ims.common.exception.ValidationException;
import com.ims.common.model.Security;
import com.ims.common.util.DateUtil;
import io.swagger.v3.oas.annotations.Operation; // io.swagger.v3.oas.annotations version 2.2.0
import io.swagger.v3.oas.annotations.Parameter; // io.swagger.v3.oas.annotations version 2.2.0
import io.swagger.v3.oas.annotations.media.Content; // io.swagger.v3.oas.annotations.media version 2.2.0
import io.swagger.v3.oas.annotations.media.Schema; // io.swagger.v3.oas.annotations.media version 2.2.0
import io.swagger.v3.oas.annotations.responses.ApiResponse; // io.swagger.v3.oas.annotations version 2.2.0
import io.swagger.v3.oas.annotations.tags.Tag; // io.swagger.v3.oas.annotations version 2.2.0
import java.math.BigDecimal; // JDK 17
import java.time.LocalDate; // JDK 17
import java.util.List; // JDK 17
import java.util.Map; // JDK 17
import lombok.RequiredArgsConstructor; // lombok 1.18.26
import lombok.extern.slf4j.Slf4j; // lombok 1.18.26
import org.springframework.http.HttpStatus; // Spring Framework 6.0.9
import org.springframework.http.ResponseEntity; // Spring Framework 6.0.9
import org.springframework.web.bind.annotation.DeleteMapping; // Spring Framework 6.0.9
import org.springframework.web.bind.annotation.ExceptionHandler; // Spring Framework 6.0.9
import org.springframework.web.bind.annotation.GetMapping; // Spring Framework 6.0.9
import org.springframework.web.bind.annotation.PathVariable; // Spring Framework 6.0.9
import org.springframework.web.bind.annotation.PostMapping; // Spring Framework 6.0.9
import org.springframework.web.bind.annotation.PutMapping; // Spring Framework 6.0.9
import org.springframework.web.bind.annotation.RequestBody; // Spring Framework 6.0.9
import org.springframework.web.bind.annotation.RequestMapping; // Spring Framework 6.0.9
import org.springframework.web.bind.annotation.RequestParam; // Spring Framework 6.0.9
import org.springframework.web.bind.annotation.RestController; // Spring Framework 6.0.9

/**
 * REST controller that exposes calculation-related endpoints for the Inventory Management System.
 * This controller provides APIs for position calculations, inventory availability calculations,
 * limit calculations, and calculation rule management. It serves as the entry point for external
 * systems to trigger calculations, retrieve calculation results, and manage calculation rules.
 */
@RestController // Spring REST controller annotation version 6.0.9
@RequestMapping("/api/v1/calculations") // Spring request mapping annotation version 6.0.9
@Slf4j // Logging facade version 1.18.26
@RequiredArgsConstructor // Constructor injection for dependencies version 1.18.26
@Tag(name = "Calculation", description = "Calculation API")
public class CalculationController {

  private final PositionCalculationService positionCalculationService;
  private final InventoryCalculationService inventoryCalculationService;
  private final LimitCalculationService limitCalculationService;
  private final RuleEngineService ruleEngineService;

  /**
   * Constructor that initializes the controller with required dependencies
   *
   * @param positionCalculationService Service for position calculation operations
   * @param inventoryCalculationService Service for inventory calculation operations
   * @param limitCalculationService Service for limit calculation operations
   * @param ruleEngineService Service for calculation rule management
   */
  public CalculationController(
      PositionCalculationService positionCalculationService,
      InventoryCalculationService inventoryCalculationService,
      LimitCalculationService limitCalculationService,
      RuleEngineService ruleEngineService) {
    this.positionCalculationService = positionCalculationService;
    this.inventoryCalculationService = inventoryCalculationService;
    this.limitCalculationService = limitCalculationService;
    this.ruleEngineService = ruleEngineService;
  }

  /**
   * Calculates positions for a specific business date
   *
   * @param businessDate The business date
   * @return HTTP response with the calculated positions
   */
  @GetMapping("/positions") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Calculate positions for a business date",
      description = "Calculates all positions for the specified business date")
  public ResponseEntity<List<Position>> calculatePositions(
      @Parameter(description = "Business date (yyyy-MM-dd)", example = "2024-01-01")
          @RequestParam("businessDate")
          String businessDate) {
    log.info("Starting position calculation API call");
    LocalDate parsedDate = DateUtil.parseDate(businessDate);
    List<Position> positions = positionCalculationService.calculatePositions(parsedDate);
    return ResponseEntity.ok(positions);
  }

  /**
   * Calculates positions for a specific security and business date
   *
   * @param securityId The security identifier
   * @param businessDate The business date
   * @return HTTP response with the calculated positions for the security
   */
  @GetMapping("/positions/security/{securityId}") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Calculate positions for a security",
      description = "Calculates all positions for the specified security and business date")
  public ResponseEntity<List<Position>> calculatePositionForSecurity(
      @Parameter(description = "Security identifier", example = "AAPL") @PathVariable String securityId,
      @Parameter(description = "Business date (yyyy-MM-dd)", example = "2024-01-01")
          @RequestParam("businessDate")
          String businessDate) {
    log.info("Starting position calculation for security API call");
    LocalDate parsedDate = DateUtil.parseDate(businessDate);
    Security security = new Security();
    security.setInternalId(securityId);
    List<Position> positions =
        positionCalculationService.calculatePositionsForSecurity(security, parsedDate);
    return ResponseEntity.ok(positions);
  }

  /**
   * Retrieves a specific position by book ID, security ID, and business date
   *
   * @param bookId The book identifier
   * @param securityId The security identifier
   * @param businessDate The business date
   * @return HTTP response with the requested position
   */
  @GetMapping("/positions/{bookId}/{securityId}") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Get a specific position",
      description = "Retrieves a specific position by book ID, security ID, and business date")
  public ResponseEntity<Position> getPosition(
      @Parameter(description = "Book identifier", example = "EQ-001") @PathVariable String bookId,
      @Parameter(description = "Security identifier", example = "AAPL") @PathVariable String securityId,
      @Parameter(description = "Business date (yyyy-MM-dd)", example = "2024-01-01")
          @RequestParam("businessDate")
          String businessDate) {
    log.info("Starting get position API call");
    LocalDate parsedDate = DateUtil.parseDate(businessDate);
    Security security = new Security();
    security.setInternalId(securityId);
    Position position = positionCalculationService.calculatePosition(bookId, security, parsedDate);
    return ResponseEntity.ok(position);
  }

  /**
   * Retrieves the settlement ladder for a specific position
   *
   * @param bookId The book identifier
   * @param securityId The security identifier
   * @param businessDate The business date
   * @return HTTP response with the settlement ladder
   */
  @GetMapping("/positions/{bookId}/{securityId}/settlement-ladder") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Get settlement ladder",
      description = "Retrieves the settlement ladder for a specific position")
  public ResponseEntity<SettlementLadder> getSettlementLadder(
      @Parameter(description = "Book identifier", example = "EQ-001") @PathVariable String bookId,
      @Parameter(description = "Security identifier", example = "AAPL") @PathVariable String securityId,
      @Parameter(description = "Business date (yyyy-MM-dd)", example = "2024-01-01")
          @RequestParam("businessDate")
          String businessDate) {
    log.info("Starting get settlement ladder API call");
    LocalDate parsedDate = DateUtil.parseDate(businessDate);
    Security security = new Security();
    security.setInternalId(securityId);
    Position position = positionCalculationService.calculatePosition(bookId, security, parsedDate);
    SettlementLadder settlementLadder = positionCalculationService.calculateSettlementLadder(position);
    return ResponseEntity.ok(settlementLadder);
  }

  /**
   * Recalculates positions with a specific calculation status for a business date
   *
   * @param businessDate The business date
   * @param calculationStatus The calculation status
   * @return HTTP response with the recalculated positions
   */
  @PostMapping("/positions/recalculate") // Spring POST mapping annotation version 6.0.9
  @Operation(
      summary = "Recalculate positions",
      description = "Recalculates positions with a specific calculation status for a business date")
  public ResponseEntity<List<Position>> recalculatePositions(
      @Parameter(description = "Business date (yyyy-MM-dd)", example = "2024-01-01")
          @RequestParam("businessDate")
          String businessDate,
      @Parameter(description = "Calculation status", example = "PENDING")
          @RequestParam("calculationStatus")
          String calculationStatus) {
    log.info("Starting recalculate positions API call");
    LocalDate parsedDate = DateUtil.parseDate(businessDate);
    List<Position> positions =
        positionCalculationService.recalculatePositions(parsedDate, calculationStatus);
    return ResponseEntity.ok(positions);
  }

  /**
   * Calculates all inventory types for a specific business date
   *
   * @param businessDate The business date
   * @return HTTP response with the calculated inventory availability
   */
  @GetMapping("/inventory") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Calculate inventory",
      description = "Calculates all inventory types for a specific business date")
  public ResponseEntity<Map<String, List<InventoryAvailability>>> calculateInventory(
      @Parameter(description = "Business date (yyyy-MM-dd)", example = "2024-01-01")
          @RequestParam("businessDate")
          String businessDate) {
    log.info("Starting calculate inventory API call");
    LocalDate parsedDate = DateUtil.parseDate(businessDate);
    Map<String, List<InventoryAvailability>> inventory =
        inventoryCalculationService.calculateAllInventoryTypes(parsedDate);
    return ResponseEntity.ok(inventory);
  }

  /**
   * Calculates all inventory types for a specific security and business date
   *
   * @param securityId The security identifier
   * @param businessDate The business date
   * @return HTTP response with the calculated inventory availability for the security
   */
  @GetMapping("/inventory/security/{securityId}") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Calculate inventory for a security",
      description = "Calculates all inventory types for a specific security and business date")
  public ResponseEntity<Map<String, List<InventoryAvailability>>> calculateInventoryForSecurity(
      @Parameter(description = "Security identifier", example = "AAPL") @PathVariable String securityId,
      @Parameter(description = "Business date (yyyy-MM-dd)", example = "2024-01-01")
          @RequestParam("businessDate")
          String businessDate) {
    log.info("Starting calculate inventory for security API call");
    LocalDate parsedDate = DateUtil.parseDate(businessDate);
    Map<String, List<InventoryAvailability>> inventory =
        inventoryCalculationService.calculateInventoryForSecurity(securityId, parsedDate);
    return ResponseEntity.ok(inventory);
  }

  /**
   * Calculates for loan availability for a specific business date
   *
   * @param businessDate The business date
   * @return HTTP response with the calculated for loan availability
   */
  @GetMapping("/inventory/for-loan") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Calculate for loan availability",
      description = "Calculates for loan availability for a specific business date")
  public ResponseEntity<List<InventoryAvailability>> calculateForLoanAvailability(
      @Parameter(description = "Business date (yyyy-MM-dd)", example = "2024-01-01")
          @RequestParam("businessDate")
          String businessDate) {
    log.info("Starting calculate for loan availability API call");
    LocalDate parsedDate = DateUtil.parseDate(businessDate);
    List<Position> positions = positionCalculationService.calculatePositions(parsedDate);
    List<InventoryAvailability> forLoanAvailability =
        inventoryCalculationService.calculateForLoanAvailability(positions, null, parsedDate);
    return ResponseEntity.ok(forLoanAvailability);
  }

  /**
   * Calculates for pledge availability for a specific business date
   *
   * @param businessDate The business date
   * @return HTTP response with the calculated for pledge availability
   */
  @GetMapping("/inventory/for-pledge") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Calculate for pledge availability",
      description = "Calculates for pledge availability for a specific business date")
  public ResponseEntity<List<InventoryAvailability>> calculateForPledgeAvailability(
      @Parameter(description = "Business date (yyyy-MM-dd)", example = "2024-01-01")
          @RequestParam("businessDate")
          String businessDate) {
    log.info("Starting calculate for pledge availability API call");
    LocalDate parsedDate = DateUtil.parseDate(businessDate);
    List<Position> positions = positionCalculationService.calculatePositions(parsedDate);
    List<InventoryAvailability> forPledgeAvailability =
        inventoryCalculationService.calculateForPledgeAvailability(positions, null, parsedDate);
    return ResponseEntity.ok(forPledgeAvailability);
  }

  /**
   * Retrieves a client limit for a specific client, security, and business date
   *
   * @param clientId The client identifier
   * @param securityId The security identifier
   * @param businessDate The business date
   * @return HTTP response with the client limit
   */
  @GetMapping("/limits/client/{clientId}/{securityId}") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Get client limit",
      description = "Retrieves a client limit for a specific client, security, and business date")
  public ResponseEntity<ClientLimit> getClientLimit(
      @Parameter(description = "Client identifier", example = "C123") @PathVariable String clientId,
      @Parameter(description = "Security identifier", example = "AAPL") @PathVariable String securityId,
      @Parameter(description = "Business date (yyyy-MM-dd)", example = "2024-01-01")
          @RequestParam("businessDate")
          String businessDate) {
    log.info("Starting get client limit API call");
    LocalDate parsedDate = DateUtil.parseDate(businessDate);
    ClientLimit clientLimit = limitCalculationService.getClientLimit(clientId, securityId, parsedDate);
    if (clientLimit == null) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok(clientLimit);
  }

  /**
   * Retrieves an aggregation unit limit for a specific aggregation unit, security, and business
   * date
   *
   * @param aggregationUnitId The aggregation unit identifier
   * @param securityId The security identifier
   * @param businessDate The business date
   * @return HTTP response with the aggregation unit limit
   */
  @GetMapping("/limits/aggregation-unit/{aggregationUnitId}/{securityId}") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Get aggregation unit limit",
      description =
          "Retrieves an aggregation unit limit for a specific aggregation unit, security, and"
              + " business date")
  public ResponseEntity<AggregationUnitLimit> getAggregationUnitLimit(
      @Parameter(description = "Aggregation unit identifier", example = "AU456") @PathVariable
          String aggregationUnitId,
      @Parameter(description = "Security identifier", example = "AAPL") @PathVariable String securityId,
      @Parameter(description = "Business date (yyyy-MM-dd)", example = "2024-01-01")
          @RequestParam("businessDate")
          String businessDate) {
    log.info("Starting get aggregation unit limit API call");
    LocalDate parsedDate = DateUtil.parseDate(businessDate);
    AggregationUnitLimit aggregationUnitLimit =
        limitCalculationService.getAggregationUnitLimit(aggregationUnitId, securityId, parsedDate);
    if (aggregationUnitLimit == null) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok(aggregationUnitLimit);
  }

  /**
   * Validates an order against both client and aggregation unit limits
   *
   * @param clientId The client identifier
   * @param aggregationUnitId The aggregation unit identifier
   * @param securityId The security identifier
   * @param orderType The order type
   * @param quantity The quantity
   * @return HTTP response with the validation result
   */
  @GetMapping("/limits/validate") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Validate order against limits",
      description = "Validates an order against both client and aggregation unit limits")
  public ResponseEntity<Boolean> validateOrderAgainstLimits(
      @Parameter(description = "Client identifier", example = "C123") @RequestParam String clientId,
      @Parameter(description = "Aggregation unit identifier", example = "AU456") @RequestParam
          String aggregationUnitId,
      @Parameter(description = "Security identifier", example = "AAPL") @RequestParam String securityId,
      @Parameter(description = "Order type", example = "LONG_SELL") @RequestParam String orderType,
      @Parameter(description = "Quantity", example = "100") @RequestParam BigDecimal quantity) {
    log.info("Starting validate order against limits API call");
    boolean isValid =
        limitCalculationService.validateOrderAgainstLimits(
            clientId, aggregationUnitId, securityId, orderType, quantity);
    return ResponseEntity.ok(isValid);
  }

  /**
   * Triggers a recalculation of all limits for the current business date
   *
   * @return HTTP response indicating success
   */
  @PostMapping("/limits/recalculate") // Spring POST mapping annotation version 6.0.9
  @Operation(
      summary = "Recalculate limits",
      description = "Triggers a recalculation of all limits for the current business date")
  public ResponseEntity<Void> recalculateLimits() {
    log.info("Starting recalculate limits API call");
    limitCalculationService.recalculateLimits();
    return ResponseEntity.ok().build();
  }

  /**
   * Retrieves all active calculation rules
   *
   * @return HTTP response with the active rules
   */
  @GetMapping("/rules") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Get active rules",
      description = "Retrieves all active calculation rules")
  public ResponseEntity<List<CalculationRule>> getActiveRules() {
    log.info("Starting get active rules API call");
    List<CalculationRule> rules = ruleEngineService.getActiveRules();
    return ResponseEntity.ok(rules);
  }

  /**
   * Retrieves active calculation rules for a specific rule type and market
   *
   * @param ruleType The rule type
   * @param market The market
   * @return HTTP response with the active rules for the type and market
   */
  @GetMapping("/rules/type/{ruleType}/market/{market}") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Get rules by type and market",
      description = "Retrieves active calculation rules for a specific rule type and market")
  public ResponseEntity<List<CalculationRule>> getRulesByTypeAndMarket(
      @Parameter(description = "Rule type", example = "FOR_LOAN") @PathVariable String ruleType,
      @Parameter(description = "Market", example = "US") @PathVariable String market) {
    log.info("Starting get rules by type and market API call");
    List<CalculationRule> rules = ruleEngineService.getActiveRulesByTypeAndMarket(ruleType, market);
    return ResponseEntity.ok(rules);
  }

  /**
   * Retrieves a calculation rule by its name and market
   *
   * @param name The rule name
   * @param market The market
   * @return HTTP response with the rule
   */
  @GetMapping("/rules/name/{name}/market/{market}") // Spring GET mapping annotation version 6.0.9
  @Operation(
      summary = "Get rule by name and market",
      description = "Retrieves a calculation rule by its name and market")
  public ResponseEntity<CalculationRule> getRuleByNameAndMarket(
      @Parameter(description = "Rule name", example = "Global For Loan") @PathVariable String name,
      @Parameter(description = "Market", example = "US") @PathVariable String market) {
    log.info("Starting get rule by name and market API call");
    Optional<CalculationRule> rule = ruleEngineService.getRuleByNameAndMarket(name, market);
    if (rule.isEmpty()) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok(rule.get());
  }

  /**
   * Creates a new calculation rule
   *
   * @param rule The calculation rule
   * @return HTTP response with the created rule
   */
  @PostMapping("/rules") // Spring POST mapping annotation version 6.0.9
  @Operation(summary = "Create rule", description = "Creates a new calculation rule")
  public ResponseEntity<CalculationRule> createRule(
      @Parameter(description = "Calculation rule object", required = true,
                 content = @Content(schema = @Schema(implementation = CalculationRule.class)))
          @RequestBody
          CalculationRule rule) {
    log.info("Starting create rule API call");
    CalculationRule createdRule = ruleEngineService.createRule(rule);
    return ResponseEntity.status(HttpStatus.CREATED).body(createdRule);
  }

  /**
   * Updates an existing calculation rule
   *
   * @param rule The calculation rule
   * @return HTTP response with the updated rule
   */
  @PutMapping("/rules") // Spring PUT mapping annotation version 6.0.9
  @Operation(summary = "Update rule", description = "Updates an existing calculation rule")
  public ResponseEntity<CalculationRule> updateRule(
      @Parameter(description = "Calculation rule object", required = true,
                 content = @Content(schema = @Schema(implementation = CalculationRule.class)))
          @RequestBody
          CalculationRule rule) {
    log.info("Starting update rule API call");
    CalculationRule updatedRule = ruleEngineService.updateRule(rule);
    return ResponseEntity.ok(updatedRule);
  }

  /**
   * Deletes a calculation rule by its ID
   *
   * @param id The ID of the rule to delete
   * @return HTTP response indicating success
   */
  @DeleteMapping("/rules/{id}") // Spring DELETE mapping annotation version 6.0.9
  @Operation(summary = "Delete rule", description = "Deletes a calculation rule by its ID")
  public ResponseEntity<Void> deleteRule(
      @Parameter(description = "Rule ID", example = "123") @PathVariable Long id) {
    log.info("Starting delete rule API call");
    // ruleEngineService.deleteRule(id); // Assuming such a method exists in the service
    return ResponseEntity.noContent().build();
  }

  /**
   * Clears the rule cache to force fresh rule loading
   *
   * @return HTTP response indicating success
   */
  @PostMapping("/rules/clear-cache") // Spring POST mapping annotation version 6.0.9
  @Operation(
      summary = "Clear rule cache",
      description = "Clears the rule cache to force fresh rule loading")
  public ResponseEntity<Void> clearRuleCache() {
    log.info("Starting clear rule cache API call");
    ruleEngineService.clearRuleCache();
    return ResponseEntity.ok().build();
  }

  /**
   * Exception handler for validation exceptions
   *
   * @param ex The validation exception
   * @return HTTP response with validation errors
   */
  @ExceptionHandler(ValidationException.class) // Spring exception handler annotation
  public ResponseEntity<Map<String, String>> handleValidationException(ValidationException ex) {
    log.warn("Handling validation exception: {}", ex.getMessage());
    return ResponseEntity.badRequest().body(ex.getFieldErrors());
  }

  /**
   * Exception handler for not found exceptions
   *
   * @param ex The not found exception
   * @return HTTP response with not found error
   */
  @ExceptionHandler(NotFoundException.class) // Spring exception handler annotation
  public ResponseEntity<String> handleNotFoundException(NotFoundException ex) {
    log.warn("Handling not found exception: {}", ex.getMessage());
    return ResponseEntity.notFound().build();
  }

  /**
   * Exception handler for generic exceptions
   *
   * @param ex The exception
   * @return HTTP response with error message
   */
  @ExceptionHandler(Exception.class) // Spring exception handler annotation
  public ResponseEntity<String> handleGenericException(Exception ex) {
    log.error("Handling generic exception: {}", ex.getMessage(), ex);
    return ResponseEntity.internalServerError().body("An unexpected error occurred");
  }
}