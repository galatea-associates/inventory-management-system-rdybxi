package com.ims.ingestion.exception;

import lombok.Getter; // lombok 1.18.26
import java.util.UUID; // JDK 17

import com.ims.common.exception.ServiceException;

/**
 * Exception thrown when data ingestion failures occur. This is a specialized ServiceException
 * with predefined error codes for different types of ingestion failures and additional context
 * about the data being ingested.
 */
@Getter
public class IngestionException extends ServiceException {

    private static final String SERVICE_NAME = "DATA_INGESTION_SERVICE";
    private static final String ERROR_CODE_REFERENCE_DATA = "REFERENCE_DATA_ERROR";
    private static final String ERROR_CODE_MARKET_DATA = "MARKET_DATA_ERROR";
    private static final String ERROR_CODE_TRADE_DATA = "TRADE_DATA_ERROR";
    private static final String ERROR_CODE_CONTRACT_DATA = "CONTRACT_DATA_ERROR";

    private final String dataType;
    private final String externalId;
    private final String source;
    private final String batchId;

    /**
     * Constructor with data type, message, and cause.
     *
     * @param dataType  The type of data being ingested
     * @param errorCode The error code identifying the error type
     * @param message   The error message
     * @param cause     The cause of this exception
     */
    public IngestionException(String dataType, String errorCode, String message, Throwable cause) {
        super(SERVICE_NAME, errorCode, message, cause);
        this.dataType = dataType;
        this.externalId = null;
        this.source = null;
        this.batchId = null;
    }

    /**
     * Constructor with data type, external ID, source, message, and cause.
     *
     * @param dataType   The type of data being ingested
     * @param errorCode  The error code identifying the error type
     * @param externalId The external identifier of the data entity
     * @param source     The source system or provider of the data
     * @param message    The error message
     * @param cause      The cause of this exception
     */
    public IngestionException(String dataType, String errorCode, String externalId, String source, String message, Throwable cause) {
        super(SERVICE_NAME, errorCode, message, cause);
        this.dataType = dataType;
        this.externalId = externalId;
        this.source = source;
        this.batchId = null;
    }

    /**
     * Constructor with data type, external ID, source, batch ID, message, and cause.
     *
     * @param dataType   The type of data being ingested
     * @param errorCode  The error code identifying the error type
     * @param externalId The external identifier of the data entity
     * @param source     The source system or provider of the data
     * @param batchId    The batch identifier for batch processing
     * @param message    The error message
     * @param cause      The cause of this exception
     */
    public IngestionException(String dataType, String errorCode, String externalId, String source, String batchId, String message, Throwable cause) {
        super(SERVICE_NAME, errorCode, message, cause);
        this.dataType = dataType;
        this.externalId = externalId;
        this.source = source;
        this.batchId = batchId;
    }

    /**
     * Creates an exception for reference data ingestion failures.
     *
     * @param message The error message
     * @return A new exception for reference data errors
     */
    public static IngestionException forReferenceData(String message) {
        return new IngestionException("REFERENCE_DATA", ERROR_CODE_REFERENCE_DATA, message, null);
    }

    /**
     * Creates an exception for reference data ingestion failures with cause.
     *
     * @param message The error message
     * @param cause   The cause of this exception
     * @return A new exception for reference data errors
     */
    public static IngestionException forReferenceData(String message, Throwable cause) {
        return new IngestionException("REFERENCE_DATA", ERROR_CODE_REFERENCE_DATA, message, cause);
    }

    /**
     * Creates an exception for reference data ingestion failures with external ID and source.
     *
     * @param externalId The external identifier of the data entity
     * @param source     The source system or provider of the data
     * @param message    The error message
     * @return A new exception for reference data errors
     */
    public static IngestionException forReferenceData(String externalId, String source, String message) {
        return new IngestionException("REFERENCE_DATA", ERROR_CODE_REFERENCE_DATA, externalId, source, message, null);
    }

    /**
     * Creates an exception for reference data ingestion failures with external ID, source, and cause.
     *
     * @param externalId The external identifier of the data entity
     * @param source     The source system or provider of the data
     * @param message    The error message
     * @param cause      The cause of this exception
     * @return A new exception for reference data errors
     */
    public static IngestionException forReferenceData(String externalId, String source, String message, Throwable cause) {
        return new IngestionException("REFERENCE_DATA", ERROR_CODE_REFERENCE_DATA, externalId, source, message, cause);
    }

    /**
     * Creates an exception for reference data ingestion failures with external ID, source, batch ID, and cause.
     *
     * @param externalId The external identifier of the data entity
     * @param source     The source system or provider of the data
     * @param batchId    The batch identifier for batch processing
     * @param message    The error message
     * @param cause      The cause of this exception
     * @return A new exception for reference data errors
     */
    public static IngestionException forReferenceData(String externalId, String source, String batchId, String message, Throwable cause) {
        return new IngestionException("REFERENCE_DATA", ERROR_CODE_REFERENCE_DATA, externalId, source, batchId, message, cause);
    }

    /**
     * Creates an exception for market data ingestion failures.
     *
     * @param message The error message
     * @return A new exception for market data errors
     */
    public static IngestionException forMarketData(String message) {
        return new IngestionException("MARKET_DATA", ERROR_CODE_MARKET_DATA, message, null);
    }

    /**
     * Creates an exception for market data ingestion failures with cause.
     *
     * @param message The error message
     * @param cause   The cause of this exception
     * @return A new exception for market data errors
     */
    public static IngestionException forMarketData(String message, Throwable cause) {
        return new IngestionException("MARKET_DATA", ERROR_CODE_MARKET_DATA, message, cause);
    }

