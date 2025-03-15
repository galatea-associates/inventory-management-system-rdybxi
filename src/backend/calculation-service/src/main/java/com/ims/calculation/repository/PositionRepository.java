package com.ims.calculation.repository;

import com.ims.calculation.model.Position;
import com.ims.common.model.Security;
import com.ims.common.model.Counterparty;
import com.ims.common.model.AggregationUnit;

import org.springframework.data.jpa.repository.JpaRepository; // version 3.1.0
import org.springframework.data.jpa.repository.Query; // version 3.1.0
import org.springframework.data.jpa.repository.Modifying; // version 3.1.0
import org.springframework.data.repository.query.Param; // version 3.1.0
import org.springframework.stereotype.Repository; // version 6.0.9

import java.time.LocalDate; // version 17
import java.util.List; // version 17
import java.util.Optional; // version 17

/**
 * Repository interface for Position entities in the calculation service.
 * Provides methods for querying and managing position data to support real-time position calculations,
 * settlement ladder projections, and inventory availability calculations.
 */
@Repository
public interface PositionRepository extends JpaRepository<Position, Long> {

    /**
     * Finds a position for a specific book, security, and business date.
     * 
     * @param bookId The book ID
     * @param security The security
     * @param businessDate The business date
     * @return The position if found, or empty if not found
     */
    Optional<Position> findByBookIdAndSecurityAndBusinessDate(String bookId, Security security, LocalDate businessDate);

    /**
     * Finds all positions for a specific security and business date.
     * 
     * @param security The security
     * @param businessDate The business date
     * @return List of positions for the security and business date
     */
    List<Position> findBySecurityAndBusinessDate(Security security, LocalDate businessDate);

    /**
     * Finds all positions for a specific counterparty and business date.
     * 
     * @param counterparty The counterparty
     * @param businessDate The business date
     * @return List of positions for the counterparty and business date
     */
    List<Position> findByCounterpartyAndBusinessDate(Counterparty counterparty, LocalDate businessDate);

    /**
     * Finds all positions for a specific aggregation unit and business date.
     * 
     * @param aggregationUnit The aggregation unit
     * @param businessDate The business date
     * @return List of positions for the aggregation unit and business date
     */
    List<Position> findByAggregationUnitAndBusinessDate(AggregationUnit aggregationUnit, LocalDate businessDate);

    /**
     * Finds all positions for a specific business date.
     * 
     * @param businessDate The business date
     * @return List of positions for the business date
     */
    List<Position> findByBusinessDate(LocalDate businessDate);

    /**
     * Finds all positions for a specific business date with a specific calculation status.
     * 
     * @param businessDate The business date
     * @param calculationStatus The calculation status
     * @return List of positions for the business date with the specified calculation status
     */
    List<Position> findByBusinessDateAndCalculationStatus(LocalDate businessDate, String calculationStatus);

    /**
     * Finds all positions for a specific security and business date with a specific calculation status.
     * 
     * @param security The security
     * @param businessDate The business date
     * @param calculationStatus The calculation status
     * @return List of positions for the security and business date with the specified calculation status
     */
    List<Position> findBySecurityAndBusinessDateAndCalculationStatus(Security security, LocalDate businessDate, String calculationStatus);

    /**
     * Finds all long positions (positive settled quantity) for a specific business date.
     * 
     * @param businessDate The business date
     * @return List of long positions for the business date
     */
    @Query("SELECT p FROM Position p WHERE p.businessDate = :businessDate AND p.settledQty > 0")
    List<Position> findLongPositions(@Param("businessDate") LocalDate businessDate);

    /**
     * Finds all short positions (negative settled quantity) for a specific business date.
     * 
     * @param businessDate The business date
     * @return List of short positions for the business date
     */
    @Query("SELECT p FROM Position p WHERE p.businessDate = :businessDate AND p.settledQty < 0")
    List<Position> findShortPositions(@Param("businessDate") LocalDate businessDate);

    /**
     * Finds all hypothecatable positions for a specific business date.
     * 
     * @param businessDate The business date
     * @return List of hypothecatable positions for the business date
     */
    @Query("SELECT p FROM Position p WHERE p.businessDate = :businessDate AND p.isHypothecatable = true")
    List<Position> findHypothecatablePositions(@Param("businessDate") LocalDate businessDate);

    /**
     * Finds all reserved positions for a specific business date.
     * 
     * @param businessDate The business date
     * @return List of reserved positions for the business date
     */
    @Query("SELECT p FROM Position p WHERE p.businessDate = :businessDate AND p.isReserved = true")
    List<Position> findReservedPositions(@Param("businessDate") LocalDate businessDate);

    /**
     * Finds all start-of-day positions for a specific business date.
     * 
     * @param businessDate The business date
     * @return List of start-of-day positions for the business date
     */
    @Query("SELECT p FROM Position p WHERE p.businessDate = :businessDate AND p.isStartOfDay = true")
    List<Position> findStartOfDayPositions(@Param("businessDate") LocalDate businessDate);

    /**
     * Finds all positions with settlement activity for a specific business date.
     * 
     * @param businessDate The business date
     * @return List of positions with settlement activity for the business date
     */
    @Query("SELECT p FROM Position p WHERE p.businessDate = :businessDate AND (p.sd0Deliver > 0 OR p.sd0Receipt > 0 OR p.sd1Deliver > 0 OR p.sd1Receipt > 0 OR p.sd2Deliver > 0 OR p.sd2Receipt > 0 OR p.sd3Deliver > 0 OR p.sd3Receipt > 0 OR p.sd4Deliver > 0 OR p.sd4Receipt > 0)")
    List<Position> findPositionsWithSettlementActivity(@Param("businessDate") LocalDate businessDate);

    /**
     * Updates the calculation status for a position.
     * 
     * @param id The position ID
     * @param calculationStatus The new calculation status
     * @param calculationDate The calculation date
     * @return Number of records updated
     */
    @Modifying
    @Query("UPDATE Position p SET p.calculationStatus = :calculationStatus, p.calculationDate = :calculationDate WHERE p.id = :id")
    int updateCalculationStatus(@Param("id") Long id, @Param("calculationStatus") String calculationStatus, @Param("calculationDate") LocalDate calculationDate);

    /**
     * Updates the calculation status for all positions on a business date.
     * 
     * @param calculationStatus The new calculation status
     * @param calculationDate The calculation date
     * @param businessDate The business date
     * @return Number of records updated
     */
    @Modifying
    @Query("UPDATE Position p SET p.calculationStatus = :calculationStatus, p.calculationDate = :calculationDate WHERE p.businessDate = :businessDate")
    int bulkUpdateCalculationStatus(@Param("calculationStatus") String calculationStatus, @Param("calculationDate") LocalDate calculationDate, @Param("businessDate") LocalDate businessDate);

    /**
     * Counts the number of positions for a specific business date.
     * 
     * @param businessDate The business date
     * @return Number of positions for the business date
     */
    long countByBusinessDate(LocalDate businessDate);

    /**
     * Counts the number of positions for a specific business date with a specific calculation status.
     * 
     * @param businessDate The business date
     * @param calculationStatus The calculation status
     * @return Number of positions for the business date with the specified calculation status
     */
    long countByBusinessDateAndCalculationStatus(LocalDate businessDate, String calculationStatus);

    /**
     * Deletes all positions for a specific business date.
     * 
     * @param businessDate The business date
     */
    void deleteByBusinessDate(LocalDate businessDate);
}