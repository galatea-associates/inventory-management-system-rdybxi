package com.ims.ingestion.repository;

import com.ims.ingestion.model.TradeData;

import org.springframework.data.jpa.repository.JpaRepository; // Spring Data JPA 3.1.0
import org.springframework.data.jpa.repository.Query; // Spring Data JPA 3.1.0
import org.springframework.data.repository.query.Param; // Spring Data JPA 3.1.0
import org.springframework.stereotype.Repository; // Spring Framework 6.0.9

import java.time.LocalDate; // Java 17
import java.util.List; // Java 17
import java.util.Optional; // Java 17

/**
 * Repository interface for accessing and managing trade data in the Inventory Management System.
 * Provides methods for querying, storing, and retrieving TradeData entities during the ingestion process,
 * supporting high-throughput trade data processing and position calculation requirements.
 */
@Repository
public interface TradeDataRepository extends JpaRepository<TradeData, Long> {
    
    /**
     * Finds a trade by its unique trade ID
     * 
     * @param tradeId The trade ID to search for
     * @return Optional containing the trade if found, empty Optional otherwise
     */
    Optional<TradeData> findByTradeId(String tradeId);
    
    /**
     * Finds a trade by its order ID
     * 
     * @param orderId The order ID to search for
     * @return Optional containing the trade if found, empty Optional otherwise
     */
    Optional<TradeData> findByOrderId(String orderId);
    
    /**
     * Finds a trade by its execution ID
     * 
     * @param executionId The execution ID to search for
     * @return Optional containing the trade if found, empty Optional otherwise
     */
    Optional<TradeData> findByExecutionId(String executionId);
    
    /**
     * Finds all trades associated with a specific batch ID
     * 
     * @param batchId The batch ID to search for
     * @return List of trades with the specified batch ID
     */
    List<TradeData> findByBatchId(String batchId);
    
    /**
     * Finds all trades with pending processing status
     * 
     * @return List of trades with pending processing status
     */
    @Query("SELECT t FROM TradeData t WHERE t.processingStatus = 'PENDING'")
    List<TradeData> findPendingTrades();
    
    /**
     * Finds all trades with error processing status
     * 
     * @return List of trades with error processing status
     */
    @Query("SELECT t FROM TradeData t WHERE t.processingStatus = 'ERROR'")
    List<TradeData> findErrorTrades();
    
    /**
     * Finds duplicate trades based on trade ID, order ID, or execution ID
     * 
     * @return List of duplicate trades
     */
    @Query("SELECT t FROM TradeData t WHERE t.tradeId IN (SELECT t2.tradeId FROM TradeData t2 WHERE t2.tradeId IS NOT NULL GROUP BY t2.tradeId HAVING COUNT(t2) > 1) OR t.orderId IN (SELECT t3.orderId FROM TradeData t3 WHERE t3.orderId IS NOT NULL GROUP BY t3.orderId HAVING COUNT(t3) > 1) OR t.executionId IN (SELECT t4.executionId FROM TradeData t4 WHERE t4.executionId IS NOT NULL GROUP BY t4.executionId HAVING COUNT(t4) > 1)")
    List<TradeData> findDuplicateTrades();
    
    /**
     * Finds trades for a specific security within a date range
     * 
     * @param securityId The security ID to search for
     * @param startDate The start date of the range (inclusive)
     * @param endDate The end date of the range (inclusive)
     * @return List of trades for the specified security within the date range
     */
    List<TradeData> findBySecurityIdAndTradeDateBetween(String securityId, LocalDate startDate, LocalDate endDate);
    
    /**
     * Finds trades for a specific book within a date range
     * 
     * @param bookId The book ID to search for
     * @param startDate The start date of the range (inclusive)
     * @param endDate The end date of the range (inclusive)
     * @return List of trades for the specified book within the date range
     */
    List<TradeData> findByBookIdAndTradeDateBetween(String bookId, LocalDate startDate, LocalDate endDate);
    
    /**
     * Finds trades for a specific counterparty within a date range
     * 
     * @param counterpartyId The counterparty ID to search for
     * @param startDate The start date of the range (inclusive)
     * @param endDate The end date of the range (inclusive)
     * @return List of trades for the specified counterparty within the date range
     */
    List<TradeData> findByCounterpartyIdAndTradeDateBetween(String counterpartyId, LocalDate startDate, LocalDate endDate);
    
    /**
     * Finds trades from a specific source with a specific processing status
     * 
     * @param source The source system of the trade data
     * @param processingStatus The processing status to filter by
     * @return List of trades matching the source and processing status
     */
    List<TradeData> findBySourceAndProcessingStatus(String source, String processingStatus);
    
    /**
     * Counts the number of trades with a specific batch ID
     * 
     * @param batchId The batch ID to count
     * @return The count of trades with the specified batch ID
     */
    long countByBatchId(String batchId);
    
    /**
     * Counts the number of trades with a specific batch ID and processing status
     * 
     * @param batchId The batch ID to count
     * @param processingStatus The processing status to filter by
     * @return The count of trades matching the batch ID and processing status
     */
    long countByBatchIdAndProcessingStatus(String batchId, String processingStatus);
    
    /**
     * Deletes all trades with a specific batch ID
     * 
     * @param batchId The batch ID of trades to delete
     */
    void deleteByBatchId(String batchId);
}