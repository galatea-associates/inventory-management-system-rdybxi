package com.ims.ingestion.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import java.util.HashSet;
import java.util.Optional;
import java.util.stream.Collectors;
import java.time.LocalDate;

import com.ims.common.model.Security;
import com.ims.common.model.SecurityIdentifier;
import com.ims.common.model.Counterparty;
import com.ims.common.model.CounterpartyIdentifier;
import com.ims.common.model.AggregationUnit;
import com.ims.common.model.IndexComposition;
import com.ims.ingestion.model.SecurityReferenceData;
import com.ims.ingestion.repository.ReferenceDataRepository;
import com.ims.common.event.ReferenceDataEvent;
import com.ims.common.util.SecurityIdMappingUtil;
import com.ims.common.exception.ValidationException;
import com.ims.common.exception.NotFoundException;
import com.ims.ingestion.exception.IngestionException;

/**
 * Service responsible for mapping data from various external sources to the internal data model
 * in the Inventory Management System. This service handles the transformation of raw reference
 * data into standardized domain entities, resolves conflicts between different data sources,
 * and ensures data integrity and consistency across the system.
 */
@Service
@Slf4j
@Transactional
public class DataMappingService {

    private static final Map<String, Integer> SOURCE_PRIORITIES = new HashMap<>();
    private static final Map<String, String> SOURCE_NAMES = new HashMap<>();
    
    static {
        // Initialize source priorities (lower values = higher priority)
        SOURCE_PRIORITIES.put("REUTERS", 10);
        SOURCE_PRIORITIES.put("BLOOMBERG", 20);
        SOURCE_PRIORITIES.put("MARKIT", 30);
        SOURCE_PRIORITIES.put("ULTUMUS", 40);
        SOURCE_PRIORITIES.put("RIMES", 50);
        
        // Initialize source display names
        SOURCE_NAMES.put("REUTERS", "Reuters");
        SOURCE_NAMES.put("BLOOMBERG", "Bloomberg");
        SOURCE_NAMES.put("MARKIT", "MarkIT");
        SOURCE_NAMES.put("ULTUMUS", "Ultumus");
        SOURCE_NAMES.put("RIMES", "RIMES");
    }
    
    @Autowired
    private ReferenceDataRepository referenceDataRepository;
    
    /**
     * Maps raw security reference data to the internal Security domain model.
     * 
     * @param referenceData SecurityReferenceData containing raw security information
     * @return The mapped Security entity
     * @throws ValidationException if the reference data fails validation
     * @throws IngestionException if an error occurs during the mapping process
     */
    public Security mapSecurityReferenceData(SecurityReferenceData referenceData) {
        log.debug("Mapping security reference data: {}", referenceData);
        
        // Validate reference data
        validateReferenceData(referenceData, "Security");
        
        // Find existing securities that might match this one
        List<SecurityReferenceData> potentialMatches = referenceDataRepository.findByIsinOrCusipOrSedol(
            referenceData.getIsin(), 
            referenceData.getCusip(), 
            referenceData.getSedol()
        );
        
        // Convert potential matches to Security entities
        List<Security> existingSecurities = new ArrayList<>(); 
        // In a real implementation, would fetch from a security repository
        
        // Try to find an existing security to update
        Optional<Security> existingSecurity = findExistingSecurity(referenceData, existingSecurities);
        
        Security security;
        boolean isNewSecurity = false;
        
        if (existingSecurity.isPresent()) {
            // Update existing security
            security = existingSecurity.get();
            log.debug("Found existing security with ID: {}", security.getInternalId());
            
            // Detect and resolve conflicts if any
            security = detectAndResolveConflicts(security, referenceData);
        } else {
            // Create new security
            security = new Security();
            isNewSecurity = true;
            log.debug("Creating new security from reference data");
        }
        
        // Map basic attributes
        mapBasicSecurityAttributes(security, referenceData);
        
        // Create and add identifiers
        addSecurityIdentifiers(security, referenceData);
        
        // Generate internal ID if needed
        if (isNewSecurity || security.getInternalId() == null) {
            security.setInternalId(SecurityIdMappingUtil.generateInternalId(security));
            log.debug("Generated internal ID for security: {}", security.getInternalId());
        }
        
        return security;
    }
    
    /**
     * Finds an existing security based on identifiers in the reference data.
     * 
     * @param referenceData The reference data containing identifiers
     * @param existingSecurities List of existing securities to search in
     * @return Optional containing the found security or empty if not found
     */
    public Optional<Security> findExistingSecurity(SecurityReferenceData referenceData, List<Security> existingSecurities) {
        // Try to match by ISIN first
        if (referenceData.getIsin() != null && !referenceData.getIsin().isEmpty()) {
            Optional<Security> byIsin = SecurityIdMappingUtil.findSecurityByIdentifier("ISIN", referenceData.getIsin(), existingSecurities);
            if (byIsin.isPresent()) {
                return byIsin;
            }
        }
        
        // Try CUSIP if ISIN not found
        if (referenceData.getCusip() != null && !referenceData.getCusip().isEmpty()) {
            Optional<Security> byCusip = SecurityIdMappingUtil.findSecurityByIdentifier("CUSIP", referenceData.getCusip(), existingSecurities);
            if (byCusip.isPresent()) {
                return byCusip;
            }
        }
        
        // Try SEDOL if CUSIP not found
        if (referenceData.getSedol() != null && !referenceData.getSedol().isEmpty()) {
            Optional<Security> bySedol = SecurityIdMappingUtil.findSecurityByIdentifier("SEDOL", referenceData.getSedol(), existingSecurities);
            if (bySedol.isPresent()) {
                return bySedol;
            }
        }
        
        // Try Bloomberg ID if SEDOL not found
        if (referenceData.getBloombergId() != null && !referenceData.getBloombergId().isEmpty()) {
            Optional<Security> byBloomberg = SecurityIdMappingUtil.findSecurityByIdentifier("BLOOMBERG_ID", referenceData.getBloombergId(), existingSecurities);
            if (byBloomberg.isPresent()) {
                return byBloomberg;
            }
        }
        
        // Try Reuters ID if Bloomberg ID not found
        if (referenceData.getReutersId() != null && !referenceData.getReutersId().isEmpty()) {
            Optional<Security> byReuters = SecurityIdMappingUtil.findSecurityByIdentifier("REUTERS_ID", referenceData.getReutersId(), existingSecurities);
            if (byReuters.isPresent()) {
                return byReuters;
            }
        }
        
        // Try ticker as last resort
        if (referenceData.getTicker() != null && !referenceData.getTicker().isEmpty()) {
            Optional<Security> byTicker = SecurityIdMappingUtil.findSecurityByIdentifier("TICKER", referenceData.getTicker(), existingSecurities);
            if (byTicker.isPresent()) {
                return byTicker;
            }
        }
        
        // No match found
        return Optional.empty();
    }
    
