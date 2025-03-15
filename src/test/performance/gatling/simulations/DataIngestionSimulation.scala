package gatling.simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import java.util.UUID
import java.io.File

class DataIngestionSimulation extends Simulation {
  // Global configuration
  val baseUrl = "${baseUrl}"
  val apiPath = "/api/v1/ingestion"
  
  // HTTP protocol configuration
  val httpProtocol = http
    .baseUrl(baseUrl)
    .header("Content-Type", "application/json")
    .header("Accept", "application/json")
    .header("X-Correlation-ID", "#{UUID.randomUUID().toString}")
    .header("X-User-ID", "performance-test-user")
  
  // CSV feeder for test data
  // CSV column mapping:
  // 0: securityId, 1: requestId, 2: clientId, 3: aggregationUnitId, 4: quantity
  // 5: cashSwapIndicator, 6: securityTemperature, 7: orderId, 8: orderQuantity
  // 9: bookId, 10: date
  val csvFeeder = csv("data/testData.csv").random
  
  // Request builders for different data ingestion types
  def createReferenceDataRequest(): ChainBuilder = {
    exec(http("Ingest Reference Data")
      .post(apiPath + "/reference-data")
      .body(ElFileBody("../../common/fixtures/referenceData.json")).asJson
      .check(status.is(200))
      .check(jsonPath("$.status").is("success")))
  }
  
  def createMarketDataRequest(): ChainBuilder = {
    exec(http("Ingest Market Data")
      .post(apiPath + "/market-data")
      .body(StringBody("""
        {
          "securityId": "${0}",
          "price": 100.00,
          "quantity": ${4},
          "timestamp": "${10}T10:00:00Z",
          "source": "REUTERS",
          "priceType": "TRADE",
          "currency": "USD",
          "temperature": "${6}"
        }
      """)).asJson
      .check(status.is(200))
      .check(jsonPath("$.status").is("success")))
  }
  
  def createTradeDataRequest(): ChainBuilder = {
    exec(http("Ingest Trade Data")
      .post(apiPath + "/trade-data")
      .body(StringBody("""
        {
          "tradeId": "${7}",
          "securityId": "${0}",
          "clientId": "${2}",
          "quantity": ${4},
          "price": 100.00,
          "tradeDate": "${10}",
          "settlementDate": "${10}",
          "counterpartyId": "${2}",
          "bookId": "${9}",
          "tradeType": "${5}"
        }
      """)).asJson
      .check(status.is(200))
      .check(jsonPath("$.status").is("success")))
  }
  
  def createContractDataRequest(): ChainBuilder = {
    exec(http("Ingest Contract Data")
      .post(apiPath + "/contract-data")
      .body(StringBody("""
        {
          "contractId": "${1}",
          "securityId": "${0}",
          "counterpartyId": "${2}",
          "quantity": ${4},
          "startDate": "${10}",
          "endDate": "${10}",
          "rate": 0.5,
          "contractType": "${5}",
          "temperature": "${6}"
        }
      """)).asJson
      .check(status.is(200))
      .check(jsonPath("$.status").is("success")))
  }
  
  def createBatchUploadRequest(dataType: String, file: File): ChainBuilder = {
    exec(http("Batch Upload - " + dataType)
      .post(apiPath + "/" + dataType + "/batch")
      .header("Content-Type", "multipart/form-data")
      .formUpload("file", file)
      .formParam("source", "PERFORMANCE_TEST")
      .check(status.is(200))
      .check(jsonPath("$.batchId").exists))
  }
  
  // Define scenarios
  val referenceDataScenario = scenario("ingestReferenceData")
    .feed(csvFeeder)
    .exec(createReferenceDataRequest())
    .pauseExp(1)
  
  val marketDataScenario = scenario("ingestMarketData")
    .feed(csvFeeder)
    .exec(createMarketDataRequest())
    .pauseExp(1)
  
  val tradeDataScenario = scenario("ingestTradeData")
    .feed(csvFeeder)
    .exec(createTradeDataRequest())
    .pauseExp(1)
  
  val contractDataScenario = scenario("ingestContractData")
    .feed(csvFeeder)
    .exec(createContractDataRequest())
    .pauseExp(1)
  
  val batchUploadScenario = scenario("uploadBatchFile")
    .feed(csvFeeder)
    .exec(createBatchUploadRequest("reference-data", 
      new File("../resources/data/testData.csv")))
    .pauseExp(5)
  
  // Get the load profile type from system properties or use default
  val loadProfile = sys.props.getOrElse("loadProfile", "constantUsersPerSec")
  
  // Define injection profiles based on the load profile parameter
  def getInjectionProfile(scenario: ScenarioBuilder) = {
    loadProfile match {
      case "constantUsersPerSec" => 
        scenario.inject(constantUsersPerSec(100) during (5.minutes))
      case "rampUsersPerSec" => 
        scenario.inject(rampUsersPerSec(50) to (300) during (10.minutes))
      case "stressTest" => 
        scenario.inject(rampUsersPerSec(100) to (1000) during (15.minutes))
      case _ => 
        scenario.inject(constantUsersPerSec(100) during (5.minutes))
    }
  }
  
  // Set up the simulation with the appropriate load profile for each scenario
  setUp(
    getInjectionProfile(referenceDataScenario),
    getInjectionProfile(marketDataScenario),
    getInjectionProfile(tradeDataScenario),
    getInjectionProfile(contractDataScenario),
    getInjectionProfile(batchUploadScenario)
  ).protocols(httpProtocol)
   .assertions(
     global.responseTime.percentile3.lt(200), // 99% of requests must complete within 200ms
     global.successfulRequests.percent.gt(99)  // 99% of requests must succeed
   )
}