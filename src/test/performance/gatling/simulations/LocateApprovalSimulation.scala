package performance.gatling.simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import java.util.UUID

/**
 * Gatling simulation for testing the locate approval workflow performance in the Inventory Management System.
 * This simulation tests the locate approval API under various load scenarios to ensure it meets
 * the required performance SLAs (P99 response time under 200ms with high throughput).
 *
 * Three load profiles are available:
 * - constantUsersPerSec: 50 users/sec for 5 minutes (default)
 * - rampUsersPerSec: ramp from 10 to 100 users/sec over 10 minutes
 * - stressTest: ramp from 50 to 500 users/sec over 15 minutes
 *
 * Run with: mvn gatling:test -Dgatling.simulationClass=performance.gatling.simulations.LocateApprovalSimulation -DloadProfile=constantUsersPerSec
 */
class LocateApprovalSimulation extends Simulation {

  // HTTP protocol configuration
  val httpProtocol = http
    .baseUrl("${baseUrl}")
    .headers(Map(
      "Content-Type" -> "application/json",
      "Accept" -> "application/json",
      "X-Correlation-ID" -> "#{UUID.randomUUID().toString}",
      "X-User-ID" -> "performance-test-user"
    ))
    
  // CSV feeder for test data - loads test data with security IDs, client IDs, quantities, etc.
  val csvFeeder = csv("data/testData.csv").random

  /**
   * Creates a locate request scenario step
   * @return ChainBuilder with the locate request HTTP call
   */
  def createLocateRequest() = {
    exec(http("Create Locate Request")
      .post("/api/v1/locates")
      .body(ElFileBody("bodies/locateRequest.json")).asJson
      .check(status.is(201))
      .check(jsonPath("$.requestId").exists.saveAs("requestId"))
    )
  }

  // Define scenario for submitting locate requests
  val locateScenario = scenario("Submit Locate Requests")
    .feed(csvFeeder)
    .exec(createLocateRequest())
    // Use exponential distribution for think time to simulate realistic user behavior
    .pause(exponential(1))

  // Get the load profile type from system property or default to constantUsersPerSec
  val profileType = System.getProperty("loadProfile", "constantUsersPerSec")

  // Define all load profiles
  val constantUsersProfile = constantUsersPerSec(50) during 5.minutes
  val rampUsersProfile = rampUsersPerSec(10) to 100 during 10.minutes
  val stressTestProfile = rampUsersPerSec(50) to 500 during 15.minutes

  // Select the appropriate load profile based on the configuration
  val selectedProfile = profileType match {
    case "constantUsersPerSec" => constantUsersProfile
    case "rampUsersPerSec" => rampUsersProfile
    case "stressTest" => stressTestProfile
    case _ => constantUsersProfile // Default
  }

  // Configure the simulation with the selected load profile
  setUp(
    locateScenario.inject(selectedProfile).protocols(httpProtocol)
  ).assertions(
    // Verify P99 response time is under 200ms as required by SLA
    global.responseTime.percentile(99.0).lt(200),
    // Verify success rate is above 99% to ensure system reliability
    global.successfulRequests.percent.gt(99)
  )
}