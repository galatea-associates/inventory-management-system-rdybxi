package com.ims.ingestion.repository;

import com.ims.ingestion.model.MarketData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for accessing and managing market data in the Inventory Management System.
 * Provides methods for querying, storing, and retrieving MarketData entities during the ingestion process,
 * supporting high-throughput market data processing and time-series data management.
 */
@Repository
public interface MarketDataRepository extends JpaRepository<MarketData, Long> {

    /**
     * Finds market data by its external ID and source
     *
     * @param externalId The external ID of the market data
     * @param source The source of the market data
     * @return The market data if found, or empty Optional otherwise
     */
    Optional<MarketData> findByExternalIdAndSource(String externalId, String source);

    /**
     * Finds market data for a specific security within a time range
     *
     * @param securityId The security ID
     * @param startTime The start time of the range
     * @param endTime The end time of the range
     * @return List of market data for the security within the time range
     */
    List<MarketData> findBySecurityIdAndEventTimeBetween(String securityId, Instant startTime, Instant endTime);

    /**
     * Finds the latest market data for a specific security and market data type
     *
     * @param securityId The security ID
     * @param marketDataType The market data type
     * @return The latest market data if found, or empty Optional otherwise
     */
    @Query("SELECT m FROM MarketData m WHERE m.securityId = :securityId AND m.marketDataType = :marketDataType ORDER BY m.eventTime DESC LIMIT 1")
    Optional<MarketData> findLatestBySecurityIdAndMarketDataType(@Param("securityId") String securityId, @Param("marketDataType") String marketDataType);

    /**
     * Finds all market data associated with a specific batch ID
     *
     * @param batchId The batch ID
     * @return List of market data with the specified batch ID
     */
    List<MarketData> findByBatchId(String batchId);

    /**
     * Finds all market data with a specific processing status
     *
     * @param processingStatus The processing status
     * @return List of market data with the specified processing status
     */
    List<MarketData> findByProcessingStatus(String processingStatus);

    /**
     * Finds all price update market data
     *
     * @return List of price update market data
     */
    @Query("SELECT m FROM MarketData m WHERE m.marketDataType = 'PRICE'")
    List<MarketData> findPriceUpdates();

    /**
     * Finds all NAV update market data
     *
     * @return List of NAV update market data
     */
    @Query("SELECT m FROM MarketData m WHERE m.marketDataType = 'NAV'")
    List<MarketData> findNavUpdates();

    /**
     * Finds all volatility update market data
     *
     * @return List of volatility update market data
     */
    @Query("SELECT m FROM MarketData m WHERE m.marketDataType = 'VOLATILITY'")
    List<MarketData> findVolatilityUpdates();

    /**
     * Finds all market data from a specific source with a specific processing status
     *
     * @param source The source of the market data
     * @param processingStatus The processing status
     * @return List of market data from the specified source with the specified processing status
     */
    List<MarketData> findBySourceAndProcessingStatus(String source, String processingStatus);

    /**
     * Finds all market data for a specific security and market data type
     *
     * @param securityId The security ID
     * @param marketDataType The market data type
     * @return List of market data for the specified security and market data type
     */
    List<MarketData> findBySecurityIdAndMarketDataType(String securityId, String marketDataType);

    /**
     * Counts the number of market data items with a specific batch ID
     *
     * @param batchId The batch ID
     * @return The count of market data items with the specified batch ID
     */
    long countByBatchId(String batchId);

    /**
     * Deletes all market data with a specific batch ID
     *
     * @param batchId The batch ID
     */
    void deleteByBatchId(String batchId);

    /**
     * Finds recent market data for a list of security IDs within a specified time window
     *
     * @param securityIds The list of security IDs
     * @param startTime The start time of the window
     * @return List of recent market data for the specified securities
     */
    @Query("SELECT m FROM MarketData m WHERE m.securityId IN :securityIds AND m.eventTime >= :startTime")
    List<MarketData> findRecentMarketDataBySecurityIds(@Param("securityIds") List<String> securityIds, @Param("startTime") Instant startTime);

    /**
     * Finds the latest price for each security in a list of security IDs
     *
     * @param securityIds The list of security IDs
     * @return List of latest price market data for the specified securities
     */
    @Query(value = "SELECT m.* FROM market_data m INNER JOIN (SELECT security_id, MAX(event_time) as max_time FROM market_data WHERE security_id IN :securityIds AND market_data_type = 'PRICE' GROUP BY security_id) latest ON m.security_id = latest.security_id AND m.event_time = latest.max_time WHERE m.market_data_type = 'PRICE'", nativeQuery = true)
    List<MarketData> findLatestPriceForSecurities(@Param("securityIds") List<String> securityIds);
}