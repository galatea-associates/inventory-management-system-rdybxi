package com.ims.calculation.repository;

import com.ims.calculation.model.ClientLimit;
import com.ims.calculation.model.AggregationUnitLimit;
import com.ims.common.exception.NotFoundException;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for managing client and aggregation unit trading limits in the Inventory Management System.
 * This repository provides methods for querying, updating, and managing limit data to support the short sell 
 * approval workflow and limit calculations. It handles both client-level and aggregation unit-level limits with 
 * support for market-specific rules.
 */
@Repository
@Transactional(readOnly = true)
public interface LimitRepository {

    // Client limit query methods
    
    /**
     * Finds a client limit for a specific client, security, and business date.
     *
     * @param clientId The client identifier
     * @param securityId The security identifier
     * @param businessDate The business date
     * @return An Optional containing the client limit if found, empty otherwise
     */
    Optional<ClientLimit> findClientLimitByClientIdAndSecurityIdAndBusinessDate(
            String clientId, String securityId, LocalDate businessDate);
    
    /**
     * Finds all client limits for a specific client and business date.
     *
     * @param clientId The client identifier
     * @param businessDate The business date
     * @return A list of client limits
     */
    List<ClientLimit> findClientLimitsByClientIdAndBusinessDate(String clientId, LocalDate businessDate);
    
    /**
     * Finds all client limits for a specific security and business date.
     *
     * @param securityId The security identifier
     * @param businessDate The business date
     * @return A list of client limits
     */
    List<ClientLimit> findClientLimitsBySecurityIdAndBusinessDate(String securityId, LocalDate businessDate);
    
    /**
     * Finds all active client limits for a specific business date.
     *
     * @param businessDate The business date
     * @return A list of active client limits
     */
    @Query("SELECT c FROM ClientLimit c WHERE c.businessDate = :businessDate AND c.status = 'ACTIVE'")
    List<ClientLimit> findActiveClientLimits(@Param("businessDate") LocalDate businessDate);
    
    /**
     * Finds all active client limits for a specific security and business date.
     *
     * @param securityId The security identifier
     * @param businessDate The business date
     * @return A list of active client limits
     */
    @Query("SELECT c FROM ClientLimit c WHERE c.securityId = :securityId AND c.businessDate = :businessDate AND c.status = 'ACTIVE'")
    List<ClientLimit> findActiveClientLimitsBySecurityId(
            @Param("securityId") String securityId, @Param("businessDate") LocalDate businessDate);
    
    /**
     * Finds all client limits for a specific market and business date.
     *
     * @param market The market identifier
     * @param businessDate The business date
     * @return A list of client limits
     */
    List<ClientLimit> findClientLimitsByMarketAndBusinessDate(String market, LocalDate businessDate);
    
    // Aggregation unit limit query methods
    
    /**
     * Finds an aggregation unit limit for a specific aggregation unit, security, and business date.
     *
     * @param aggregationUnitId The aggregation unit identifier
     * @param securityId The security identifier
     * @param businessDate The business date
     * @return An Optional containing the aggregation unit limit if found, empty otherwise
     */
    Optional<AggregationUnitLimit> findAggregationUnitLimitByAggregationUnitIdAndSecurityIdAndBusinessDate(
            String aggregationUnitId, String securityId, LocalDate businessDate);
    
    /**
     * Finds all aggregation unit limits for a specific aggregation unit and business date.
     *
     * @param aggregationUnitId The aggregation unit identifier
     * @param businessDate The business date
     * @return A list of aggregation unit limits
     */
    List<AggregationUnitLimit> findAggregationUnitLimitsByAggregationUnitIdAndBusinessDate(
            String aggregationUnitId, LocalDate businessDate);
    
    /**
     * Finds all aggregation unit limits for a specific security and business date.
     *
     * @param securityId The security identifier
     * @param businessDate The business date
     * @return A list of aggregation unit limits
     */
    List<AggregationUnitLimit> findAggregationUnitLimitsBySecurityIdAndBusinessDate(
            String securityId, LocalDate businessDate);
    
    /**
     * Finds all active aggregation unit limits for a specific business date.
     *
     * @param businessDate The business date
     * @return A list of active aggregation unit limits
     */
    @Query("SELECT a FROM AggregationUnitLimit a WHERE a.businessDate = :businessDate AND a.status = 'ACTIVE'")
    List<AggregationUnitLimit> findActiveAggregationUnitLimits(@Param("businessDate") LocalDate businessDate);
    
    /**
     * Finds all active aggregation unit limits for a specific security and business date.
     *
     * @param securityId The security identifier
     * @param businessDate The business date
     * @return A list of active aggregation unit limits
     */
    @Query("SELECT a FROM AggregationUnitLimit a WHERE a.securityId = :securityId AND a.businessDate = :businessDate AND a.status = 'ACTIVE'")
    List<AggregationUnitLimit> findActiveAggregationUnitLimitsBySecurityId(
            @Param("securityId") String securityId, @Param("businessDate") LocalDate businessDate);
    
