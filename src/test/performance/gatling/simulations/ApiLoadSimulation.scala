package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import java.util.UUID

/**
 * Gatling simulation for testing the API performance under load across multiple endpoints
 * of the Inventory Management System (IMS).
 * 
 * This simulation tests the performance of various API endpoints under different load 
 * scenarios to ensure the system meets its required performance SLAs:
 * - Processing 300,000+ events per second with end-to-end latency under 200ms
 * - 99% of requests completing within 200ms
 * - At least 99% successful requests
 */
class ApiLoadSimulation extends Simulation {

  // HTTP Protocol Configuration
  val httpProtocol = http
    .baseUrl("${baseUrl}")
    .headers(Map(
      "Content-Type" -> "application/json",
      "Accept" -> "application/json"
    ))

  // Global API paths configuration
  val apiPaths = Map(
    "position" -> "/api/v1/position",
    "inventory" -> "/api/v1/inventory",
    "reference" -> "/api/v1/reference",
    "locate" -> "/api/v1/locates",
    "calculation" -> "/api/v1/calculations"
  )

  // CSV feeder with transformation to map columns to meaningful variable names
  // CSV columns: securityId,requestId,clientId,aggregationUnitId,quantity,type,temperature,orderId,orderQuantity,bookId,businessDate
  val csvFeeder = csv("data/testData.csv").random
    .transform { row =>
      Map(
        "securityId" -> row(0),
        "requestId" -> row(1),
        "clientId" -> row(2),
        "aggregationUnitId" -> row(3),
        "quantity" -> row(4),
        "type" -> row(5),
        "temperature" -> row(6),
        "orderId" -> row(7),
        "orderQuantity" -> row(8),
        "bookId" -> row(9),
        "businessDate" -> row(10)
      )
    }

  /**
   * Creates a position request scenario step
   * 
   * @return Gatling chain builder with the position request step
   */
  def createPositionRequest() = {
    exec(session => {
      // Generate a unique correlation ID for each request
      session.set("correlationId", UUID.randomUUID().toString)
    })
    .exec(http("Position API Request")
      .get(apiPaths("position"))
      .queryParam("bookId", "${bookId}")
      .queryParam("securityId", "${securityId}")
      .queryParam("businessDate", "${businessDate}")
      .header("X-Correlation-ID", "${correlationId}")
      .header("X-User-ID", "performance-test-user")
      .check(status.is(200))
      .check(jsonPath("$.securityId").exists)
    )
  }

  /**
   * Creates an inventory request scenario step
   * 
   * @return Gatling chain builder with the inventory request step
   */
  def createInventoryRequest() = {
    exec(session => {
      session.set("correlationId", UUID.randomUUID().toString)
    })
    .exec(http("Inventory API Request")
      .get(apiPaths("inventory"))
      .queryParam("businessDate", "${businessDate}")
      .header("X-Correlation-ID", "${correlationId}")
      .header("X-User-ID", "performance-test-user")
      .check(status.is(200))
      .check(jsonPath("$[*]").exists)
    )
  }

  /**
   * Creates a reference data request scenario step
   * 
   * @return Gatling chain builder with the reference data request step
   */
  def createReferenceDataRequest() = {
    exec(session => {
      session.set("correlationId", UUID.randomUUID().toString)
    })
    .exec(http("Reference Data API Request")
      .get(apiPaths("reference"))
      .queryParam("securityId", "${securityId}")
      .header("X-Correlation-ID", "${correlationId}")
      .header("X-User-ID", "performance-test-user")
      .check(status.is(200))
      .check(jsonPath("$.securityId").exists)
    )
  }

  /**
   * Creates a calculation request scenario step
   * 
   * @return Gatling chain builder with the calculation request step
   */
  def createCalculationRequest() = {
    exec(session => {
      session.set("correlationId", UUID.randomUUID().toString)
    })
    .exec(http("Calculation API Request")
      .get(apiPaths("calculation"))
      .queryParam("businessDate", "${businessDate}")
      .header("X-Correlation-ID", "${correlationId}")
      .header("X-User-ID", "performance-test-user")
      .check(status.is(200))
      .check(jsonPath("$[*]").exists)
    )
  }

  // Define individual API scenarios
  val positionScenario = scenario("Position API Load Test")
    .feed(csvFeeder)
    .exec(createPositionRequest())
    .pause(exponentialPaused(1.seconds, 2.seconds))

  val inventoryScenario = scenario("Inventory API Load Test")
    .feed(csvFeeder)
    .exec(createInventoryRequest())
    .pause(exponentialPaused(1.seconds, 2.seconds))

  val referenceDataScenario = scenario("Reference Data API Load Test")
    .feed(csvFeeder)
    .exec(createReferenceDataRequest())
    .pause(exponentialPaused(1.seconds, 2.seconds))

  val calculationScenario = scenario("Calculation API Load Test")
    .feed(csvFeeder)
    .exec(createCalculationRequest())
    .pause(exponentialPaused(1.seconds, 2.seconds))

  // Mixed API scenario with randomization to better simulate real-world usage
  val mixedApiScenario = scenario("Mixed API Load Test")
    .during(30.minutes) {
      feed(csvFeeder)
      .exec(
        randomSwitch(
          25.0 -> createPositionRequest(),
          25.0 -> createInventoryRequest(),
          25.0 -> createReferenceDataRequest(),
          25.0 -> createCalculationRequest()
        )
      )
      .pause(exponentialPaused(1.seconds, 2.seconds))
    }

  // Setup different load profiles for comprehensive performance testing
  setUp(
    // Constant users per second - tests steady load
    positionScenario.inject(
      constantUsersPerSec(100) during(5.minutes)
    ).protocols(httpProtocol),
    
    // Ramping users per second - tests scaling behavior
    inventoryScenario.inject(
      rampUsersPerSec(20) to(200) during(10.minutes)
    ).protocols(httpProtocol),
    
    // Stress test with high load - tests system limits
    referenceDataScenario.inject(
      rampUsersPerSec(100) to(1000) during(15.minutes)
    ).protocols(httpProtocol),
    
    // Mixed workload - simulates real-world usage patterns
    mixedApiScenario.inject(
      // Warm-up phase
      rampUsersPerSec(10) to(50) during(2.minutes),
      
      // Normal business hours with varying load
      constantUsersPerSec(50) during(5.minutes),
      rampUsersPerSec(50) to(200) during(5.minutes),
      constantUsersPerSec(200) during(5.minutes),
      
      // Peak load period
      rampUsersPerSec(200) to(500) during(5.minutes),
      constantUsersPerSec(500) during(3.minutes),
      
      // Gradual reduction
      rampUsersPerSec(500) to(100) during(5.minutes)
    ).protocols(httpProtocol)
  ).assertions(
    // Response time assertions - ensure system meets performance SLAs
    global.responseTime.percentile(99).lt(200), // 99% of requests must complete within 200ms
    global.successfulRequests.percent.gt(99)    // 99% of requests must be successful
  )
}