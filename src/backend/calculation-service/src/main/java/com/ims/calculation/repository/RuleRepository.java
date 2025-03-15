package com.ims.calculation.repository;

import com.ims.calculation.model.CalculationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for CalculationRule entities in the calculation service.
 * Provides methods for querying and managing calculation rules to support rule
 * customization, market-specific rules, and rule versioning.
 */
@Repository
public interface RuleRepository extends JpaRepository<CalculationRule, Long> {

    /**
     * Finds a rule by its name and market.
     *
     * @param name the rule name
     * @param market the market
     * @return the rule if found, or empty if not found
     */
    Optional<CalculationRule> findByNameAndMarket(String name, String market);
    
    /**
     * Finds all rules of a specific type.
     *
     * @param ruleType the rule type
     * @return list of rules of the specified type
     */
    List<CalculationRule> findByRuleType(String ruleType);
    
    /**
     * Finds all rules for a specific market.
     *
     * @param market the market
     * @return list of rules for the specified market
     */
    List<CalculationRule> findByMarket(String market);
    
    /**
     * Finds all rules of a specific type for a specific market.
     *
     * @param ruleType the rule type
     * @param market the market
     * @return list of rules of the specified type for the specified market
     */
    List<CalculationRule> findByRuleTypeAndMarket(String ruleType, String market);
    
    /**
     * Finds all active rules of a specific type for a specific market or global market.
     *
     * @param ruleType the rule type
     * @param market the market
     * @return list of active rules of the specified type for the specified market or global market
     */
    @Query("SELECT r FROM CalculationRule r WHERE r.ruleType = :ruleType AND (r.market = :market OR r.market = 'GLOBAL') AND r.status = 'ACTIVE' AND r.effectiveDate <= CURRENT_DATE AND (r.expiryDate IS NULL OR r.expiryDate > CURRENT_DATE) ORDER BY r.priority DESC")
    List<CalculationRule> findActiveRulesByRuleTypeAndMarket(@Param("ruleType") String ruleType, @Param("market") String market);
    
    /**
     * Finds all rules with a specific status.
     *
     * @param status the rule status
     * @return list of rules with the specified status
     */
    List<CalculationRule> findByStatus(String status);
    
    /**
     * Finds all rules with an effective date before the specified date.
     *
     * @param date the date to compare against
     * @return list of rules with an effective date before the specified date
     */
    List<CalculationRule> findByEffectiveDateBefore(LocalDate date);
    
    /**
     * Finds all rules with an expiry date after the specified date.
     *
     * @param date the date to compare against
     * @return list of rules with an expiry date after the specified date
     */
    List<CalculationRule> findByExpiryDateAfter(LocalDate date);
    
    /**
     * Finds all active rules (status is ACTIVE, effective date is in the past,
     * expiry date is in the future or null).
     *
     * @return list of active rules
     */
    @Query("SELECT r FROM CalculationRule r WHERE r.status = 'ACTIVE' AND r.effectiveDate <= CURRENT_DATE AND (r.expiryDate IS NULL OR r.expiryDate > CURRENT_DATE)")
    List<CalculationRule> findActiveRules();
    
    /**
     * Finds all expired rules (expiry date is in the past).
     *
     * @return list of expired rules
     */
    @Query("SELECT r FROM CalculationRule r WHERE r.expiryDate IS NOT NULL AND r.expiryDate <= CURRENT_DATE")
    List<CalculationRule> findExpiredRules();
    
    /**
     * Finds all future rules (effective date is in the future).
     *
     * @return list of future rules
     */
    @Query("SELECT r FROM CalculationRule r WHERE r.effectiveDate > CURRENT_DATE")
    List<CalculationRule> findFutureRules();
    
    /**
     * Updates the status of a rule.
     *
     * @param id the rule ID
     * @param status the new status
     * @return number of records updated
     */
    @Modifying
    @Query("UPDATE CalculationRule r SET r.status = :status WHERE r.id = :id")
    int updateStatus(@Param("id") Long id, @Param("status") String status);
    
    /**
     * Updates the effective date of a rule.
     *
     * @param id the rule ID
     * @param effectiveDate the new effective date
     * @return number of records updated
     */
    @Modifying
    @Query("UPDATE CalculationRule r SET r.effectiveDate = :effectiveDate WHERE r.id = :id")
    int updateEffectiveDate(@Param("id") Long id, @Param("effectiveDate") LocalDate effectiveDate);
    
    /**
     * Updates the expiry date of a rule.
     *
     * @param id the rule ID
     * @param expiryDate the new expiry date
     * @return number of records updated
     */
    @Modifying
    @Query("UPDATE CalculationRule r SET r.expiryDate = :expiryDate WHERE r.id = :id")
    int updateExpiryDate(@Param("id") Long id, @Param("expiryDate") LocalDate expiryDate);
    
    /**
     * Updates the priority of a rule.
     *
     * @param id the rule ID
     * @param priority the new priority
     * @return number of records updated
     */
    @Modifying
    @Query("UPDATE CalculationRule r SET r.priority = :priority WHERE r.id = :id")
    int updatePriority(@Param("id") Long id, @Param("priority") int priority);
    
    /**
     * Counts the number of rules of a specific type for a specific market.
     *
     * @param ruleType the rule type
     * @param market the market
     * @return number of rules of the specified type for the specified market
     */
    long countByRuleTypeAndMarket(String ruleType, String market);
    
    /**
     * Counts the number of active rules.
     *
     * @return number of active rules
     */
    @Query("SELECT COUNT(r) FROM CalculationRule r WHERE r.status = 'ACTIVE' AND r.effectiveDate <= CURRENT_DATE AND (r.expiryDate IS NULL OR r.expiryDate > CURRENT_DATE)")
    long countActiveRules();
}