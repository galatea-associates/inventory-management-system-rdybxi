package gatling.simulations

import io.gatling.core.Predef._ // Gatling core DSL - version 3.9.0
import io.gatling.http.Predef._ // Gatling HTTP DSL - version 3.9.0
import scala.concurrent.duration._ // Scala duration utilities - version 2.13.10
import java.util.UUID // For generating unique request IDs - version 17

/**
 * Gatling simulation for testing the inventory calculation workflow performance.
 * This simulation tests the system's ability to calculate various inventory types
 * with high throughput and low latency, ensuring the system meets the 200ms
 * end-to-end latency requirement for inventory calculations.
 */
class InventoryCalculationSimulation extends Simulation {
  
  // Define base URL and API path
  val baseUrl = "${baseUrl}"
  val apiPath = "/api/v1/calculations/inventory"
  
  // Configure HTTP protocol with headers
  val httpProtocol = http
    .baseUrl(baseUrl)
    .headers(Map(
      "Content-Type" -> "application/json",
      "Accept" -> "application/json",
      "X-Correlation-ID" -> "#{UUID.randomUUID().toString}",
      "X-User-ID" -> "performance-test-user"
    ))
  
  // Configure the CSV feeder - path may need to be adjusted based on project structure
  val feeder = csv("testData.csv").random
  
  // Scenario for For Loan Availability calculation
  val calculateForLoanAvailability = scenario("Calculate For Loan Availability")
    .feed(feeder)
    .exec(
      http("For Loan Availability Calculation")
        .post(s"$apiPath/for-loan")
        .body(StringBody(
          """
          {
            "securityId": "${securityId}",
            "bookId": "${bookId}",
            "businessDate": "${businessDate}"
          }
          """)).asJson
        .check(status.is(200))
        .check(jsonPath("$.availableQuantity").exists)
        .check(responseTimeInMillis.lte(200))
    )
    .pause(exponentialPauses(1))
  
  // Scenario for For Pledge Availability calculation
  val calculateForPledgeAvailability = scenario("Calculate For Pledge Availability")
    .feed(feeder)
    .exec(
      http("For Pledge Availability Calculation")
        .post(s"$apiPath/for-pledge")
        .body(StringBody(
          """
          {
            "securityId": "${securityId}",
            "bookId": "${bookId}",
            "businessDate": "${businessDate}"
          }
          """)).asJson
        .check(status.is(200))
        .check(jsonPath("$.availableQuantity").exists)
        .check(responseTimeInMillis.lte(200))
    )
    .pause(exponentialPauses(1))
  
  // Scenario for Short Sell Availability calculation
  val calculateShortSellAvailability = scenario("Calculate Short Sell Availability")
    .feed(feeder)
    .exec(
      http("Short Sell Availability Calculation")
        .post(s"$apiPath/short-sell")
        .body(StringBody(
          """
          {
            "securityId": "${securityId}",
            "bookId": "${bookId}",
            "clientId": "${clientId}",
            "aggregationUnitId": "${aggregationUnitId}",
            "businessDate": "${businessDate}"
          }
          """)).asJson
        .check(status.is(200))
        .check(jsonPath("$.availableQuantity").exists)
        .check(responseTimeInMillis.lte(200))
    )
    .pause(exponentialPauses(1))
  
  // Scenario for Locate Availability calculation
  val calculateLocateAvailability = scenario("Calculate Locate Availability")
    .feed(feeder)
    .exec(
      http("Locate Availability Calculation")
        .post(s"$apiPath/locate")
        .body(StringBody(
          """
          {
            "securityId": "${securityId}",
            "requestorId": "${requestorId}",
            "clientId": "${clientId}",
            "aggregationUnitId": "${aggregationUnitId}",
            "businessDate": "${businessDate}"
          }
          """)).asJson
        .check(status.is(200))
        .check(jsonPath("$.availableQuantity").exists)
        .check(responseTimeInMillis.lte(200))
    )
    .pause(exponentialPauses(1))
  
  // Scenario for Batch Inventory calculation
  val batchInventoryCalculation = scenario("Batch Inventory Calculation")
    .feed(feeder)
    .exec(
      http("Batch Inventory Calculation")
        .post(s"$apiPath/batch")
        .body(StringBody(
          """
          {
            "securityId": "${securityId}",
            "bookId": "${bookId}",
            "clientId": "${clientId}",
            "aggregationUnitId": "${aggregationUnitId}",
            "businessDate": "${businessDate}",
            "calculationTypes": ["FOR_LOAN", "FOR_PLEDGE", "SHORT_SELL", "LOCATE"]
          }
          """)).asJson
        .check(status.is(200))
        .check(jsonPath("$.calculations").exists)
        .check(responseTimeInMillis.lte(500))
    )
    .pause(exponentialPauses(2))
  
  // Define load profiles as per requirements
  val constantUsersPerSecProfile = constantUsersPerSec(50) during (5 minutes)
  val rampUsersPerSecProfile = rampUsersPerSec(10) to 100 during (10 minutes)
  val stressTestProfile = rampUsersPerSec(50) to 500 during (15 minutes)
  
  // Uncomment the profile you want to use
  val activeProfile = constantUsersPerSecProfile
  // val activeProfile = rampUsersPerSecProfile
  // val activeProfile = stressTestProfile
  
  // Set up the simulation with weighted scenarios
  setUp(
    calculateForLoanAvailability.inject(activeProfile.multiply(0.3)),
    calculateForPledgeAvailability.inject(activeProfile.multiply(0.2)),
    calculateShortSellAvailability.inject(activeProfile.multiply(0.2)),
    calculateLocateAvailability.inject(activeProfile.multiply(0.2)),
    batchInventoryCalculation.inject(activeProfile.multiply(0.1))
  ).protocols(httpProtocol)
   .assertions(
     // Validate that 99% of requests complete within 200ms as per SLA requirements
     global.responseTime.percentile3.lt(200),
     // Validate that more than 99% of requests are successful
     global.successfulRequests.percent.gt(99)
   )
}