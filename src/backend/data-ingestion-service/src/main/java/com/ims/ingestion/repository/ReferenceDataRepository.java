package com.ims.ingestion.repository;

import com.ims.ingestion.model.SecurityReferenceData;
import org.springframework.data.jpa.repository.JpaRepository; // version 3.1.0
import org.springframework.data.jpa.repository.Query; // version 3.1.0
import org.springframework.data.repository.query.Param; // version 3.1.0
import org.springframework.stereotype.Repository; // version 6.0.9

import java.util.List; // version 17
import java.util.Optional; // version 17

/**
 * Repository interface for accessing and managing security reference data in the Inventory Management System.
 * Provides methods for querying, storing, and retrieving SecurityReferenceData entities during the ingestion process,
 * supporting the multi-source data integration requirement and conflict detection.
 */
@Repository
public interface ReferenceDataRepository extends JpaRepository<SecurityReferenceData, Long> {

    /**
     * Finds a security reference data by its external ID, identifier type, and source
     *
     * @param externalId The external ID of the security
     * @param identifierType The type of the identifier
     * @param source The source of the data
     * @return The security reference data if found, or empty Optional otherwise
     */
    Optional<SecurityReferenceData> findByExternalIdAndIdentifierTypeAndSource(String externalId, String identifierType, String source);

    /**
     * Finds all security reference data associated with a specific batch ID
     *
     * @param batchId The batch ID
     * @return List of security reference data with the specified batch ID
     */
    List<SecurityReferenceData> findByBatchId(String batchId);

    /**
     * Finds all security reference data with a specific processing status
     *
     * @param processingStatus The processing status
     * @return List of security reference data with the specified processing status
     */
    List<SecurityReferenceData> findByProcessingStatus(String processingStatus);

    /**
     * Finds all security reference data with a specific batch ID and processing status
     *
     * @param batchId The batch ID
     * @param processingStatus The processing status
     * @return List of security reference data with the specified batch ID and processing status
     */
    List<SecurityReferenceData> findByBatchIdAndProcessingStatus(String batchId, String processingStatus);

    /**
     * Counts the number of security reference data items with a specific batch ID
     *
     * @param batchId The batch ID
     * @return The count of security reference data items with the specified batch ID
     */
    long countByBatchId(String batchId);

    /**
     * Counts the number of security reference data items with a specific batch ID and processing status
     *
     * @param batchId The batch ID
     * @param processingStatus The processing status
     * @return The count of security reference data items with the specified batch ID and processing status
     */
    long countByBatchIdAndProcessingStatus(String batchId, String processingStatus);

    /**
     * Finds securities with conflicting data from different sources based on primary identifiers (ISIN, CUSIP, SEDOL)
     *
     * @return List of security reference data with conflicts
     */
    @Query(value = "SELECT s FROM SecurityReferenceData s WHERE EXISTS (SELECT s2 FROM SecurityReferenceData s2 WHERE ((s.isin IS NOT NULL AND s.isin = s2.isin) OR (s.cusip IS NOT NULL AND s.cusip = s2.cusip) OR (s.sedol IS NOT NULL AND s.sedol = s2.sedol)) AND s.source != s2.source AND (s.securityType != s2.securityType OR s.issuer != s2.issuer OR s.currency != s2.currency OR s.market != s2.market))")
    List<SecurityReferenceData> findConflictingSecurities();

    /**
     * Finds security reference data by ISIN, CUSIP, or SEDOL identifiers
     *
     * @param isin The ISIN identifier
     * @param cusip The CUSIP identifier
     * @param sedol The SEDOL identifier
     * @return List of security reference data matching any of the provided identifiers
     */
    @Query("SELECT s FROM SecurityReferenceData s WHERE (s.isin = :isin AND :isin IS NOT NULL) OR (s.cusip = :cusip AND :cusip IS NOT NULL) OR (s.sedol = :sedol AND :sedol IS NOT NULL)")
    List<SecurityReferenceData> findByIsinOrCusipOrSedol(
            @Param("isin") String isin, 
            @Param("cusip") String cusip, 
            @Param("sedol") String sedol);

    /**
     * Finds all security reference data from a specific source with a specific processing status
     *
     * @param source The source of the data
     * @param processingStatus The processing status
     * @return List of security reference data from the specified source with the specified processing status
     */
    List<SecurityReferenceData> findBySourceAndProcessingStatus(String source, String processingStatus);

    /**
     * Deletes all security reference data with a specific batch ID
     *
     * @param batchId The batch ID
     */
    void deleteByBatchId(String batchId);

    /**
     * Finds duplicate security reference data within a batch based on external ID, identifier type, and source
     *
     * @param batchId The batch ID
     * @return List of duplicate security reference data in the batch
     */
    @Query("SELECT s FROM SecurityReferenceData s WHERE s.batchId = :batchId AND EXISTS (SELECT s2 FROM SecurityReferenceData s2 WHERE s2.batchId = :batchId AND s2.externalId = s.externalId AND s2.identifierType = s.identifierType AND s2.source = s.source AND s2.id != s.id)")
    List<SecurityReferenceData> findDuplicatesByBatchId(@Param("batchId") String batchId);
}