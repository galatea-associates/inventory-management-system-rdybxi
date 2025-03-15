package com.ims.ingestion.adapter;

import com.bloomberglp.blpapi.CorrelationID; // com.bloomberglp.blpapi 3.16.1
import com.bloomberglp.blpapi.Element; // com.bloomberglp.blpapi 3.16.1
import com.bloomberglp.blpapi.Event; // com.bloomberglp.blpapi 3.16.1
import com.bloomberglp.blpapi.EventHandler; // com.bloomberglp.blpapi 3.16.1
import com.bloomberglp.blpapi.EventQueue; // com.bloomberglp.blpapi 3.16.1
import com.bloomberglp.blpapi.Event.EventType; // com.bloomberglp.blpapi 3.16.1
import com.bloomberglp.blpapi.Message; // com.bloomberglp.blpapi 3.16.1
import com.bloomberglp.blpapi.Request; // com.bloomberglp.blpapi 3.16.1
import com.bloomberglp.blpapi.Service; // com.bloomberglp.blpapi 3.16.1
import com.bloomberglp.blpapi.Session; // com.bloomberglp.blpapi 3.16.1
import com.bloomberglp.blpapi.SessionOptions; // com.bloomberglp.blpapi 3.16.1
import com.ims.common.event.MarketDataEvent; // internal
import com.ims.common.event.ReferenceDataEvent; // internal
import com.ims.common.model.Price; // internal
import com.ims.common.model.Security; // internal
import com.ims.common.model.SecurityIdentifier; // internal
import com.ims.ingestion.exception.IngestionException; // internal
import com.ims.ingestion.model.MarketData; // internal
import com.ims.ingestion.model.SecurityReferenceData; // internal
import com.ims.ingestion.service.DataMappingService; // internal
import java.io.File; // java.io 17
import java.io.IOException; // java.io 17
import java.math.BigDecimal; // java.math 17
import java.time.Instant; // java.time 17
import java.time.LocalDate; // java.time 17
import java.util.ArrayList; // java.util 17
import java.util.HashMap; // java.util 17
import java.util.List; // java.util 17
import java.util.Map; // java.util 17
import java.util.concurrent.CompletableFuture; // java.util.concurrent 17
import java.util.concurrent.ExecutorService; // java.util.concurrent 17
import java.util.concurrent.Executors; // java.util.concurrent 17
import lombok.extern.slf4j.Slf4j; // lombok.extern.slf4j 1.18.26
import org.springframework.beans.factory.annotation.Autowired; // org.springframework.beans.factory.annotation 6.0.9
import org.springframework.beans.factory.annotation.Value; // org.springframework.beans.factory.annotation 6.0.9
import org.springframework.stereotype.Component; // org.springframework.stereotype 6.0.9

/**
 * Adapter implementation for integrating with Bloomberg as a data provider in the
 * Inventory Management System. This class handles the connection to Bloomberg data
 * feeds, processes both batch and real-time data, and transforms the external data
 * format into the system's internal models for reference data and market data.
 */
@Component
@Slf4j
public class BloombergAdapter {

  private static final String SOURCE_NAME = "BLOOMBERG";
  private static final String REFERENCE_DATA_SERVICE = "//blp/refdata";
  private static final String MARKET_DATA_SERVICE = "//blp/mktdata";

  private final DataMappingService dataMappingService;
  private Session session;
  private Service referenceDataService;
  private Service marketDataService;
  private final ExecutorService executorService = Executors.newFixedThreadPool(10);
  private String bloombergHost;
  private int bloombergPort;
  private String bloombergAuthOptions;
  private boolean connected = false;
  private EventQueue eventQueue;

  /**
   * Constructor with dependency injection.
   *
   * @param dataMappingService The data mapping service for transforming data.
   */
  @Autowired
  public BloombergAdapter(DataMappingService dataMappingService) {
    this.dataMappingService = dataMappingService;
    this.eventQueue = new EventQueue();
  }

  /**
   * Initializes the Bloomberg adapter with configuration values.
   *
   * @param host The Bloomberg host address.
   * @param port The Bloomberg port number.
   * @param authOptions The Bloomberg authentication options.
   */
  @Autowired
  public void initialize(
      @Value("${bloomberg.host}") String host,
      @Value("${bloomberg.port}") int port,
      @Value("${bloomberg.authOptions}") String authOptions) {
    this.bloombergHost = host;
    this.bloombergPort = port;
    this.bloombergAuthOptions = authOptions;
    log.info(
        "Initialized Bloomberg adapter with host={}, port={}, authOptions={}",
        bloombergHost,
        bloombergPort,
        bloombergAuthOptions);
  }

