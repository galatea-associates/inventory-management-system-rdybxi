package com.ims.ingestion.service;

import com.ims.common.event.MarketDataEvent;
import com.ims.common.model.MarketData;
import com.ims.ingestion.adapter.BloombergAdapter; // version 1.0.0
import com.ims.ingestion.adapter.ReutersAdapter; // version 1.0.0
import com.ims.ingestion.exception.IngestionException;
import com.ims.ingestion.repository.MarketDataRepository;
import java.time.Instant; // version 17
import java.util.List; // version 17
import java.util.Map; // version 17
import java.util.Optional; // version 17
import java.util.UUID; // version 17
import lombok.extern.slf4j.Slf4j; // version 1.18.26
import org.springframework.beans.factory.annotation.Autowired; // version 6.0.9
import org.springframework.beans.factory.annotation.Value; // version 6.0.9
import org.springframework.kafka.core.KafkaTemplate; // version 3.0.5
import org.springframework.kafka.annotation.KafkaListener; // version 3.0.5
import org.springframework.stereotype.Service; // version 6.0.9
import org.springframework.transaction.annotation.Transactional; // version 6.0.9

/**
 * Service responsible for ingesting, processing, and publishing market data from various
 * external providers. Handles both batch and real-time market data feeds, performs data
 * validation, transformation, and ensures high-throughput processing of market data events.
 */
@Service
@Slf4j
public class MarketDataService {

  private final MarketDataRepository marketDataRepository;
  private final KafkaTemplate<String, MarketDataEvent> marketDataKafkaTemplate;
  private final ReutersAdapter reutersAdapter;
  private final BloombergAdapter bloombergAdapter;
  private final MarkITAdapter markITAdapter;
  private final UltumusAdapter ultumusAdapter;
  private final RIMESAdapter rimesAdapter;

  @Value("${app.kafka.topics.market-data}")
  private String marketDataTopic;

  @Value("${app.market-data.real-time.enabled:true}")
  private boolean enableRealTimeProcessing;

  @Value("${app.market-data.batch-size:1000}")
  private int batchSize;

  /**
   * Constructor with dependency injection for required components
   *
   * @param marketDataRepository The repository for persisting and retrieving market data
   * @param marketDataKafkaTemplate The template for sending messages to Kafka topics
   * @param reutersAdapter The adapter for Reuters market data feed integration
   * @param bloombergAdapter The adapter for Bloomberg market data feed integration
   * @param markITAdapter The adapter for MarkIT market data feed integration
   * @param ultumusAdapter The adapter for Ultumus market data feed integration
   * @param rimesAdapter The adapter for RIMES market data feed integration
   * @param marketDataTopic The topic to which market data events are published
   * @param enableRealTimeProcessing Flag to enable or disable real-time processing
   * @param batchSize The batch size for processing market data
   */
  @Autowired
  public MarketDataService(
      MarketDataRepository marketDataRepository,
      KafkaTemplate<String, MarketDataEvent> marketDataKafkaTemplate,
      ReutersAdapter reutersAdapter,
      BloombergAdapter bloombergAdapter,
      MarkITAdapter markITAdapter,
      UltumusAdapter ultumusAdapter,
      RIMESAdapter rimesAdapter,
      @Value("${app.kafka.topics.market-data}") String marketDataTopic,
      @Value("${app.market-data.real-time.enabled:true}") boolean enableRealTimeProcessing,
      @Value("${app.market-data.batch-size:1000}") int batchSize) {
    this.marketDataRepository = marketDataRepository;
    this.marketDataKafkaTemplate = marketDataKafkaTemplate;
    this.reutersAdapter = reutersAdapter;
    this.bloombergAdapter = bloombergAdapter;
    this.markITAdapter = markITAdapter;
    this.ultumusAdapter = ultumusAdapter;
    this.rimesAdapter = rimesAdapter;
    this.marketDataTopic = marketDataTopic;
    this.enableRealTimeProcessing = enableRealTimeProcessing;
    this.batchSize = batchSize;
    log.info("MarketDataService initialized");
  }

  /**
   * Initializes the market data service and connects to real-time data sources if enabled
   */
  public void initialize() {
    log.info("Initializing market data service");
    if (enableRealTimeProcessing) {
      connectToRealTimeDataSources();
    }
    log.info("Market data service initialized successfully");
  }

