package com.ims.workflow.repository;

import com.ims.workflow.model.OrderValidation;
import org.springframework.data.jpa.repository.JpaRepository; // version: 3.1.0
import org.springframework.data.jpa.repository.Query; // version: 3.1.0
import org.springframework.data.repository.query.Param; // version: 3.1.0
import org.springframework.stereotype.Repository; // version: 6.0.9

import java.math.BigDecimal; // version: 17
import java.time.LocalDateTime; // version: 17
import java.util.List; // version: 17
import java.util.Optional; // version: 17

/**
 * Repository interface for managing OrderValidation entities in the Inventory Management System.
 * This interface extends Spring Data JPA's JpaRepository to provide CRUD operations and
 * custom query methods for order validations as part of the short sell approval workflow.
 */
@Repository
public interface OrderValidationRepository extends JpaRepository<OrderValidation, Long> {

    /**
     * Finds an order validation by its unique identifier
     * 
     * @param validationId the validation identifier
     * @return the found order validation or empty if not found
     */
    Optional<OrderValidation> findByValidationId(String validationId);

    /**
     * Finds an order validation by its order identifier
     * 
     * @param orderId the order identifier
     * @return the found order validation or empty if not found
     */
    Optional<OrderValidation> findByOrderId(String orderId);

    /**
     * Finds all order validations with a specific status
     * 
     * @param status the status to search for
     * @return list of order validations with the specified status
     */
    List<OrderValidation> findByStatus(String status);

    /**
     * Finds all order validations for a specific security with a specific status
     * 
     * @param securityId the security identifier
     * @param status the status to search for
     * @return list of order validations for the security with the specified status
     */
    @Query("SELECT o FROM OrderValidation o WHERE o.security.internalId = :securityId AND o.status = :status")
    List<OrderValidation> findBySecurityIdAndStatus(
            @Param("securityId") String securityId, 
            @Param("status") String status);

    /**
     * Finds all order validations for a specific client with a specific status
     * 
     * @param clientId the client identifier
     * @param status the status to search for
     * @return list of order validations for the client with the specified status
     */
    @Query("SELECT o FROM OrderValidation o WHERE o.client.counterpartyId = :clientId AND o.status = :status")
    List<OrderValidation> findByClientIdAndStatus(
            @Param("clientId") String clientId, 
            @Param("status") String status);

    /**
     * Finds all order validations for a specific aggregation unit with a specific status
     * 
     * @param aggregationUnitId the aggregation unit identifier
     * @param status the status to search for
     * @return list of order validations for the aggregation unit with the specified status
     */
    @Query("SELECT o FROM OrderValidation o WHERE o.aggregationUnit.aggregationUnitId = :aggregationUnitId AND o.status = :status")
    List<OrderValidation> findByAggregationUnitIdAndStatus(
            @Param("aggregationUnitId") String aggregationUnitId, 
            @Param("status") String status);

    /**
     * Finds all order validations created between two timestamps
     * 
     * @param startTime the start timestamp
     * @param endTime the end timestamp
     * @return list of order validations created within the specified time range
     */
    List<OrderValidation> findByValidationTimestampBetween(LocalDateTime startTime, LocalDateTime endTime);

    /**
     * Finds all order validations with a specific order type
     * 
     * @param orderType the order type
     * @return list of order validations with the specified order type
     */
    List<OrderValidation> findByOrderType(String orderType);

    /**
     * Finds all order validations with a specific order type and status
     * 
     * @param orderType the order type
     * @param status the status
     * @return list of order validations with the specified order type and status
     */
    List<OrderValidation> findByOrderTypeAndStatus(String orderType, String status);

    /**
     * Finds all pending order validations
     * 
     * @return list of pending order validations
     */
    @Query("SELECT o FROM OrderValidation o WHERE o.status = 'PENDING'")
    List<OrderValidation> findPendingValidations();

    /**
     * Finds all short sell order validations
     * 
     * @return list of short sell order validations
     */
    @Query("SELECT o FROM OrderValidation o WHERE o.orderType = 'SHORT_SELL'")
    List<OrderValidation> findShortSellValidations();

    /**
     * Finds all long sell order validations
     * 
     * @return list of long sell order validations
     */
    @Query("SELECT o FROM OrderValidation o WHERE o.orderType = 'LONG_SELL'")
    List<OrderValidation> findLongSellValidations();

    /**
     * Finds all order validations for a specific security and client with a specific status
     * 
     * @param securityId the security identifier
     * @param clientId the client identifier
     * @param status the status
     * @return list of order validations for the security and client with the specified status
     */
    @Query("SELECT o FROM OrderValidation o WHERE o.security.internalId = :securityId AND o.client.counterpartyId = :clientId AND o.status = :status")
    List<OrderValidation> findBySecurityIdAndClientIdAndStatus(
            @Param("securityId") String securityId, 
            @Param("clientId") String clientId, 
            @Param("status") String status);

    /**
     * Counts the number of order validations with a specific status
     * 
     * @param status the status
     * @return the count of order validations with the specified status
     */
    long countByStatus(String status);

    /**
     * Counts the number of order validations with a specific order type and status
     * 
     * @param orderType the order type
     * @param status the status
     * @return the count of order validations with the specified order type and status
     */
    long countByOrderTypeAndStatus(String orderType, String status);

    /**
     * Finds all order validations with a quantity greater than the specified value
     * 
     * @param quantity the quantity threshold
     * @return list of order validations with quantity greater than the specified value
     */
    List<OrderValidation> findByQuantityGreaterThan(BigDecimal quantity);

    /**
     * Finds all approved order validations
     * 
     * @return list of approved order validations
     */
    @Query("SELECT o FROM OrderValidation o WHERE o.status = 'APPROVED'")
    List<OrderValidation> findApprovedValidations();

    /**
     * Finds all rejected order validations
     * 
     * @return list of rejected order validations
     */
    @Query("SELECT o FROM OrderValidation o WHERE o.status = 'REJECTED'")
    List<OrderValidation> findRejectedValidations();

    /**
     * Finds all order validations with a specific rejection reason
     * 
     * @param rejectionReason the rejection reason
     * @return list of order validations with the specified rejection reason
     */
    List<OrderValidation> findByRejectionReason(String rejectionReason);

    /**
     * Finds all order validations with processing time less than the specified value
     * 
     * @param processingTime the processing time threshold in milliseconds
     * @return list of order validations with processing time less than the specified value
     */
    List<OrderValidation> findByProcessingTimeLessThan(Long processingTime);

    /**
     * Finds all order validations with processing time greater than the specified value
     * 
     * @param processingTime the processing time threshold in milliseconds
     * @return list of order validations with processing time greater than the specified value
     */
    List<OrderValidation> findByProcessingTimeGreaterThan(Long processingTime);

    /**
     * Updates the status of an order validation
     * 
     * @param validationId the validation identifier
     * @param status the new status
     * @return the number of rows affected
     */
    @Query("UPDATE OrderValidation o SET o.status = :status WHERE o.validationId = :validationId")
    int updateStatus(@Param("validationId") String validationId, @Param("status") String status);

    /**
     * Finds all order validations with processing time exceeding the 150ms SLA
     * 
     * @return list of order validations exceeding the SLA
     */
    @Query("SELECT o FROM OrderValidation o WHERE o.processingTime > 150")
    List<OrderValidation> findValidationsExceedingSLA();
}