  /**
   * Establishes connection to Bloomberg data feed.
   *
   * @return True if connection successful, false otherwise.
   */
  public boolean connect() {
    log.info("Attempting to connect to Bloomberg");
    SessionOptions sessionOptions = new SessionOptions();
    sessionOptions.setServerHost(bloombergHost);
    sessionOptions.setServerPort(bloombergPort);
    if (bloombergAuthOptions != null && !bloombergAuthOptions.isEmpty()) {
      sessionOptions.setAuthenticationOptions(bloombergAuthOptions);
    }

    try {
      session = new Session(sessionOptions, new BloombergEventHandler(this), eventQueue);
      session.start();
      referenceDataService = session.getService(REFERENCE_DATA_SERVICE);
      marketDataService = session.getService(MARKET_DATA_SERVICE);
      connected = true;
      log.info("Successfully connected to Bloomberg");
      return true;
    } catch (Exception e) {
      log.error("Failed to connect to Bloomberg: {}", e.getMessage(), e);
      return false;
    }
  }

  /** Closes connection to Bloomberg data feed. */
  public void disconnect() {
    log.info("Attempting to disconnect from Bloomberg");
    try {
      if (session != null) {
        session.stop();
      }
      connected = false;
      session = null;
      referenceDataService = null;
      marketDataService = null;
      log.info("Successfully disconnected from Bloomberg");
    } catch (Exception e) {
      log.error("Failed to disconnect from Bloomberg: {}", e.getMessage(), e);
    }
  }

  /**
   * Checks if the adapter is connected to Bloomberg.
   *
   * @return True if connected, false otherwise.
   */
  public boolean isConnected() {
    return connected;
  }

  /**
   * Processes a batch file of reference data from Bloomberg.
   *
   * @param batchFile The batch file to process.
   * @param batchId The ID of the batch.
   * @return Future containing processed reference data.
   */
  public CompletableFuture<List<SecurityReferenceData>> processReferenceDataBatch(
      File batchFile, String batchId) {
    log.info("Starting batch processing for file: {}, batchId: {}", batchFile.getName(), batchId);

    return CompletableFuture.supplyAsync(
        () -> {
          List<SecurityReferenceData> results = new ArrayList<>();
          try {
            // Simulate parsing the batch file and extracting security identifiers
            List<String> securityIds = List.of("AAPL US Equity", "MSFT US Equity", "GOOG US Equity");

            // Create and send reference data request to Bloomberg
            Request request = createReferenceDataRequest(securityIds);
            CorrelationID cid = new CorrelationID(batchId);
            session.send(request, cid, eventQueue);

            // Process response and create SecurityReferenceData objects
            while (true) {
              Event event = eventQueue.nextEvent();
              if (event.eventType() == EventType.RESPONSE) {
                for (Message message : event) {
                  SecurityReferenceData refData = processReferenceDataResponse(message);
                  refData.setSource(SOURCE_NAME);
                  refData.setBatchId(batchId);
                  results.add(refData);
                }
                if (event.correlationID() == cid) {
                  break; // End loop when response for this batch is received
                }
              }
            }

            log.info("Completed batch processing for batchId: {}", batchId);
            return results;
          } catch (Exception e) {
            log.error("Error processing batch file: {}", e.getMessage(), e);
            throw new RuntimeException("Error processing batch file", e);
          }
        },
        executorService);
  }

  /**
   * Subscribes to reference data updates from Bloomberg.
   *
   * @param securityIds The list of security identifiers to subscribe to.
   */
  public void subscribeToReferenceData(List<String> securityIds) {
    log.info("Subscribing to reference data for securities: {}", securityIds);
    if (!isConnected()) {
      connect();
    }

    try {
      Request request = createReferenceDataRequest(securityIds);
      session.send(request, null, eventQueue);
      log.info("Successfully subscribed to reference data for securities: {}", securityIds);
    } catch (Exception e) {
      log.error("Failed to subscribe to reference data: {}", e.getMessage(), e);
      throw IngestionException.forReferenceData("Failed to subscribe to reference data", e);
    }
  }

  /**
   * Subscribes to real-time market data updates from Bloomberg.
   *
   * @param securityIds The list of security identifiers to subscribe to.
   */
  public void subscribeToMarketData(List<String> securityIds) {
    log.info("Subscribing to market data for securities: {}", securityIds);
    if (!isConnected()) {
      connect();
    }

    try {
      Request request = createMarketDataRequest(securityIds);
      session.send(request, null, eventQueue);
      log.info("Successfully subscribed to market data for securities: {}", securityIds);
    } catch (Exception e) {
      log.error("Failed to subscribe to market data: {}", e.getMessage(), e);
      throw IngestionException.forMarketData("Failed to subscribe to market data", e);
    }
  }