  /** Establishes connections to real-time market data providers */
  public void connectToRealTimeDataSources() {
    log.info("Attempting to connect to real-time data sources");
    if (!reutersAdapter.isConnected()) {
      reutersAdapter.connect();
    }
    if (!bloombergAdapter.isConnected()) {
      bloombergAdapter.connect();
    }
    log.info("Successfully connected to real-time data sources");
  }

  /**
   * Subscribes to market data updates for a list of securities
   *
   * @param securityIds The list of security identifiers to subscribe to
   * @param source The source of the market data
   */
  public void subscribeToMarketData(List<String> securityIds, String source) {
    log.info("Subscribing to market data for securities: {} from source: {}", securityIds, source);
    if ("REUTERS".equalsIgnoreCase(source)) {
      reutersAdapter.subscribeToMarketData(securityIds);
    } else if ("BLOOMBERG".equalsIgnoreCase(source)) {
      bloombergAdapter.subscribeToMarketData(securityIds);
    } else {
      log.warn("Unsupported market data source: {}", source);
    }
    log.info("Successfully subscribed to market data");
  }

  /**
   * Processes a batch file of market data from a specific source
   *
   * @param batchFile The batch file to process
   * @param source The source of the market data
   * @return Future containing processed market data
   */
  @Transactional
  public CompletableFuture<List<MarketData>> processMarketDataBatch(File batchFile, String source) {
    log.info("Starting batch processing from source: {}", source);
    String batchId = UUID.randomUUID().toString();

    CompletableFuture<List<MarketData>> future;

    if ("MARKIT".equalsIgnoreCase(source)) {
      future = markITAdapter.processMarketDataBatch(batchFile, batchId);
    } else if ("ULTUMUS".equalsIgnoreCase(source)) {
      future = ultumusAdapter.processMarketDataBatch(batchFile, batchId);
    } else if ("RIMES".equalsIgnoreCase(source)) {
      future = rimesAdapter.processMarketDataBatch(batchFile, batchId);
    } else {
      CompletableFuture<List<MarketData>> failedFuture = new CompletableFuture<>();
      failedFuture.completeExceptionally(
          IngestionException.forMarketData("Unsupported market data source: " + source));
      return failedFuture;
    }

    return future.thenApply(
        marketDataList -> {
          List<MarketData> validatedMarketData = new ArrayList<>();
          for (MarketData marketData : marketDataList) {
            if (validateMarketData(marketData)) {
              validatedMarketData.add(marketData);
            }
          }
          return validatedMarketData;
        })
        .thenCompose(
            validatedMarketData -> {
              List<CompletableFuture<Void>> saveFutures = new ArrayList<>();
              for (int i = 0; i < validatedMarketData.size(); i += batchSize) {
                List<MarketData> batch =
                    validatedMarketData.subList(i, Math.min(i + batchSize, validatedMarketData.size()));
                saveFutures.add(
                    CompletableFuture.runAsync(
                        () -> marketDataRepository.saveAll(batch),
                        java.util.concurrent.ForkJoinPool.commonPool()));
              }

              return CompletableFuture.allOf(saveFutures.toArray(new CompletableFuture[0]))
                  .thenApply(
                      v -> {
                        publishMarketDataEvents(validatedMarketData);
                        return validatedMarketData;
                      });
            })
        .whenComplete(
            (result, ex) -> {
              if (ex != null) {
                log.error("Error processing batch from source: {}", source, ex);
              } else {
                log.info("Completed batch processing from source: {}", source);
              }
            });
  }

  /**
   * Handles market data updates from Reuters
   *
   * @param event The Reuters market data event
   */
  @Transactional
  public void handleReutersMarketDataUpdate(Object event) {
    log.info("Received Reuters market data update");
    MarketData marketData = reutersAdapter.handleMarketDataUpdate(event);
    if (validateMarketData(marketData)) {
      marketDataRepository.save(marketData);
      publishMarketDataEvent(marketData);
      log.info("Successfully processed Reuters update");
    }
  }

