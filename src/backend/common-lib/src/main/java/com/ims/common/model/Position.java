package com.ims.common.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Entity class representing a financial position in the system.
 * This class stores essential position information including book, security, counterparty, aggregation unit,
 * and settlement quantities. It serves as a central component for position calculation, inventory
 * availability, and settlement ladder projections throughout the system.
 */
@Entity
@Table(name = "positions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class Position extends BaseEntity {

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
     * Calculates the projected position after all settlements.
     *
     * @return The projected position quantity
     */
    public BigDecimal getProjectedPosition() {
        return settledQty.add(getNetSettlement());
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
}