  /**
   * Handles reference data events from Bloomberg.
   *
   * @param event The Bloomberg event.
   * @return Processed reference data.
   */
  public List<SecurityReferenceData> handleReferenceDataEvent(Event event) {
    log.info("Received reference data event: {}", event.eventType());
    List<SecurityReferenceData> results = new ArrayList<>();

    try {
      for (Message message : event) {
        SecurityReferenceData refData = processReferenceDataResponse(message);
        refData.setSource(SOURCE_NAME);
        results.add(refData);
      }
      return results;
    } catch (Exception e) {
      log.error("Error handling reference data event: {}", e.getMessage(), e);
      throw IngestionException.forReferenceData("Error handling reference data event", e);
    }
  }

  /**
   * Handles market data events from Bloomberg.
   *
   * @param event The Bloomberg event.
   * @return Processed market data.
   */
  public MarketData handleMarketDataEvent(Event event) {
    log.info("Received market data event: {}", event.eventType());

    try {
      Message message = event.messageIterator().next();
      MarketData marketData = processMarketDataResponse(message);
      marketData.setSource(SOURCE_NAME);
      return marketData;
    } catch (Exception e) {
      log.error("Error handling market data event: {}", e.getMessage(), e);
      throw IngestionException.forMarketData("Error handling market data event", e);
    }
  }

  /**
   * Maps Bloomberg reference data to internal domain model.
   *
   * @param referenceData The Bloomberg reference data.
   * @return Mapped Security domain object.
   */
  public Security mapBloombergReferenceDataToInternal(SecurityReferenceData referenceData) {
    log.debug("Mapping Bloomberg reference data: {}", referenceData);
    try {
      return dataMappingService.mapSecurityReferenceData(referenceData);
    } catch (Exception e) {
      log.error("Error mapping Bloomberg reference data: {}", e.getMessage(), e);
      throw IngestionException.forReferenceData("Error mapping Bloomberg reference data", e);
    }
  }

  /**
   * Maps Bloomberg market data to internal domain model.
   *
   * @param marketData The Bloomberg market data.
   * @return Mapped Price domain object.
   */
  public Price mapBloombergMarketDataToInternal(MarketData marketData) {
    log.debug("Mapping Bloomberg market data: {}", marketData);
    try {
      Price price = new Price();
      price.setSecurityId(marketData.getSecurityId());
      price.setPrice(marketData.getPrice());
      price.setBidPrice(marketData.getBidPrice());
      price.setAskPrice(marketData.getAskPrice());
      price.setVolume(marketData.getVolume());
      price.setSource(SOURCE_NAME);
      price.setEventTime(marketData.getEventTime());
      return price;
    } catch (Exception e) {
      log.error("Error mapping Bloomberg market data: {}", e.getMessage(), e);
      throw IngestionException.forMarketData("Error mapping Bloomberg market data", e);
    }
  }

  /**
   * Creates a reference data event from Bloomberg data.
   *
   * @param security The security.
   * @param operation The operation.
   * @return Event for publishing.
   */
  public ReferenceDataEvent createReferenceDataEvent(Security security, String operation) {
    ReferenceDataEvent event = new ReferenceDataEvent(SOURCE_NAME);
    event.setOperation(operation);
    event.addSecurity(security);
    return event;
  }

  /**
   * Creates a market data event from Bloomberg data.
   *
   * @param price The price.
   * @return Event for publishing.
   */
  public MarketDataEvent createMarketDataEvent(Price price) {
    return MarketDataEvent.builder()
        .eventType("PRICE_UPDATE")
        .source(SOURCE_NAME)
        .securityId(price.getSecurityId())
        .price(price.getPrice())
        .bidPrice(price.getBidPrice())
        .askPrice(price.getAskPrice())
        .volume(price.getVolume())
        .effectiveTime(price.getEventTime())
        .dataSource(SOURCE_NAME)
        .build();
  }

  /**
   * Extracts security ID from Bloomberg event.
   *
   * @param message The Bloomberg message.
   * @return Extracted security ID.
   */
  private String extractSecurityId(Message message) {
    Element securityDataArray = message.getElement("securityData");
    Element securityData = securityDataArray.getValueAsElement(0);
    return securityData.getElement("security").getValueAsString();
  }

