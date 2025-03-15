package com.ims.common.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ims.common.model.Position;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Event class representing position updates in the Inventory Management System.
 * This class extends BaseEvent and carries position data for event-driven communication
 * between microservices. It supports different types of position events including
 * position updates, start-of-day positions, and settlement ladder updates.
 * 
 * This class supports:
 * - Position and Settlement Ladder Calculation (F-201)
 * - Event-Driven Architecture with immutable events
 * - High-Throughput Message Processing (F-501)
 */
@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
@SuperBuilder
@JsonIgnoreProperties(ignoreUnknown = true)
public class PositionEvent extends BaseEvent {

    private String bookId;
    private String securityId;
    private String securityIdentifier;
    private LocalDate businessDate;
    private String positionType;
    private Boolean isHypothecatable;
    private Boolean isReserved;
    private BigDecimal contractualQty;
    private BigDecimal settledQty;
    private BigDecimal sd0Deliver;
    private BigDecimal sd0Receipt;
    private BigDecimal sd1Deliver;
    private BigDecimal sd1Receipt;
    private BigDecimal sd2Deliver;
    private BigDecimal sd2Receipt;
    private BigDecimal sd3Deliver;
    private BigDecimal sd3Receipt;
    private BigDecimal sd4Deliver;
    private BigDecimal sd4Receipt;
    private String eventSubType;

    /**
     * Constructor that initializes a new position event with the specified event type and source
     *
     * @param eventType The type of the event
     * @param source The source system or service that generated the event
     */
    public PositionEvent(String eventType, String source) {
        super(eventType, source);
        this.contractualQty = BigDecimal.ZERO;
        this.settledQty = BigDecimal.ZERO;
        this.sd0Deliver = BigDecimal.ZERO;
        this.sd0Receipt = BigDecimal.ZERO;
        this.sd1Deliver = BigDecimal.ZERO;
        this.sd1Receipt = BigDecimal.ZERO;
        this.sd2Deliver = BigDecimal.ZERO;
        this.sd2Receipt = BigDecimal.ZERO;
        this.sd3Deliver = BigDecimal.ZERO;
        this.sd3Receipt = BigDecimal.ZERO;
        this.sd4Deliver = BigDecimal.ZERO;
        this.sd4Receipt = BigDecimal.ZERO;
        this.isHypothecatable = false;
        this.isReserved = false;
    }

    /**
     * Creates a PositionEvent from a Position object
     *
     * @param position The Position object to convert
     * @return A new PositionEvent populated with data from the Position
     */
    public static PositionEvent fromPosition(Position position) {
        PositionEvent event = new PositionEvent("POSITION_UPDATE", "CALCULATION_SERVICE");
        
        event.setBookId(position.getBookId());
        event.setSecurityId(position.getSecurity().getInternalId());
        event.setSecurityIdentifier(position.getSecurity().getPrimaryIdentifierValue());
        event.setBusinessDate(position.getBusinessDate());
        event.setPositionType(position.getPositionType());
        event.setIsHypothecatable(position.getIsHypothecatable());
        event.setIsReserved(position.getIsReserved());
        event.setContractualQty(position.getContractualQty());
        event.setSettledQty(position.getSettledQty());
        
        // Set settlement ladder data
        event.setSd0Deliver(position.getSd0Deliver());
        event.setSd0Receipt(position.getSd0Receipt());
        event.setSd1Deliver(position.getSd1Deliver());
        event.setSd1Receipt(position.getSd1Receipt());
        event.setSd2Deliver(position.getSd2Deliver());
        event.setSd2Receipt(position.getSd2Receipt());
        event.setSd3Deliver(position.getSd3Deliver());
        event.setSd3Receipt(position.getSd3Receipt());
        event.setSd4Deliver(position.getSd4Deliver());
        event.setSd4Receipt(position.getSd4Receipt());
        
        event.setEventSubType("POSITION_UPDATE");
        
        return event;
    }
    
    /**
     * Validates the event data before processing
     *
     * @return True if the event is valid, false otherwise
     */
    @Override
    protected boolean validate() {
        return super.validate() &&
               bookId != null && !bookId.isEmpty() &&
               securityId != null && !securityId.isEmpty() &&
               businessDate != null;
    }
    
    /**
     * Checks if this event is a position update event
     *
     * @return True if this is a position update event, false otherwise
     */
    public boolean isPositionUpdate() {
        return "POSITION_UPDATE".equals(eventSubType);
    }
    
    /**
     * Checks if this event is a start-of-day position event
     *
     * @return True if this is a start-of-day event, false otherwise
     */
    public boolean isStartOfDay() {
        return "START_OF_DAY".equals(eventSubType);
    }
    
    /**
     * Checks if this event is a settlement ladder update event
     *
     * @return True if this is a settlement ladder update event, false otherwise
     */
    public boolean isSettlementLadderUpdate() {
        return "SETTLEMENT_LADDER_UPDATE".equals(eventSubType);
    }
    
    /**
     * Converts this event to a Position object
     *
     * @return A Position object populated with data from this event
     */
    public Position toPosition() {
        // Note: In a complete implementation, this would use a SecurityService
        // to look up the Security entity by securityId
        return Position.builder()
                .bookId(this.bookId)
                // .security() would be populated using SecurityService lookup
                .businessDate(this.businessDate)
                .positionType(this.positionType)
                .isHypothecatable(this.isHypothecatable)
                .isReserved(this.isReserved)
                .contractualQty(this.contractualQty)
                .settledQty(this.settledQty)
                .sd0Deliver(this.sd0Deliver)
                .sd0Receipt(this.sd0Receipt)
                .sd1Deliver(this.sd1Deliver)
                .sd1Receipt(this.sd1Receipt)
                .sd2Deliver(this.sd2Deliver)
                .sd2Receipt(this.sd2Receipt)
                .sd3Deliver(this.sd3Deliver)
                .sd3Receipt(this.sd3Receipt)
                .sd4Deliver(this.sd4Deliver)
                .sd4Receipt(this.sd4Receipt)
                .build();
    }
}