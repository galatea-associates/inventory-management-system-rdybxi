package com.ims.calculation.service;

import com.ims.calculation.model.CalculationRule;
import com.ims.calculation.repository.RuleRepository;
import com.ims.common.exception.ValidationException;
import com.ims.common.exception.ServiceException;
import com.ims.common.util.DateUtil;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service class responsible for managing and executing calculation rules in the Inventory Management System.
 * Provides functionality to retrieve, evaluate, and apply business rules for inventory calculations,
 * supporting customizable rule definitions, market-specific regulations, and rule versioning.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class RuleEngineService {

    private static final String SERVICE_NAME = "RuleEngineService";
    private static final String CACHE_NAME_ACTIVE_RULES = "activeRules";
    private static final String CACHE_NAME_RULES_BY_TYPE_MARKET = "rulesByTypeAndMarket";
    
    private final RuleRepository ruleRepository;

    /**
     * Retrieves all active calculation rules.
     *
     * @return List of active calculation rules
     */
    @Cacheable(value = CACHE_NAME_ACTIVE_RULES)
    public List<CalculationRule> getActiveRules() {
        log.debug("Retrieving all active calculation rules");
        return ruleRepository.findActiveRules();
    }

    /**
     * Retrieves active calculation rules for a specific rule type and market.
     *
     * @param ruleType the rule type
     * @param market the market
     * @return List of active calculation rules for the specified type and market
     */
    @Cacheable(value = CACHE_NAME_RULES_BY_TYPE_MARKET, key = "#ruleType + '-' + #market")
    public List<CalculationRule> getActiveRulesByTypeAndMarket(String ruleType, String market) {
        log.debug("Retrieving active calculation rules for type {} and market {}", ruleType, market);
        
        if (ruleType == null || market == null) {
            throw new ValidationException("CalculationRule", "Rule type and market must not be null");
        }
        
        return ruleRepository.findActiveRulesByRuleTypeAndMarket(ruleType, market);
    }

    /**
     * Retrieves a calculation rule by its name and market.
     *
     * @param name the rule name
     * @param market the market
     * @return The rule if found, or empty if not found
     */
    public Optional<CalculationRule> getRuleByNameAndMarket(String name, String market) {
        log.debug("Retrieving calculation rule by name {} and market {}", name, market);
        
        if (name == null || market == null) {
            throw new ValidationException("CalculationRule", "Rule name and market must not be null");
        }
        
        return ruleRepository.findByNameAndMarket(name, market);
    }

    /**
     * Creates a new calculation rule.
     *
     * @param rule the rule to create
     * @return The created rule
     */
    @CacheEvict(value = {CACHE_NAME_ACTIVE_RULES, CACHE_NAME_RULES_BY_TYPE_MARKET}, allEntries = true)
    public CalculationRule createRule(CalculationRule rule) {
        log.debug("Creating new calculation rule: {}", rule);
        validateRule(rule);
        return ruleRepository.save(rule);
    }

    /**
     * Updates an existing calculation rule.
     *
     * @param rule the rule to update
     * @return The updated rule
     */
    @CacheEvict(value = {CACHE_NAME_ACTIVE_RULES, CACHE_NAME_RULES_BY_TYPE_MARKET}, allEntries = true)
    public CalculationRule updateRule(CalculationRule rule) {
        log.debug("Updating existing calculation rule: {}", rule);
        
        validateRule(rule);
        
        if (rule.getId() == null) {
            throw new ValidationException("CalculationRule", "Rule ID must not be null for updates");
        }
        
        return ruleRepository.save(rule);
    }

    /**
     * Creates multiple calculation rules.
     *
     * @param rules the rules to create
     * @return The created rules
     */
    @CacheEvict(value = {CACHE_NAME_ACTIVE_RULES, CACHE_NAME_RULES_BY_TYPE_MARKET}, allEntries = true)
    public List<CalculationRule> createRules(List<CalculationRule> rules) {
        log.debug("Creating {} calculation rules", rules != null ? rules.size() : 0);
        
        if (rules == null || rules.isEmpty()) {
            throw new ValidationException("CalculationRule", "Rules list must not be null or empty");
        }
        
        rules.forEach(this::validateRule);
        
        return ruleRepository.saveAll(rules);
    }

    /**
     * Validates a calculation rule before saving.
     *
     * @param rule the rule to validate
     */
    private void validateRule(CalculationRule rule) {
        if (rule == null) {
            throw new ValidationException("CalculationRule", "Rule must not be null");
        }
        
        ValidationException validationEx = new ValidationException("CalculationRule", "Rule validation failed");
        
        if (rule.getName() == null || rule.getName().trim().isEmpty()) {
            validationEx.addFieldError("name", "Rule name must not be null or empty");
        }
        
        if (rule.getRuleType() == null || rule.getRuleType().trim().isEmpty()) {
            validationEx.addFieldError("ruleType", "Rule type must not be null or empty");
        }
        
        if (rule.getMarket() == null || rule.getMarket().trim().isEmpty()) {
            validationEx.addFieldError("market", "Rule market must not be null or empty");
        }
        
        if (rule.getEffectiveDate() == null) {
            validationEx.addFieldError("effectiveDate", "Rule effective date must not be null");
        }
        
        if (rule.getConditions() == null || rule.getConditions().isEmpty()) {
            validationEx.addFieldError("conditions", "Rule must have at least one condition");
        }
        
        if (validationEx.hasFieldErrors()) {
            throw validationEx;
        }
    }

    /**
     * Evaluates a set of rules against a context to determine if an item should be included.
     *
     * @param rules the rules to evaluate
     * @param context the context containing attributes to evaluate against
     * @return True if the item should be included based on the rules, false otherwise
     */
    public boolean evaluateRules(List<CalculationRule> rules, Map<String, Object> context) {
        log.debug("Evaluating {} rules against context", rules != null ? rules.size() : 0);
        
        if (rules == null || rules.isEmpty()) {
            return true; // No rules, include by default
        }
        
        // Filter for active rules only
        List<CalculationRule> activeRules = rules.stream()
                .filter(CalculationRule::isActive)
                .collect(Collectors.toList());
        
        if (activeRules.isEmpty()) {
            return true; // No active rules, include by default
        }
        
        // Check inclusion rules
        boolean shouldInclude = shouldInclude(activeRules, context);
        
        // Check exclusion rules
        boolean shouldExclude = shouldExclude(activeRules, context);
        
        // Include if any inclusion rule applies and no exclusion rule applies
        return shouldInclude && !shouldExclude;
    }

    /**
     * Evaluates rules of a specific type and market against a context.
     *
     * @param ruleType the rule type
     * @param market the market
     * @param context the context containing attributes to evaluate against
     * @return True if the item should be included based on the rules, false otherwise
     */
    public boolean evaluateRulesByTypeAndMarket(String ruleType, String market, Map<String, Object> context) {
        log.debug("Evaluating rules of type {} for market {} against context", ruleType, market);
        
        // Apply market-specific adjustments to the context
        Map<String, Object> adjustedContext = applyMarketSpecificRuleAdjustments(market, context);
        
        // Get active rules for the specified type and market
        List<CalculationRule> rules = getActiveRulesByTypeAndMarket(ruleType, market);
        
        // Evaluate the rules against the adjusted context
        return evaluateRules(rules, adjustedContext);
    }

    /**
     * Determines if an item should be included based on inclusion rules.
     *
     * @param rules the rules to evaluate
     * @param context the context containing attributes to evaluate against
     * @return True if the item should be included, false otherwise
     */
    private boolean shouldInclude(List<CalculationRule> rules, Map<String, Object> context) {
        List<CalculationRule> inclusionRules = rules.stream()
                .filter(r -> "INCLUDE".equals(r.getRuleType()))
                .collect(Collectors.toList());
        
        if (inclusionRules.isEmpty()) {
            return true; // No inclusion rules, include by default
        }
        
        // Check if any inclusion rule applies
        return inclusionRules.stream().anyMatch(rule -> rule.shouldInclude(context));
    }

    /**
     * Determines if an item should be excluded based on exclusion rules.
     *
     * @param rules the rules to evaluate
     * @param context the context containing attributes to evaluate against
     * @return True if the item should be excluded, false otherwise
     */
    private boolean shouldExclude(List<CalculationRule> rules, Map<String, Object> context) {
        List<CalculationRule> exclusionRules = rules.stream()
                .filter(r -> "EXCLUDE".equals(r.getRuleType()))
                .collect(Collectors.toList());
        
        if (exclusionRules.isEmpty()) {
            return false; // No exclusion rules, don't exclude by default
        }
        
        // Check if any exclusion rule applies
        return exclusionRules.stream().anyMatch(rule -> rule.shouldExclude(context));
    }

    /**
     * Clears the rule cache to force fresh rule loading.
     */
    @CacheEvict(value = {CACHE_NAME_ACTIVE_RULES, CACHE_NAME_RULES_BY_TYPE_MARKET}, allEntries = true)
    public void clearRuleCache() {
        log.debug("Clearing rule cache");
        // Spring will automatically clear the caches based on the annotation
    }

    /**
     * Applies market-specific adjustments to rule evaluation.
     *
     * @param market the market
     * @param context the context to adjust
     * @return The context with market-specific adjustments applied
     */
    public Map<String, Object> applyMarketSpecificRuleAdjustments(String market, Map<String, Object> context) {
        log.debug("Applying market-specific rule adjustments for market {}", market);
        
        if (context == null) {
            context = new HashMap<>();
        }
        
        Map<String, Object> adjustedContext = new HashMap<>(context);
        
        // Apply Taiwan-specific adjustments
        if ("TW".equals(market)) {
            adjustedContext = applyTaiwanSpecificAdjustments(adjustedContext);
        }
        
        // Apply Japan-specific adjustments
        if ("JP".equals(market)) {
            adjustedContext = applyJapanSpecificAdjustments(adjustedContext);
        }
        
        return adjustedContext;
    }

    /**
     * Applies Taiwan-specific adjustments to rule evaluation.
     *
     * @param context the context to adjust
     * @return The context with Taiwan-specific adjustments applied
     */
    private Map<String, Object> applyTaiwanSpecificAdjustments(Map<String, Object> context) {
        // Taiwan regulation: Borrowed shares cannot be re-lent
        if (Boolean.TRUE.equals(context.get("isBorrowed"))) {
            context.put("canBeLent", false);
        }
        
        return context;
    }

    /**
     * Applies Japan-specific adjustments to rule evaluation.
     *
     * @param context the context to adjust
     * @return The context with Japan-specific adjustments applied
     */
    private Map<String, Object> applyJapanSpecificAdjustments(Map<String, Object> context) {
        // Japan-specific rule: Apply settlement cut-off rules for SLAB activity
        LocalDate currentDate = DateUtil.getCurrentDate();
        boolean isBeforeCutoff = Boolean.TRUE.equals(context.get("isBeforeJapanCutoff"));
        
        if (!isBeforeCutoff && "SLAB".equals(context.get("activityType"))) {
            // Apply +1 day for SLAB activity after cut-off time
            context.put("effectiveSettlementDay", ((Number)context.getOrDefault("effectiveSettlementDay", 0)).intValue() + 1);
        }
        
        // Japan-specific rule: Handle quanto settlements with T+2 settlement
        if (Boolean.TRUE.equals(context.get("isQuanto")) && context.containsKey("settlementDate")) {
            // Adjust settlement date for quanto securities (T+1 treat as T+2)
            if (((Number)context.getOrDefault("settlementDays", 0)).intValue() == 1) {
                context.put("settlementDays", 2);
            }
        }
        
        return context;
    }
}