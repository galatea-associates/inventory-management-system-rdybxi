package com.ims.common.event;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.ims.common.model.AggregationUnit;
import com.ims.common.model.Counterparty;
import com.ims.common.model.CounterpartyIdentifier;
import com.ims.common.model.IndexComposition;
import com.ims.common.model.Security;
import com.ims.common.model.SecurityIdentifier;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Event class for reference data changes in the Inventory Management System.
 * This class extends BaseEvent and is used to communicate reference data updates
 * (securities, counterparties, aggregation units, index compositions) between services.
 * It supports the event-driven architecture by providing a standardized format
 * for reference data change notifications.
 */
@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ReferenceDataEvent extends BaseEvent {

    /**
     * The type of entity this event refers to (SECURITY, COUNTERPARTY, AGGREGATION_UNIT, INDEX_COMPOSITION)
     */
    private String entityType;
    
    /**
     * The operation being performed (CREATE, UPDATE, DELETE)
     */
    private String operation;
    
    /**
     * The source of the data (Reuters, Bloomberg, MarkIT, etc.)
     */
    private String dataSource;
    
    /**
     * The security data when this is a security event
     */
    private Security security;
    
    /**
     * List of security identifiers when this is a security event
     */
    private List<SecurityIdentifier> securityIdentifiers;
    
    /**
     * The counterparty data when this is a counterparty event
     */
    private Counterparty counterparty;
    
    /**
     * List of counterparty identifiers when this is a counterparty event
     */
    private List<CounterpartyIdentifier> counterpartyIdentifiers;
    
    /**
     * The aggregation unit data when this is an aggregation unit event
     */
    private AggregationUnit aggregationUnit;
    
    /**
     * The index composition data when this is an index composition event
     */
    private IndexComposition indexComposition;

    /**
     * Constructor that initializes a new reference data event with the specified event type and source
     *
     * @param source The source system or service that generated the event
     */
    public ReferenceDataEvent(String source) {
        super("REFERENCE_DATA", source);
        this.securityIdentifiers = new ArrayList<>();
        this.counterpartyIdentifiers = new ArrayList<>();
    }

    /**
     * Adds a security to this event
     *
     * @param security The security to add
     */
    public void addSecurity(Security security) {
        this.security = security;
        this.entityType = "SECURITY";
    }

    /**
     * Adds a security identifier to this event
     *
     * @param identifier The security identifier to add
     */
    public void addSecurityIdentifier(SecurityIdentifier identifier) {
        if (securityIdentifiers == null) {
            securityIdentifiers = new ArrayList<>();
        }
        securityIdentifiers.add(identifier);
    }

    /**
     * Adds a counterparty to this event
     *
     * @param counterparty The counterparty to add
     */
    public void addCounterparty(Counterparty counterparty) {
        this.counterparty = counterparty;
        this.entityType = "COUNTERPARTY";
    }

    /**
     * Adds a counterparty identifier to this event
     *
     * @param identifier The counterparty identifier to add
     */
    public void addCounterpartyIdentifier(CounterpartyIdentifier identifier) {
        if (counterpartyIdentifiers == null) {
            counterpartyIdentifiers = new ArrayList<>();
        }
        counterpartyIdentifiers.add(identifier);
    }

    /**
     * Adds an aggregation unit to this event
     *
     * @param aggregationUnit The aggregation unit to add
     */
    public void addAggregationUnit(AggregationUnit aggregationUnit) {
        this.aggregationUnit = aggregationUnit;
        this.entityType = "AGGREGATION_UNIT";
    }

    /**
     * Adds an index composition to this event
     *
     * @param indexComposition The index composition to add
     */
    public void addIndexComposition(IndexComposition indexComposition) {
        this.indexComposition = indexComposition;
        this.entityType = "INDEX_COMPOSITION";
    }

    /**
     * Checks if this event is related to a security
     *
     * @return True if this is a security event, false otherwise
     */
    public boolean isSecurityEvent() {
        return "SECURITY".equals(entityType);
    }

    /**
     * Checks if this event is related to a counterparty
     *
     * @return True if this is a counterparty event, false otherwise
     */
    public boolean isCounterpartyEvent() {
        return "COUNTERPARTY".equals(entityType);
    }

    /**
     * Checks if this event is related to an aggregation unit
     *
     * @return True if this is an aggregation unit event, false otherwise
     */
    public boolean isAggregationUnitEvent() {
        return "AGGREGATION_UNIT".equals(entityType);
    }

    /**
     * Checks if this event is related to an index composition
     *
     * @return True if this is an index composition event, false otherwise
     */
    public boolean isIndexCompositionEvent() {
        return "INDEX_COMPOSITION".equals(entityType);
    }

    /**
     * Checks if this event represents a create operation
     *
     * @return True if this is a create operation, false otherwise
     */
    public boolean isCreateOperation() {
        return "CREATE".equals(operation);
    }

    /**
     * Checks if this event represents an update operation
     *
     * @return True if this is an update operation, false otherwise
     */
    public boolean isUpdateOperation() {
        return "UPDATE".equals(operation);
    }

    /**
     * Checks if this event represents a delete operation
     *
     * @return True if this is a delete operation, false otherwise
     */
    public boolean isDeleteOperation() {
        return "DELETE".equals(operation);
    }

    /**
     * Validates the event data before processing
     *
     * @return True if the event is valid, false otherwise
     */
    @Override
    protected boolean validate() {
        // First validate the base properties
        if (!super.validate()) {
            return false;
        }
        
        // Then validate the reference data specific properties
        if (entityType == null || entityType.isEmpty()) {
            return false;
        }
        
        if (operation == null || operation.isEmpty()) {
            return false;
        }
        
        if (dataSource == null || dataSource.isEmpty()) {
            return false;
        }
        
        // Ensure at least one entity is present
        return security != null || counterparty != null || 
               aggregationUnit != null || indexComposition != null;
    }
}