    /**
     * Creates an exception for market data ingestion failures with external ID and source.
     *
     * @param externalId The external identifier of the data entity
     * @param source     The source system or provider of the data
     * @param message    The error message
     * @return A new exception for market data errors
     */
    public static IngestionException forMarketData(String externalId, String source, String message) {
        return new IngestionException("MARKET_DATA", ERROR_CODE_MARKET_DATA, externalId, source, message, null);
    }

    /**
     * Creates an exception for market data ingestion failures with external ID, source, and cause.
     *
     * @param externalId The external identifier of the data entity
     * @param source     The source system or provider of the data
     * @param message    The error message
     * @param cause      The cause of this exception
     * @return A new exception for market data errors
     */
    public static IngestionException forMarketData(String externalId, String source, String message, Throwable cause) {
        return new IngestionException("MARKET_DATA", ERROR_CODE_MARKET_DATA, externalId, source, message, cause);
    }

    /**
     * Creates an exception for trade data ingestion failures.
     *
     * @param message The error message
     * @return A new exception for trade data errors
     */
    public static IngestionException forTradeData(String message) {
        return new IngestionException("TRADE_DATA", ERROR_CODE_TRADE_DATA, message, null);
    }

    /**
     * Creates an exception for trade data ingestion failures with cause.
     *
     * @param message The error message
     * @param cause   The cause of this exception
     * @return A new exception for trade data errors
     */
    public static IngestionException forTradeData(String message, Throwable cause) {
        return new IngestionException("TRADE_DATA", ERROR_CODE_TRADE_DATA, message, cause);
    }

    /**
     * Creates an exception for trade data ingestion failures with external ID and source.
     *
     * @param externalId The external identifier of the data entity
     * @param source     The source system or provider of the data
     * @param message    The error message
     * @return A new exception for trade data errors
     */
    public static IngestionException forTradeData(String externalId, String source, String message) {
        return new IngestionException("TRADE_DATA", ERROR_CODE_TRADE_DATA, externalId, source, message, null);
    }

    /**
     * Creates an exception for trade data ingestion failures with external ID, source, and cause.
     *
     * @param externalId The external identifier of the data entity
     * @param source     The source system or provider of the data
     * @param message    The error message
     * @param cause      The cause of this exception
     * @return A new exception for trade data errors
     */
    public static IngestionException forTradeData(String externalId, String source, String message, Throwable cause) {
        return new IngestionException("TRADE_DATA", ERROR_CODE_TRADE_DATA, externalId, source, message, cause);
    }

    /**
     * Creates an exception for contract data ingestion failures.
     *
     * @param message The error message
     * @return A new exception for contract data errors
     */
    public static IngestionException forContractData(String message) {
        return new IngestionException("CONTRACT_DATA", ERROR_CODE_CONTRACT_DATA, message, null);
    }

    /**
     * Creates an exception for contract data ingestion failures with cause.
     *
     * @param message The error message
     * @param cause   The cause of this exception
     * @return A new exception for contract data errors
     */
    public static IngestionException forContractData(String message, Throwable cause) {
        return new IngestionException("CONTRACT_DATA", ERROR_CODE_CONTRACT_DATA, message, cause);
    }

    /**
     * Creates an exception for contract data ingestion failures with external ID and source.
     *
     * @param externalId The external identifier of the data entity
     * @param source     The source system or provider of the data
     * @param message    The error message
     * @return A new exception for contract data errors
     */
    public static IngestionException forContractData(String externalId, String source, String message) {
        return new IngestionException("CONTRACT_DATA", ERROR_CODE_CONTRACT_DATA, externalId, source, message, null);
    }

    /**
     * Creates an exception for contract data ingestion failures with external ID, source, and cause.
     *
     * @param externalId The external identifier of the data entity
     * @param source     The source system or provider of the data
     * @param message    The error message
     * @param cause      The cause of this exception
     * @return A new exception for contract data errors
     */
    public static IngestionException forContractData(String externalId, String source, String message, Throwable cause) {
        return new IngestionException("CONTRACT_DATA", ERROR_CODE_CONTRACT_DATA, externalId, source, message, cause);
    }

    /**
     * Creates a new exception with the specified external ID.
     *
     * @param externalId The new external ID
     * @return A new exception with the specified external ID
     */
    public IngestionException withExternalId(String externalId) {
        return new IngestionException(
            this.dataType,
            this.getErrorCode(),
            externalId,
            this.source,
            this.batchId,
            this.getMessage(),
            this.getCause()
        );
    }

    /**
     * Creates a new exception with the specified source.
     *
     * @param source The new source
     * @return A new exception with the specified source
     */
    public IngestionException withSource(String source) {
        return new IngestionException(
            this.dataType,
            this.getErrorCode(),
            this.externalId,
            source,
            this.batchId,
            this.getMessage(),
            this.getCause()
        );
    }

    /**
     * Creates a new exception with the specified batch ID.
     *
     * @param batchId The new batch ID
     * @return A new exception with the specified batch ID
     */
    public IngestionException withBatchId(String batchId) {
        return new IngestionException(
            this.dataType,
            this.getErrorCode(),
            this.externalId,
            this.source,
            batchId,
            this.getMessage(),
            this.getCause()
        );
    }

    /**
     * Creates a new exception with the specified correlation ID.
     *
     * @param correlationId The new correlation ID
     * @return A new exception with the specified correlation ID
     */
    @Override
    public IngestionException withCorrelationId(UUID correlationId) {
        ServiceException newException = super.withCorrelationId(correlationId);
        
        // Create new IngestionException with the same properties
        return new IngestionException(
            this.dataType,
            newException.getErrorCode(),
            this.externalId,
            this.source,
            this.batchId,
            newException.getMessage(),
            newException.getCause()
        );
    }
}