package com.ims.calculation.repository;

import com.ims.calculation.model.InventoryAvailability;
import com.ims.common.model.Security;
import com.ims.common.model.Counterparty;
import com.ims.common.model.AggregationUnit;
import com.ims.common.exception.NotFoundException;

import org.springframework.data.jpa.repository.JpaRepository; // version 3.1.0
import org.springframework.data.jpa.repository.Query; // version 3.1.0
import org.springframework.data.jpa.repository.Modifying; // version 3.1.0
import org.springframework.data.repository.query.Param; // version 3.1.0
import org.springframework.stereotype.Repository; // version 6.0.9
import org.springframework.transaction.annotation.Transactional; // version 6.0.9

import java.time.LocalDate; // version 17
import java.math.BigDecimal; // version 17
import java.util.List; // version 17
import java.util.Optional; // version 17

/**
 * Repository interface for managing inventory availability data in the Inventory Management System.
 * This repository provides methods for querying, saving, and manipulating inventory data,
 * supporting various inventory calculation requirements including for loan availability,
 * for pledge availability, short sell availability, and locate availability.
 * It includes specialized queries for market-specific rules and supports the high-performance
 * requirements of the system.
 */
@Repository
@Transactional(readOnly = true)
public interface InventoryRepository extends JpaRepository<InventoryAvailability, Long> {

    // Basic find methods
    List<InventoryAvailability> findBySecurityIdAndBusinessDate(String securityId, LocalDate businessDate);
    
    List<InventoryAvailability> findBySecurityIdAndCounterpartyIdAndBusinessDate(
            String securityId, String counterpartyId, LocalDate businessDate);
    
    List<InventoryAvailability> findBySecurityIdAndAggregationUnitIdAndBusinessDate(
            String securityId, String aggregationUnitId, LocalDate businessDate);
    
    List<InventoryAvailability> findBySecurityIdAndCalculationTypeAndBusinessDate(
            String securityId, String calculationType, LocalDate businessDate);
    
    List<InventoryAvailability> findByCounterpartyIdAndCalculationTypeAndBusinessDate(
            String counterpartyId, String calculationType, LocalDate businessDate);
    
    List<InventoryAvailability> findByAggregationUnitIdAndCalculationTypeAndBusinessDate(
            String aggregationUnitId, String calculationType, LocalDate businessDate);
    
    // Calculation type specific queries
    @Query("SELECT i FROM InventoryAvailability i WHERE i.calculationType = 'FOR_LOAN' AND i.businessDate = :businessDate")
    List<InventoryAvailability> findForLoanAvailability(@Param("businessDate") LocalDate businessDate);
    
    @Query("SELECT i FROM InventoryAvailability i WHERE i.calculationType = 'FOR_PLEDGE' AND i.businessDate = :businessDate")
    List<InventoryAvailability> findForPledgeAvailability(@Param("businessDate") LocalDate businessDate);
    
    @Query("SELECT i FROM InventoryAvailability i WHERE i.calculationType = 'SHORT_SELL' AND i.businessDate = :businessDate")
    List<InventoryAvailability> findShortSellAvailability(@Param("businessDate") LocalDate businessDate);
    
    @Query("SELECT i FROM InventoryAvailability i WHERE i.calculationType = 'LONG_SELL' AND i.businessDate = :businessDate")
    List<InventoryAvailability> findLongSellAvailability(@Param("businessDate") LocalDate businessDate);
    
    @Query("SELECT i FROM InventoryAvailability i WHERE i.calculationType = 'LOCATE' AND i.businessDate = :businessDate")
    List<InventoryAvailability> findLocateAvailability(@Param("businessDate") LocalDate businessDate);
    
    @Query("SELECT i FROM InventoryAvailability i WHERE i.calculationType = 'OVERBORROW' AND i.businessDate = :businessDate")
    List<InventoryAvailability> findOverborrow(@Param("businessDate") LocalDate businessDate);
    
    // Market-specific queries
    List<InventoryAvailability> findByMarketAndBusinessDate(String market, LocalDate businessDate);
    
    List<InventoryAvailability> findByMarketAndCalculationTypeAndBusinessDate(
            String market, String calculationType, LocalDate businessDate);
    
    // Security temperature queries
    @Query("SELECT i FROM InventoryAvailability i WHERE i.securityTemperature = 'HTB' AND i.businessDate = :businessDate")
    List<InventoryAvailability> findHardToBorrowSecurities(@Param("businessDate") LocalDate businessDate);
    