    /**
     * Creates a SecurityIdentifier entity from reference data.
     * 
     * @param identifierType The type of identifier
     * @param identifierValue The value of the identifier
     * @param source The source of the identifier
     * @param isPrimary Whether this is the primary identifier
     * @return The created SecurityIdentifier entity
     */
    public SecurityIdentifier createSecurityIdentifier(
            String identifierType, 
            String identifierValue, 
            String source, 
            Boolean isPrimary) {
        
        try {
            // Validate the identifier format
            SecurityIdMappingUtil.validateIdentifier(identifierType, identifierValue);
            
            // Create and configure the identifier
            SecurityIdentifier identifier = new SecurityIdentifier();
            identifier.setIdentifierType(identifierType);
            identifier.setIdentifierValue(identifierValue);
            identifier.setSource(source);
            identifier.setIsPrimary(isPrimary);
            
            // Set priority based on source and type
            int sourcePriority = getSourcePriority(source);
            identifier.setPriority(sourcePriority);
            
            return identifier;
        } catch (ValidationException ex) {
            log.warn("Invalid identifier format for type {}, value {}: {}", identifierType, identifierValue, ex.getMessage());
            throw ex;
        }
    }
    
    /**
     * Detects and resolves conflicts between different sources of security data.
     * 
     * @param security The existing security entity
     * @param newData The new reference data
     * @return The security with resolved conflicts
     */
    public Security detectAndResolveConflicts(Security security, SecurityReferenceData newData) {
        String newDataSource = newData.getSource();
        int newSourcePriority = getSourcePriority(newDataSource);
        
        // Check for conflicts in basic attributes
        if (security.getSecurityType() != null && newData.getSecurityType() != null && 
                !security.getSecurityType().equals(newData.getSecurityType())) {
            
            log.info("Conflict detected for securityType: existing={}, new={} from source {}",
                    security.getSecurityType(), newData.getSecurityType(), newDataSource);
            
            // Determine source of existing value
            String existingSource = determineSourceOfAttribute(security, "securityType");
            int existingPriority = getSourcePriority(existingSource);
            
            // Apply value from higher priority source
            if (newSourcePriority < existingPriority) {
                log.info("Resolving conflict: Using securityType={} from {} (higher priority than {})",
                        newData.getSecurityType(), newDataSource, existingSource);
                security.setSecurityType(newData.getSecurityType());
            } else {
                log.info("Retaining existing securityType={} from {} (higher priority than {})",
                        security.getSecurityType(), existingSource, newDataSource);
            }
        }
        
        // Similarly check other attributes
        resolveAttributeConflict(security, newData, "issuer", newData.getIssuer());
        resolveAttributeConflict(security, newData, "currency", newData.getCurrency());
        resolveAttributeConflict(security, newData, "market", newData.getMarket());
        resolveAttributeConflict(security, newData, "status", newData.getStatus());
        
        // Check isBasketProduct and basketType together
        if (security.getIsBasketProduct() != null && newData.getIsBasket() != null && 
                !security.getIsBasketProduct().equals(newData.getIsBasket())) {
            
            log.info("Conflict detected for isBasketProduct: existing={}, new={} from source {}",
                    security.getIsBasketProduct(), newData.getIsBasket(), newDataSource);
            
            String existingSource = determineSourceOfAttribute(security, "isBasketProduct");
            int existingPriority = getSourcePriority(existingSource);
            
            if (newSourcePriority < existingPriority) {
                log.info("Resolving conflict: Using isBasketProduct={} from {} (higher priority)",
                        newData.getIsBasket(), newDataSource);
                security.setIsBasketProduct(newData.getIsBasket());
                
                // Update basket type if applicable
                if (Boolean.TRUE.equals(newData.getIsBasket()) && newData.getBasketType() != null) {
                    security.setBasketType(newData.getBasketType());
                }
            }
        }
        
        // Handle conflicting identifiers
        resolveIdentifierConflicts(security, newData);
        
        return security;
    }
    
