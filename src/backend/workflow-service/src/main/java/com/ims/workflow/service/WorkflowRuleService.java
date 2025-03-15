package com.ims.workflow.service;

import com.ims.workflow.model.WorkflowRule;
import com.ims.workflow.repository.WorkflowRuleRepository;
import com.ims.workflow.exception.WorkflowException;
import com.ims.workflow.publisher.WorkflowEventPublisher;
import com.ims.common.event.WorkflowEvent;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.UUID;
import java.util.Comparator;
import java.util.stream.Collectors;

/**
 * Service responsible for managing workflow rules in the system. Provides functionality
 * for creating, retrieving, updating, and evaluating rules used in locate approval
 * and short sell validation workflows.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WorkflowRuleService {

    private final WorkflowRuleRepository ruleRepository;
    private final WorkflowEventPublisher eventPublisher;

    /**
     * Creates a new workflow rule in the system.
     *
     * @param rule The workflow rule to create
     * @return The created workflow rule
     */
    @Transactional
    public WorkflowRule createRule(WorkflowRule rule) {
        if (rule == null) {
            throw new IllegalArgumentException("Rule cannot be null");
        }
        
        // Generate ID if not provided
        if (rule.getRuleId() == null || rule.getRuleId().isEmpty()) {
            rule.setRuleId(UUID.randomUUID().toString());
        }
        
        // Set default status if not set
        if (rule.getStatus() == null || rule.getStatus().isEmpty()) {
            rule.setStatus("DRAFT");
        }
        
        // Set default priority if not set
        if (rule.getPriority() == 0) {
            rule.setPriority(100); // Default priority
        }
        
        WorkflowRule savedRule = ruleRepository.save(rule);
        publishRuleEvent(savedRule, "RULE_CREATED");
        log.info("Created workflow rule: {}", savedRule.getRuleId());
        return savedRule;
    }

    /**
     * Retrieves a workflow rule by its ID.
     *
     * @param ruleId The rule ID to find
     * @return The workflow rule if found, or empty if not found
     */
    @Transactional(readOnly = true)
    public Optional<WorkflowRule> getRule(String ruleId) {
        if (ruleId == null || ruleId.isEmpty()) {
            throw new IllegalArgumentException("Rule ID cannot be null or empty");
        }
        return ruleRepository.findByRuleId(ruleId);
    }

    /**
     * Retrieves a workflow rule by its name.
     *
     * @param name The rule name to find
     * @return The workflow rule if found, or empty if not found
     */
    @Transactional(readOnly = true)
    public Optional<WorkflowRule> getRuleByName(String name) {
        if (name == null || name.isEmpty()) {
            throw new IllegalArgumentException("Rule name cannot be null or empty");
        }
        return ruleRepository.findByName(name);
    }

    /**
     * Retrieves all workflow rules in the system.
     *
     * @return List of all workflow rules
     */
    @Transactional(readOnly = true)
    public List<WorkflowRule> getAllRules() {
        return ruleRepository.findAll();
    }

    /**
     * Retrieves all workflow rules with a specific status.
     *
     * @param status The status to filter by
     * @return List of workflow rules with the specified status
     */
    @Transactional(readOnly = true)
    public List<WorkflowRule> getRulesByStatus(String status) {
        if (status == null || status.isEmpty()) {
            throw new IllegalArgumentException("Status cannot be null or empty");
        }
        return ruleRepository.findByStatus(status);
    }

    /**
     * Retrieves all workflow rules with a specific rule type.
     *
     * @param ruleType The rule type to filter by
     * @return List of workflow rules with the specified rule type
     */
    @Transactional(readOnly = true)
    public List<WorkflowRule> getRulesByType(String ruleType) {
        if (ruleType == null || ruleType.isEmpty()) {
            throw new IllegalArgumentException("Rule type cannot be null or empty");
        }
        return ruleRepository.findByRuleType(ruleType);
    }

    /**
     * Retrieves all workflow rules for a specific market.
     *
     * @param market The market to filter by
     * @return List of workflow rules for the specified market
     */
    @Transactional(readOnly = true)
    public List<WorkflowRule> getRulesByMarket(String market) {
        if (market == null || market.isEmpty()) {
            throw new IllegalArgumentException("Market cannot be null or empty");
        }
        return ruleRepository.findByMarket(market);
    }

    /**
     * Retrieves all workflow rules with a specific rule type and market.
     *
     * @param ruleType The rule type to filter by
     * @param market The market to filter by
     * @return List of workflow rules with the specified rule type and market
     */
    @Transactional(readOnly = true)
    public List<WorkflowRule> getRulesByTypeAndMarket(String ruleType, String market) {
        if (ruleType == null || ruleType.isEmpty()) {
            throw new IllegalArgumentException("Rule type cannot be null or empty");
        }
        if (market == null || market.isEmpty()) {
            throw new IllegalArgumentException("Market cannot be null or empty");
        }
        return ruleRepository.findByRuleTypeAndMarket(ruleType, market);
    }

    /**
     * Retrieves all active workflow rules.
     *
     * @return List of active workflow rules
     */
    @Transactional(readOnly = true)
    public List<WorkflowRule> getActiveRules() {
        return ruleRepository.findActiveRules();
    }

    /**
     * Retrieves all active workflow rules for a specific market.
     *
     * @param market The market to filter by
     * @return List of active workflow rules for the specified market
     */
    @Transactional(readOnly = true)
    public List<WorkflowRule> getActiveRulesByMarket(String market) {
        if (market == null || market.isEmpty()) {
            throw new IllegalArgumentException("Market cannot be null or empty");
        }
        return ruleRepository.findActiveRulesByMarket(market);
    }

    /**
     * Retrieves all active workflow rules with a specific rule type.
     *
     * @param ruleType The rule type to filter by
     * @return List of active workflow rules with the specified rule type
     */
    @Transactional(readOnly = true)
    public List<WorkflowRule> getActiveRulesByType(String ruleType) {
        if (ruleType == null || ruleType.isEmpty()) {
            throw new IllegalArgumentException("Rule type cannot be null or empty");
        }
        return ruleRepository.findActiveRulesByRuleType(ruleType);
    }

    /**
     * Retrieves all active workflow rules with a specific rule type and market.
     *
     * @param ruleType The rule type to filter by
     * @param market The market to filter by
     * @return List of active workflow rules with the specified rule type and market
     */
    @Transactional(readOnly = true)
    public List<WorkflowRule> getActiveRulesByTypeAndMarket(String ruleType, String market) {
        if (ruleType == null || ruleType.isEmpty()) {
            throw new IllegalArgumentException("Rule type cannot be null or empty");
        }
        if (market == null || market.isEmpty()) {
            throw new IllegalArgumentException("Market cannot be null or empty");
        }
        return ruleRepository.findActiveRulesByMarketAndRuleType(market, ruleType)
            .stream()
            .sorted(Comparator.comparing(WorkflowRule::getPriority).reversed())
            .collect(Collectors.toList());
    }

    /**
     * Retrieves all active locate approval workflow rules for a specific market.
     *
     * @param market The market to filter by
     * @return List of active locate approval workflow rules for the specified market
     */
    @Transactional(readOnly = true)
    public List<WorkflowRule> getActiveLocateRules(String market) {
        if (market == null || market.isEmpty()) {
            throw new IllegalArgumentException("Market cannot be null or empty");
        }
        return ruleRepository.findActiveLocateRulesByMarket(market)
            .stream()
            .sorted(Comparator.comparing(WorkflowRule::getPriority).reversed())
            .collect(Collectors.toList());
    }

    /**
     * Retrieves all active short sell approval workflow rules for a specific market.
     *
     * @param market The market to filter by
     * @return List of active short sell approval workflow rules for the specified market
     */
    @Transactional(readOnly = true)
    public List<WorkflowRule> getActiveShortSellRules(String market) {
        if (market == null || market.isEmpty()) {
            throw new IllegalArgumentException("Market cannot be null or empty");
        }
        return ruleRepository.findActiveShortSellRulesByMarket(market)
            .stream()
            .sorted(Comparator.comparing(WorkflowRule::getPriority).reversed())
            .collect(Collectors.toList());
    }

    /**
     * Updates an existing workflow rule.
     *
     * @param rule The workflow rule to update
     * @return The updated workflow rule
     */
    @Transactional
    public WorkflowRule updateRule(WorkflowRule rule) {
        if (rule == null || rule.getRuleId() == null || rule.getRuleId().isEmpty()) {
            throw new IllegalArgumentException("Rule cannot be null and must have a valid ID");
        }
        
        // Check if rule exists
        Optional<WorkflowRule> existingRule = ruleRepository.findByRuleId(rule.getRuleId());
        if (!existingRule.isPresent()) {
            throw WorkflowException.locateWorkflowError("RULE_UPDATE", "Rule not found: " + rule.getRuleId());
        }
        
        WorkflowRule updatedRule = ruleRepository.save(rule);
        publishRuleEvent(updatedRule, "RULE_UPDATED");
        log.info("Updated workflow rule: {}", updatedRule.getRuleId());
        return updatedRule;
    }

    /**
     * Activates a workflow rule.
     *
     * @param ruleId The rule ID to activate
     * @param approvedBy The user who approved the rule
     * @return The activated workflow rule
     */
    @Transactional
    public WorkflowRule activateRule(String ruleId, String approvedBy) {
        if (ruleId == null || ruleId.isEmpty()) {
            throw new IllegalArgumentException("Rule ID cannot be null or empty");
        }
        if (approvedBy == null || approvedBy.isEmpty()) {
            throw new IllegalArgumentException("Approved by cannot be null or empty");
        }
        
        Optional<WorkflowRule> ruleOpt = ruleRepository.findByRuleId(ruleId);
        if (!ruleOpt.isPresent()) {
            throw WorkflowException.locateWorkflowError("RULE_ACTIVATION", "Rule not found: " + ruleId);
        }
        
        WorkflowRule rule = ruleOpt.get();
        rule.activate(approvedBy);
        
        WorkflowRule activatedRule = ruleRepository.save(rule);
        publishRuleEvent(activatedRule, "RULE_ACTIVATED");
        log.info("Activated workflow rule: {}", activatedRule.getRuleId());
        return activatedRule;
    }

    /**
     * Deactivates a workflow rule.
     *
     * @param ruleId The rule ID to deactivate
     * @return The deactivated workflow rule
     */
    @Transactional
    public WorkflowRule deactivateRule(String ruleId) {
        if (ruleId == null || ruleId.isEmpty()) {
            throw new IllegalArgumentException("Rule ID cannot be null or empty");
        }
        
        Optional<WorkflowRule> ruleOpt = ruleRepository.findByRuleId(ruleId);
        if (!ruleOpt.isPresent()) {
            throw WorkflowException.locateWorkflowError("RULE_DEACTIVATION", "Rule not found: " + ruleId);
        }
        
        WorkflowRule rule = ruleOpt.get();
        rule.deactivate();
        
        WorkflowRule deactivatedRule = ruleRepository.save(rule);
        publishRuleEvent(deactivatedRule, "RULE_DEACTIVATED");
        log.info("Deactivated workflow rule: {}", deactivatedRule.getRuleId());
        return deactivatedRule;
    }

    /**
     * Expires a workflow rule.
     *
     * @param ruleId The rule ID to expire
     * @return The expired workflow rule
     */
    @Transactional
    public WorkflowRule expireRule(String ruleId) {
        if (ruleId == null || ruleId.isEmpty()) {
            throw new IllegalArgumentException("Rule ID cannot be null or empty");
        }
        
        Optional<WorkflowRule> ruleOpt = ruleRepository.findByRuleId(ruleId);
        if (!ruleOpt.isPresent()) {
            throw WorkflowException.locateWorkflowError("RULE_EXPIRATION", "Rule not found: " + ruleId);
        }
        
        WorkflowRule rule = ruleOpt.get();
        rule.expire();
        
        WorkflowRule expiredRule = ruleRepository.save(rule);
        publishRuleEvent(expiredRule, "RULE_EXPIRED");
        log.info("Expired workflow rule: {}", expiredRule.getRuleId());
        return expiredRule;
    }

    /**
     * Deletes a workflow rule.
     *
     * @param ruleId The rule ID to delete
     */
    @Transactional
    public void deleteRule(String ruleId) {
        if (ruleId == null || ruleId.isEmpty()) {
            throw new IllegalArgumentException("Rule ID cannot be null or empty");
        }
        
        Optional<WorkflowRule> ruleOpt = ruleRepository.findByRuleId(ruleId);
        if (!ruleOpt.isPresent()) {
            throw WorkflowException.locateWorkflowError("RULE_DELETION", "Rule not found: " + ruleId);
        }
        
        WorkflowRule rule = ruleOpt.get();
        
        // Cannot delete active rules
        if (rule.isActive()) {
            throw WorkflowException.locateWorkflowError("RULE_DELETION", "Cannot delete active rule: " + ruleId);
        }
        
        ruleRepository.delete(rule);
        publishRuleEvent(rule, "RULE_DELETED");
        log.info("Deleted workflow rule: {}", ruleId);
    }

    /**
     * Creates a clone of an existing workflow rule.
     *
     * @param ruleId The rule ID to clone
     * @return The cloned workflow rule
     */
    @Transactional
    public WorkflowRule cloneRule(String ruleId) {
        if (ruleId == null || ruleId.isEmpty()) {
            throw new IllegalArgumentException("Rule ID cannot be null or empty");
        }
        
        Optional<WorkflowRule> ruleOpt = ruleRepository.findByRuleId(ruleId);
        if (!ruleOpt.isPresent()) {
            throw WorkflowException.locateWorkflowError("RULE_CLONING", "Rule not found: " + ruleId);
        }
        
        WorkflowRule sourceRule = ruleOpt.get();
        WorkflowRule clonedRule = sourceRule.clone();
        
        // Generate new ID and update name to indicate it's a copy
        clonedRule.setRuleId(UUID.randomUUID().toString());
        clonedRule.setName(sourceRule.getName() + " (Copy)");
        
        WorkflowRule savedRule = ruleRepository.save(clonedRule);
        publishRuleEvent(savedRule, "RULE_CREATED");
        log.info("Cloned workflow rule: {} from {}", savedRule.getRuleId(), ruleId);
        return savedRule;
    }

    /**
     * Processes all expired workflow rules.
     * Scheduled to run daily at midnight.
     *
     * @return The number of rules expired
     */
    @Transactional
    @Scheduled(cron = "0 0 0 * * ?")
    public int processExpiredRules() {
        List<WorkflowRule> expiredRules = ruleRepository.findExpiredRules();
        
        for (WorkflowRule rule : expiredRules) {
            rule.expire();
            ruleRepository.save(rule);
            publishRuleEvent(rule, "RULE_EXPIRED");
        }
        
        log.info("Processed {} expired workflow rules", expiredRules.size());
        return expiredRules.size();
    }

    /**
     * Processes a list of rules against a context to determine an outcome.
     *
     * @param rules The rules to process
     * @param context The context containing values for evaluation
     * @return The updated context after rule processing
     */
    public Map<String, Object> processRules(List<WorkflowRule> rules, Map<String, Object> context) {
        if (rules == null || context == null) {
            throw new IllegalArgumentException("Rules and context cannot be null");
        }
        
        // If no rules, return original context
        if (rules.isEmpty()) {
            return context;
        }
        
        // Sort rules by priority (highest first)
        List<WorkflowRule> sortedRules = rules.stream()
            .sorted(Comparator.comparing(WorkflowRule::getPriority).reversed())
            .collect(Collectors.toList());
        
        // Create copy of context for result
        Map<String, Object> resultContext = new HashMap<>(context);
        
        // Process each rule in order of priority
        for (WorkflowRule rule : sortedRules) {
            // Skip inactive rules or rules not applicable for this market
            if (!rule.isActive()) {
                continue;
            }
            
            // Check if rule applies to the market in context
            String marketInContext = (String) context.get("market");
            if (marketInContext != null && !rule.isApplicableForMarket(marketInContext)) {
                continue;
            }
            
            // Evaluate rule conditions
            if (rule.evaluate(resultContext)) {
                // Execute rule actions
                rule.executeActions(resultContext);
                
                // If rule is marked as terminal, break the loop
                boolean isTerminal = Boolean.TRUE.equals(resultContext.get("terminal"));
                if (isTerminal) {
                    break;
                }
            }
        }
        
        return resultContext;
    }

    /**
     * Publishes a workflow event for a rule operation.
     *
     * @param rule The rule that was operated on
     * @param eventType The type of event
     */
    private void publishRuleEvent(WorkflowRule rule, String eventType) {
        WorkflowEvent event = WorkflowEvent.builder()
            .eventType(eventType)
            .source("workflow-rule-service")
            .workflowType("RULE_MANAGEMENT")
            .workflowId(rule.getRuleId())
            .ruleId(rule.getRuleId())
            .ruleName(rule.getName())
            .ruleType(rule.getRuleType())
            .market(rule.getMarket())
            .status(rule.getStatus())
            .actionTimestamp(LocalDate.now().atStartOfDay())
            .build();
        
        eventPublisher.publishWorkflowEvent(event);
    }

    /**
     * Validates a workflow rule for correctness.
     *
     * @param rule The rule to validate
     * @return True if the rule is valid, false otherwise
     */
    public boolean validateRule(WorkflowRule rule) {
        if (rule == null) {
            return false;
        }
        
        // Name is required
        if (rule.getName() == null || rule.getName().isEmpty()) {
            return false;
        }
        
        // Rule type is required
        if (rule.getRuleType() == null || rule.getRuleType().isEmpty()) {
            return false;
        }
        
        // Market is required
        if (rule.getMarket() == null || rule.getMarket().isEmpty()) {
            return false;
        }
        
        // Must have either conditions or condition expression
        boolean hasConditions = rule.getConditions() != null && !rule.getConditions().isEmpty();
        boolean hasConditionExpression = rule.getConditionExpression() != null && !rule.getConditionExpression().isEmpty();
        if (!hasConditions && !hasConditionExpression) {
            return false;
        }
        
        // Must have either actions or action expression
        boolean hasActions = rule.getActions() != null && !rule.getActions().isEmpty();
        boolean hasActionExpression = rule.getActionExpression() != null && !rule.getActionExpression().isEmpty();
        if (!hasActions && !hasActionExpression) {
            return false;
        }
        
        return true;
    }
}