    /**
     * Finds all aggregation unit limits for a specific market and business date.
     *
     * @param market The market identifier
     * @param businessDate The business date
     * @return A list of aggregation unit limits
     */
    List<AggregationUnitLimit> findAggregationUnitLimitsByMarketAndBusinessDate(String market, LocalDate businessDate);
    
    // Update methods for client limits
    
    /**
     * Updates the long sell used amount for a client limit.
     *
     * @param clientId The client identifier
     * @param securityId The security identifier
     * @param businessDate The business date
     * @param amount The amount to add to the long sell used
     * @return The number of records updated
     */
    @Modifying
    @Transactional
    @Query("UPDATE ClientLimit c SET c.longSellUsed = c.longSellUsed + :amount, c.lastUpdated = CURRENT_TIMESTAMP WHERE c.clientId = :clientId AND c.securityId = :securityId AND c.businessDate = :businessDate")
    int updateClientLongSellUsed(
            @Param("clientId") String clientId, 
            @Param("securityId") String securityId, 
            @Param("businessDate") LocalDate businessDate,
            @Param("amount") BigDecimal amount);
    
    /**
     * Updates the short sell used amount for a client limit.
     *
     * @param clientId The client identifier
     * @param securityId The security identifier
     * @param businessDate The business date
     * @param amount The amount to add to the short sell used
     * @return The number of records updated
     */
    @Modifying
    @Transactional
    @Query("UPDATE ClientLimit c SET c.shortSellUsed = c.shortSellUsed + :amount, c.lastUpdated = CURRENT_TIMESTAMP WHERE c.clientId = :clientId AND c.securityId = :securityId AND c.businessDate = :businessDate")
    int updateClientShortSellUsed(
            @Param("clientId") String clientId, 
            @Param("securityId") String securityId, 
            @Param("businessDate") LocalDate businessDate,
            @Param("amount") BigDecimal amount);
    
    /**
     * Updates the status of a client limit.
     *
     * @param clientId The client identifier
     * @param securityId The security identifier
     * @param businessDate The business date
     * @param status The new status
     * @return The number of records updated
     */
    @Modifying
    @Transactional
    @Query("UPDATE ClientLimit c SET c.status = :status, c.lastUpdated = CURRENT_TIMESTAMP WHERE c.clientId = :clientId AND c.securityId = :securityId AND c.businessDate = :businessDate")
    int updateClientLimitStatus(
            @Param("clientId") String clientId, 
            @Param("securityId") String securityId, 
            @Param("businessDate") LocalDate businessDate,
            @Param("status") String status);
    
    /**
     * Updates the long sell and short sell limits for a client limit.
     *
     * @param clientId The client identifier
     * @param securityId The security identifier
     * @param businessDate The business date
     * @param longSellLimit The new long sell limit
     * @param shortSellLimit The new short sell limit
     * @return The number of records updated
     */
    @Modifying
    @Transactional
    @Query("UPDATE ClientLimit c SET c.longSellLimit = :longSellLimit, c.shortSellLimit = :shortSellLimit, c.lastUpdated = CURRENT_TIMESTAMP WHERE c.clientId = :clientId AND c.securityId = :securityId AND c.businessDate = :businessDate")
    int updateClientLimitLimits(
            @Param("clientId") String clientId, 
            @Param("securityId") String securityId, 
            @Param("businessDate") LocalDate businessDate,
            @Param("longSellLimit") BigDecimal longSellLimit,
            @Param("shortSellLimit") BigDecimal shortSellLimit);
    
    // Update methods for aggregation unit limits
    
    /**
     * Updates the long sell used amount for an aggregation unit limit.
     *
     * @param aggregationUnitId The aggregation unit identifier
     * @param securityId The security identifier
     * @param businessDate The business date
     * @param amount The amount to add to the long sell used
     * @return The number of records updated
     */
    @Modifying
    @Transactional
    @Query("UPDATE AggregationUnitLimit a SET a.longSellUsed = a.longSellUsed + :amount, a.lastUpdated = CURRENT_TIMESTAMP WHERE a.aggregationUnitId = :aggregationUnitId AND a.securityId = :securityId AND a.businessDate = :businessDate")
    int updateAggregationUnitLongSellUsed(
            @Param("aggregationUnitId") String aggregationUnitId, 
            @Param("securityId") String securityId, 
            @Param("businessDate") LocalDate businessDate,
            @Param("amount") BigDecimal amount);
    
