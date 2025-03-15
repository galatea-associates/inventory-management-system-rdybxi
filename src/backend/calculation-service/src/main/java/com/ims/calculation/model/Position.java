package com.ims.calculation.model;

import com.ims.common.model.AggregationUnit;
import com.ims.common.model.BaseEntity;
import com.ims.common.model.Counterparty;
import com.ims.common.model.Security;

import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Enhanced entity class representing a financial position in the calculation service.
 * This class extends the common Position model with additional calculation-specific fields
 * and methods to support real-time position calculation, settlement ladder projections,
 * and inventory availability calculations.
 */
@Entity
@Table(name = "calculated_positions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class Position extends BaseEntity {

    // Core position fields
    private String bookId;
    
    @ManyToOne
    @JoinColumn(name = "security_id")
    private Security security;
    
    @ManyToOne
    @JoinColumn(name = "counterparty_id")
    private Counterparty counterparty;
    
    @ManyToOne
    @JoinColumn(name = "aggregation_unit_id")
    private AggregationUnit aggregationUnit;
    
    private LocalDate businessDate;
    private String positionType;
    private Boolean isHypothecatable;
    private Boolean isReserved;
    private BigDecimal contractualQty;
    private BigDecimal settledQty;
    
    // Settlement ladder fields
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
    
    // Calculation-specific fields
    private BigDecimal currentNetPosition;
    private BigDecimal projectedNetPosition;
    private String calculationStatus;
    private LocalDate calculationDate;
    private String calculationRuleId;
    private String calculationRuleVersion;
    private Boolean isStartOfDay;

    /**
     * Default constructor required by JPA.
     * Initializes BigDecimal fields to zero.
     */
    public Position() {
        super();
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
        this.isStartOfDay = false;
        this.calculationStatus = "PENDING";
    }

    /**
     * Determines if the position is long (positive settled quantity).
     *
     * @return True if the position is long, false otherwise
     */
    public boolean isLong() {
        return settledQty.compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Determines if the position is short (negative settled quantity).
     *
     * @return True if the position is short, false otherwise
     */
    public boolean isShort() {
        return settledQty.compareTo(BigDecimal.ZERO) < 0;
    }

    /**
     * Determines if the position is flat (zero settled quantity).
     *
     * @return True if the position is flat, false otherwise
     */
    public boolean isFlat() {
        return settledQty.compareTo(BigDecimal.ZERO) == 0;
    }

    /**
     * Calculates the net settlement for the current business day (receipts minus deliveries).
     *
     * @return The net settlement quantity for today
     */
    public BigDecimal getNetSettlementToday() {
        return sd0Receipt.subtract(sd0Deliver);
    }

    /**
     * Calculates the net settlement for tomorrow (receipts minus deliveries).
     *
     * @return The net settlement quantity for tomorrow
     */
    public BigDecimal getNetSettlementTomorrow() {
        return sd1Receipt.subtract(sd1Deliver);
    }

    /**
     * Calculates the net settlement for a specific day in the settlement ladder.
     *
     * @param daysFromToday The number of days from today (0-4)
     * @return The net settlement quantity for the specified day
     */
    public BigDecimal getNetSettlementForDay(int daysFromToday) {
        switch (daysFromToday) {
            case 0:
                return getNetSettlementToday();
            case 1:
                return getNetSettlementTomorrow();
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
     * Calculates the projected settled quantity after today's settlements.
     *
     * @return The projected settled quantity
     */
    public BigDecimal getProjectedSettledQty() {
        return settledQty.add(getNetSettlementToday());
    }

    /**
     * Calculates the total delivery quantity across all settlement days.
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
     * Calculates the total receipt quantity across all settlement days.
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
     * Calculates the net settlement across all settlement days (total receipts minus total deliveries).
     *
     * @return The net settlement quantity
     */
    public BigDecimal getNetSettlement() {
        return getTotalReceipts().subtract(getTotalDeliveries());
    }

    /**
     * Gets the current net position, or calculates it if not already set.
     *
     * @return The current net position
     */
    public BigDecimal getCurrentNetPosition() {
        if (currentNetPosition == null) {
            currentNetPosition = settledQty.add(contractualQty);
        }
        return currentNetPosition;
    }

    /**
     * Gets the projected net position, or calculates it if not already set.
     *
     * @return The projected net position
     */
    public BigDecimal getProjectedNetPosition() {
        if (projectedNetPosition == null) {
            projectedNetPosition = getCurrentNetPosition().add(getNetSettlement());
        }
        return projectedNetPosition;
    }

    /**
     * Determines if the position calculation is valid based on status and date.
     *
     * @return True if the calculation is valid, false otherwise
     */
    public boolean isCalculationValid() {
        return "VALID".equals(calculationStatus) && 
               businessDate.equals(calculationDate);
    }

    /**
     * Determines if the position is for an equity security.
     *
     * @return True if the position is for an equity, false otherwise
     */
    public boolean isEquity() {
        return security != null && security.isEquity();
    }

    /**
     * Determines if the position is for a bond security.
     *
     * @return True if the position is for a bond, false otherwise
     */
    public boolean isBond() {
        return security != null && security.isBond();
    }

    /**
     * Determines if the position is for an ETF security.
     *
     * @return True if the position is for an ETF, false otherwise
     */
    public boolean isETF() {
        return security != null && security.isETF();
    }

    /**
     * Determines if the position is owned by a client.
     *
     * @return True if the position is a client position, false otherwise
     */
    public boolean isClientPosition() {
        return counterparty != null && counterparty.isClient();
    }

    /**
     * Determines if the position is owned by an internal entity.
     *
     * @return True if the position is an internal position, false otherwise
     */
    public boolean isInternalPosition() {
        return counterparty != null && counterparty.isInternalEntity();
    }

    /**
     * Determines if the position is available for securities lending.
     *
     * @return True if the position is available for loan, false otherwise
     */
    public boolean isAvailableForLoan() {
        return isLong() && Boolean.TRUE.equals(isHypothecatable) && !Boolean.TRUE.equals(isReserved);
    }

    /**
     * Determines if the position is available for pledging into financing trades.
     *
     * @return True if the position is available for pledge, false otherwise
     */
    public boolean isAvailableForPledge() {
        return isLong() && Boolean.TRUE.equals(isHypothecatable) && !Boolean.TRUE.equals(isReserved);
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
     * Recalculates the current and projected net positions.
     */
    public void recalculate() {
        currentNetPosition = settledQty.add(contractualQty);
        projectedNetPosition = currentNetPosition.add(getNetSettlement());
        calculationStatus = "VALID";
        calculationDate = businessDate;
    }

    /**
     * Creates a calculation position from a common position.
     *
     * @param commonPosition The common position
     * @return A new calculation position
     */
    public static Position fromCommonPosition(com.ims.common.model.Position commonPosition) {
        return Position.builder()
                .bookId(commonPosition.getBookId())
                .security(commonPosition.getSecurity())
                .counterparty(commonPosition.getCounterparty())
                .aggregationUnit(commonPosition.getAggregationUnit())
                .businessDate(commonPosition.getBusinessDate())
                .positionType(commonPosition.getPositionType())
                .isHypothecatable(commonPosition.getIsHypothecatable())
                .isReserved(commonPosition.getIsReserved())
                .contractualQty(commonPosition.getContractualQty())
                .settledQty(commonPosition.getSettledQty())
                .sd0Deliver(commonPosition.getSd0Deliver())
                .sd0Receipt(commonPosition.getSd0Receipt())
                .sd1Deliver(commonPosition.getSd1Deliver())
                .sd1Receipt(commonPosition.getSd1Receipt())
                .sd2Deliver(commonPosition.getSd2Deliver())
                .sd2Receipt(commonPosition.getSd2Receipt())
                .sd3Deliver(commonPosition.getSd3Deliver())
                .sd3Receipt(commonPosition.getSd3Receipt())
                .sd4Deliver(commonPosition.getSd4Deliver())
                .sd4Receipt(commonPosition.getSd4Receipt())
                .calculationStatus("PENDING")
                .calculationDate(null)
                .currentNetPosition(null)
                .projectedNetPosition(null)
                .build();
    }

    /**
     * Converts this calculation position to a common position.
     *
     * @return A common position
     */
    public com.ims.common.model.Position toCommonPosition() {
        return com.ims.common.model.Position.builder()
                .bookId(this.bookId)
                .security(this.security)
                .counterparty(this.counterparty)
                .aggregationUnit(this.aggregationUnit)
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