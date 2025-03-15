package gatling.simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import java.util.UUID

class ShortSellValidationSimulation extends Simulation {

  // Global configuration
  val baseUrl = "${baseUrl}"
  val apiPath = "/api/v1/short-sell/validate"

  // HTTP protocol configuration
  val httpProtocol = http
    .baseUrl(baseUrl)
    .header("Content-Type", "application/json")
    .header("Accept", "application/json")
    .header("X-User-ID", "performance-test-user")

  // Data feeder from CSV file
  val csvFeeder = csv("data/testData.csv").random

  /**
   * Creates a short sell validation request scenario step
   * @return Gatling chain builder with the short sell validation request step
   */
  def createShortSellValidationRequest() = {
    exec(
      http("Short Sell Validation Request")
        .post(apiPath)
        .header("X-Correlation-ID", _ => UUID.randomUUID().toString)
        .body(ElFileBody("bodies/shortSellRequest.json"))
        .check(status.is(200))
        .check(jsonPath("$.validationStatus").exists)
        .check(responseTimeInMillis.lte(150))
    )
  }

  // Define the test scenario
  val shortSellScenario = scenario("Validate Short Sell Orders")
    .feed(csvFeeder)
    .exec(createShortSellValidationRequest())
    .pause(exponentialPaused(500.milliseconds)) // exponential think time with 500ms mean

  // Configure the simulation with different load profiles
  setUp(
    shortSellScenario.inject(
      // Constant load of 100 users per second for 5 minutes
      constantUsersPerSec(100) during (5 minutes),
      
      // Ramp up from 20 to 200 users per second over 10 minutes
      rampUsersPerSec(20) to (200) during (10 minutes),
      
      // Stress test: ramp up from 100 to 1000 users per second over 15 minutes
      rampUsersPerSec(100) to (1000) during (15 minutes)
    )
  ).protocols(httpProtocol)
   .assertions(
     // Verify that 99% of requests complete within 150ms (SLA requirement)
     global.responseTime.percentile(99).lt(150),
     
     // Verify that at least 99% of requests are successful
     global.successfulRequests.percent.gt(99)
   )
}