    /**
     * Maps raw counterparty reference data to the internal Counterparty domain model.
     * 
     * @param referenceData Map containing counterparty reference data
     * @return The mapped Counterparty entity
     */
    public Counterparty mapCounterpartyReferenceData(Map<String, Object> referenceData) {
        log.debug("Mapping counterparty reference data: {}", referenceData);
        
        // Validate reference data
        validateReferenceData(referenceData, "Counterparty");
        
        String source = (String) referenceData.get("source");
        String externalId = (String) referenceData.get("externalId");
        String identifierType = (String) referenceData.get("identifierType");
        
        // Try to find existing counterparty (simplified - would use a repository in real implementation)
        Optional<Counterparty> existingCounterparty = Optional.empty(); // findExistingCounterparty(...);
        
        Counterparty counterparty;
        boolean isNewCounterparty = false;
        
        if (existingCounterparty.isPresent()) {
            // Update existing counterparty
            counterparty = existingCounterparty.get();
            log.debug("Found existing counterparty with ID: {}", counterparty.getCounterpartyId());
        } else {
            // Create new counterparty
            counterparty = new Counterparty();
            isNewCounterparty = true;
            log.debug("Creating new counterparty");
        }
        
        // Map basic attributes
        mapBasicCounterpartyAttributes(counterparty, referenceData);
        
        // Create and add identifiers
        addCounterpartyIdentifiers(counterparty, referenceData);
        
        // Generate or update counterparty ID if needed
        if (isNewCounterparty || counterparty.getCounterpartyId() == null) {
            counterparty.setCounterpartyId(generateCounterpartyId(counterparty));
        }
        
        return counterparty;
    }
    
    /**
     * Creates a CounterpartyIdentifier entity from reference data.
     * 
     * @param identifierType The type of identifier
     * @param identifierValue The value of the identifier
     * @param source The source of the identifier
     * @param isPrimary Whether this is the primary identifier
     * @return The created CounterpartyIdentifier entity
     */
    public CounterpartyIdentifier createCounterpartyIdentifier(
            String identifierType, 
            String identifierValue, 
            String source, 
            Boolean isPrimary) {
        
        // Validate identifier (simplified - would have more validation logic in real implementation)
        if (identifierType == null || identifierType.isEmpty()) {
            throw new ValidationException("CounterpartyIdentifier", "Identifier type cannot be empty");
        }
        
        if (identifierValue == null || identifierValue.isEmpty()) {
            throw new ValidationException("CounterpartyIdentifier", "Identifier value cannot be empty");
        }
        
        // Create and configure identifier
        CounterpartyIdentifier identifier = new CounterpartyIdentifier();
        identifier.setIdentifierType(identifierType);
        identifier.setIdentifierValue(identifierValue);
        identifier.setSource(source);
        identifier.setIsPrimary(isPrimary);
        
        // Set priority based on source
        int sourcePriority = getSourcePriority(source);
        identifier.setPriority(sourcePriority);
        
        return identifier;
    }
    
    /**
     * Maps raw aggregation unit reference data to the internal AggregationUnit domain model.
     * 
     * @param referenceData Map containing aggregation unit reference data
     * @return The mapped AggregationUnit entity
     */
    public AggregationUnit mapAggregationUnitReferenceData(Map<String, Object> referenceData) {
        log.debug("Mapping aggregation unit reference data: {}", referenceData);
        
        // Validate reference data
        validateReferenceData(referenceData, "AggregationUnit");
        
        String aggregationUnitId = (String) referenceData.get("aggregationUnitId");
        
        // Try to find existing aggregation unit (simplified - would use a repository in real implementation)
        Optional<AggregationUnit> existingAggregationUnit = Optional.empty(); // findExistingAggregationUnit(...);
        
        AggregationUnit aggregationUnit;
        
        if (existingAggregationUnit.isPresent()) {
            // Update existing aggregation unit
            aggregationUnit = existingAggregationUnit.get();
            log.debug("Found existing aggregation unit with ID: {}", aggregationUnit.getAggregationUnitId());
        } else {
            // Create new aggregation unit
            aggregationUnit = new AggregationUnit();
            aggregationUnit.setAggregationUnitId(aggregationUnitId);
            log.debug("Creating new aggregation unit with ID: {}", aggregationUnitId);
        }
        
        // Map basic attributes
        if (referenceData.containsKey("name")) {
            aggregationUnit.setName((String) referenceData.get("name"));
        }
        
        if (referenceData.containsKey("type")) {
            aggregationUnit.setType((String) referenceData.get("type"));
        }
        
        if (referenceData.containsKey("market")) {
            aggregationUnit.setMarket((String) referenceData.get("market"));
        }
        
        if (referenceData.containsKey("region")) {
            aggregationUnit.setRegion((String) referenceData.get("region"));
        }
        
        if (referenceData.containsKey("status")) {
            aggregationUnit.setStatus((String) referenceData.get("status"));
        }
        
        if (referenceData.containsKey("officerId")) {
            aggregationUnit.setOfficerId((String) referenceData.get("officerId"));
        }
        
        if (referenceData.containsKey("regulatoryId")) {
            aggregationUnit.setRegulatoryId((String) referenceData.get("regulatoryId"));
        }
        
        if (referenceData.containsKey("parentEntityId")) {
            aggregationUnit.setParentEntityId((String) referenceData.get("parentEntityId"));
        }
        
        // Add books if provided
        if (referenceData.containsKey("books") && referenceData.get("books") instanceof List) {
            List<?> books = (List<?>) referenceData.get("books");
            for (Object book : books) {
                if (book instanceof String) {
                    aggregationUnit.addBook((String) book);
                }
            }
        }
        
        return aggregationUnit;
    }
    