  /**
   * Handles market data updates from Bloomberg
   *
   * @param event The Bloomberg market data event
   */
  @Transactional
  public void handleBloombergMarketDataUpdate(Object event) {
    log.info("Received Bloomberg market data update");
    MarketData marketData = bloombergAdapter.handleMarketDataEvent(event);
    if (validateMarketData(marketData)) {
      marketDataRepository.save(marketData);
      publishMarketDataEvent(marketData);
      log.info("Successfully processed Bloomberg update");
    }
  }

  /**
   * Processes a market data event received from Kafka
   *
   * @param event The market data event
   */
  @KafkaListener(
      topics = "${app.kafka.topics.market-data-input}",
      groupId = "${app.kafka.group-id}")
  @Transactional
  public void processMarketDataEvent(MarketDataEvent event) {
    log.info("Received market data event from Kafka");
    if (event.validate()) {
      MarketData marketData =
          MarketData.builder()
              .securityId(event.getSecurityId())
              .marketDataType(event.getMarketDataType())
              .price(event.getPrice())
              .build();
      marketDataRepository.save(marketData);
      log.info("Successfully processed market data event");
    }
  }

  /**
   * Publishes a market data event to Kafka
   *
   * @param marketData The market data to publish
   */
  public void publishMarketDataEvent(MarketData marketData) {
    log.info("Publishing market data event");
    MarketDataEvent event = marketData.toMarketDataEvent();
    if (event.validate()) {
      marketDataKafkaTemplate.send(marketDataTopic, event);
      log.info("Successfully published event to Kafka topic: {}", marketDataTopic);
    }
  }

  /**
   * Publishes multiple market data events to Kafka
   *
   * @param marketDataList The list of market data to publish
   */
  public void publishMarketDataEvents(List<MarketData> marketDataList) {
    log.info("Publishing multiple market data events");
    for (MarketData marketData : marketDataList) {
      publishMarketDataEvent(marketData);
    }
    log.info("Successfully published all events");
  }

  /**
   * Retrieves the latest market data for a security and market data type
   *
   * @param securityId The security ID
   * @param marketDataType The market data type
   * @return The latest market data if found, or empty Optional otherwise
   */
  public Optional<MarketData> getLatestMarketData(String securityId, String marketDataType) {
    log.info("Retrieving latest market data for securityId: {}, marketDataType: {}", securityId, marketDataType);
    return marketDataRepository.findLatestBySecurityIdAndMarketDataType(securityId, marketDataType);
  }

  /**
   * Retrieves market data for a security within a time range
   *
   * @param securityId The security ID
   * @param startTime The start time of the range
   * @param endTime The end time of the range
   * @return List of market data within the time range
   */
  public List<MarketData> getMarketDataInTimeRange(String securityId, Instant startTime, Instant endTime) {
    log.info("Retrieving market data for securityId: {} in time range: {} - {}", securityId, startTime, endTime);
    return marketDataRepository.findBySecurityIdAndEventTimeBetween(securityId, startTime, endTime);
  }

  /**
   * Retrieves the latest prices for a list of securities
   *
   * @param securityIds The list of security IDs
   * @return Map of security IDs to their latest price data
   */
  public Map<String, MarketData> getLatestPricesForSecurities(List<String> securityIds) {
    log.info("Retrieving latest prices for securities: {}", securityIds);
    List<MarketData> latestPrices = marketDataRepository.findLatestPriceForSecurities(securityIds);
    Map<String, MarketData> priceMap = new HashMap<>();
    for (MarketData md : latestPrices) {
      priceMap.put(md.getSecurityId(), md);
    }
    return priceMap;
  }

  /**
   * Validates market data before processing
   *
   * @param marketData The market data to validate
   * @return True if the market data is valid, false otherwise
   */
  public boolean validateMarketData(MarketData marketData) {
    if (marketData == null) {
      log.warn("Market data is null");
      return false;
    }
    boolean isValid = marketData.validate();
    if (!isValid) {
      log.warn("Market data validation failed: {}", marketData);
    }
    return isValid;
  }

  /** Scheduled job to process pending market data */
  // @Scheduled(fixedDelayString = "${app.market-data.processing.interval:60000}")
  public void processPendingMarketData() {
    // Implementation for processing pending market data
  }

  /** Shuts down the market data service and releases resources */
  public void shutdown() {
    log.info("Shutting down market data service");
    reutersAdapter.shutdown();
    bloombergAdapter.shutdown();
    log.info("Market data service shutdown complete");
  }
}