package com.ims.calculation.model;

import com.ims.common.model.BaseEntity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Embeddable;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.ToString;

import java.time.LocalDate;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.time.LocalDateTime;

/**
 * Entity class representing calculation rules in the Inventory Management System.
 * These rules define how inventory calculations should be performed, including
 * inclusion/exclusion criteria, market-specific regulations, and customizable parameters.
 * Rules are versioned and can be activated/deactivated to support changing regulatory
 * requirements across different markets.
 */
@Entity
@Table(name = "calculation_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class CalculationRule extends BaseEntity {

    /**
     * Name of the calculation rule
     */
    @Column(name = "name", nullable = false)
    private String name;
    
    /**
     * Description of the rule's purpose and behavior
     */
    @Column(name = "description", length = 2000)
    private String description;
    
    /**
     * Type of rule (e.g., FOR_LOAN, FOR_PLEDGE, LOCATE_AVAILABILITY)
     */
    @Column(name = "rule_type", nullable = false)
    private String ruleType;
    
    /**
     * Market to which this rule applies (e.g., GLOBAL, US, JAPAN, TAIWAN)
     */
    @Column(name = "market", nullable = false)
    private String market;
    
    /**
     * Priority of the rule when multiple rules apply (lower number = higher priority)
     */
    @Column(name = "priority")
    private int priority;
    
    /**
     * Date from which this rule becomes effective
     */
    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;
    
    /**
     * Date on which this rule expires (null if no expiry)
     */
    @Column(name = "expiry_date")
    private LocalDate expiryDate;
    
    /**
     * Status of the rule (e.g., DRAFT, ACTIVE, INACTIVE, ARCHIVED)
     */
    @Column(name = "status", nullable = false)
    private String status;
    
    /**
     * Collection of conditions that determine when this rule applies
     */
    @ElementCollection
    @CollectionTable(
        name = "rule_conditions",
        joinColumns = @JoinColumn(name = "rule_id")
    )
    @Builder.Default
    private List<RuleCondition> conditions = new ArrayList<>();
    
    /**
     * Collection of actions to be executed when the rule conditions are met
     */
    @ElementCollection
    @CollectionTable(
        name = "rule_actions",
        joinColumns = @JoinColumn(name = "rule_id")
    )
    @Builder.Default
    private List<RuleAction> actions = new ArrayList<>();
    
    /**
     * Custom parameters for this rule
     */
    @ElementCollection
    @CollectionTable(
        name = "rule_parameters",
        joinColumns = @JoinColumn(name = "rule_id")
    )
    @MapKeyColumn(name = "param_key")
    @Column(name = "param_value")
    @Builder.Default
    private Map<String, String> parameters = new HashMap<>();
    
    /**
     * Determines if the rule is currently active based on status and dates.
     *
     * @return true if the rule is active, false otherwise
     */
    public boolean isActive() {
        LocalDate now = LocalDate.now();
        return "ACTIVE".equals(status) && 
               (effectiveDate == null || !now.isBefore(effectiveDate)) &&
               (expiryDate == null || now.isBefore(expiryDate));
    }
    
    /**
     * Determines if the rule is applicable for a specific market.
     *
     * @param targetMarket the market to check
     * @return true if the rule is applicable for the market, false otherwise
     */
    public boolean isApplicableForMarket(String targetMarket) {
        return "GLOBAL".equals(market) || market.equals(targetMarket);
    }
    
    /**
     * Determines if an item should be included based on rule conditions.
     *
     * @param context the context containing attributes to evaluate against conditions
     * @return true if the item should be included, false otherwise
     */
    public boolean shouldInclude(Map<String, Object> context) {
        if (conditions == null || conditions.isEmpty()) {
            return "INCLUDE".equals(ruleType);
        }
        
        boolean conditionsMet = evaluateConditions(context);
        return conditionsMet && "INCLUDE".equals(ruleType);
    }
    
    /**
     * Determines if an item should be excluded based on rule conditions.
     *
     * @param context the context containing attributes to evaluate against conditions
     * @return true if the item should be excluded, false otherwise
     */
    public boolean shouldExclude(Map<String, Object> context) {
        if (conditions == null || conditions.isEmpty()) {
            return "EXCLUDE".equals(ruleType);
        }
        
        boolean conditionsMet = evaluateConditions(context);
        return conditionsMet && "EXCLUDE".equals(ruleType);
    }
    
    /**
     * Evaluates all conditions of the rule against a context.
     *
     * @param context the context containing attributes to evaluate
     * @return true if all conditions are met, false otherwise
     */
    private boolean evaluateConditions(Map<String, Object> context) {
        if (conditions == null || conditions.isEmpty()) {
            return true;
        }
        
        boolean result = true;
        String lastLogicalOperator = null;
        
        for (RuleCondition condition : conditions) {
            if (lastLogicalOperator == null) {
                result = condition.evaluate(context);
            } else if ("AND".equals(lastLogicalOperator)) {
                result = result && condition.evaluate(context);
            } else if ("OR".equals(lastLogicalOperator)) {
                result = result || condition.evaluate(context);
            }
            
            lastLogicalOperator = condition.getLogicalOperator();
        }
        
        return result;
    }
    
    /**
     * Gets a parameter value by key.
     *
     * @param key the parameter key
     * @return the parameter value, or null if not found
     */
    public String getParameter(String key) {
        return parameters != null ? parameters.get(key) : null;
    }
    
    /**
     * Adds a condition to the rule.
     *
     * @param condition the condition to add
     */
    public void addCondition(RuleCondition condition) {
        if (conditions == null) {
            conditions = new ArrayList<>();
        }
        conditions.add(condition);
    }
    
    /**
     * Adds an action to the rule.
     *
     * @param action the action to add
     */
    public void addAction(RuleAction action) {
        if (actions == null) {
            actions = new ArrayList<>();
        }
        actions.add(action);
    }
    
    /**
     * Adds a parameter to the rule.
     *
     * @param key the parameter key
     * @param value the parameter value
     */
    public void addParameter(String key, String value) {
        if (parameters == null) {
            parameters = new HashMap<>();
        }
        parameters.put(key, value);
    }
    
    /**
     * Creates a deep copy of the rule.
     *
     * @return a new instance with the same data
     */
    public CalculationRule clone() {
        CalculationRule clone = new CalculationRule();
        clone.setName(this.name);
        clone.setDescription(this.description);
        clone.setRuleType(this.ruleType);
        clone.setMarket(this.market);
        clone.setPriority(this.priority);
        clone.setEffectiveDate(this.effectiveDate);
        clone.setExpiryDate(this.expiryDate);
        clone.setStatus(this.status);
        
        // Deep copy collections
        if (this.conditions != null) {
            for (RuleCondition condition : this.conditions) {
                RuleCondition conditionClone = RuleCondition.builder()
                    .attribute(condition.getAttribute())
                    .operator(condition.getOperator())
                    .value(condition.getValue())
                    .logicalOperator(condition.getLogicalOperator())
                    .build();
                clone.addCondition(conditionClone);
            }
        }
        
        if (this.actions != null) {
            for (RuleAction action : this.actions) {
                RuleAction actionClone = RuleAction.builder()
                    .actionType(action.getActionType())
                    .build();
                
                if (action.getParameters() != null) {
                    for (Map.Entry<String, String> entry : action.getParameters().entrySet()) {
                        actionClone.addParameter(entry.getKey(), entry.getValue());
                    }
                }
                
                clone.addAction(actionClone);
            }
        }
        
        if (this.parameters != null) {
            clone.parameters = new HashMap<>(this.parameters);
        }
        
        return clone;
    }

    /**
     * Embedded class representing a condition in a calculation rule.
     * Conditions define when a rule should be applied based on attribute values in the context.
     */
    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @ToString
    public static class RuleCondition {
        
        /**
         * Attribute name to evaluate in the context
         */
        @Column(name = "attribute", nullable = false)
        private String attribute;
        
        /**
         * Operator to apply (e.g., EQUALS, NOT_EQUALS, GREATER_THAN, CONTAINS)
         */
        @Column(name = "operator", nullable = false)
        private String operator;
        
        /**
         * Value to compare against
         */
        @Column(name = "value", nullable = false)
        private String value;
        
        /**
         * Logical operator to connect with next condition (AND/OR)
         */
        @Column(name = "logical_operator")
        private String logicalOperator;
        
        /**
         * Evaluates the condition against a context.
         *
         * @param context the context containing attributes to evaluate
         * @return true if the condition is satisfied, false otherwise
         */
        public boolean evaluate(Map<String, Object> context) {
            if (context == null || !context.containsKey(attribute)) {
                return false;
            }
            
            Object attributeValue = context.get(attribute);
            
            if (attributeValue == null) {
                return "IS_NULL".equals(operator);
            }
            
            if ("IS_NULL".equals(operator)) {
                return false;
            }
            
            if ("IS_NOT_NULL".equals(operator)) {
                return true;
            }
            
            String strAttributeValue = String.valueOf(attributeValue);
            
            switch (operator) {
                case "EQUALS":
                    return strAttributeValue.equals(value);
                case "NOT_EQUALS":
                    return !strAttributeValue.equals(value);
                case "CONTAINS":
                    return strAttributeValue.contains(value);
                case "STARTS_WITH":
                    return strAttributeValue.startsWith(value);
                case "ENDS_WITH":
                    return strAttributeValue.endsWith(value);
                case "GREATER_THAN":
                    if (attributeValue instanceof Number && isNumeric(value)) {
                        return ((Number) attributeValue).doubleValue() > Double.parseDouble(value);
                    }
                    return strAttributeValue.compareTo(value) > 0;
                case "LESS_THAN":
                    if (attributeValue instanceof Number && isNumeric(value)) {
                        return ((Number) attributeValue).doubleValue() < Double.parseDouble(value);
                    }
                    return strAttributeValue.compareTo(value) < 0;
                case "GREATER_THAN_OR_EQUAL":
                    if (attributeValue instanceof Number && isNumeric(value)) {
                        return ((Number) attributeValue).doubleValue() >= Double.parseDouble(value);
                    }
                    return strAttributeValue.compareTo(value) >= 0;
                case "LESS_THAN_OR_EQUAL":
                    if (attributeValue instanceof Number && isNumeric(value)) {
                        return ((Number) attributeValue).doubleValue() <= Double.parseDouble(value);
                    }
                    return strAttributeValue.compareTo(value) <= 0;
                case "IN":
                    String[] values = value.split(",");
                    for (String val : values) {
                        if (strAttributeValue.equals(val.trim())) {
                            return true;
                        }
                    }
                    return false;
                default:
                    return false;
            }
        }
        
        /**
         * Checks if a string can be parsed as a number.
         * 
         * @param str the string to check
         * @return true if the string represents a number, false otherwise
         */
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
     * Embedded class representing an action in a calculation rule.
     * Actions define what should happen when a rule's conditions are satisfied.
     */
    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @ToString
    public static class RuleAction {
        
        /**
         * Type of action to execute (e.g., MODIFY_QUANTITY, SET_FLAG, APPLY_HAIRCUT)
         */
        @Column(name = "action_type", nullable = false)
        private String actionType;
        
        /**
         * Parameters for the action
         */
        @ElementCollection
        @CollectionTable(
            name = "rule_action_parameters",
            joinColumns = @JoinColumn(name = "action_id")
        )
        @MapKeyColumn(name = "param_key")
        @Column(name = "param_value")
        @Builder.Default
        private Map<String, String> parameters = new HashMap<>();
        
        /**
         * Executes the action with a given context.
         *
         * @param context the context to modify
         * @return the updated context after executing the action
         */
        public Map<String, Object> execute(Map<String, Object> context) {
            if (context == null) {
                return new HashMap<>();
            }
            
            Map<String, Object> result = new HashMap<>(context);
            
            switch (actionType) {
                case "MODIFY_QUANTITY":
                    modifyQuantity(result);
                    break;
                case "SET_FLAG":
                    setFlag(result);
                    break;
                case "APPLY_HAIRCUT":
                    applyHaircut(result);
                    break;
                case "EXCLUDE_ITEM":
                    result.put("excluded", true);
                    break;
                case "INCLUDE_ITEM":
                    result.put("excluded", false);
                    break;
                case "SET_PARAMETER":
                    String key = getParameter("key");
                    String value = getParameter("value");
                    if (key != null) {
                        result.put(key, value);
                    }
                    break;
                default:
                    // Unknown action type, no operation
                    break;
            }
            
            return result;
        }
        
        /**
         * Modifies a quantity in the context.
         *
         * @param context the context to modify
         */
        private void modifyQuantity(Map<String, Object> context) {
            String field = getParameter("field");
            String operation = getParameter("operation");
            String valueStr = getParameter("value");
            
            if (field == null || operation == null || valueStr == null) {
                return;
            }
            
            Object currentValue = context.get(field);
            if (!(currentValue instanceof Number)) {
                return;
            }
            
            double currentDouble = ((Number) currentValue).doubleValue();
            double value;
            
            try {
                value = Double.parseDouble(valueStr);
            } catch (NumberFormatException e) {
                return;
            }
            
            double result;
            switch (operation) {
                case "ADD":
                    result = currentDouble + value;
                    break;
                case "SUBTRACT":
                    result = currentDouble - value;
                    break;
                case "MULTIPLY":
                    result = currentDouble * value;
                    break;
                case "DIVIDE":
                    if (value == 0) {
                        return; // Avoid division by zero
                    }
                    result = currentDouble / value;
                    break;
                case "SET":
                    result = value;
                    break;
                default:
                    return; // Unknown operation
            }
            
            // Preserve the original number type
            if (currentValue instanceof Integer) {
                context.put(field, (int) result);
            } else if (currentValue instanceof Long) {
                context.put(field, (long) result);
            } else if (currentValue instanceof Float) {
                context.put(field, (float) result);
            } else {
                context.put(field, result);
            }
        }
        
        /**
         * Sets a flag in the context.
         *
         * @param context the context to modify
         */
        private void setFlag(Map<String, Object> context) {
            String flag = getParameter("flag");
            String valueStr = getParameter("value");
            
            if (flag == null || valueStr == null) {
                return;
            }
            
            boolean value = Boolean.parseBoolean(valueStr);
            context.put(flag, value);
        }
        
        /**
         * Applies a haircut to a value in the context.
         *
         * @param context the context to modify
         */
        private void applyHaircut(Map<String, Object> context) {
            String field = getParameter("field");
            String percentStr = getParameter("percent");
            
            if (field == null || percentStr == null) {
                return;
            }
            
            Object currentValue = context.get(field);
            if (!(currentValue instanceof Number)) {
                return;
            }
            
            double currentDouble = ((Number) currentValue).doubleValue();
            
            try {
                double percent = Double.parseDouble(percentStr);
                double haircut = currentDouble * (percent / 100.0);
                double result = currentDouble - haircut;
                
                // Preserve the original number type
                if (currentValue instanceof Integer) {
                    context.put(field, (int) result);
                } else if (currentValue instanceof Long) {
                    context.put(field, (long) result);
                } else if (currentValue instanceof Float) {
                    context.put(field, (float) result);
                } else {
                    context.put(field, result);
                }
                
            } catch (NumberFormatException e) {
                // Invalid percent format, no operation
            }
        }
        
        /**
         * Gets a parameter value by key.
         *
         * @param key the parameter key
         * @return the parameter value, or null if not found
         */
        public String getParameter(String key) {
            return parameters != null ? parameters.get(key) : null;
        }
        
        /**
         * Adds a parameter to the action.
         *
         * @param key the parameter key
         * @param value the parameter value
         */
        public void addParameter(String key, String value) {
            if (parameters == null) {
                parameters = new HashMap<>();
            }
            parameters.put(key, value);
        }
    }
}