    /**
     * Maps raw index composition reference data to the internal IndexComposition domain model.
     * 
     * @param referenceData Map containing index composition reference data
     * @param existingSecurities List of existing securities to reference
     * @return The mapped IndexComposition entity
     * @throws NotFoundException if the index or constituent securities cannot be found
     */
    public IndexComposition mapIndexCompositionReferenceData(
            Map<String, Object> referenceData, 
            List<Security> existingSecurities) {
        
        log.debug("Mapping index composition reference data: {}", referenceData);
        
        // Validate reference data
        validateReferenceData(referenceData, "IndexComposition");
        
        // Extract required fields
        String indexId = (String) referenceData.get("indexId");
        String indexIdType = (String) referenceData.get("indexIdType");
        
        String constituentId = (String) referenceData.get("constituentId");
        String constituentIdType = (String) referenceData.get("constituentIdType");
        
        // Find index security
        Security indexSecurity = SecurityIdMappingUtil.getSecurityByIdentifier(
                indexIdType, indexId, existingSecurities);
        
        // Find constituent security
        Security constituentSecurity = SecurityIdMappingUtil.getSecurityByIdentifier(
                constituentIdType, constituentId, existingSecurities);
        
        // Create new index composition
        IndexComposition composition = new IndexComposition();
        composition.setIndexSecurity(indexSecurity);
        composition.setConstituentSecurity(constituentSecurity);
        
        // Set weight
        if (referenceData.containsKey("weight")) {
            Object weightObj = referenceData.get("weight");
            if (weightObj instanceof Number) {
                composition.setWeight(((Number) weightObj).doubleValue());
            } else if (weightObj instanceof String) {
                try {
                    composition.setWeight(Double.parseDouble((String) weightObj));
                } catch (NumberFormatException e) {
                    log.warn("Invalid weight format: {}", weightObj);
                }
            }
        }
        
        // Set composition type
        if (referenceData.containsKey("compositionType")) {
            composition.setCompositionType((String) referenceData.get("compositionType"));
        } else {
            composition.setCompositionType("PRIMARY");
        }
        
        // Set dates
        if (referenceData.containsKey("effectiveDate")) {
            Object dateObj = referenceData.get("effectiveDate");
            if (dateObj instanceof LocalDate) {
                composition.setEffectiveDate((LocalDate) dateObj);
            } else if (dateObj instanceof String) {
                try {
                    composition.setEffectiveDate(LocalDate.parse((String) dateObj));
                } catch (Exception e) {
                    log.warn("Invalid date format for effectiveDate: {}", dateObj);
                }
            }
        } else {
            composition.setEffectiveDate(LocalDate.now());
        }
        
        if (referenceData.containsKey("expiryDate")) {
            Object dateObj = referenceData.get("expiryDate");
            if (dateObj instanceof LocalDate) {
                composition.setExpiryDate((LocalDate) dateObj);
            } else if (dateObj instanceof String) {
                try {
                    composition.setExpiryDate(LocalDate.parse((String) dateObj));
                } catch (Exception e) {
                    log.warn("Invalid date format for expiryDate: {}", dateObj);
                }
            }
        }
        
        // Set source and active flag
        if (referenceData.containsKey("source")) {
            composition.setSource((String) referenceData.get("source"));
        }
        
        if (referenceData.containsKey("isActive")) {
            Object activeObj = referenceData.get("isActive");
            if (activeObj instanceof Boolean) {
                composition.setIsActive((Boolean) activeObj);
            } else if (activeObj instanceof String) {
                composition.setIsActive(Boolean.parseBoolean((String) activeObj));
            }
        } else {
            composition.setIsActive(true);
        }
        
        return composition;
    }
    
    /**
     * Creates a ReferenceDataEvent for a mapped entity.
     * 
     * @param operation The operation (CREATE, UPDATE, DELETE)
     * @param source The source of the data
     * @param entity The entity to include in the event
     * @return The created ReferenceDataEvent
     */
    public ReferenceDataEvent createReferenceDataEvent(String operation, String source, Object entity) {
        ReferenceDataEvent event = new ReferenceDataEvent(source);
        event.setOperation(operation);
        event.setDataSource(source);
        
        if (entity instanceof Security) {
            event.addSecurity((Security) entity);
            
            // Add identifiers
            for (SecurityIdentifier identifier : ((Security) entity).getIdentifiers()) {
                event.addSecurityIdentifier(identifier);
            }
        } else if (entity instanceof Counterparty) {
            event.addCounterparty((Counterparty) entity);
            
            // Add identifiers
            for (CounterpartyIdentifier identifier : ((Counterparty) entity).getIdentifiers()) {
                event.addCounterpartyIdentifier(identifier);
            }
        } else if (entity instanceof AggregationUnit) {
            event.addAggregationUnit((AggregationUnit) entity);
        } else if (entity instanceof IndexComposition) {
            event.addIndexComposition((IndexComposition) entity);
        } else {
            throw new IllegalArgumentException("Unsupported entity type: " + entity.getClass().getName());
        }
        
        return event;
    }
    
