package com.ims.workflow.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.ims.common.model.BaseEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Entity class representing a workflow rule in the Inventory Management System.
 * Workflow rules define the conditions and actions for automated decision-making
 * in locate approval and short sell validation workflows. This model supports
 * rule versioning, market-specific customization, and priority-based execution.
 */
@Entity
@Table(name = "workflow_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class WorkflowRule extends BaseEntity {

    @NotBlank
    @Column(name = "rule_id", unique = true)
    private String ruleId;

    @NotBlank
    @Size(max = 100)
    private String name;

    @Size(max = 500)
    private String description;

    @NotBlank
    @Column(name = "rule_type")
    private String ruleType;

    private int priority;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @NotBlank
    private String status;

    private String market;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "approval_date")
    private LocalDate approvalDate;

    @Column(name = "condition_expression", length = 2000)
    private String conditionExpression;

    @Column(name = "action_expression", length = 2000)
    private String actionExpression;

    @ElementCollection
    @CollectionTable(name = "rule_conditions", joinColumns = @JoinColumn(name = "rule_id"))
    private List<RuleCondition> conditions = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "rule_actions", joinColumns = @JoinColumn(name = "rule_id"))
    private List<RuleAction> actions = new ArrayList<>();

    /**
     * Default constructor required by JPA.
     * Initializes collections and default values.
     */
    public WorkflowRule() {
        super();
        this.conditions = new ArrayList<>();
        this.actions = new ArrayList<>();
        this.status = "DRAFT";
        this.priority = 0;
    }

    /**
     * Determines if the rule is active based on status and dates.
     *
     * @return True if the rule is active, false otherwise
     */
    public boolean isActive() {
        return "ACTIVE".equals(status) &&
               (effectiveDate != null && !effectiveDate.isAfter(LocalDate.now())) &&
               (expiryDate == null || !expiryDate.isBefore(LocalDate.now()));
    }

    /**
     * Determines if the rule is applicable for a specific market.
     *
     * @param marketCode The market code to check
     * @return True if the rule is applicable for the market, false otherwise
     */
    public boolean isApplicableForMarket(String marketCode) {
        return "GLOBAL".equals(market) || market.equals(marketCode);
    }

    /**
     * Evaluates the rule conditions against a given context.
     *
     * @param context The context containing values for evaluation
     * @return True if the rule conditions are satisfied, false otherwise
     */
    public boolean evaluate(Map<String, Object> context) {
        if (!isActive()) {
            return false;
        }

        if (conditionExpression != null && !conditionExpression.isEmpty()) {
            // Evaluation of the expression would be implemented by a rule engine
            // This is a placeholder for the actual implementation
            return evaluateExpression(conditionExpression, context);
        }

        if (conditions != null && !conditions.isEmpty()) {
            // Evaluate each condition
            boolean result = true;
            for (RuleCondition condition : conditions) {
                boolean conditionResult = condition.evaluate(context);
                
                // Apply logical operator (default is AND)
                if ("OR".equals(condition.getLogicalOperator())) {
                    result = result || conditionResult;
                } else {
                    result = result && conditionResult;
                }
                
                // Short circuit evaluation
                if ("AND".equals(condition.getLogicalOperator()) && !result) {
                    return false;
                }
                if ("OR".equals(condition.getLogicalOperator()) && result) {
                    return true;
                }
            }
            return result;
        }

        // No conditions or expression means the rule is always applicable
        return true;
    }

    /**
     * Placeholder method for expression evaluation.
     * In a real implementation, this would use a rule engine or expression parser.
     */
    private boolean evaluateExpression(String expression, Map<String, Object> context) {
        // This would be replaced by actual expression evaluation logic
        return true;
    }

    /**
     * Executes the rule actions in a given context.
     *
     * @param context The context for action execution
     */
    public void executeActions(Map<String, Object> context) {
        if (!isActive()) {
            return;
        }

        if (actionExpression != null && !actionExpression.isEmpty()) {
            // Execution of the expression would be implemented by a rule engine
            // This is a placeholder for the actual implementation
            executeExpression(actionExpression, context);
        }

        if (actions != null && !actions.isEmpty()) {
            // Execute each action
            for (RuleAction action : actions) {
                action.execute(context);
            }
        }
    }

    /**
     * Placeholder method for expression execution.
     * In a real implementation, this would use a rule engine or expression parser.
     */
    private void executeExpression(String expression, Map<String, Object> context) {
        // This would be replaced by actual expression execution logic
    }

    /**
     * Adds a condition to the rule.
     *
     * @param condition The condition to add
     * @return This rule instance for method chaining
     */
    public WorkflowRule addCondition(RuleCondition condition) {
        if (conditions == null) {
            conditions = new ArrayList<>();
        }
        conditions.add(condition);
        condition.setRule(this);
        return this;
    }

    /**
     * Removes a condition from the rule.
     *
     * @param condition The condition to remove
     * @return This rule instance for method chaining
     */
    public WorkflowRule removeCondition(RuleCondition condition) {
        if (conditions != null) {
            conditions.remove(condition);
            condition.setRule(null);
        }
        return this;
    }

    /**
     * Adds an action to the rule.
     *
     * @param action The action to add
     * @return This rule instance for method chaining
     */
    public WorkflowRule addAction(RuleAction action) {
        if (actions == null) {
            actions = new ArrayList<>();
        }
        actions.add(action);
        action.setRule(this);
        return this;
    }

    /**
     * Removes an action from the rule.
     *
     * @param action The action to remove
     * @return This rule instance for method chaining
     */
    public WorkflowRule removeAction(RuleAction action) {
        if (actions != null) {
            actions.remove(action);
            action.setRule(null);
        }
        return this;
    }

    /**
     * Activates the rule.
     *
     * @param approvedBy The user who approved the rule
     * @return This rule instance for method chaining
     */
    public WorkflowRule activate(String approvedBy) {
        this.status = "ACTIVE";
        this.approvedBy = approvedBy;
        this.approvalDate = LocalDate.now();
        if (this.effectiveDate == null) {
            this.effectiveDate = LocalDate.now();
        }
        return this;
    }

    /**
     * Deactivates the rule.
     *
     * @return This rule instance for method chaining
     */
    public WorkflowRule deactivate() {
        this.status = "INACTIVE";
        return this;
    }

    /**
     * Expires the rule.
     *
     * @return This rule instance for method chaining
     */
    public WorkflowRule expire() {
        this.status = "EXPIRED";
        if (this.expiryDate == null) {
            this.expiryDate = LocalDate.now();
        }
        return this;
    }

    /**
     * Creates a clone of this rule for versioning.
     *
     * @return A new rule instance with copied properties
     */
    public WorkflowRule clone() {
        WorkflowRule clone = new WorkflowRule();
        clone.setRuleId(this.ruleId + "_v" + (this.getVersion() != null ? this.getVersion() + 1 : 1));
        clone.setName(this.name);
        clone.setDescription(this.description);
        clone.setRuleType(this.ruleType);
        clone.setPriority(this.priority);
        clone.setEffectiveDate(this.effectiveDate);
        clone.setExpiryDate(this.expiryDate);
        clone.setStatus("DRAFT");
        clone.setMarket(this.market);
        clone.setConditionExpression(this.conditionExpression);
        clone.setActionExpression(this.actionExpression);

        // Clone conditions
        if (this.conditions != null) {
            for (RuleCondition condition : this.conditions) {
                RuleCondition clonedCondition = new RuleCondition();
                clonedCondition.setConditionId(condition.getConditionId());
                clonedCondition.setAttribute(condition.getAttribute());
                clonedCondition.setOperator(condition.getOperator());
                clonedCondition.setValue(condition.getValue());
                clonedCondition.setLogicalOperator(condition.getLogicalOperator());
                clone.addCondition(clonedCondition);
            }
        }

        // Clone actions
        if (this.actions != null) {
            for (RuleAction action : this.actions) {
                RuleAction clonedAction = new RuleAction();
                clonedAction.setActionId(action.getActionId());
                clonedAction.setActionType(action.getActionType());
                clonedAction.setParameters(action.getParameters());
                clone.addAction(clonedAction);
            }
        }

        return clone;
    }

    /**
     * Determines if the rule is in draft status.
     *
     * @return True if the rule is in draft status, false otherwise
     */
    public boolean isDraft() {
        return "DRAFT".equals(status);
    }

    /**
     * Determines if the rule is in inactive status.
     *
     * @return True if the rule is in inactive status, false otherwise
     */
    public boolean isInactive() {
        return "INACTIVE".equals(status);
    }

    /**
     * Determines if the rule is in expired status.
     *
     * @return True if the rule is in expired status, false otherwise
     */
    public boolean isExpired() {
        return "EXPIRED".equals(status);
    }

    /**
     * Determines if the rule is for locate approval.
     *
     * @return True if the rule is for locate approval, false otherwise
     */
    public boolean isLocateRule() {
        return "LOCATE_APPROVAL".equals(ruleType);
    }

    /**
     * Determines if the rule is for short sell approval.
     *
     * @return True if the rule is for short sell approval, false otherwise
     */
    public boolean isShortSellRule() {
        return "SHORT_SELL_APPROVAL".equals(ruleType);
    }

    /**
     * Determines if the rule is a global rule applicable to all markets.
     *
     * @return True if the rule is a global rule, false otherwise
     */
    public boolean isGlobalRule() {
        return "GLOBAL".equals(market);
    }

    /**
     * JPA lifecycle callback that sets default values before entity is persisted.
     */
    @PrePersist
    public void prePersist() {
        super.prePersist();
        if (status == null) {
            status = "DRAFT";
        }
        if (priority == 0) {
            priority = 0;
        }
    }

    /**
     * Embedded class representing a condition in a workflow rule.
     * Conditions are evaluated to determine if a rule should be applied.
     */
    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @ToString
    public static class RuleCondition {

        @Column(name = "condition_id")
        private String conditionId;

        private String attribute;

        private String operator;

        private String value;

        @Column(name = "logical_operator")
        private String logicalOperator;

        @Transient
        @JsonIgnore
        private WorkflowRule rule;

        /**
         * Evaluates the condition against a given context.
         *
         * @param context The context containing values for evaluation
         * @return True if the condition is satisfied, false otherwise
         */
        public boolean evaluate(Map<String, Object> context) {
            if (attribute == null || operator == null) {
                return false;
            }

            Object contextValue = context.get(attribute);
            if (contextValue == null) {
                return "IS_NULL".equals(operator);
            }

            switch (operator) {
                case "EQUALS":
                    return value.equals(contextValue.toString());
                case "NOT_EQUALS":
                    return !value.equals(contextValue.toString());
                case "CONTAINS":
                    return contextValue.toString().contains(value);
                case "NOT_CONTAINS":
                    return !contextValue.toString().contains(value);
                case "STARTS_WITH":
                    return contextValue.toString().startsWith(value);
                case "ENDS_WITH":
                    return contextValue.toString().endsWith(value);
                case "GREATER_THAN":
                    if (contextValue instanceof Number && isNumeric(value)) {
                        return Double.parseDouble(contextValue.toString()) > Double.parseDouble(value);
                    }
                    return false;
                case "LESS_THAN":
                    if (contextValue instanceof Number && isNumeric(value)) {
                        return Double.parseDouble(contextValue.toString()) < Double.parseDouble(value);
                    }
                    return false;
                case "GREATER_THAN_OR_EQUAL":
                    if (contextValue instanceof Number && isNumeric(value)) {
                        return Double.parseDouble(contextValue.toString()) >= Double.parseDouble(value);
                    }
                    return false;
                case "LESS_THAN_OR_EQUAL":
                    if (contextValue instanceof Number && isNumeric(value)) {
                        return Double.parseDouble(contextValue.toString()) <= Double.parseDouble(value);
                    }
                    return false;
                case "IS_NULL":
                    return contextValue == null;
                case "IS_NOT_NULL":
                    return contextValue != null;
                default:
                    return false;
            }
        }

        private boolean isNumeric(String str) {
            try {
                Double.parseDouble(str);
                return true;
            } catch (NumberFormatException e) {
                return false;
            }
        }
    }

    /**
     * Embedded class representing an action in a workflow rule.
     * Actions are executed when a rule's conditions are satisfied.
     */
    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @ToString
    public static class RuleAction {

        @Column(name = "action_id")
        private String actionId;

        @Column(name = "action_type")
        private String actionType;

        @Column(length = 2000)
        private String parameters;

        @Transient
        @JsonIgnore
        private WorkflowRule rule;

        /**
         * Executes the action in a given context.
         *
         * @param context The context for action execution
         */
        public void execute(Map<String, Object> context) {
            if (actionType == null) {
                return;
            }

            switch (actionType) {
                case "SET_VALUE":
                    executeSetValue(context);
                    break;
                case "APPROVE":
                    executeApprove(context);
                    break;
                case "REJECT":
                    executeReject(context);
                    break;
                case "QUEUE_FOR_REVIEW":
                    executeQueueForReview(context);
                    break;
                case "NOTIFY":
                    executeNotify(context);
                    break;
                default:
                    // Unknown action type, do nothing
                    break;
            }
        }

        private void executeSetValue(Map<String, Object> context) {
            // Implementation would parse parameters and set values in the context
            // Example: parameters = "attribute=result,value=APPROVED"
        }

        private void executeApprove(Map<String, Object> context) {
            // Implementation would set approval status in the context
            context.put("status", "APPROVED");
        }

        private void executeReject(Map<String, Object> context) {
            // Implementation would set rejection status in the context
            context.put("status", "REJECTED");
            
            // If parameters include rejection reason, set it
            // Example: parameters = "reason=Insufficient inventory"
        }

        private void executeQueueForReview(Map<String, Object> context) {
            // Implementation would set status to pending review
            context.put("status", "PENDING_REVIEW");
            
            // If parameters include reviewer, set it
            // Example: parameters = "reviewer=operations"
        }

        private void executeNotify(Map<String, Object> context) {
            // Implementation would trigger notification
            // Example: parameters = "recipient=trader,template=locate_approved"
        }
    }
}