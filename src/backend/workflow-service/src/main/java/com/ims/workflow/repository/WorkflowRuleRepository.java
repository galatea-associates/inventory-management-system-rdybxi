package com.ims.workflow.repository;

import com.ims.workflow.model.WorkflowRule;
import org.springframework.data.jpa.repository.JpaRepository; // version 3.1.0
import org.springframework.data.jpa.repository.Query; // version 3.1.0
import org.springframework.data.jpa.repository.Modifying; // version 3.1.0
import org.springframework.data.repository.query.Param; // version 3.1.0
import org.springframework.stereotype.Repository; // version 6.0.9

import java.util.List; // version 17
import java.util.Optional; // version 17
import java.time.LocalDate; // version 17

/**
 * Repository interface for managing WorkflowRule entities in the Inventory Management System.
 * Provides CRUD operations and custom query methods for workflow rules used in locate approval
 * and short sell validation workflows.
 */
@Repository
public interface WorkflowRuleRepository extends JpaRepository<WorkflowRule, Long> {

    /**
     * Finds a workflow rule by its unique identifier.
     *
     * @param ruleId The rule ID to search for
     * @return The found workflow rule or empty if not found
     */
    Optional<WorkflowRule> findByRuleId(String ruleId);

    /**
     * Finds a workflow rule by its name.
     *
     * @param name The rule name to search for
     * @return The found workflow rule or empty if not found
     */
    Optional<WorkflowRule> findByName(String name);

    /**
     * Finds all workflow rules with a specific status.
     *
     * @param status The status to search for
     * @return List of workflow rules with the specified status
     */
    List<WorkflowRule> findByStatus(String status);

    /**
     * Finds all workflow rules with a specific rule type.
     *
     * @param ruleType The rule type to search for
     * @return List of workflow rules with the specified rule type
     */
    List<WorkflowRule> findByRuleType(String ruleType);

    /**
     * Finds all workflow rules for a specific market.
     *
     * @param market The market to search for
     * @return List of workflow rules for the specified market
     */
    List<WorkflowRule> findByMarket(String market);

    /**
     * Finds all workflow rules with a specific rule type and market.
     *
     * @param ruleType The rule type to search for
     * @param market The market to search for
     * @return List of workflow rules with the specified rule type and market
     */
    List<WorkflowRule> findByRuleTypeAndMarket(String ruleType, String market);

    /**
     * Finds all workflow rules with a specific status and rule type.
     *
     * @param status The status to search for
     * @param ruleType The rule type to search for
     * @return List of workflow rules with the specified status and rule type
     */
    List<WorkflowRule> findByStatusAndRuleType(String status, String ruleType);

    /**
     * Finds all workflow rules with a specific status and market.
     *
     * @param status The status to search for
     * @param market The market to search for
     * @return List of workflow rules with the specified status and market
     */
    List<WorkflowRule> findByStatusAndMarket(String status, String market);

    /**
     * Finds all workflow rules with a specific status, rule type, and market.
     *
     * @param status The status to search for
     * @param ruleType The rule type to search for
     * @param market The market to search for
     * @return List of workflow rules with the specified status, rule type, and market
     */
    List<WorkflowRule> findByStatusAndRuleTypeAndMarket(String status, String ruleType, String market);

    /**
     * Finds all workflow rules with a priority greater than or equal to the specified value.
     *
     * @param priority The minimum priority value
     * @return List of workflow rules with priority greater than or equal to the specified value
     */
    List<WorkflowRule> findByPriorityGreaterThanEqual(int priority);

    /**
     * Finds all workflow rules that are effective on a specific date.
     *
     * @param date The date to check for effectiveness
     * @param date The date to check for expiry
     * @return List of workflow rules effective on the specified date
     */
    List<WorkflowRule> findByEffectiveDateLessThanEqualAndExpiryDateGreaterThanEqual(LocalDate date, LocalDate date2);

    /**
     * Finds all workflow rules approved by a specific user.
     *
     * @param approvedBy The approver to search for
     * @return List of workflow rules approved by the specified user
     */
    List<WorkflowRule> findByApprovedBy(String approvedBy);

    /**
     * Finds all active workflow rules.
     *
     * @return List of active workflow rules
     */
    @Query("SELECT r FROM WorkflowRule r WHERE r.status = 'ACTIVE' AND r.effectiveDate <= CURRENT_DATE AND (r.expiryDate IS NULL OR r.expiryDate >= CURRENT_DATE)")
    List<WorkflowRule> findActiveRules();

    /**
     * Finds all active workflow rules for a specific market.
     *
     * @param market The market to search for
     * @return List of active workflow rules for the specified market
     */
    @Query("SELECT r FROM WorkflowRule r WHERE r.status = 'ACTIVE' AND r.effectiveDate <= CURRENT_DATE AND (r.expiryDate IS NULL OR r.expiryDate >= CURRENT_DATE) AND (r.market = :market OR r.market = 'GLOBAL')")
    List<WorkflowRule> findActiveRulesByMarket(@Param("market") String market);

