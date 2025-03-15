package com.ims.calculation.model;

import com.ims.common.model.BaseEntity;
import com.ims.common.model.Security;

import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

/**
 * Entity class representing a settlement ladder in the Inventory Management System.
 * A settlement ladder projects expected receipts and deliveries for a security position
 * over the next several days (current day plus 4 days). This model supports real-time
 * position calculation, settlement projections, and provides essential data for
 * inventory availability calculations.
 */
@Entity
@Table(name = "settlement_ladders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class SettlementLadder extends BaseEntity {

    /**
     * The book identifier associated with this settlement ladder.
     */
    private String bookId;
    
    /**
     * The security associated with this settlement ladder.
     */
    @ManyToOne
    @JoinColumn(name = "security_id")
    private Security security;
    
    /**
     * The business date for this settlement ladder.
     */
    private LocalDate businessDate;
    
    /**
     * The date when the settlement ladder was last calculated.
     */
    private LocalDate calculationDate;
    
    /**
     * The status of the calculation (e.g., PENDING, VALID, ERROR).
     */
    private String calculationStatus;
    
    /**
     * The quantity to deliver on the current business day (SD+0).
     */
    private BigDecimal sd0Deliver;
    
    /**
     * The quantity to receive on the current business day (SD+0).
     */
    private BigDecimal sd0Receipt;
    
    /**
     * The quantity to deliver on the next business day (SD+1).
     */
    private BigDecimal sd1Deliver;
    
    /**
     * The quantity to receive on the next business day (SD+1).
     */
    private BigDecimal sd1Receipt;
    
    /**
     * The quantity to deliver two business days from today (SD+2).
     */
    private BigDecimal sd2Deliver;
    
    /**
     * The quantity to receive two business days from today (SD+2).
     */
    private BigDecimal sd2Receipt;
    
    /**
     * The quantity to deliver three business days from today (SD+3).
     */
    private BigDecimal sd3Deliver;
    
    /**
     * The quantity to receive three business days from today (SD+3).
     */
    private BigDecimal sd3Receipt;
    
    /**
     * The quantity to deliver four business days from today (SD+4).
     */
    private BigDecimal sd4Deliver;
    
    /**
     * The quantity to receive four business days from today (SD+4).
     */
    private BigDecimal sd4Receipt;
    
    /**
     * The net settlement quantity (total receipts minus total deliveries).
     */
    private BigDecimal netSettlement;
    
    /**
     * A map of delivery quantities indexed by settlement date.
     * This is a transient field derived from the sd* fields.
     */
    @Transient
    private Map<LocalDate, BigDecimal> deliveries;
    
    /**
     * A map of receipt quantities indexed by settlement date.
     * This is a transient field derived from the sd* fields.
     */
    @Transient
    private Map<LocalDate, BigDecimal> receipts;
    
    /**
     * Default constructor required by JPA.
     * Initializes BigDecimal fields to zero and maps to empty HashMaps.
     */
    public SettlementLadder() {
        super();
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
        this.netSettlement = BigDecimal.ZERO;
        this.deliveries = new HashMap<>();
        this.receipts = new HashMap<>();
        this.calculationStatus = "PENDING";
    }
    
    /**
     * Creates a settlement ladder from a position.
     *
     * @param position The position to create the settlement ladder from
     * @return A new settlement ladder initialized from the position
     */
    public static SettlementLadder fromPosition(Position position) {
        SettlementLadder ladder = SettlementLadder.builder()
                .bookId(position.getBookId())
                .security(position.getSecurity())
                .businessDate(position.getBusinessDate())
                .sd0Deliver(position.getSd0Deliver())
                .sd0Receipt(position.getSd0Receipt())
                .sd1Deliver(position.getSd1Deliver())
                .sd1Receipt(position.getSd1Receipt())
                .sd2Deliver(position.getSd2Deliver())
                .sd2Receipt(position.getSd2Receipt())
                .sd3Deliver(position.getSd3Deliver())
                .sd3Receipt(position.getSd3Receipt())
                .sd4Deliver(position.getSd4Deliver())
                .sd4Receipt(position.getSd4Receipt())
                .calculationStatus("VALID")
                .calculationDate(position.getBusinessDate())
                .build();
        
        ladder.deliveries = new HashMap<>();
        ladder.receipts = new HashMap<>();
        
        // Populate deliveries map
        LocalDate sd0 = position.getBusinessDate();
        if (position.getSd0Deliver().compareTo(BigDecimal.ZERO) > 0) {
            ladder.deliveries.put(sd0, position.getSd0Deliver());
        }
        if (position.getSd1Deliver().compareTo(BigDecimal.ZERO) > 0) {
            ladder.deliveries.put(sd0.plusDays(1), position.getSd1Deliver());
        }
        if (position.getSd2Deliver().compareTo(BigDecimal.ZERO) > 0) {
            ladder.deliveries.put(sd0.plusDays(2), position.getSd2Deliver());
        }
        if (position.getSd3Deliver().compareTo(BigDecimal.ZERO) > 0) {
            ladder.deliveries.put(sd0.plusDays(3), position.getSd3Deliver());
        }
        if (position.getSd4Deliver().compareTo(BigDecimal.ZERO) > 0) {
            ladder.deliveries.put(sd0.plusDays(4), position.getSd4Deliver());
        }
        
        // Populate receipts map
        if (position.getSd0Receipt().compareTo(BigDecimal.ZERO) > 0) {
            ladder.receipts.put(sd0, position.getSd0Receipt());
        }
        if (position.getSd1Receipt().compareTo(BigDecimal.ZERO) > 0) {
            ladder.receipts.put(sd0.plusDays(1), position.getSd1Receipt());
        }
        if (position.getSd2Receipt().compareTo(BigDecimal.ZERO) > 0) {
            ladder.receipts.put(sd0.plusDays(2), position.getSd2Receipt());
        }
        if (position.getSd3Receipt().compareTo(BigDecimal.ZERO) > 0) {
            ladder.receipts.put(sd0.plusDays(3), position.getSd3Receipt());
        }
        if (position.getSd4Receipt().compareTo(BigDecimal.ZERO) > 0) {
            ladder.receipts.put(sd0.plusDays(4), position.getSd4Receipt());
        }
        
        ladder.calculateNetSettlement();
        
        return ladder;
    }
    
    /**
     * Adds a delivery to the settlement ladder.
     *
     * @param settlementDate The settlement date
     * @param quantity The quantity to deliver
     */
    public void addDelivery(LocalDate settlementDate, BigDecimal quantity) {
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }
        
        long days = ChronoUnit.DAYS.between(businessDate, settlementDate);
        
        if (days < 0) {
            return; // Past settlement date
        }
        
        switch ((int) days) {
            case 0:
                sd0Deliver = sd0Deliver.add(quantity);
                break;
            case 1:
                sd1Deliver = sd1Deliver.add(quantity);
                break;
            case 2:
                sd2Deliver = sd2Deliver.add(quantity);
                break;
            case 3:
                sd3Deliver = sd3Deliver.add(quantity);
                break;
            case 4:
                sd4Deliver = sd4Deliver.add(quantity);
                break;
            default:
                return; // Beyond 4 days
        }
        
        // Update deliveries map
        deliveries.put(settlementDate, deliveries.getOrDefault(settlementDate, BigDecimal.ZERO).add(quantity));
        
        // Recalculate net settlement
        calculateNetSettlement();
    }
    
    /**
     * Adds a receipt to the settlement ladder.
     *
     * @param settlementDate The settlement date
     * @param quantity The quantity to receive
     */
    public void addReceipt(LocalDate settlementDate, BigDecimal quantity) {
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }
        
        long days = ChronoUnit.DAYS.between(businessDate, settlementDate);
        
        if (days < 0) {
            return; // Past settlement date
        }
        
        switch ((int) days) {
            case 0:
                sd0Receipt = sd0Receipt.add(quantity);
                break;
            case 1:
                sd1Receipt = sd1Receipt.add(quantity);
                break;
            case 2:
                sd2Receipt = sd2Receipt.add(quantity);
                break;
            case 3:
                sd3Receipt = sd3Receipt.add(quantity);
                break;
            case 4:
                sd4Receipt = sd4Receipt.add(quantity);
                break;
            default:
                return; // Beyond 4 days
        }
        
        // Update receipts map
        receipts.put(settlementDate, receipts.getOrDefault(settlementDate, BigDecimal.ZERO).add(quantity));
        
        // Recalculate net settlement
        calculateNetSettlement();
    }
    
    /**
     * Gets the net settlement for a specific day in the settlement ladder.
     *
     * @param daysFromToday The number of days from today (0-4)
     * @return The net settlement quantity for the specified day
     */
    public BigDecimal getNetSettlementForDay(int daysFromToday) {
        switch (daysFromToday) {
            case 0:
                return sd0Receipt.subtract(sd0Deliver);
            case 1:
                return sd1Receipt.subtract(sd1Deliver);
            case 2:
                return sd2Receipt.subtract(sd2Deliver);
            case 3:
                return sd3Receipt.subtract(sd3Deliver);
            case 4:
                return sd4Receipt.subtract(sd4Deliver);
            default:
                return BigDecimal.ZERO;
        }
    }
    
    /**
     * Gets the total delivery quantity across all settlement days.
     *
     * @return The total delivery quantity
     */
    public BigDecimal getTotalDeliveries() {
        return sd0Deliver
                .add(sd1Deliver)
                .add(sd2Deliver)
                .add(sd3Deliver)
                .add(sd4Deliver);
    }
    
    /**
     * Gets the total receipt quantity across all settlement days.
     *
     * @return The total receipt quantity
     */
    public BigDecimal getTotalReceipts() {
        return sd0Receipt
                .add(sd1Receipt)
                .add(sd2Receipt)
                .add(sd3Receipt)
                .add(sd4Receipt);
    }
    
    /**
     * Calculates the net settlement across all settlement days.
     *
     * @return The net settlement quantity
     */
    public BigDecimal calculateNetSettlement() {
        BigDecimal totalReceipts = getTotalReceipts();
        BigDecimal totalDeliveries = getTotalDeliveries();
        netSettlement = totalReceipts.subtract(totalDeliveries);
        return netSettlement;
    }
    
    /**
     * Updates a position's settlement ladder fields from this settlement ladder.
     *
     * @param position The position to update
     * @return The updated position
     */
    public Position updatePositionSettlementLadder(Position position) {
        position.setSd0Deliver(this.sd0Deliver);
        position.setSd0Receipt(this.sd0Receipt);
        position.setSd1Deliver(this.sd1Deliver);
        position.setSd1Receipt(this.sd1Receipt);
        position.setSd2Deliver(this.sd2Deliver);
        position.setSd2Receipt(this.sd2Receipt);
        position.setSd3Deliver(this.sd3Deliver);
        position.setSd3Receipt(this.sd3Receipt);
        position.setSd4Deliver(this.sd4Deliver);
        position.setSd4Receipt(this.sd4Receipt);
        return position;
    }
    
    /**
     * Determines if the settlement ladder calculation is valid.
     *
     * @return True if the calculation is valid, false otherwise
     */
    public boolean isCalculationValid() {
        return "VALID".equals(calculationStatus) && 
               businessDate.equals(calculationDate);
    }
    
    /**
     * Updates the calculation status and date.
     *
     * @param status The new calculation status
     * @param date The calculation date
     */
    public void updateCalculationStatus(String status, LocalDate date) {
        this.calculationStatus = status;
        this.calculationDate = date;
    }
    
    /**
     * Recalculates the settlement ladder.
     */
    public void recalculate() {
        // Rebuild deliveries and receipts maps
        this.deliveries = new HashMap<>();
        this.receipts = new HashMap<>();
        
        LocalDate sd0 = this.businessDate;
        
        if (sd0Deliver.compareTo(BigDecimal.ZERO) > 0) {
            deliveries.put(sd0, sd0Deliver);
        }
        if (sd1Deliver.compareTo(BigDecimal.ZERO) > 0) {
            deliveries.put(sd0.plusDays(1), sd1Deliver);
        }
        if (sd2Deliver.compareTo(BigDecimal.ZERO) > 0) {
            deliveries.put(sd0.plusDays(2), sd2Deliver);
        }
        if (sd3Deliver.compareTo(BigDecimal.ZERO) > 0) {
            deliveries.put(sd0.plusDays(3), sd3Deliver);
        }
        if (sd4Deliver.compareTo(BigDecimal.ZERO) > 0) {
            deliveries.put(sd0.plusDays(4), sd4Deliver);
        }
        
        if (sd0Receipt.compareTo(BigDecimal.ZERO) > 0) {
            receipts.put(sd0, sd0Receipt);
        }
        if (sd1Receipt.compareTo(BigDecimal.ZERO) > 0) {
            receipts.put(sd0.plusDays(1), sd1Receipt);
        }
        if (sd2Receipt.compareTo(BigDecimal.ZERO) > 0) {
            receipts.put(sd0.plusDays(2), sd2Receipt);
        }
        if (sd3Receipt.compareTo(BigDecimal.ZERO) > 0) {
            receipts.put(sd0.plusDays(3), sd3Receipt);
        }
        if (sd4Receipt.compareTo(BigDecimal.ZERO) > 0) {
            receipts.put(sd0.plusDays(4), sd4Receipt);
        }
        
        calculateNetSettlement();
        
        // Update calculation status
        calculationStatus = "VALID";
        calculationDate = businessDate;
    }
    
    /**
     * Gets the settlement date for a specific day in the settlement ladder.
     *
     * @param daysFromToday The number of days from today (0-4)
     * @return The settlement date for the specified day
     */
    public LocalDate getSettlementDateForDay(int daysFromToday) {
        return businessDate.plusDays(daysFromToday);
    }
}