  /**
   * Creates a reference data request for Bloomberg API.
   *
   * @param securityIds The list of security identifiers.
   * @return Bloomberg API request.
   */
  private Request createReferenceDataRequest(List<String> securityIds) throws IOException {
    Request request = referenceDataService.createRequest("ReferenceDataRequest");
    Element securities = request.getElement("securities");
    for (String securityId : securityIds) {
      securities.appendValue(securityId);
    }

    Element fields = request.getElement("fields");
    fields.appendValue("PX_LAST");
    fields.appendValue("SECURITY_NAME");
    return request;
  }

  /**
   * Creates a market data request for Bloomberg API.
   *
   * @param securityIds The list of security identifiers.
   * @return Bloomberg API request.
   */
  private Request createMarketDataRequest(List<String> securityIds) throws IOException {
    Request subscriptionRequest = marketDataService.createRequest("MarketDataRequest");
    Element subscriptions = subscriptionRequest.getElement("securities");
    for (String securityId : securityIds) {
      subscriptions.appendValue(securityId);
    }

    Element fields = subscriptionRequest.getElement("fields");
    fields.appendValue("LAST_PRICE");
    fields.appendValue("BID");
    fields.appendValue("ASK");
    return subscriptionRequest;
  }

  /**
   * Processes reference data response from Bloomberg.
   *
   * @param message The Bloomberg message.
   * @return Processed reference data.
   */
  private SecurityReferenceData processReferenceDataResponse(Message message) {
    String securityId = extractSecurityId(message);
    SecurityReferenceData refData = new SecurityReferenceData();
    refData.setExternalId(securityId);
    refData.setIdentifierType("BLOOMBERG_ID");
    refData.setSource(SOURCE_NAME);

    Element fieldDataArray = message.getElement("securityData").getValueAsElement(0).getElement("fieldData");
    if (fieldDataArray.hasElement("PX_LAST")) {
      refData.addAttribute("PX_LAST", fieldDataArray.getElement("PX_LAST").toString());
    }
    if (fieldDataArray.hasElement("SECURITY_NAME")) {
      refData.setName(fieldDataArray.getElement("SECURITY_NAME").getValueAsString());
    }
    return refData;
  }

  /**
   * Processes market data response from Bloomberg.
   *
   * @param message The Bloomberg message.
   * @return Processed market data.
   */
  private MarketData processMarketDataResponse(Message message) {
    String securityId = extractSecurityId(message);
    MarketData marketData = new MarketData();
    marketData.setSecurityId(securityId);
    marketData.setMarketDataType("PRICE");
    marketData.setSource(SOURCE_NAME);
    marketData.setEventTime(Instant.now());

    Element fieldData = message.getElement("fieldData");
    if (fieldData.hasElement("LAST_PRICE")) {
      marketData.setPrice(BigDecimal.valueOf(fieldData.getElementAsFloat64("LAST_PRICE")));
    }
    if (fieldData.hasElement("BID")) {
      marketData.setBidPrice(BigDecimal.valueOf(fieldData.getElementAsFloat64("BID")));
    }
    if (fieldData.hasElement("ASK")) {
      marketData.setAskPrice(BigDecimal.valueOf(fieldData.getElementAsFloat64("ASK")));
    }
    return marketData;
  }

  /** Shuts down the adapter and releases resources. */
  public void shutdown() {
    log.info("Shutting down Bloomberg adapter");
    disconnect();
    executorService.shutdown();
    log.info("Bloomberg adapter shutdown complete");
  }

  private static class BloombergEventHandler implements EventHandler {

    private final BloombergAdapter adapter;

    public BloombergEventHandler(BloombergAdapter adapter) {
      this.adapter = adapter;
    }

    @Override
    public void processEvent(Event event, Session session) {
      try {
        switch (event.eventType()) {
          case SUBSCRIPTION_DATA:
            MarketData marketData = adapter.handleMarketDataEvent(event);
            // Process market data event
            break;
          case RESPONSE:
            List<SecurityReferenceData> refDataList = adapter.handleReferenceDataEvent(event);
            // Process reference data event
            break;
          case PARTIAL_RESPONSE:
            // Handle partial responses
            break;
          case SUBSCRIPTION_STATUS:
            // Handle subscription status
            break;
          case SERVICE_STATUS:
            // Handle service status
            break;
          case SESSION_STATUS:
            // Handle session status
            break;
          case AUTHORIZATION_STATUS:
            // Handle authorization status
            break;
          case RESOLUTION_STATUS:
            // Handle resolution status
            break;
          case ADMIN:
            // Handle admin events
            break;
          case ROUTE_STATUS:
            // Handle route status
            break;
          case UNKNOWN:
            // Handle unknown events
            break;
          default:
            log.warn("Unhandled event type: {}", event.eventType());
        }
      } catch (Exception e) {
        log.error("Error processing Bloomberg event: {}", e.getMessage(), e);
      }
    }
  }
}