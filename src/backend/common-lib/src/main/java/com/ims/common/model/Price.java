package com.ims.common.model;

import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Entity class representing price data for financial securities in the Inventory Management System.
 * This model stores various types of price information including trade prices, bid/ask prices, and
 * volume data, along with metadata such as source, timestamp, and price type. It serves as a core
 * domain model for market data used in position valuation and inventory calculations.
 */
@Entity
@Table(name = "prices", indexes = {
    @Index(name = "idx_prices_security_timestamp", columnList = "security_id, event_time")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class Price extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "security_id", insertable = false, updatable = false)
    private Security security;
    
    private String securityId;
    
    private Instant eventTime;
    
    private BigDecimal price;
    
    private BigDecimal bidPrice;
    
    private BigDecimal askPrice;
    
    private BigDecimal volume;
    
    private String currency;
    
    private String source;
    
    private String priceType;
    
    private Boolean isComposite;
    
    /**
     * Calculates the mid price based on bid and ask prices if available.
     * The mid price is the average of the bid and ask prices.
     *
     * @return The calculated mid price or null if bid or ask prices are not available
     */
    public BigDecimal getMidPrice() {
        if (bidPrice != null && askPrice != null) {
            return bidPrice.add(askPrice).divide(BigDecimal.valueOf(2), 10, BigDecimal.ROUND_HALF_UP);
        }
        return null;
    }
    
    /**
     * Calculates the spread between ask and bid prices.
     * The spread is the difference between the ask price and the bid price.
     *
     * @return The calculated spread or null if bid or ask prices are not available
     */
    public BigDecimal getSpread() {
        if (bidPrice != null && askPrice != null) {
            return askPrice.subtract(bidPrice);
        }
        return null;
    }
    
    /**
     * Calculates the spread as a percentage of the mid price.
     * This is useful for comparing spreads across securities with different price levels.
     *
     * @return The calculated spread percentage or null if mid price cannot be calculated or is zero
     */
    public BigDecimal getSpreadPercentage() {
        BigDecimal midPrice = getMidPrice();
        BigDecimal spread = getSpread();
        
        if (midPrice != null && spread != null && midPrice.compareTo(BigDecimal.ZERO) != 0) {
            return spread.divide(midPrice, 10, BigDecimal.ROUND_HALF_UP).multiply(BigDecimal.valueOf(100));
        }
        return null;
    }
    
    /**
     * Determines if this price represents a trade price.
     * Trade prices come from actual executed trades rather than quotes.
     *
     * @return True if this is a trade price, false otherwise
     */
    public boolean isTradePrice() {
        return "TRADE".equals(priceType);
    }
    
    /**
     * Determines if this price represents a quote price.
     * Quote prices represent bid/ask quotes rather than actual trades.
     *
     * @return True if this is a quote price, false otherwise
     */
    public boolean isQuotePrice() {
        return "QUOTE".equals(priceType);
    }
    
    /**
     * Determines if this price represents a closing price.
     * Closing prices are the official end-of-day prices used for valuation.
     *
     * @return True if this is a closing price, false otherwise
     */
    public boolean isClosingPrice() {
        return "CLOSING".equals(priceType);
    }
    
    /**
     * Gets the security identifier, either from the security object or the securityId field.
     * This ensures consistent access to the security identifier regardless of whether
     * the Security entity is loaded.
     *
     * @return The security identifier
     */
    public String getSecurityIdentifier() {
        return security != null ? security.getInternalId() : securityId;
    }
    
    /**
     * JPA lifecycle callback that ensures securityId is set before entity is persisted.
     * This maintains consistency between the security entity reference and the securityId field.
     */
    @PrePersist
    @Override
    public void prePersist() {
        super.prePersist();
        if (security != null && securityId == null) {
            securityId = security.getInternalId();
        }
    }
}