    /**
     * Validates reference data for required fields and format.
     * 
     * @param referenceData The reference data to validate
     * @param entityType The type of entity being validated
     * @throws ValidationException if validation fails
     */
    public void validateReferenceData(Object referenceData, String entityType) {
        if (referenceData == null) {
            throw new ValidationException(entityType, "Reference data cannot be null");
        }
        
        if (referenceData instanceof SecurityReferenceData) {
            SecurityReferenceData securityData = (SecurityReferenceData) referenceData;
            
            // Create validation exception to collect all errors
            ValidationException validationException = new ValidationException(entityType, 
                    "Invalid security reference data");
            
            // Check required fields
            if (securityData.getExternalId() == null || securityData.getExternalId().isEmpty()) {
                validationException.addFieldError("externalId", "External ID is required");
            }
            
            if (securityData.getIdentifierType() == null || securityData.getIdentifierType().isEmpty()) {
                validationException.addFieldError("identifierType", "Identifier type is required");
            }
            
            if (securityData.getSecurityType() == null || securityData.getSecurityType().isEmpty()) {
                validationException.addFieldError("securityType", "Security type is required");
            }
            
            if (securityData.getSource() == null || securityData.getSource().isEmpty()) {
                validationException.addFieldError("source", "Source is required");
            }
            
            // Check if any identifiers are provided
            boolean hasAnyIdentifier = securityData.getIsin() != null || 
                                      securityData.getCusip() != null || 
                                      securityData.getSedol() != null || 
                                      securityData.getTicker() != null ||
                                      securityData.getBloombergId() != null ||
                                      securityData.getReutersId() != null;
            
            if (!hasAnyIdentifier) {
                validationException.addFieldError("identifiers", 
                        "At least one standard identifier (ISIN, CUSIP, SEDOL, etc.) is required");
            }
            
            if (validationException.hasFieldErrors()) {
                throw validationException;
            }
        } else if (referenceData instanceof Map) {
            Map<?, ?> dataMap = (Map<?, ?>) referenceData;
            
            // Handle different entity types
            if ("Counterparty".equals(entityType)) {
                validateCounterpartyReferenceData(dataMap, entityType);
            } else if ("AggregationUnit".equals(entityType)) {
                validateAggregationUnitReferenceData(dataMap, entityType);
            } else if ("IndexComposition".equals(entityType)) {
                validateIndexCompositionReferenceData(dataMap, entityType);
            }
        } else {
            throw new ValidationException(entityType, 
                    "Unsupported reference data type: " + referenceData.getClass().getName());
        }
    }
    
    /**
     * Gets the priority for a data source.
     * 
     * @param source The source code
     * @return The priority value (lower is higher priority)
     */
    public Integer getSourcePriority(String source) {
        if (source == null) {
            return Integer.MAX_VALUE;
        }
        
        return SOURCE_PRIORITIES.getOrDefault(source, Integer.MAX_VALUE);
    }
    
    /**
     * Gets the display name for a data source code.
     * 
     * @param sourceCode The source code
     * @return The display name for the source
     */
    public String getSourceDisplayName(String sourceCode) {
        if (sourceCode == null) {
            return "Unknown";
        }
        
        return SOURCE_NAMES.getOrDefault(sourceCode, sourceCode);
    }
    
    // Private helper methods
    
    private void mapBasicSecurityAttributes(Security security, SecurityReferenceData referenceData) {
        // Only update if the field is provided and not null
        if (referenceData.getSecurityType() != null) {
            security.setSecurityType(referenceData.getSecurityType());
        }
        
        if (referenceData.getIssuer() != null) {
            security.setIssuer(referenceData.getIssuer());
        }
        
        if (referenceData.getDescription() != null) {
            security.setDescription(referenceData.getDescription());
        }
        
        if (referenceData.getCurrency() != null) {
            security.setCurrency(referenceData.getCurrency());
        }
        
        if (referenceData.getIssueDate() != null) {
            security.setIssueDate(referenceData.getIssueDate());
        }
        
        if (referenceData.getMaturityDate() != null) {
            security.setMaturityDate(referenceData.getMaturityDate());
        }
        
        if (referenceData.getMarket() != null) {
            security.setMarket(referenceData.getMarket());
        }
        
        if (referenceData.getExchange() != null) {
            security.setExchange(referenceData.getExchange());
        }
        
        if (referenceData.getStatus() != null) {
            security.setStatus(referenceData.getStatus());
        }
        
        if (referenceData.getIsBasket() != null) {
            security.setIsBasketProduct(referenceData.getIsBasket());
            
            if (referenceData.getBasketType() != null) {
                security.setBasketType(referenceData.getBasketType());
            }
        }
    }
    
    private void addSecurityIdentifiers(Security security, SecurityReferenceData referenceData) {
        String source = referenceData.getSource();
        
        // Add external ID with the source-specific identifier type
        if (referenceData.getExternalId() != null) {
            SecurityIdentifier extIdIdentifier = createSecurityIdentifier(
                referenceData.getIdentifierType(),
                referenceData.getExternalId(),
                source,
                false
            );
            security.addIdentifier(extIdIdentifier);
        }
        
        // Add standard identifiers if present
        if (referenceData.getIsin() != null) {
            SecurityIdentifier isinIdentifier = createSecurityIdentifier("ISIN", referenceData.getIsin(), source, false);
            security.addIdentifier(isinIdentifier);
        }
        
        if (referenceData.getCusip() != null) {
            SecurityIdentifier cusipIdentifier = createSecurityIdentifier("CUSIP", referenceData.getCusip(), source, false);
            security.addIdentifier(cusipIdentifier);
        }
        
        if (referenceData.getSedol() != null) {
            SecurityIdentifier sedolIdentifier = createSecurityIdentifier("SEDOL", referenceData.getSedol(), source, false);
            security.addIdentifier(sedolIdentifier);
        }
        
        if (referenceData.getTicker() != null) {
            SecurityIdentifier tickerIdentifier = createSecurityIdentifier("TICKER", referenceData.getTicker(), source, false);
            security.addIdentifier(tickerIdentifier);
        }
        
        if (referenceData.getBloombergId() != null) {
            SecurityIdentifier bloombergIdentifier = createSecurityIdentifier("BLOOMBERG_ID", referenceData.getBloombergId(), source, false);
            security.addIdentifier(bloombergIdentifier);
        }
        
        if (referenceData.getReutersId() != null) {
            SecurityIdentifier reutersIdentifier = createSecurityIdentifier("REUTERS_ID", referenceData.getReutersId(), source, false);
            security.addIdentifier(reutersIdentifier);
        }
        
        // Determine and set primary identifier
        setPrimaryIdentifier(security);
    }
    
