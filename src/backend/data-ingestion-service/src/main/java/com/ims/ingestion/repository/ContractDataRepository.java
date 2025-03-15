package com.ims.ingestion.repository;

import com.ims.ingestion.model.ContractData;
import org.springframework.data.jpa.repository.JpaRepository; // version 3.1.0
import org.springframework.data.jpa.repository.Query; // version 3.1.0
import org.springframework.data.repository.query.Param; // version 3.1.0
import org.springframework.stereotype.Repository; // version 6.0.9

import java.util.List; // version 17
import java.util.Optional; // version 17
import java.time.LocalDate; // version 17

/**
 * Repository interface for accessing and managing contract data in the Inventory Management System.
 * Provides methods for querying, storing, and retrieving ContractData entities during the ingestion process,
 * supporting both batch and real-time contract data processing for security financing contracts and
 * swap contracts.
 */
@Repository
public interface ContractDataRepository extends JpaRepository<ContractData, Long> {

    /**
     * Finds a contract data by its external contract ID
     *
     * @param externalContractId The external contract ID
     * @return The contract data if found, or empty Optional otherwise
     */
    Optional<ContractData> findByExternalContractId(String externalContractId);

    /**
     * Finds all contract data associated with a specific batch ID
     *
     * @param batchId The batch ID
     * @return List of contract data with the specified batch ID
     */
    List<ContractData> findByBatchId(String batchId);

    /**
     * Finds all contract data with a specific processing status
     *
     * @param processingStatus The processing status
     * @return List of contract data with the specified processing status
     */
    List<ContractData> findByProcessingStatus(String processingStatus);

    /**
     * Finds all contract data with a specific batch ID and processing status
     *
     * @param batchId The batch ID
     * @param processingStatus The processing status
     * @return List of contract data with the specified batch ID and processing status
     */
    List<ContractData> findByBatchIdAndProcessingStatus(String batchId, String processingStatus);

    /**
     * Counts the number of contract data items with a specific batch ID
     *
     * @param batchId The batch ID
     * @return The count of contract data items with the specified batch ID
     */
    long countByBatchId(String batchId);

    /**
     * Counts the number of contract data items with a specific batch ID and processing status
     *
     * @param batchId The batch ID
     * @param processingStatus The processing status
     * @return The count of contract data items with the specified batch ID and processing status
     */
    long countByBatchIdAndProcessingStatus(String batchId, String processingStatus);
    
    /**
     * Finds contracts with duplicate external IDs within the system
     *
     * @return List of contract data with duplicate external IDs
     */
    @Query("SELECT c FROM ContractData c WHERE EXISTS (SELECT c2 FROM ContractData c2 WHERE c2.externalContractId = c.externalContractId AND c2.id != c.id)")
    List<ContractData> findDuplicateContracts();

    /**
     * Finds all contracts of a specific type
     *
     * @param contractType The contract type
     * @return List of contracts of the specified type
     */
    List<ContractData> findByContractType(String contractType);

    /**
     * Finds all contracts of a specific type and direction
     *
     * @param contractType The contract type
     * @param direction The direction (BORROW or LOAN)
     * @return List of contracts of the specified type and direction
     */
    List<ContractData> findByContractTypeAndDirection(String contractType, String direction);

    /**
     * Finds all contracts for a specific security
     *
     * @param securityId The security ID
     * @return List of contracts for the specified security
     */
    List<ContractData> findBySecurityId(String securityId);

    /**
     * Finds all contracts for a specific counterparty
     *
     * @param counterpartyId The counterparty ID
     * @return List of contracts for the specified counterparty
     */
    List<ContractData> findByCounterpartyId(String counterpartyId);

    /**
     * Finds all contracts with a specific status
     *
     * @param status The status
     * @return List of contracts with the specified status
     */
    List<ContractData> findByStatus(String status);

    /**
     * Finds all active contracts in the system
     *
     * @return List of active contracts
     */
    @Query("SELECT c FROM ContractData c WHERE c.status = 'ACTIVE'")
    List<ContractData> findActiveContracts();

    /**
     * Finds all contracts expiring within a date range
     *
     * @param startDate The start date
     * @param endDate The end date
     * @return List of contracts expiring within the date range
     */
    List<ContractData> findByEndDateBetween(LocalDate startDate, LocalDate endDate);

    /**
     * Finds all contracts from a specific data source
     *
     * @param dataSource The data source
     * @return List of contracts from the specified data source
     */
    List<ContractData> findByDataSource(String dataSource);

    /**
     * Finds all contracts from a specific data source with a specific processing status
     *
     * @param dataSource The data source
     * @param processingStatus The processing status
     * @return List of contracts from the specified data source with the specified processing status
     */
    List<ContractData> findByDataSourceAndProcessingStatus(String dataSource, String processingStatus);

    /**
     * Deletes all contract data with a specific batch ID
     *
     * @param batchId The batch ID
     */
    void deleteByBatchId(String batchId);
}