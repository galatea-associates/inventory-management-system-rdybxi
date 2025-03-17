package com.ims.ingestion.adapter;

import com.refinitiv.ema.access.*;
import org.springframework.stereotype.Component; // org.springframework.stereotype 6.0.9
import org.springframework.beans.factory.annotation.Autowired; // org.springframework.beans.factory.annotation 6.0.9
import org.springframework.beans.factory.annotation.Value; // org.springframework.beans.factory.annotation 6.0.9
import lombok.extern.slf4j.Slf4j; // lombok.extern.slf4j 1.18.26

import java.io.File; // java.io 17
import java.time.Instant; // java.time 17
import java.util.List; // java.util 17
import java.util.ArrayList; // java.util 17
import java.util.concurrent.CompletableFuture; // java.util.concurrent 17
import java.util.concurrent.ExecutorService; // java.util.concurrent 17
import java.util.concurrent.Executors; // java.util.concurrent 17

import com.refinitiv.ema.rdm.EmaRdm; // com.refinitiv.ema.rdm 3.6.2

import com.ims.common.model.Security; // src/backend/common-lib/src/main/java/com/ims/common/model/Security.java
import com.ims.common.model.Price; // src/backend/common-lib/src/main/java/com/ims/common/model/Price.java
import com.ims.ingestion.model.SecurityReferenceData; // src/backend/data-ingestion-service/src/main/java/com/ims/ingestion/model/SecurityReferenceData.java
import com.ims.common.model.MarketData; // src/backend/data-ingestion-service/src/main/java/com/ims/ingestion/model/MarketData.java
import com.ims.common.event.ReferenceDataEvent; // src/backend/common-lib/src/main/java/com/ims/common/event/ReferenceDataEvent.java
import com.ims.common.event.MarketDataEvent; // src/backend/common-lib/src/main/java/com/ims/common/event/MarketDataEvent.java
import com.ims.ingestion.exception.IngestionException; // src/backend/data-ingestion-service/src/main/java/com/ims/ingestion/exception/IngestionException.java
import com.ims.ingestion.service.DataMappingService; // src/backend/data-ingestion-service/src/main/java/com/ims/ingestion/service/DataMappingService.java

/**
 * Adapter implementation for integrating with Reuters as a data provider.
 * This class handles the connection to Reuters data feeds, processes both batch and real-time data,
 * and transforms the external data format into the system's internal models.
 */
@Component
@Slf4j
public class ReutersAdapter {

    private static final String SOURCE_NAME = "REUTERS";
    private static final String REFERENCE_DATA_DOMAIN = "ReferenceData";
    private static final String MARKET_DATA_DOMAIN = "MarketData";

    private final DataMappingService dataMappingService;
    private OmmConsumer consumer;
    private final ExecutorService executorService = Executors.newFixedThreadPool(10);

    @Value("${reuters.username}")
    private String reutersUsername;

    @Value("${reuters.password}")
    private String reutersPassword;

    @Value("${reuters.serviceName}")
    private String reutersServiceName;

    @Value("${reuters.hostname}")
    private String reutersHostname;

    @Value("${reuters.port}")
    private int reutersPort;

    private boolean connected = false;

    /**
     * Constructor with dependency injection
     * @param dataMappingService
     */
    @Autowired
    public ReutersAdapter(DataMappingService dataMappingService) {
        this.dataMappingService = dataMappingService;
    }

    /**
     * Initializes the Reuters adapter with configuration values
     * @param username
     * @param password
     * @param serviceName
     * @param hostname
     * @param port
     */
    @Autowired
    public void initialize(
            @Value("${reuters.username}") String username,
            @Value("${reuters.password}") String password,
            @Value("${reuters.serviceName}") String serviceName,
            @Value("${reuters.hostname}") String hostname,
            @Value("${reuters.port}") int port) {
        this.reutersUsername = username;
        this.reutersPassword = password;
        this.reutersServiceName = serviceName;
        this.reutersHostname = hostname;
        this.reutersPort = port;
        log.info("Reuters adapter initialized with configuration: Username={}, ServiceName={}, Hostname={}, Port={}",
                username, serviceName, hostname, port);
    }