    private void setPrimaryIdentifier(Security security) {
        // Clear any existing primary flags
        for (SecurityIdentifier identifier : security.getIdentifiers()) {
            identifier.setIsPrimary(false);
        }
        
        // Try to find best identifier based on type priority
        List<String> priorityTypes = List.of("ISIN", "CUSIP", "SEDOL", "BLOOMBERG_ID", "REUTERS_ID", "TICKER");
        
        for (String type : priorityTypes) {
            SecurityIdentifier identifier = security.getIdentifierByType(type);
            if (identifier != null) {
                identifier.setIsPrimary(true);
                security.setPrimaryIdentifierType(type);
                security.setPrimaryIdentifierValue(identifier.getIdentifierValue());
                return;
            }
        }
    }
    
    private void resolveAttributeConflict(Security security, SecurityReferenceData newData, 
            String attributeName, Object newValue) {
        
        if (newValue == null) {
            return; // No new value to consider
        }
        
        // Get existing value using reflection
        Object existingValue = null;
        try {
            java.lang.reflect.Method getter = security.getClass().getMethod("get" + 
                    attributeName.substring(0, 1).toUpperCase() + attributeName.substring(1));
            existingValue = getter.invoke(security);
        } catch (Exception e) {
            log.error("Error getting attribute {}: {}", attributeName, e.getMessage());
            return;
        }
        
        if (existingValue != null && !existingValue.equals(newValue)) {
            log.info("Conflict detected for {}: existing={}, new={} from source {}",
                    attributeName, existingValue, newValue, newData.getSource());
            
            String existingSource = determineSourceOfAttribute(security, attributeName);
            int existingPriority = getSourcePriority(existingSource);
            int newSourcePriority = getSourcePriority(newData.getSource());
            
            if (newSourcePriority < existingPriority) {
                log.info("Resolving conflict: Using {}={} from {} (higher priority than {})",
                        attributeName, newValue, newData.getSource(), existingSource);
                
                // Set new value using reflection
                try {
                    java.lang.reflect.Method setter = security.getClass().getMethod("set" + 
                            attributeName.substring(0, 1).toUpperCase() + attributeName.substring(1), 
                            newValue.getClass());
                    setter.invoke(security, newValue);
                } catch (Exception e) {
                    log.error("Error setting attribute {}: {}", attributeName, e.getMessage());
                }
            } else {
                log.info("Retaining existing {}={} from {} (higher priority than {})",
                        attributeName, existingValue, existingSource, newData.getSource());
            }
        }
    }
    
    private String determineSourceOfAttribute(Security security, String attributeName) {
        // This is a simplified approach. In a real system, you might track the source of each attribute.
        // Here we'll use the source of the primary identifier as a proxy.
        
        for (SecurityIdentifier identifier : security.getIdentifiers()) {
            if (Boolean.TRUE.equals(identifier.getIsPrimary())) {
                return identifier.getSource();
            }
        }
        
        // Default to highest priority source if primary not found
        return security.getIdentifiers().stream()
                .min((id1, id2) -> Integer.compare(
                    getSourcePriority(id1.getSource()), 
                    getSourcePriority(id2.getSource())))
                .map(SecurityIdentifier::getSource)
                .orElse("UNKNOWN");
    }
    
    private void resolveIdentifierConflicts(Security security, SecurityReferenceData newData) {
        String source = newData.getSource();
        
        // Check ISIN conflicts
        if (newData.getIsin() != null) {
            SecurityIdentifier existingIsin = security.getIdentifierByType("ISIN");
            if (existingIsin != null && !existingIsin.getIdentifierValue().equals(newData.getIsin())) {
                resolveIdentifierValueConflict(security, existingIsin, "ISIN", newData.getIsin(), source);
            }
        }
        
        // Check CUSIP conflicts
        if (newData.getCusip() != null) {
            SecurityIdentifier existingCusip = security.getIdentifierByType("CUSIP");
            if (existingCusip != null && !existingCusip.getIdentifierValue().equals(newData.getCusip())) {
                resolveIdentifierValueConflict(security, existingCusip, "CUSIP", newData.getCusip(), source);
            }
        }
        
        // Check SEDOL conflicts
        if (newData.getSedol() != null) {
            SecurityIdentifier existingSedol = security.getIdentifierByType("SEDOL");
            if (existingSedol != null && !existingSedol.getIdentifierValue().equals(newData.getSedol())) {
                resolveIdentifierValueConflict(security, existingSedol, "SEDOL", newData.getSedol(), source);
            }
        }
        
        // Check Bloomberg ID conflicts
        if (newData.getBloombergId() != null) {
            SecurityIdentifier existingBloomberg = security.getIdentifierByType("BLOOMBERG_ID");
            if (existingBloomberg != null && !existingBloomberg.getIdentifierValue().equals(newData.getBloombergId())) {
                resolveIdentifierValueConflict(security, existingBloomberg, "BLOOMBERG_ID", newData.getBloombergId(), source);
            }
        }
        
        // Check Reuters ID conflicts
        if (newData.getReutersId() != null) {
            SecurityIdentifier existingReuters = security.getIdentifierByType("REUTERS_ID");
            if (existingReuters != null && !existingReuters.getIdentifierValue().equals(newData.getReutersId())) {
                resolveIdentifierValueConflict(security, existingReuters, "REUTERS_ID", newData.getReutersId(), source);
            }
        }
        
        // Check Ticker conflicts
        if (newData.getTicker() != null) {
            SecurityIdentifier existingTicker = security.getIdentifierByType("TICKER");
            if (existingTicker != null && !existingTicker.getIdentifierValue().equals(newData.getTicker())) {
                resolveIdentifierValueConflict(security, existingTicker, "TICKER", newData.getTicker(), source);
            }
        }
    }
    
