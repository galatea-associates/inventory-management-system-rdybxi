package com.ims.ingestion.adapter;

import com.fasterxml.jackson.databind.JsonNode; //com.fasterxml.jackson.databind 2.14.2
import com.fasterxml.jackson.databind.ObjectMapper; //com.fasterxml.jackson.databind 2.14.2
import com.ims.common.event.MarketDataEvent;
import com.ims.common.event.ReferenceDataEvent;
import com.ims.common.model.IndexComposition;
import com.ims.common.model.Security;
import com.ims.ingestion.exception.IngestionException;
import com.ims.common.model.MarketData;
import com.ims.ingestion.model.SecurityReferenceData;
import com.ims.ingestion.service.DataMappingService;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j; //lombok.extern.slf4j 1.18.26
import org.apache.http.client.HttpClient; //org.apache.httpcomponents 4.5.14
import org.apache.http.client.methods.HttpGet; //org.apache.httpcomponents 4.5.14
import org.apache.http.client.methods.HttpPost; //org.apache.httpcomponents 4.5.14
import org.apache.http.entity.StringEntity; //org.apache.httpcomponents 4.5.14
import org.apache.http.impl.client.HttpClients; //org.apache.httpcomponents 4.5.14
import org.apache.http.util.EntityUtils; //org.apache.httpcomponents 4.5.14
import org.springframework.beans.factory.annotation.Autowired; //org.springframework.beans.factory.annotation 6.0.9
import org.springframework.beans.factory.annotation.Value; //org.springframework.beans.factory.annotation 6.0.9
import org.springframework.stereotype.Component; //org.springframework.stereotype 6.0.9

import java.io.File; //java.io 17
import java.io.IOException; //java.io 17
import java.math.BigDecimal; //java.math 17
import java.time.Instant; //java.time 17
import java.time.LocalDate; //java.time 17
import java.util.ArrayList; //java.util 17
import java.util.HashMap; //java.util 17
import java.util.List; //java.util 17
import java.util.Map; //java.util 17
import java.util.concurrent.CompletableFuture; //java.util.concurrent 17
import java.util.concurrent.ExecutorService; //java.util.concurrent 17
import java.util.concurrent.Executors; //java.util.concurrent 17

/**
 * Adapter implementation for integrating with MarkIT as a data provider.
 * This class handles the connection to MarkIT data feeds, processes both batch and real-time ETF and index data,
 * and transforms the external data format into the system's internal models.
 */
@Component
@Slf4j
public class MarkITAdapter {

    private static final String SOURCE_NAME = "MARKIT";
    private static final String REFERENCE_DATA_ENDPOINT = "/api/v1/reference-data";
    private static final String COMPOSITION_DATA_ENDPOINT = "/api/v1/composition-data";
    private static final String NAV_DATA_ENDPOINT = "/api/v1/nav-data";
    private static final String INAV_DATA_ENDPOINT = "/api/v1/inav-data";

    private final DataMappingService dataMappingService;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final ExecutorService executorService;

    @Value("${markit.api.key}")
    private String markitApiKey;

    @Value("${markit.api.url}")
    private String markitBaseUrl;

    @Value("${markit.api.username}")
    private String markitUsername;

    @Value("${markit.api.password}")
    private String markitPassword;

    /**
     * -- GETTER --
     *  Checks if the adapter is connected to MarkIT
     *
     * @return True if connected, false otherwise
     */
    @Getter
    private boolean connected;

    /**
     * Constructor with dependency injection
     *
     * @param dataMappingService
     */
    public MarkITAdapter(DataMappingService dataMappingService) {
        this.dataMappingService = dataMappingService;
        this.objectMapper = new ObjectMapper();
        this.executorService = Executors.newFixedThreadPool(10);
        this.httpClient = HttpClients.createDefault();
        this.connected = false;
    }