    @Query("SELECT i FROM InventoryAvailability i WHERE i.securityTemperature = 'GC' AND i.businessDate = :businessDate")
    List<InventoryAvailability> findGeneralCollateralSecurities(@Param("businessDate") LocalDate businessDate);
    
    // External source queries
    @Query("SELECT i FROM InventoryAvailability i WHERE i.isExternalSource = true AND i.businessDate = :businessDate")
    List<InventoryAvailability> findByExternalSource(@Param("businessDate") LocalDate businessDate);
    
    @Query("SELECT i FROM InventoryAvailability i WHERE i.isExternalSource = true AND i.externalSourceName = :externalSourceName AND i.businessDate = :businessDate")
    List<InventoryAvailability> findByExternalSourceAndName(
            @Param("externalSourceName") String externalSourceName, @Param("businessDate") LocalDate businessDate);
    
    // Status queries
    @Query("SELECT i FROM InventoryAvailability i WHERE i.status = 'ACTIVE' AND i.businessDate = :businessDate")
    List<InventoryAvailability> findActiveInventory(@Param("businessDate") LocalDate businessDate);
    
    // Rule-based queries
    List<InventoryAvailability> findByCalculationRuleIdAndBusinessDate(String calculationRuleId, LocalDate businessDate);
    
    // Update operations
    @Modifying
    @Transactional
    @Query("UPDATE InventoryAvailability i SET i.availableQuantity = :availableQuantity WHERE i.id = :id")
    int updateAvailableQuantity(@Param("id") Long id, @Param("availableQuantity") BigDecimal availableQuantity);
    
    @Modifying
    @Transactional
    @Query("UPDATE InventoryAvailability i SET i.reservedQuantity = :reservedQuantity WHERE i.id = :id")
    int updateReservedQuantity(@Param("id") Long id, @Param("reservedQuantity") BigDecimal reservedQuantity);
    
    @Modifying
    @Transactional
    @Query("UPDATE InventoryAvailability i SET i.decrementQuantity = :decrementQuantity WHERE i.id = :id")
    int updateDecrementQuantity(@Param("id") Long id, @Param("decrementQuantity") BigDecimal decrementQuantity);
    
    @Modifying
    @Transactional
    @Query("UPDATE InventoryAvailability i SET i.reservedQuantity = i.reservedQuantity + :amount, i.availableQuantity = i.availableQuantity - :amount WHERE i.id = :id")
    int incrementReservedQuantity(@Param("id") Long id, @Param("amount") BigDecimal amount);
    
    @Modifying
    @Transactional
    @Query("UPDATE InventoryAvailability i SET i.reservedQuantity = i.reservedQuantity - :amount, i.availableQuantity = i.availableQuantity + :amount WHERE i.id = :id")
    int decrementReservedQuantity(@Param("id") Long id, @Param("amount") BigDecimal amount);
    
    @Modifying
    @Transactional
    @Query("UPDATE InventoryAvailability i SET i.decrementQuantity = i.decrementQuantity + :amount WHERE i.id = :id")
    int incrementDecrementQuantity(@Param("id") Long id, @Param("amount") BigDecimal amount);
    
    @Modifying
    @Transactional
    @Query("UPDATE InventoryAvailability i SET i.decrementQuantity = i.decrementQuantity - :amount WHERE i.id = :id")
    int decrementDecrementQuantity(@Param("id") Long id, @Param("amount") BigDecimal amount);
    
    @Modifying
    @Transactional
    @Query("UPDATE InventoryAvailability i SET i.status = :status WHERE i.id = :id")
    int updateStatus(@Param("id") Long id, @Param("status") String status);
    
    // Data maintenance
    @Modifying
    @Transactional
    @Query("DELETE FROM InventoryAvailability i WHERE i.businessDate < :date")
    int deleteByBusinessDateBefore(@Param("date") LocalDate date);
    
    // Helper methods
    default InventoryAvailability getInventoryById(Long id) {
        return findById(id).orElseThrow(() -> 
            new NotFoundException("InventoryAvailability", id.toString()));
    }
    
    // Standard JpaRepository methods with @Transactional annotation for write operations
    @Override
    @Transactional
    <S extends InventoryAvailability> S save(S entity);
    
    @Override
    @Transactional
    <S extends InventoryAvailability> List<S> saveAll(Iterable<S> entities);
    
    @Override
    @Transactional
    void deleteById(Long id);
}