    private void resolveIdentifierValueConflict(Security security, SecurityIdentifier existingIdentifier,
            String identifierType, String newValue, String newSource) {
        
        log.info("Identifier conflict detected: {}={} (source: {}) vs {}={} (source: {})",
                identifierType, existingIdentifier.getIdentifierValue(), existingIdentifier.getSource(),
                identifierType, newValue, newSource);
        
        int existingPriority = getSourcePriority(existingIdentifier.getSource());
        int newSourcePriority = getSourcePriority(newSource);
        
        if (newSourcePriority < existingPriority) {
            // New source has higher priority, update existing identifier
            log.info("Resolving conflict: Using {}={} from {} (higher priority)",
                    identifierType, newValue, newSource);
            existingIdentifier.setIdentifierValue(newValue);
            existingIdentifier.setSource(newSource);
            existingIdentifier.setPriority(newSourcePriority);
            
            // Update primary identifier if applicable
            if (Boolean.TRUE.equals(existingIdentifier.getIsPrimary())) {
                security.setPrimaryIdentifierValue(newValue);
            }
        } else {
            // Existing source has higher priority, keep it but add the new one with its source
            log.info("Retaining existing {}={} from {} (higher priority), adding new as secondary",
                    identifierType, existingIdentifier.getIdentifierValue(), existingIdentifier.getSource());
            
            // Check if we already have this identifier from the new source
            SecurityIdentifier sourceSpecificIdentifier = security.getIdentifierByTypeAndSource(
                    identifierType, newSource);
            
            if (sourceSpecificIdentifier == null) {
                // Add new identifier with source-specific type
                SecurityIdentifier newIdentifier = createSecurityIdentifier(
                        identifierType, newValue, newSource, false);
                security.addIdentifier(newIdentifier);
            } else if (!sourceSpecificIdentifier.getIdentifierValue().equals(newValue)) {
                // Update the existing source-specific identifier
                sourceSpecificIdentifier.setIdentifierValue(newValue);
            }
        }
    }
    
    private void mapBasicCounterpartyAttributes(Counterparty counterparty, Map<String, Object> referenceData) {
        if (referenceData.containsKey("name")) {
            counterparty.setName((String) referenceData.get("name"));
        }
        
        if (referenceData.containsKey("shortName")) {
            counterparty.setShortName((String) referenceData.get("shortName"));
        }
        
        if (referenceData.containsKey("type")) {
            counterparty.setType((String) referenceData.get("type"));
        }
        
        if (referenceData.containsKey("category")) {
            counterparty.setCategory((String) referenceData.get("category"));
        }
        
        if (referenceData.containsKey("status")) {
            counterparty.setStatus((String) referenceData.get("status"));
        }
        
        if (referenceData.containsKey("kycStatus")) {
            counterparty.setKycStatus((String) referenceData.get("kycStatus"));
        }
        
        if (referenceData.containsKey("riskRating")) {
            counterparty.setRiskRating((String) referenceData.get("riskRating"));
        }
        
        if (referenceData.containsKey("country")) {
            counterparty.setCountry((String) referenceData.get("country"));
        }
        
        if (referenceData.containsKey("region")) {
            counterparty.setRegion((String) referenceData.get("region"));
        }
    }
    
    private void addCounterpartyIdentifiers(Counterparty counterparty, Map<String, Object> referenceData) {
        String source = (String) referenceData.get("source");
        
        // Add external ID with source-specific identifier type
        if (referenceData.containsKey("externalId") && referenceData.containsKey("identifierType")) {
            String externalId = (String) referenceData.get("externalId");
            String identifierType = (String) referenceData.get("identifierType");
            
            CounterpartyIdentifier extIdIdentifier = createCounterpartyIdentifier(
                identifierType, externalId, source, false);
            counterparty.addIdentifier(extIdIdentifier);
        }
        
        // Add standard identifiers if present
        if (referenceData.containsKey("lei")) {
            String lei = (String) referenceData.get("lei");
            CounterpartyIdentifier leiIdentifier = createCounterpartyIdentifier("LEI", lei, source, false);
            counterparty.addIdentifier(leiIdentifier);
        }
        
        if (referenceData.containsKey("bic")) {
            String bic = (String) referenceData.get("bic");
            CounterpartyIdentifier bicIdentifier = createCounterpartyIdentifier("BIC", bic, source, false);
            counterparty.addIdentifier(bicIdentifier);
        }
        
        if (referenceData.containsKey("swift")) {
            String swift = (String) referenceData.get("swift");
            CounterpartyIdentifier swiftIdentifier = createCounterpartyIdentifier("SWIFT", swift, source, false);
            counterparty.addIdentifier(swiftIdentifier);
        }
        
        if (referenceData.containsKey("bloombergId")) {
            String bloombergId = (String) referenceData.get("bloombergId");
            CounterpartyIdentifier bloombergIdentifier = createCounterpartyIdentifier(
                "BLOOMBERG_ID", bloombergId, source, false);
            counterparty.addIdentifier(bloombergIdentifier);
        }
        
        if (referenceData.containsKey("reutersId")) {
            String reutersId = (String) referenceData.get("reutersId");
            CounterpartyIdentifier reutersIdentifier = createCounterpartyIdentifier(
                "REUTERS_ID", reutersId, source, false);
            counterparty.addIdentifier(reutersIdentifier);
        }
        
        // Set primary identifier
        setPrimaryCounterpartyIdentifier(counterparty);
    }
    