    /**
     * Initializes the MarkIT adapter with configuration values
     *
     * @param apiKey
     * @param baseUrl
     * @param username
     * @param password
     */
    @Autowired
    public void initialize(
            @Value("${markit.api.key}") String apiKey,
            @Value("${markit.api.url}") String baseUrl,
            @Value("${markit.api.username}") String username,
            @Value("${markit.api.password}") String password) {
        this.markitApiKey = apiKey;
        this.markitBaseUrl = baseUrl;
        this.markitUsername = username;
        this.markitPassword = password;
        log.info("Initialized MarkIT adapter with configuration");
    }

    /**
     * Establishes connection to MarkIT API
     *
     * @return True if connection successful, false otherwise
     */
    public boolean connect() {
        log.info("Attempting to connect to MarkIT");
        try {
            HttpGet httpGet = new HttpGet(markitBaseUrl + "/api/v1/test-connection");
            httpGet.addHeader("Authorization", "Basic " + markitUsername + ":" + markitPassword);
            httpGet.addHeader("X-API-Key", markitApiKey);

            httpClient.execute(httpGet, response -> {
                int status = response.getStatusLine().getStatusCode();
                if (status >= 200 && status < 300) {
                    connected = true;
                    log.info("Successfully connected to MarkIT");
                    return null;
                } else {
                    log.error("Failed to connect to MarkIT. Status code: {}", status);
                    return null;
                }
            });
            return connected;
        } catch (IOException e) {
            log.error("IOException during connection attempt: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Closes connection to MarkIT API
     */
    public void disconnect() {
        log.info("Attempting to disconnect from MarkIT");
        connected = false;
        log.info("Successfully disconnected from MarkIT");
    }

    /**
     * Processes a batch file of reference data from MarkIT
     *
     * @param batchFile
     * @param batchId
     * @return Future containing processed reference data
     */
    public CompletableFuture<List<SecurityReferenceData>> processReferenceDataBatch(File batchFile, String batchId) {
        log.info("Starting MarkIT reference data batch processing with batchId: {}", batchId);
        return CompletableFuture.supplyAsync(() -> {
            List<SecurityReferenceData> results = new ArrayList<>();
            try {
                JsonNode rootNode = objectMapper.readTree(batchFile);
                if (rootNode.isArray()) {
                    for (JsonNode node : rootNode) {
                        SecurityReferenceData referenceData = objectMapper.convertValue(node, SecurityReferenceData.class);
                        referenceData.setSource(SOURCE_NAME);
                        referenceData.setBatchId(batchId);

                        // Example logic for ETFs and indices (adjust based on actual MarkIT data structure)
                        if (node.has("isETF") && node.get("isETF").asBoolean()) {
                            referenceData.setIsBasket(true);
                            referenceData.setBasketType("ETF");
                        } else if (node.has("isIndex") && node.get("isIndex").asBoolean()) {
                            referenceData.setIsBasket(true);
                            referenceData.setBasketType("INDEX");
                        }
                        results.add(referenceData);
                    }
                }
                log.info("Completed MarkIT reference data batch processing with batchId: {}", batchId);
                return results;
            } catch (IOException e) {
                log.error("Error processing MarkIT reference data batch: {}", e.getMessage());
                throw new RuntimeException("Error processing MarkIT reference data batch", e);
            }
        }, executorService);
    }

    /**
     * Processes a batch file of basket composition data from MarkIT
     *
     * @param batchFile
     * @param batchId
     * @return Future containing processed composition data
     */
    public CompletableFuture<List<IndexComposition>> processCompositionDataBatch(File batchFile, String batchId) {
        log.info("Starting MarkIT composition data batch processing with batchId: {}", batchId);
        return CompletableFuture.supplyAsync(() -> {
            List<IndexComposition> results = new ArrayList<>();
            try {
                JsonNode rootNode = objectMapper.readTree(batchFile);
                if (rootNode.isArray()) {
                    for (JsonNode node : rootNode) {
                        IndexComposition composition = objectMapper.convertValue(node, IndexComposition.class);
                        composition.setSource(SOURCE_NAME);
                        // Set effectiveDate to current date if not provided
                        if (composition.getEffectiveDate() == null) {
                            composition.setEffectiveDate(LocalDate.now());
                        }
                        results.add(composition);
                    }
                }
                log.info("Completed MarkIT composition data batch processing with batchId: {}", batchId);
                return results;
            } catch (IOException e) {
                log.error("Error processing MarkIT composition data batch: {}", e.getMessage());
                throw new RuntimeException("Error processing MarkIT composition data batch", e);
            }
        }, executorService);
    }

    /**
     * Fetches reference data for ETFs and indices from MarkIT API
     *
     * @param identifiers
     * @param identifierType
     * @return Future containing fetched reference data
     */
    public CompletableFuture<List<SecurityReferenceData>> fetchReferenceData(List<String> identifiers, String identifierType) {
        log.info("Fetching MarkIT reference data for identifiers: {}, identifierType: {}", identifiers, identifierType);
        return CompletableFuture.supplyAsync(() -> {
            List<SecurityReferenceData> results = new ArrayList<>();
            try {
                if (!isConnected()) {
                    connect();
                }

                HttpPost httpPost = new HttpPost(markitBaseUrl + REFERENCE_DATA_ENDPOINT);
                httpPost.addHeader("Authorization", "Basic " + markitUsername + ":" + markitPassword);
                httpPost.addHeader("X-API-Key", markitApiKey);
                httpPost.addHeader("Content-Type", "application/json");

                // Create request body with identifiers and identifierType
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("identifiers", identifiers);
                requestBody.put("identifierType", identifierType);
                StringEntity entity = new StringEntity(objectMapper.writeValueAsString(requestBody));
                httpPost.setEntity(entity);

                httpClient.execute(httpPost, response -> {
                    int status = response.getStatusLine().getStatusCode();
                    if (status >= 200 && status < 300) {
                        String responseBody = EntityUtils.toString(response.getEntity());
                        JsonNode rootNode = objectMapper.readTree(responseBody);
                        if (rootNode.isArray()) {
                            for (JsonNode node : rootNode) {
                                SecurityReferenceData referenceData = objectMapper.convertValue(node, SecurityReferenceData.class);
                                referenceData.setSource(SOURCE_NAME);

                                // Example logic for ETFs and indices (adjust based on actual MarkIT data structure)
                                if (node.has("isETF") && node.get("isETF").asBoolean()) {
                                    referenceData.setIsBasket(true);
                                    referenceData.setBasketType("ETF");
                                } else if (node.has("isIndex") && node.get("isIndex").asBoolean()) {
                                    referenceData.setIsBasket(true);
                                    referenceData.setBasketType("INDEX");
                                }
                                results.add(referenceData);
                            }
                        }
                    } else {
                        log.error("Failed to fetch MarkIT reference data. Status code: {}", status);
                    }
                    return null;
                });
                return results;
            } catch (IOException e) {
                log.error("IOException while fetching MarkIT reference data: {}", e.getMessage());
                throw new RuntimeException("IOException while fetching MarkIT reference data", e);
            }
        }, executorService);
    }

    /**
     * Fetches composition data for ETFs and indices from MarkIT API
     *
     * @param basketIdentifiers
     * @param identifierType
     * @return Future containing fetched composition data mapped by basket identifier
     */
    public CompletableFuture<Map<String, List<IndexComposition>>> fetchCompositionData(List<String> basketIdentifiers, String identifierType) {
        log.info("Fetching MarkIT composition data for basket identifiers: {}, identifierType: {}", basketIdentifiers, identifierType);
        return CompletableFuture.supplyAsync(() -> {
            Map<String, List<IndexComposition>> results = new HashMap<>();
            try {
                if (!isConnected()) {
                    connect();
                }

                HttpPost httpPost = new HttpPost(markitBaseUrl + COMPOSITION_DATA_ENDPOINT);
                httpPost.addHeader("Authorization", "Basic " + markitUsername + ":" + markitPassword);
                httpPost.addHeader("X-API-Key", markitApiKey);
                httpPost.addHeader("Content-Type", "application/json");

                // Create request body with basketIdentifiers and identifierType
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("basketIdentifiers", basketIdentifiers);
                requestBody.put("identifierType", identifierType);
                StringEntity entity = new StringEntity(objectMapper.writeValueAsString(requestBody));
                httpPost.setEntity(entity);

                httpClient.execute(httpPost, response -> {
                    int status = response.getStatusLine().getStatusCode();
                    if (status >= 200 && status < 300) {
                        String responseBody = EntityUtils.toString(response.getEntity());
                        JsonNode rootNode = objectMapper.readTree(responseBody);
                        if (rootNode.isObject()) {
                            rootNode.fields().forEachRemaining(entry -> {
                                String basketIdentifier = entry.getKey();
                                List<IndexComposition> compositions = new ArrayList<>();
                                JsonNode constituents = entry.getValue();
                                if (constituents.isArray()) {
                                    for (JsonNode constituentNode : constituents) {
                                        IndexComposition composition = objectMapper.convertValue(constituentNode, IndexComposition.class);
                                        composition.setSource(SOURCE_NAME);
                                        // Set effectiveDate to current date if not provided
                                        if (composition.getEffectiveDate() == null) {
                                            composition.setEffectiveDate(LocalDate.now());
                                        }
                                        compositions.add(composition);
                                    }
                                }
                                results.put(basketIdentifier, compositions);
                            });
                        }
                    } else {
                        log.error("Failed to fetch MarkIT composition data. Status code: {}", status);
                    }
                    return null;
                });
                return results;
            } catch (IOException e) {
                log.error("IOException while fetching MarkIT composition data: {}", e.getMessage());
                throw new RuntimeException("IOException while fetching MarkIT composition data", e);
            }
        }, executorService);
    }

    /**
     * Fetches NAV data for ETFs from MarkIT API
     *
     * @param etfIdentifiers
     * @param identifierType
     * @return Future containing fetched NAV data
     */
    public CompletableFuture<List<MarketData>> fetchNavData(List<String> etfIdentifiers, String identifierType) {
        log.info("Fetching MarkIT NAV data for ETF identifiers: {}, identifierType: {}", etfIdentifiers, identifierType);
        return CompletableFuture.supplyAsync(() -> {
            List<MarketData> results = new ArrayList<>();
            try {
                if (!isConnected()) {
                    connect();
                }

                HttpPost httpPost = new HttpPost(markitBaseUrl + NAV_DATA_ENDPOINT);
                httpPost.addHeader("Authorization", "Basic " + markitUsername + ":" + markitPassword);
                httpPost.addHeader("X-API-Key", markitApiKey);
                httpPost.addHeader("Content-Type", "application/json");

                // Create request body with etfIdentifiers and identifierType
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("etfIdentifiers", etfIdentifiers);
                requestBody.put("identifierType", identifierType);
                StringEntity entity = new StringEntity(objectMapper.writeValueAsString(requestBody));
                httpPost.setEntity(entity);

                httpClient.execute(httpPost, response -> {
                    int status = response.getStatusLine().getStatusCode();
                    if (status >= 200 && status < 300) {
                        String responseBody = EntityUtils.toString(response.getEntity());
                        JsonNode rootNode = objectMapper.readTree(responseBody);
                        if (rootNode.isArray()) {
                            for (JsonNode node : rootNode) {
                                MarketData marketData = objectMapper.convertValue(node, MarketData.class);
                                marketData.setMarketDataType("NAV");
                                marketData.setSource(SOURCE_NAME);
                                marketData.setIsComposite(true);
                                marketData.setEventTime(Instant.now());
                                results.add(marketData);
                            }
                        }
                    } else {
                        log.error("Failed to fetch MarkIT NAV data. Status code: {}", status);
                    }
                    return null;
                });
                return results;
            } catch (IOException e) {
                log.error("IOException while fetching MarkIT NAV data: {}", e.getMessage());
                throw new RuntimeException("IOException while fetching MarkIT NAV data", e);
            }
        }, executorService);
    }

    /**
     * Fetches intraday NAV (iNAV) data for ETFs from MarkIT API
     *
     * @param etfIdentifiers
     * @param identifierType
     * @return Future containing fetched iNAV data
     */
    public CompletableFuture<List<MarketData>> fetchINavData(List<String> etfIdentifiers, String identifierType) {
        log.info("Fetching MarkIT iNAV data for ETF identifiers: {}, identifierType: {}", etfIdentifiers, identifierType);
        return CompletableFuture.supplyAsync(() -> {
            List<MarketData> results = new ArrayList<>();
            try {
                if (!isConnected()) {
                    connect();
                }

                HttpPost httpPost = new HttpPost(markitBaseUrl + INAV_DATA_ENDPOINT);
                httpPost.addHeader("Authorization", "Basic " + markitUsername + ":" + markitPassword);
                httpPost.addHeader("X-API-Key", markitApiKey);
                httpPost.addHeader("Content-Type", "application/json");

                // Create request body with etfIdentifiers and identifierType
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("etfIdentifiers", etfIdentifiers);
                requestBody.put("identifierType", identifierType);
                StringEntity entity = new StringEntity(objectMapper.writeValueAsString(requestBody));
                httpPost.setEntity(entity);

                httpClient.execute(httpPost, response -> {
                    int status = response.getStatusLine().getStatusCode();
                    if (status >= 200 && status < 300) {
                        String responseBody = EntityUtils.toString(response.getEntity());
                        JsonNode rootNode = objectMapper.readTree(responseBody);
                        if (rootNode.isArray()) {
                            for (JsonNode node : rootNode) {
                                MarketData marketData = objectMapper.convertValue(node, MarketData.class);
                                marketData.setMarketDataType("INAV");
                                marketData.setSource(SOURCE_NAME);
                                marketData.setIsComposite(true);
                                marketData.setEventTime(Instant.now());
                                results.add(marketData);
                            }
                        }
                    } else {
                        log.error("Failed to fetch MarkIT iNAV data. Status code: {}", status);
                    }
                    return null;
                });
                return results;
            } catch (IOException e) {
                log.error("IOException while fetching MarkIT iNAV data: {}", e.getMessage());
                throw new RuntimeException("IOException while fetching MarkIT iNAV data", e);
            }
        }, executorService);
    }

    /**
     * Subscribes to real-time NAV updates for ETFs
     *
     * @param etfIdentifiers
     * @param identifierType
     */
    public void subscribeToNavUpdates(List<String> etfIdentifiers, String identifierType) {
        log.info("Subscribing to MarkIT NAV updates for ETF identifiers: {}, identifierType: {}", etfIdentifiers, identifierType);
        try {
            if (!isConnected()) {
                connect();
            }

            HttpPost httpPost = new HttpPost(markitBaseUrl + "/api/v1/subscribe"); // Replace with actual subscription endpoint
            httpPost.addHeader("Authorization", "Basic " + markitUsername + ":" + markitPassword);
            httpPost.addHeader("X-API-Key", markitApiKey);
            httpPost.addHeader("Content-Type", "application/json");

            // Create request body with etfIdentifiers, identifierType, and callback URL
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("etfIdentifiers", etfIdentifiers);
            requestBody.put("identifierType", identifierType);
            requestBody.put("callbackUrl", "http://your-callback-url"); // Replace with actual callback URL
            StringEntity entity = new StringEntity(objectMapper.writeValueAsString(requestBody));
            httpPost.setEntity(entity);

            httpClient.execute(httpPost, response -> {
                int status = response.getStatusLine().getStatusCode();
                if (status >= 200 && status < 300) {
                    log.info("Successfully subscribed to MarkIT NAV updates");
                } else {
                    log.error("Failed to subscribe to MarkIT NAV updates. Status code: {}", status);
                }
                return null;
            });
        } catch (IOException e) {
            log.error("IOException while subscribing to MarkIT NAV updates: {}", e.getMessage());
            throw IngestionException.forMarketData("Error subscribing to MarkIT NAV updates", e);
        }
    }

    /**
     * Handles NAV update notifications from MarkIT
     *
     * @param updateJson
     * @return Processed NAV data
     */
    public MarketData handleNavUpdate(String updateJson) {
        log.info("Received MarkIT NAV update: {}", updateJson);
        try {
            JsonNode rootNode = objectMapper.readTree(updateJson);
            String etfIdentifier = rootNode.get("etfIdentifier").asText();
            BigDecimal navValue = new BigDecimal(rootNode.get("navValue").asText());

            MarketData marketData = new MarketData();
            marketData.setSecurityId(etfIdentifier);
            marketData.setMarketDataType("NAV");
            marketData.setNavValue(navValue);
            marketData.setSource(SOURCE_NAME);
            marketData.setIsComposite(true);
            marketData.setEventTime(Instant.now());

            return marketData;
        } catch (IOException e) {
            log.error("Error processing MarkIT NAV update: {}", e.getMessage());
            throw IngestionException.forMarketData("Error processing MarkIT NAV update", e);
        }
    }

    /**
     * Maps MarkIT reference data to internal domain model
     *
     * @param referenceData
     * @return Mapped Security domain object
     */
    public Security mapMarkITReferenceDataToInternal(SecurityReferenceData referenceData) {
        log.info("Mapping MarkIT reference data to internal model");
        try {
            return dataMappingService.mapSecurityReferenceData(referenceData);
        } catch (Exception e) {
            log.error("Error mapping MarkIT reference data: {}", e.getMessage());
            throw IngestionException.forReferenceData("Error mapping MarkIT reference data", e);
        }
    }

    /**
     * Maps MarkIT composition data to internal domain model
     *
     * @param basketSecurity
     * @param compositions
     * @return List of mapped IndexComposition domain objects
     */
    public List<IndexComposition> mapMarkITCompositionToInternal(Security basketSecurity, List<IndexComposition> compositions) {
        log.info("Mapping MarkIT composition data to internal model");
        List<IndexComposition> results = new ArrayList<>();
        try {
            for (IndexComposition composition : compositions) {
                composition.setIndexSecurity(basketSecurity);
                // Ensure constituentSecurity is properly set (fetch from DB if needed)
                composition.setSource(SOURCE_NAME);
                results.add(composition);
            }
            return results;
        } catch (Exception e) {
            log.error("Error mapping MarkIT composition data: {}", e.getMessage());
            throw IngestionException.forReferenceData("Error mapping MarkIT composition data", e);
        }
    }

    /**
     * Maps MarkIT NAV data to internal domain model
     *
     * @param navData
     * @return Mapped MarketDataEvent for publishing
     */
    public MarketDataEvent mapMarkITNavDataToInternal(MarketData navData) {
        log.info("Mapping MarkIT NAV data to internal model");
        try {
            return MarketDataEvent.builder()
                    .eventType("NAV_UPDATE")
                    .source(SOURCE_NAME)
                    .securityId(navData.getSecurityId())
                    .navValue(navData.getNavValue())
                    .isComposite(true)
                    .effectiveTime(navData.getEventTime())
                    .dataSource(SOURCE_NAME)
                    .build();
        } catch (Exception e) {
            log.error("Error mapping MarkIT NAV data: {}", e.getMessage());
            throw IngestionException.forMarketData("Error mapping MarkIT NAV data", e);
        }
    }

    /**
     * Creates a reference data event from MarkIT data
     *
     * @param security
     * @param operation
     * @return Event for publishing
     */
    public ReferenceDataEvent createReferenceDataEvent(Security security, String operation) {
        ReferenceDataEvent event = new ReferenceDataEvent(SOURCE_NAME);
        event.setOperation(operation);
        event.addSecurity(security);
        return event;
    }

    /**
     * Creates a reference data event for index composition from MarkIT data
     *
     * @param composition
     * @param operation
     * @return Event for publishing
     */
    public ReferenceDataEvent createCompositionDataEvent(IndexComposition composition, String operation) {
        ReferenceDataEvent event = new ReferenceDataEvent(SOURCE_NAME);
        event.setOperation(operation);
        event.addIndexComposition(composition);
        return event;
    }

    /**
     * Shuts down the adapter and releases resources
     */
    public void shutdown() {
        log.info("Shutting down MarkIT adapter");
        disconnect();
        executorService.shutdown();
        log.info("MarkIT adapter shutdown complete");
    }
}