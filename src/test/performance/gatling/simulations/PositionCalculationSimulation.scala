package simulations

import io.gatling.core.Predef._ // Gatling core DSL for simulation definition - v3.9.0
import io.gatling.http.Predef._ // Gatling HTTP DSL for HTTP requests - v3.9.0
import scala.concurrent.duration._ // Scala duration utilities for defining test durations - v2.13.10
import java.util.UUID // For generating unique request IDs - v17

/**
 * Gatling simulation for testing the position calculation workflow performance
 * This simulation tests the system's ability to calculate real-time positions and settlement ladders
 * with high throughput and low latency, ensuring the system meets the 200ms end-to-end latency requirement
 * for position calculations.
 */
class PositionCalculationSimulation extends Simulation {
  
  // Base URL and API path configured as environment variables
  val baseUrl = "${baseUrl}"
  val apiPath = "/api/v1/calculations/position"

  // HTTP protocol configuration
  val httpProtocol = http
    .baseUrl(baseUrl)
    .headers(Map(
      "Content-Type" -> "application/json",
      "Accept" -> "application/json",
      "X-Correlation-ID" -> "#{UUID.randomUUID().toString}",
      "X-User-ID" -> "performance-test-user"
    ))
    .check(status.is(200)) // Common check for all requests

  // CSV feeder for test data
  val positionFeeder = csv("data/testData.csv").random

  // Scenario 1: Calculate single position
  val calculatePositions = scenario("calculatePositions")
    .feed(positionFeeder)
    .exec(
      http("Calculate Position")
        .post(apiPath)
        .body(StringBody("""{"securityId":"${securityId}","bookId":"${bookId}","businessDate":"${businessDate}"}"""))
        .check(
          jsonPath("$.securityId").exists,
          jsonPath("$.bookId").exists,
          jsonPath("$.businessDate").exists,
          jsonPath("$.position").exists,
          responseTimeInMillis.lte(200) // Check response time meets 200ms SLA
        )
    )
    .pause(exponential(1)) // Exponential think time with 1 second mean

  // Scenario 2: Get settlement ladder data for a position
  val getSettlementLadder = scenario("getSettlementLadder")
    .feed(positionFeeder)
    .exec(
      http("Get Settlement Ladder")
        .get(apiPath + "/settlement-ladder")
        .queryParam("securityId", "${securityId}")
        .queryParam("bookId", "${bookId}")
        .queryParam("businessDate", "${businessDate}")
        .check(
          jsonPath("$.settlementLadder").exists,
          jsonPath("$.settlementLadder[*].settlementDate").exists,
          jsonPath("$.settlementLadder[*].deliverQuantity").exists,
          jsonPath("$.settlementLadder[*].receiveQuantity").exists,
          responseTimeInMillis.lte(200) // Check response time meets 200ms SLA
        )
    )
    .pause(exponential(1)) // Exponential think time with 1 second mean

  // Scenario 3: Batch position calculation
  val batchPositionCalculation = scenario("batchPositionCalculation")
    .feed(positionFeeder)
    .exec(
      http("Batch Position Calculation")
        .post(apiPath + "/batch")
        .body(StringBody("""
        {
          "positions": [
            {"securityId":"${securityId}","bookId":"${bookId}","businessDate":"${businessDate}"}
          ],
          "calculateSettlementLadder": true,
          "calculateProjectedPosition": true
        }
        """))
        .check(
          jsonPath("$.positions").exists,
          jsonPath("$.positions[0].securityId").exists,
          jsonPath("$.positions[0].bookId").exists,
          jsonPath("$.positions[0].position").exists,
          jsonPath("$.calculationTime").exists,
          responseTimeInMillis.lte(500) // Batch operations allowed 500ms
        )
    )
    .pause(exponential(2)) // Exponential think time with 2 second mean

  // Load profile 1: Constant user load - 50 users/sec for 5 minutes
  val constantUsersPerSecProfile = constantUsersPerSec(50) during(5.minutes)
  
  // Load profile 2: Ramping user load - 10 to 100 users/sec over 10 minutes
  val rampUsersPerSecProfile = rampUsersPerSec(10) to(100) during(10.minutes)
  
  // Load profile 3: Stress test - 50 to 500 users/sec over 15 minutes
  val stressTestProfile = rampUsersPerSec(50) to(500) during(15.minutes)

  // Configure the simulation with all scenarios and their injection profiles
  setUp(
    calculatePositions.inject(constantUsersPerSecProfile),
    getSettlementLadder.inject(rampUsersPerSecProfile),
    batchPositionCalculation.inject(stressTestProfile)
  ).protocols(httpProtocol)
   .assertions(
     // Assert that 99% of requests complete within 200ms
     global.responseTime.percentile(99).lt(200),
     // Assert that 99% of requests are successful
     global.successfulRequests.percent.gt(99)
   )
}