    private void setPrimaryCounterpartyIdentifier(Counterparty counterparty) {
        // Clear existing primary flags
        for (CounterpartyIdentifier identifier : counterparty.getIdentifiers()) {
            identifier.setIsPrimary(false);
        }
        
        // Try to find best identifier based on type priority
        List<String> priorityTypes = List.of("LEI", "BIC", "SWIFT", "BLOOMBERG_ID", "REUTERS_ID");
        
        for (String type : priorityTypes) {
            CounterpartyIdentifier identifier = counterparty.getIdentifierByType(type);
            if (identifier != null) {
                identifier.setIsPrimary(true);
                counterparty.setPrimaryIdentifierType(type);
                counterparty.setPrimaryIdentifierValue(identifier.getIdentifierValue());
                return;
            }
        }
    }
    
    private String generateCounterpartyId(Counterparty counterparty) {
        // Find primary identifier to use in ID
        for (CounterpartyIdentifier identifier : counterparty.getIdentifiers()) {
            if (Boolean.TRUE.equals(identifier.getIsPrimary())) {
                return String.format("CP-%s-%s", identifier.getIdentifierType(), identifier.getIdentifierValue());
            }
        }
        
        // If no primary identifier, use the first available
        if (!counterparty.getIdentifiers().isEmpty()) {
            CounterpartyIdentifier firstId = counterparty.getIdentifiers().iterator().next();
            return String.format("CP-%s-%s", firstId.getIdentifierType(), firstId.getIdentifierValue());
        }
        
        // Last resort: use name or timestamp
        if (counterparty.getName() != null) {
            return String.format("CP-%s-%d", 
                counterparty.getName().replaceAll("[^A-Za-z0-9]", "").substring(0, 
                    Math.min(10, counterparty.getName().length())),
                System.currentTimeMillis());
        }
        
        return "CP-" + System.currentTimeMillis();
    }
    
    private void validateCounterpartyReferenceData(Map<?, ?> dataMap, String entityType) {
        ValidationException validationException = new ValidationException(entityType, 
                "Invalid counterparty reference data");
        
        // Check required fields
        if (!dataMap.containsKey("externalId") || dataMap.get("externalId") == null || 
                dataMap.get("externalId").toString().isEmpty()) {
            validationException.addFieldError("externalId", "External ID is required");
        }
        
        if (!dataMap.containsKey("identifierType") || dataMap.get("identifierType") == null || 
                dataMap.get("identifierType").toString().isEmpty()) {
            validationException.addFieldError("identifierType", "Identifier type is required");
        }
        
        if (!dataMap.containsKey("source") || dataMap.get("source") == null || 
                dataMap.get("source").toString().isEmpty()) {
            validationException.addFieldError("source", "Source is required");
        }
        
        if (!dataMap.containsKey("name") || dataMap.get("name") == null || 
                dataMap.get("name").toString().isEmpty()) {
            validationException.addFieldError("name", "Name is required");
        }
        
        if (!dataMap.containsKey("type") || dataMap.get("type") == null || 
                dataMap.get("type").toString().isEmpty()) {
            validationException.addFieldError("type", "Type is required");
        }
        
        if (validationException.hasFieldErrors()) {
            throw validationException;
        }
    }
    
    private void validateAggregationUnitReferenceData(Map<?, ?> dataMap, String entityType) {
        ValidationException validationException = new ValidationException(entityType, 
                "Invalid aggregation unit reference data");
        
        // Check required fields
        if (!dataMap.containsKey("aggregationUnitId") || dataMap.get("aggregationUnitId") == null || 
                dataMap.get("aggregationUnitId").toString().isEmpty()) {
            validationException.addFieldError("aggregationUnitId", "Aggregation unit ID is required");
        }
        
        if (!dataMap.containsKey("name") || dataMap.get("name") == null || 
                dataMap.get("name").toString().isEmpty()) {
            validationException.addFieldError("name", "Name is required");
        }
        
        if (!dataMap.containsKey("type") || dataMap.get("type") == null || 
                dataMap.get("type").toString().isEmpty()) {
            validationException.addFieldError("type", "Type is required");
        }
        
        if (!dataMap.containsKey("market") || dataMap.get("market") == null || 
                dataMap.get("market").toString().isEmpty()) {
            validationException.addFieldError("market", "Market is required");
        }
        
        if (validationException.hasFieldErrors()) {
            throw validationException;
        }
    }
    
    private void validateIndexCompositionReferenceData(Map<?, ?> dataMap, String entityType) {
        ValidationException validationException = new ValidationException(entityType, 
                "Invalid index composition reference data");
        
        // Check required fields
        if (!dataMap.containsKey("indexId") || dataMap.get("indexId") == null || 
                dataMap.get("indexId").toString().isEmpty()) {
            validationException.addFieldError("indexId", "Index ID is required");
        }
        
        if (!dataMap.containsKey("indexIdType") || dataMap.get("indexIdType") == null || 
                dataMap.get("indexIdType").toString().isEmpty()) {
            validationException.addFieldError("indexIdType", "Index ID type is required");
        }
        
        if (!dataMap.containsKey("constituentId") || dataMap.get("constituentId") == null || 
                dataMap.get("constituentId").toString().isEmpty()) {
            validationException.addFieldError("constituentId", "Constituent ID is required");
        }
        
        if (!dataMap.containsKey("constituentIdType") || dataMap.get("constituentIdType") == null || 
                dataMap.get("constituentIdType").toString().isEmpty()) {
            validationException.addFieldError("constituentIdType", "Constituent ID type is required");
        }
        
        if (validationException.hasFieldErrors()) {
            throw validationException;
        }
    }
}