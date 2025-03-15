package com.ims.calculation.engine;

import com.hazelcast.core.HazelcastInstance;
import com.hazelcast.map.IMap;
import com.ims.calculation.exception.CalculationException;
import com.ims.calculation.model.Position;
import com.ims.calculation.model.SettlementLadder;
import com.ims.calculation.repository.PositionRepository;
import com.ims.common.event.PositionEvent;
import com.ims.common.event.TradeDataEvent;
import com.ims.common.model.Security;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Core calculation engine for position processing in the Inventory Management System.
 * Implements high-performance, thread-safe algorithms for real-time position calculations,
 * settlement ladder projections, and provides the foundation for inventory availability calculations.
 * Processes trade and position events, manages in-memory position caching for optimal performance,
 * and supports parallel processing to handle the high throughput requirements of the system.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class PositionEngine {

    private final PositionRepository positionRepository;
    private final HazelcastInstance hazelcastInstance;
    private final IMap<String, Position> positionCache;

    /**
     * Constructor that initializes the position engine with required dependencies
     *
     * @param positionRepository Repository for position data
     * @param hazelcastInstance Hazelcast instance for distributed caching
     */
    public PositionEngine(PositionRepository positionRepository, HazelcastInstance hazelcastInstance) {
        this.positionRepository = positionRepository;
        this.hazelcastInstance = hazelcastInstance;
        this.positionCache = hazelcastInstance.getMap("positionCache");
    }

    /**
     * Processes a trade event and updates the relevant position
     *
     * @param event The trade event to process
     * @return The updated position
     */
    @Transactional
    public Position processTradeEvent(TradeDataEvent event) {
        log.debug("Processing trade event: {}", event);
        
        if (!validateTradeEvent(event)) {
            throw new IllegalArgumentException("Invalid trade event: " + event);
        }
        
        try {
            // Find or create position
            Security security = new Security();  // In a real implementation, this would be looked up by securityId
            security.setInternalId(event.getSecurityId());
            
            Position position = findOrCreatePosition(
                    event.getBookId(),
                    security,
                    event.getTradeDate()
            );
            
            // Update position based on trade
            position = updatePositionForTrade(position, event);
            
            // Recalculate position and update calculation status
            position.recalculate();
            position.updateCalculationStatus("VALID", LocalDate.now());
            
            // Save and cache position
            position = positionRepository.save(position);
            cachePosition(position);
            
            log.info("Trade event processed, updated position: {}", position.getId());
            return position;
        } catch (Exception e) {
            log.error("Error processing trade event: {}", event, e);
            throw CalculationException.forPositionCalculation(null, event.getTradeDate(), 
                    "Error processing trade event: " + e.getMessage(), e);
        }
    }

    /**
     * Processes a position event and updates the relevant position
     *
     * @param event The position event to process
     * @return The updated position
     */
    @Transactional
    public Position processPositionEvent(PositionEvent event) {
        log.debug("Processing position event: {}", event);
        
        if (!validatePositionEvent(event)) {
            throw new IllegalArgumentException("Invalid position event: " + event);
        }
        
        try {
            // Convert event to position
            Position eventPosition = event.toPosition();
            
            // Find existing position or use the converted one
            Security security = eventPosition.getSecurity();
            if (security == null) {
                security = new Security();  // In a real implementation, this would be looked up by securityId
                security.setInternalId(event.getSecurityId());
            }
            
            Optional<Position> existingPosition = positionRepository.findByBookIdAndSecurityAndBusinessDate(
                    event.getBookId(),
                    security,
                    event.getBusinessDate()
            );
            
            Position position = existingPosition.orElse(eventPosition);
            
            // Update position from event data if existing
            if (existingPosition.isPresent()) {
                position.setContractualQty(event.getContractualQty());
                position.setSettledQty(event.getSettledQty());
                position.setIsHypothecatable(event.getIsHypothecatable());
                position.setIsReserved(event.getIsReserved());
                position.setSd0Deliver(event.getSd0Deliver());
                position.setSd0Receipt(event.getSd0Receipt());
                position.setSd1Deliver(event.getSd1Deliver());
                position.setSd1Receipt(event.getSd1Receipt());
                position.setSd2Deliver(event.getSd2Deliver());
                position.setSd2Receipt(event.getSd2Receipt());
                position.setSd3Deliver(event.getSd3Deliver());
                position.setSd3Receipt(event.getSd3Receipt());
                position.setSd4Deliver(event.getSd4Deliver());
                position.setSd4Receipt(event.getSd4Receipt());
            }
            
            // Recalculate position and update calculation status
            position.recalculate();
            position.updateCalculationStatus("VALID", LocalDate.now());
            
            // Save and cache position
            position = positionRepository.save(position);
            cachePosition(position);
            
            log.info("Position event processed, updated position: {}", position.getId());
            return position;
        } catch (Exception e) {
            log.error("Error processing position event: {}", event, e);
            throw CalculationException.forPositionCalculation(null, event.getBusinessDate(), 
                    "Error processing position event: " + e.getMessage(), e);
        }
    }

    /**
     * Calculates the settlement ladder for a position
     *
     * @param position The position to calculate the settlement ladder for
     * @return The calculated settlement ladder
     */
    public SettlementLadder calculateSettlementLadder(Position position) {
        log.debug("Calculating settlement ladder for position: {}", position.getId());
        
        SettlementLadder ladder = SettlementLadder.fromPosition(position);
        ladder.calculateNetSettlement();
        ladder.updatePositionSettlementLadder(position);
        
        return ladder;
    }

    /**
     * Calculates the current position based on settled quantity and contractual quantity
     *
     * @param position The position to calculate
     * @return The position with calculated current net position
     */
    public Position calculateCurrentPosition(Position position) {
        BigDecimal currentNetPosition = position.getSettledQty().add(position.getContractualQty());
        position.setCurrentNetPosition(currentNetPosition);
        return position;
    }

    /**
     * Calculates the projected position based on current position and settlement ladder
     *
     * @param position The position to calculate
     * @return The position with calculated projected net position
     */
    public Position calculateProjectedPosition(Position position) {
        // Ensure settlement ladder is calculated
        SettlementLadder ladder = calculateSettlementLadder(position);
        
        // Ensure current position is calculated
        if (position.getCurrentNetPosition() == null) {
            calculateCurrentPosition(position);
        }
        
        BigDecimal projectedNetPosition = position.getCurrentNetPosition().add(ladder.getNetSettlement());
        position.setProjectedNetPosition(projectedNetPosition);
        
        return position;
    }

    /**
     * Finds an existing position or creates a new one if not found
     *
     * @param bookId The book ID
     * @param security The security
     * @param businessDate The business date
     * @return The found or created position
     */
    @Transactional
    public Position findOrCreatePosition(String bookId, Security security, LocalDate businessDate) {
        String cacheKey = getCacheKey(bookId, security.getInternalId(), businessDate);
        
        // Check cache first
        Position position = positionCache.get(cacheKey);
        if (position != null) {
            log.debug("Position found in cache: {}", position.getId());
            return position;
        }
        
        // Check repository
        Optional<Position> existingPosition = positionRepository.findByBookIdAndSecurityAndBusinessDate(
                bookId, security, businessDate);
        
        if (existingPosition.isPresent()) {
            position = existingPosition.get();
            cachePosition(position);
            log.debug("Position found in repository: {}", position.getId());
            return position;
        }
        
        // Create new position
        position = new Position();
        position.setBookId(bookId);
        position.setSecurity(security);
        position.setBusinessDate(businessDate);
        position.setCalculationStatus("PENDING");
        
        // Save new position
        position = positionRepository.save(position);
        cachePosition(position);
        
        log.info("Created new position: {}", position.getId());
        return position;
    }

    /**
     * Updates a position based on trade data
     *
     * @param position The position to update
     * @param tradeEvent The trade event with trade data
     * @return The updated position
     */
    public Position updatePositionForTrade(Position position, TradeDataEvent tradeEvent) {
        log.debug("Updating position for trade: {}", tradeEvent.getTradeId());
        
        BigDecimal quantity = tradeEvent.getQuantity();
        LocalDate settlementDate = tradeEvent.getSettlementDate();
        
        // Update contractual quantity based on trade side
        if (tradeEvent.isBuy()) {
            position.setContractualQty(position.getContractualQty().add(quantity));
        } else if (tradeEvent.isSell()) {
            position.setContractualQty(position.getContractualQty().subtract(quantity));
        }
        
        // Update settlement ladder
        if (tradeEvent.isBuy()) {
            updateSettlementLadder(position, settlementDate, quantity, false);
        } else if (tradeEvent.isSell()) {
            updateSettlementLadder(position, settlementDate, quantity, true);
        }
        
        return position;
    }

    /**
     * Updates the settlement ladder for a position based on a trade
     *
     * @param position The position to update
     * @param settlementDate The settlement date
     * @param quantity The quantity
     * @param isDelivery True if this is a delivery, false if it's a receipt
     * @return The position with updated settlement ladder
     */
    public Position updateSettlementLadder(Position position, LocalDate settlementDate, BigDecimal quantity, boolean isDelivery) {
        if (settlementDate == null || quantity == null || quantity.compareTo(BigDecimal.ZERO) == 0) {
            return position;
        }
        
        long daysDiff = java.time.temporal.ChronoUnit.DAYS.between(position.getBusinessDate(), settlementDate);
        
        if (daysDiff < 0 || daysDiff > 4) {
            log.warn("Settlement date {} is outside the settlement window for position date {}", 
                     settlementDate, position.getBusinessDate());
            return position;
        }
        
        switch ((int) daysDiff) {
            case 0:
                if (isDelivery) {
                    position.setSd0Deliver(position.getSd0Deliver().add(quantity));
                } else {
                    position.setSd0Receipt(position.getSd0Receipt().add(quantity));
                }
                break;
            case 1:
                if (isDelivery) {
                    position.setSd1Deliver(position.getSd1Deliver().add(quantity));
                } else {
                    position.setSd1Receipt(position.getSd1Receipt().add(quantity));
                }
                break;
            case 2:
                if (isDelivery) {
                    position.setSd2Deliver(position.getSd2Deliver().add(quantity));
                } else {
                    position.setSd2Receipt(position.getSd2Receipt().add(quantity));
                }
                break;
            case 3:
                if (isDelivery) {
                    position.setSd3Deliver(position.getSd3Deliver().add(quantity));
                } else {
                    position.setSd3Receipt(position.getSd3Receipt().add(quantity));
                }
                break;
            case 4:
                if (isDelivery) {
                    position.setSd4Deliver(position.getSd4Deliver().add(quantity));
                } else {
                    position.setSd4Receipt(position.getSd4Receipt().add(quantity));
                }
                break;
        }
        
        return position;
    }

    /**
     * Processes a list of positions asynchronously in parallel
     *
     * @param positions The positions to process
     * @return The processed positions
     */
    public List<Position> processPositionsAsync(List<Position> positions) {
        log.info("Processing {} positions asynchronously", positions.size());
        
        List<CompletableFuture<Position>> futures = positions.stream()
            .map(position -> CompletableFuture.supplyAsync(() -> processPosition(position)))
            .collect(Collectors.toList());
        
        // Wait for all futures to complete
        CompletableFuture<Void> allFutures = CompletableFuture.allOf(
            futures.toArray(new CompletableFuture[0])
        );
        
        // When all futures complete, collect the results
        return allFutures.thenApply(v ->
            futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList())
        ).join();
    }

    /**
     * Processes a single position, calculating current and projected values
     *
     * @param position The position to process
     * @return The processed position
     */
    public Position processPosition(Position position) {
        log.debug("Processing position: {}", position.getId());
        
        try {
            // Calculate current position
            calculateCurrentPosition(position);
            
            // Calculate settlement ladder
            calculateSettlementLadder(position);
            
            // Calculate projected position
            calculateProjectedPosition(position);
            
            // Update status
            position.updateCalculationStatus("VALID", LocalDate.now());
            
            // Save and cache position
            position = positionRepository.save(position);
            cachePosition(position);
            
            return position;
        } catch (Exception e) {
            log.error("Error processing position: {}", position.getId(), e);
            position.updateCalculationStatus("ERROR", LocalDate.now());
            position = positionRepository.save(position);
            cachePosition(position);
            
            throw CalculationException.forPositionCalculation(position.getSecurity(), position.getBusinessDate(), 
                "Error processing position: " + e.getMessage(), e);
        }
    }

    /**
     * Caches a position for faster access
     *
     * @param position The position to cache
     */
    private void cachePosition(Position position) {
        String cacheKey = getCacheKey(
            position.getBookId(),
            position.getSecurity() != null ? position.getSecurity().getInternalId() : null,
            position.getBusinessDate()
        );
        
        positionCache.set(cacheKey, position);
        log.debug("Cached position with key: {}", cacheKey);
    }

    /**
     * Generates a cache key for a position
     *
     * @param bookId The book ID
     * @param securityId The security ID
     * @param businessDate The business date
     * @return The generated cache key
     */
    private String getCacheKey(String bookId, String securityId, LocalDate businessDate) {
        return bookId + ":" + securityId + ":" + businessDate;
    }

    /**
     * Clears the position cache
     */
    public void clearCache() {
        positionCache.clear();
        log.info("Position cache cleared");
    }

    /**
     * Validates a trade event before processing
     *
     * @param event The trade event to validate
     * @return True if the event is valid, false otherwise
     */
    private boolean validateTradeEvent(TradeDataEvent event) {
        if (event == null) {
            log.error("Trade event is null");
            return false;
        }
        
        if (event.getBookId() == null || event.getBookId().isEmpty()) {
            log.error("Trade event has no book ID: {}", event);
            return false;
        }
        
        if (event.getSecurityId() == null || event.getSecurityId().isEmpty()) {
            log.error("Trade event has no security ID: {}", event);
            return false;
        }
        
        if (event.getTradeDate() == null) {
            log.error("Trade event has no trade date: {}", event);
            return false;
        }
        
        if (event.getQuantity() == null || event.getQuantity().compareTo(BigDecimal.ZERO) == 0) {
            log.error("Trade event has no quantity or zero quantity: {}", event);
            return false;
        }
        
        return true;
    }

    /**
     * Validates a position event before processing
     *
     * @param event The position event to validate
     * @return True if the event is valid, false otherwise
     */
    private boolean validatePositionEvent(PositionEvent event) {
        if (event == null) {
            log.error("Position event is null");
            return false;
        }
        
        if (event.getBookId() == null || event.getBookId().isEmpty()) {
            log.error("Position event has no book ID: {}", event);
            return false;
        }
        
        if (event.getSecurityId() == null || event.getSecurityId().isEmpty()) {
            log.error("Position event has no security ID: {}", event);
            return false;
        }
        
        if (event.getBusinessDate() == null) {
            log.error("Position event has no business date: {}", event);
            return false;
        }
        
        return true;
    }
}