    /**
     * Finds all active workflow rules with a specific rule type.
     *
     * @param ruleType The rule type to search for
     * @return List of active workflow rules with the specified rule type
     */
    @Query("SELECT r FROM WorkflowRule r WHERE r.status = 'ACTIVE' AND r.effectiveDate <= CURRENT_DATE AND (r.expiryDate IS NULL OR r.expiryDate >= CURRENT_DATE) AND r.ruleType = :ruleType")
    List<WorkflowRule> findActiveRulesByRuleType(@Param("ruleType") String ruleType);

    /**
     * Finds all active workflow rules for a specific market and rule type.
     *
     * @param market The market to search for
     * @param ruleType The rule type to search for
     * @return List of active workflow rules for the specified market and rule type
     */
    @Query("SELECT r FROM WorkflowRule r WHERE r.status = 'ACTIVE' AND r.effectiveDate <= CURRENT_DATE AND (r.expiryDate IS NULL OR r.expiryDate >= CURRENT_DATE) AND r.ruleType = :ruleType AND (r.market = :market OR r.market = 'GLOBAL') ORDER BY r.priority DESC")
    List<WorkflowRule> findActiveRulesByMarketAndRuleType(@Param("market") String market, @Param("ruleType") String ruleType);

    /**
     * Finds all active locate approval workflow rules for a specific market.
     *
     * @param market The market to search for
     * @return List of active locate approval workflow rules for the specified market
     */
    @Query("SELECT r FROM WorkflowRule r WHERE r.status = 'ACTIVE' AND r.effectiveDate <= CURRENT_DATE AND (r.expiryDate IS NULL OR r.expiryDate >= CURRENT_DATE) AND r.ruleType = 'LOCATE_APPROVAL' AND (r.market = :market OR r.market = 'GLOBAL') ORDER BY r.priority DESC")
    List<WorkflowRule> findActiveLocateRulesByMarket(@Param("market") String market);

    /**
     * Finds all active short sell approval workflow rules for a specific market.
     *
     * @param market The market to search for
     * @return List of active short sell approval workflow rules for the specified market
     */
    @Query("SELECT r FROM WorkflowRule r WHERE r.status = 'ACTIVE' AND r.effectiveDate <= CURRENT_DATE AND (r.expiryDate IS NULL OR r.expiryDate >= CURRENT_DATE) AND r.ruleType = 'SHORT_SELL_APPROVAL' AND (r.market = :market OR r.market = 'GLOBAL') ORDER BY r.priority DESC")
    List<WorkflowRule> findActiveShortSellRulesByMarket(@Param("market") String market);

    /**
     * Finds all workflow rules that have expired but are not marked as expired.
     *
     * @return List of expired workflow rules
     */
    @Query("SELECT r FROM WorkflowRule r WHERE r.status != 'EXPIRED' AND r.expiryDate < CURRENT_DATE")
    List<WorkflowRule> findExpiredRules();

    /**
     * Updates the status of a workflow rule.
     *
     * @param ruleId The rule ID to update
     * @param status The new status
     * @return The number of rows affected
     */
    @Modifying
    @Query("UPDATE WorkflowRule r SET r.status = :status WHERE r.ruleId = :ruleId")
    int updateStatus(@Param("ruleId") String ruleId, @Param("status") String status);

    /**
     * Updates the status of all expired workflow rules to EXPIRED.
     *
     * @return The number of rows affected
     */
    @Modifying
    @Query("UPDATE WorkflowRule r SET r.status = 'EXPIRED' WHERE r.status != 'EXPIRED' AND r.expiryDate < CURRENT_DATE")
    int expireRules();

    /**
     * Counts the number of workflow rules with a specific status.
     *
     * @param status The status to count
     * @return The count of workflow rules with the specified status
     */
    long countByStatus(String status);

    /**
     * Counts the number of workflow rules with a specific rule type.
     *
     * @param ruleType The rule type to count
     * @return The count of workflow rules with the specified rule type
     */
    long countByRuleType(String ruleType);

    /**
     * Counts the number of workflow rules for a specific market.
     *
     * @param market The market to count
     * @return The count of workflow rules for the specified market
     */
    long countByMarket(String market);

    /**
     * Counts the number of active workflow rules.
     *
     * @return The count of active workflow rules
     */
    @Query("SELECT COUNT(r) FROM WorkflowRule r WHERE r.status = 'ACTIVE' AND r.effectiveDate <= CURRENT_DATE AND (r.expiryDate IS NULL OR r.expiryDate >= CURRENT_DATE)")
    long countActiveRules();
}