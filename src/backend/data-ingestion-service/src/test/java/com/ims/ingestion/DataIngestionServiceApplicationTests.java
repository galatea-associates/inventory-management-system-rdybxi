package com.ims.ingestion;

import com.ims.ingestion.config.KafkaConfig; // Internal import
import com.ims.ingestion.service.ContractDataService; // Internal import
import com.ims.ingestion.service.MarketDataService; // Internal import
import com.ims.ingestion.service.ReferenceDataService; // Internal import
import com.ims.ingestion.service.TradeDataService; // Internal import
import org.junit.jupiter.api.DisplayName; // JUnit 5.9.2
import org.junit.jupiter.api.Test; // JUnit 5.9.2
import org.springframework.beans.factory.annotation.Autowired; // Spring Framework 6.0.9
import org.springframework.boot.test.context.SpringBootTest; // Spring Boot 3.1.0
import org.springframework.kafka.core.KafkaTemplate; // Spring Kafka 3.0.5
import org.springframework.kafka.test.context.EmbeddedKafka; // Spring Kafka 3.0.5
import org.springframework.test.context.ActiveProfiles; // Spring Framework 6.0.9

import static org.junit.jupiter.api.Assertions.assertNotNull; // JUnit 5.9.2

/**
 * Integration test class for the Data Ingestion Service application. This class verifies that the
 * Spring Boot application context loads successfully with all required beans and configurations,
 * ensuring that the service can properly ingest reference data, market data, trade data, and
 * contract data from various external sources.
 */
@SpringBootTest
@ActiveProfiles("test")
@EmbeddedKafka(
    partitions = 1,
    topics = {
      "reference-data-events-test",
      "market-data-events-test",
      "trade-data-events-test",
      "contract-data-events-test"
    })
public class DataIngestionServiceApplicationTests {

  @Autowired private ReferenceDataService referenceDataService;

  @Autowired private MarketDataService marketDataService;

  @Autowired private TradeDataService tradeDataService;

  @Autowired private ContractDataService contractDataService;

  @Autowired private KafkaTemplate<String, Object> kafkaTemplate;

  public DataIngestionServiceApplicationTests() {
    // Default constructor
  }

  /** Verifies that the Spring application context loads successfully */
  @Test
  @DisplayName("Should load application context")
  void contextLoads() {
    // Assert that the Spring application context loads successfully
    assertNotNull(referenceDataService, "ReferenceDataService should not be null");
    assertNotNull(marketDataService, "MarketDataService should not be null");
    assertNotNull(tradeDataService, "TradeDataService should not be null");
    assertNotNull(contractDataService, "ContractDataService should not be null");
    assertNotNull(kafkaTemplate, "KafkaTemplate should not be null");
  }

  /** Verifies that the ReferenceDataService is properly configured and available */
  @Test
  @DisplayName("Should have ReferenceDataService available")
  void testReferenceDataServiceAvailable() {
    // Assert that referenceDataService is not null
    assertNotNull(referenceDataService, "ReferenceDataService must be autowired");
  }

  /** Verifies that the MarketDataService is properly configured and available */
  @Test
  @DisplayName("Should have MarketDataService available")
  void testMarketDataServiceAvailable() {
    // Assert that marketDataService is not null
    assertNotNull(marketDataService, "MarketDataService must be autowired");
  }

  /** Verifies that the TradeDataService is properly configured and available */
  @Test
  @DisplayName("Should have TradeDataService available")
  void testTradeDataServiceAvailable() {
    // Assert that tradeDataService is not null
    assertNotNull(tradeDataService, "TradeDataService must be autowired");
  }

  /** Verifies that the ContractDataService is properly configured and available */
  @Test
  @DisplayName("Should have ContractDataService available")
  void testContractDataServiceAvailable() {
    // Assert that contractDataService is not null
    assertNotNull(contractDataService, "ContractDataService must be autowired");
  }

  /**
   * Verifies that the Kafka configuration is properly set up and the KafkaTemplate is available
   */
  @Test
  @DisplayName("Should have Kafka configuration available")
  void testKafkaConfigurationAvailable() {
    // Assert that kafkaTemplate is not null
    assertNotNull(kafkaTemplate, "KafkaTemplate must be autowired");
  }
}