    /**
     * Establishes connection to Reuters data feed
     * @return
     */
    public boolean connect() {
        log.info("Attempting to connect to Reuters...");
        try {
            OmmConsumerConfig config = EmaFactory.createOmmConsumerConfig();
            config.username(reutersUsername);
            config.password(reutersPassword);
            // config.ser(reutersServiceName)
            config.host(reutersHostname);
            // config.port(reutersPort);

            consumer = EmaFactory.createOmmConsumer(config);
            connected = true;
            log.info("Successfully connected to Reuters.");
            return true;
        } catch (OmmException e) {
            log.error("Failed to connect to Reuters: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Closes connection to Reuters data feed
     */
    public void disconnect() {
        log.info("Attempting to disconnect from Reuters...");
        try {
            if (consumer != null) {
                consumer.uninitialize();
            }
            connected = false;
            log.info("Successfully disconnected from Reuters.");
        } catch (OmmException e) {
            log.error("Failed to disconnect from Reuters: {}", e.getMessage(), e);
        }
    }

    /**
     * Checks if the adapter is connected to Reuters
     * @return
     */
    public boolean isConnected() {
        return connected;
    }

    /**
     * Processes a batch file of reference data from Reuters
     * @param batchFile
     * @param batchId
     * @return
     */
    public CompletableFuture<List<SecurityReferenceData>> processReferenceDataBatch(File batchFile, String batchId) {
        log.info("Processing reference data batch: batchId={}", batchId);
        return CompletableFuture.supplyAsync(() -> {
            List<SecurityReferenceData> results = new ArrayList<>();
            try {
                // TODO: Implement parsing of the batch file
                // For each record in the file:
                // 1. Create a SecurityReferenceData object
                // 2. Set the source to SOURCE_NAME
                // 3. Set the batchId
                // 4. Add the object to the results list
                log.info("Parsing batch file: {}", batchFile.getName());
                // Dummy data for now
                SecurityReferenceData dummyData = SecurityReferenceData.builder()
                        .externalId("AAPL.O")
                        .identifierType("REUTERS_ID")
                        .source(SOURCE_NAME)
                        .batchId(batchId)
                        .build();
                results.add(dummyData);

                log.info("Completed processing reference data batch: batchId={}", batchId);
                return results;
            } catch (Exception e) {
                log.error("Error processing reference data batch: batchId={}", batchId, e);
                throw new RuntimeException("Error processing reference data batch", e);
            }
        }, executorService);
    }

    /**
     * Subscribes to real-time reference data updates from Reuters
     * @param ricCodes
     */
    public void subscribeToReferenceData(List<String> ricCodes) {
        log.info("Subscribing to reference data for RICs: {}", ricCodes);
        try {
            if (!isConnected()) {
                connect();
            }

            for (String ricCode : ricCodes) {
                ReqMsg reqMsg = EmaFactory.createReqMsg();
                reqMsg.domainType(EmaRdm.MMT_DIRECTORY);
                reqMsg.serviceName(reutersServiceName);
                reqMsg.name(ricCode);

                consumer.registerClient(reqMsg, null);
                log.info("Successfully subscribed to reference data for RIC: {}", ricCode);
            }
        } catch (OmmException e) {
            log.error("Failed to subscribe to reference data: {}", e.getMessage(), e);
            throw IngestionException.forReferenceData("Failed to subscribe to reference data", e);
        }
    }

    /**
     * Subscribes to real-time market data updates from Reuters
     * @param ricCodes
     */
    public void subscribeToMarketData(List<String> ricCodes) {
        log.info("Subscribing to market data for RICs: {}", ricCodes);
        try {
            if (!isConnected()) {
                connect();
            }

            for (String ricCode : ricCodes) {
                ReqMsg reqMsg = EmaFactory.createReqMsg();
                reqMsg.domainType(EmaRdm.MMT_MARKET_PRICE);
                reqMsg.serviceName(reutersServiceName);
                reqMsg.name(ricCode);

                consumer.registerClient(reqMsg, null);
                log.info("Successfully subscribed to market data for RIC: {}", ricCode);
            }
        } catch (OmmException e) {
            log.error("Failed to subscribe to market data: {}", e.getMessage(), e);
            throw IngestionException.forMarketData("Failed to subscribe to market data", e);
        }
    }

    /**
     * Handles reference data updates from Reuters
     * @param event
     * @return
     */
    public SecurityReferenceData handleReferenceDataUpdate(OmmConsumerEvent event) {
        log.info("Received reference data update: {}", event);
        try {
            String ricCode = extractRicCode(event);
            SecurityReferenceData referenceData = new SecurityReferenceData();
            referenceData.setExternalId(ricCode);
            referenceData.setIdentifierType("REUTERS_ID");
            referenceData.setSource(SOURCE_NAME);

            // TODO: Extract other fields from the event payload and set them on the referenceData object

            return referenceData;
        } catch (Exception e) {
            log.error("Failed to handle reference data update: {}", e.getMessage(), e);
            throw IngestionException.forReferenceData("Failed to handle reference data update", e);
        }
    }

    /**
     * Handles market data updates from Reuters
     * @param event
     * @return
     */
    public MarketData handleMarketDataUpdate(OmmConsumerEvent event) {
        log.info("Received market data update: {}", event);
        try {
            String ricCode = extractRicCode(event);
            MarketData marketData = new MarketData();
            marketData.setSecurityId(ricCode);
            marketData.setMarketDataType("PRICE");
            marketData.setSource(SOURCE_NAME);
            marketData.setEventTime(Instant.now());

            // TODO: Extract price, bidPrice, askPrice, volume from the event payload and set them on the marketData object

            return marketData;
        } catch (Exception e) {
            log.error("Failed to handle market data update: {}", e.getMessage(), e);
            throw IngestionException.forMarketData("Failed to handle market data update", e);
        }
    }

    /**
     * Maps Reuters reference data to internal domain model
     * @param referenceData
     * @return
     */
    public Security mapReutersReferenceDataToInternal(SecurityReferenceData referenceData) {
        log.info("Mapping Reuters reference data to internal model: {}", referenceData);
        try {
            return dataMappingService.mapSecurityReferenceData(referenceData);
        } catch (Exception e) {
            log.error("Failed to map Reuters reference data: {}", e.getMessage(), e);
            throw IngestionException.forReferenceData("Failed to map Reuters reference data", e);
        }
    }

    /**
     * Maps Reuters market data to internal domain model
     * @param marketData
     * @return
     */
    public Price mapReutersMarketDataToInternal(MarketData marketData) {
        log.info("Mapping Reuters market data to internal model: {}", marketData);
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
            log.error("Failed to map Reuters market data: {}", e.getMessage(), e);
            throw IngestionException.forMarketData("Failed to map Reuters market data", e);
        }
    }

    /**
     * Creates a reference data event from Reuters data
     * @param security
     * @param operation
     * @return
     */
    public ReferenceDataEvent createReferenceDataEvent(Security security, String operation) {
        ReferenceDataEvent event = new ReferenceDataEvent(SOURCE_NAME);
        event.setOperation(operation);
        event.addSecurity(security);
        return event;
    }

    /**
     * Creates a market data event from Reuters data
     * @param price
     * @return
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
     * Extracts RIC code from Reuters event
     * @param event
     * @return
     */
    private String extractRicCode(OmmConsumerEvent event) {
        // TODO: Implement RIC code extraction from the event
        return "AAPL.O"; // Dummy value for now
    }

    /**
     * Shuts down the adapter and releases resources
     */
    public void shutdown() {
        log.info("Shutting down Reuters adapter...");
        disconnect();
        executorService.shutdown();
        log.info("Reuters adapter shutdown complete.");
    }
}