    /**
     * Updates the short sell used amount for an aggregation unit limit.
     *
     * @param aggregationUnitId The aggregation unit identifier
     * @param securityId The security identifier
     * @param businessDate The business date
     * @param amount The amount to add to the short sell used
     * @return The number of records updated
     */
    @Modifying
    @Transactional
    @Query("UPDATE AggregationUnitLimit a SET a.shortSellUsed = a.shortSellUsed + :amount, a.lastUpdated = CURRENT_TIMESTAMP WHERE a.aggregationUnitId = :aggregationUnitId AND a.securityId = :securityId AND a.businessDate = :businessDate")
    int updateAggregationUnitShortSellUsed(
            @Param("aggregationUnitId") String aggregationUnitId, 
            @Param("securityId") String securityId, 
            @Param("businessDate") LocalDate businessDate,
            @Param("amount") BigDecimal amount);
    
    /**
     * Updates the status of an aggregation unit limit.
     *
     * @param aggregationUnitId The aggregation unit identifier
     * @param securityId The security identifier
     * @param businessDate The business date
     * @param status The new status
     * @return The number of records updated
     */
    @Modifying
    @Transactional
    @Query("UPDATE AggregationUnitLimit a SET a.status = :status, a.lastUpdated = CURRENT_TIMESTAMP WHERE a.aggregationUnitId = :aggregationUnitId AND a.securityId = :securityId AND a.businessDate = :businessDate")
    int updateAggregationUnitLimitStatus(
            @Param("aggregationUnitId") String aggregationUnitId, 
            @Param("securityId") String securityId, 
            @Param("businessDate") LocalDate businessDate,
            @Param("status") String status);
    
    /**
     * Updates the long sell and short sell limits for an aggregation unit limit.
     *
     * @param aggregationUnitId The aggregation unit identifier
     * @param securityId The security identifier
     * @param businessDate The business date
     * @param longSellLimit The new long sell limit
     * @param shortSellLimit The new short sell limit
     * @return The number of records updated
     */
    @Modifying
    @Transactional
    @Query("UPDATE AggregationUnitLimit a SET a.longSellLimit = :longSellLimit, a.shortSellLimit = :shortSellLimit, a.lastUpdated = CURRENT_TIMESTAMP WHERE a.aggregationUnitId = :aggregationUnitId AND a.securityId = :securityId AND a.businessDate = :businessDate")
    int updateAggregationUnitLimitLimits(
            @Param("aggregationUnitId") String aggregationUnitId, 
            @Param("securityId") String securityId, 
            @Param("businessDate") LocalDate businessDate,
            @Param("longSellLimit") BigDecimal longSellLimit,
            @Param("shortSellLimit") BigDecimal shortSellLimit);
    
    // Data cleanup methods
    
    /**
     * Deletes client limits with business date before the specified date.
     *
     * @param date The cutoff date
     * @return The number of records deleted
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM ClientLimit c WHERE c.businessDate < :date")
    int deleteClientLimitsByBusinessDateBefore(@Param("date") LocalDate date);
    
    /**
     * Deletes aggregation unit limits with business date before the specified date.
     *
     * @param date The cutoff date
     * @return The number of records deleted
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM AggregationUnitLimit a WHERE a.businessDate < :date")
    int deleteAggregationUnitLimitsByBusinessDateBefore(@Param("date") LocalDate date);
    
    // Convenience methods for fetching with exception handling
    
    /**
     * Gets a client limit by its ID, throwing an exception if not found.
     *
     * @param id The client limit ID
     * @return The client limit
     * @throws NotFoundException if the client limit is not found
     */
    default ClientLimit getClientLimitById(Long id) {
        return findById(id, ClientLimit.class)
                .orElseThrow(() -> new NotFoundException("ClientLimit", id.toString()));
    }
    
    /**
     * Gets an aggregation unit limit by its ID, throwing an exception if not found.
     *
     * @param id The aggregation unit limit ID
     * @return The aggregation unit limit
     * @throws NotFoundException if the aggregation unit limit is not found
     */
    default AggregationUnitLimit getAggregationUnitLimitById(Long id) {
        return findById(id, AggregationUnitLimit.class)
                .orElseThrow(() -> new NotFoundException("AggregationUnitLimit", id.toString()));
    }
    
    // Generic methods for both entity types
    
    /**
     * Finds an entity by its ID and type.
     *
     * @param <T> The entity type
     * @param id The entity ID
     * @param type The entity class
     * @return An Optional containing the entity if found, empty otherwise
     */
    <T> Optional<T> findById(Long id, Class<T> type);
    
    /**
     * Saves an entity.
     *
     * @param <T> The entity type
     * @param entity The entity to save
     * @return The saved entity
     */
    @Transactional
    <T> T save(T entity);
    
    /**
     * Saves multiple entities.
     *
     * @param <T> The entity type
     * @param entities The entities to save
     * @return The saved entities
     */
    @Transactional
    <T> List<T> saveAll(Iterable<?> entities);
    
    /**
     * Deletes an entity by its ID and type.
     *
     * @param id The entity ID
     * @param type The entity class
     */
    @Transactional
    void deleteById(Long id, Class<?> type);
}