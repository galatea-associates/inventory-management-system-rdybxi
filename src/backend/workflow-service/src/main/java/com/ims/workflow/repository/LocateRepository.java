package com.ims.workflow.repository;

import com.ims.workflow.model.LocateRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;
import java.math.BigDecimal;

/**
 * Repository interface for managing LocateRequest entities. Extends JpaRepository to inherit
 * standard CRUD operations and adds custom query methods for specific business requirements
 * related to locate request processing, approval, and rejection.
 */
@Repository
public interface LocateRepository extends JpaRepository<LocateRequest, Long> {

    /**
     * Finds a locate request by its unique identifier.
     *
     * @param requestId The unique identifier of the locate request
     * @return The found locate request or empty if not found
     */
    Optional<LocateRequest> findByRequestId(String requestId);

    /**
     * Finds all locate requests with a specific status.
     *
     * @param status The status to search for
     * @return List of locate requests with the specified status
     */
    List<LocateRequest> findByStatus(String status);

    /**
     * Finds all locate requests for a specific security with a specific status.
     *
     * @param securityId The security ID to search for
     * @param status The status to search for
     * @return List of locate requests for the security with the specified status
     */
    List<LocateRequest> findBySecurityIdAndStatus(String securityId, String status);

    /**
     * Finds all locate requests for a specific client with a specific status.
     *
     * @param clientId The client ID to search for
     * @param status The status to search for
     * @return List of locate requests for the client with the specified status
     */
    List<LocateRequest> findByClientIdAndStatus(String clientId, String status);

    /**
     * Finds all locate requests for a specific requestor with a specific status.
     *
     * @param requestorId The requestor ID to search for
     * @param status The status to search for
     * @return List of locate requests for the requestor with the specified status
     */
    List<LocateRequest> findByRequestorIdAndStatus(String requestorId, String status);

    /**
     * Finds all locate requests for a specific aggregation unit with a specific status.
     *
     * @param aggregationUnitId The aggregation unit ID to search for
     * @param status The status to search for
     * @return List of locate requests for the aggregation unit with the specified status
     */
    List<LocateRequest> findByAggregationUnitIdAndStatus(String aggregationUnitId, String status);

    /**
     * Finds all locate requests created between two timestamps.
     *
     * @param startTime The start timestamp
     * @param endTime The end timestamp
     * @return List of locate requests created within the specified time range
     */
    List<LocateRequest> findByRequestTimestampBetween(LocalDateTime startTime, LocalDateTime endTime);

    /**
     * Finds all locate requests with a specific locate type.
     *
     * @param locateType The locate type to search for
     * @return List of locate requests with the specified locate type
     */
    List<LocateRequest> findByLocateType(String locateType);

    /**
     * Finds all locate requests with a specific locate type and status.
     *
     * @param locateType The locate type to search for
     * @param status The status to search for
     * @return List of locate requests with the specified locate type and status
     */
    List<LocateRequest> findByLocateTypeAndStatus(String locateType, String status);

    /**
     * Finds all pending locate requests.
     *
     * @return List of pending locate requests
     */
    @Query("SELECT l FROM LocateRequest l WHERE l.status = 'PENDING'")
    List<LocateRequest> findPendingLocates();

    /**
     * Finds all active locate requests (approved and not expired).
     *
     * @return List of active locate requests
     */
    @Query("SELECT l FROM LocateRequest l WHERE l.status = 'APPROVED' AND l.approval.expiryDate >= CURRENT_DATE")
    List<LocateRequest> findActiveLocates();

    /**
     * Finds all expired locate requests.
     *
     * @return List of expired locate requests
     */
    @Query("SELECT l FROM LocateRequest l WHERE l.status = 'APPROVED' AND l.approval.expiryDate < CURRENT_DATE")
    List<LocateRequest> findExpiredLocates();

    /**
     * Finds all short sell locate requests.
     *
     * @return List of short sell locate requests
     */
    @Query("SELECT l FROM LocateRequest l WHERE l.locateType = 'SHORT_SELL'")
    List<LocateRequest> findShortSellLocates();

    /**
     * Finds all swap locate requests.
     *
     * @return List of swap locate requests
     */
    @Query("SELECT l FROM LocateRequest l WHERE l.locateType = 'SWAP'")
    List<LocateRequest> findSwapLocates();

    /**
     * Finds all locate requests for a specific security and client with a specific status.
     *
     * @param securityId The security ID to search for
     * @param clientId The client ID to search for
     * @param status The status to search for
     * @return List of locate requests for the security and client with the specified status
     */
    List<LocateRequest> findBySecurityIdAndClientIdAndStatus(String securityId, String clientId, String status);

    /**
     * Counts the number of locate requests with a specific status.
     *
     * @param status The status to count
     * @return The count of locate requests with the specified status
     */
    long countByStatus(String status);

    /**
     * Counts the number of locate requests with a specific locate type and status.
     *
     * @param locateType The locate type to count
     * @param status The status to count
     * @return The count of locate requests with the specified locate type and status
     */
    long countByLocateTypeAndStatus(String locateType, String status);

    /**
     * Finds all locate requests with a requested quantity greater than the specified value.
     *
     * @param quantity The quantity threshold
     * @return List of locate requests with requested quantity greater than the specified value
     */
    List<LocateRequest> findByRequestedQuantityGreaterThan(BigDecimal quantity);

    /**
     * Finds all locate requests that have been approved.
     *
     * @return List of approved locate requests
     */
    List<LocateRequest> findByApprovalIsNotNull();

    /**
     * Finds all locate requests that have been rejected.
     *
     * @return List of rejected locate requests
     */
    List<LocateRequest> findByRejectionIsNotNull();

    /**
     * Finds all locate requests with a specific rejection reason.
     *
     * @param rejectionReason The rejection reason to search for
     * @return List of locate requests with the specified rejection reason
     */
    List<LocateRequest> findByRejectionRejectionReason(String rejectionReason);

    /**
     * Finds all locate requests that were auto-approved.
     *
     * @param isAutoApproved Whether to find auto-approved or manually approved requests
     * @return List of auto-approved locate requests
     */
    List<LocateRequest> findByApprovalIsAutoApproved(Boolean isAutoApproved);

    /**
     * Finds all locate requests that were auto-rejected.
     *
     * @param isAutoRejected Whether to find auto-rejected or manually rejected requests
     * @return List of auto-rejected locate requests
     */
    List<LocateRequest> findByRejectionIsAutoRejected(Boolean isAutoRejected);

    /**
     * Finds all locate requests with a specific security temperature in their approval.
     *
     * @param securityTemperature The security temperature to search for
     * @return List of locate requests with the specified security temperature
     */
    List<LocateRequest> findByApprovalSecurityTemperature(String securityTemperature);

    /**
     * Updates the status of a locate request.
     *
     * @param requestId The ID of the locate request to update
     * @param status The new status
     * @return The number of rows affected
     */
    @Query("UPDATE LocateRequest l SET l.status = :status WHERE l.requestId = :requestId")
    int updateStatus(@Param("requestId") String requestId, @Param("status") String status);
}