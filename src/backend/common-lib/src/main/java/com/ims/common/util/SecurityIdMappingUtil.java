package com.ims.common.util;

import com.ims.common.exception.NotFoundException;
import com.ims.common.exception.ValidationException;
import com.ims.common.model.Security;
import com.ims.common.model.SecurityIdentifier;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Utility class for mapping and resolving security identifiers across different systems 
 * and data sources in the Inventory Management System.
 * <p>
 * Provides methods for finding securities by various identifier types, resolving conflicts
 * between identifiers from different sources, and determining canonical identifiers for securities.
 */
@Slf4j
public class SecurityIdMappingUtil {

    /**
     * Map containing priorities for different identifier types (ISIN, CUSIP, SEDOL, etc.)
     * Lower values indicate higher priority.
     */
    private static final Map<String, Integer> IDENTIFIER_TYPE_PRIORITIES = new HashMap<>();
    
    /**
     * Map containing priorities for different data sources (Reuters, Bloomberg, MarkIT, etc.)
     * Lower values indicate higher priority.
     */
    private static final Map<String, Integer> SOURCE_PRIORITIES = new HashMap<>();
    
    /**
     * Ordered list of identifier types considered canonical (ISIN, CUSIP, SEDOL, etc.)
     */
    private static final List<String> CANONICAL_IDENTIFIER_TYPES = new ArrayList<>();
    
    static {
        // Initialize identifier type priorities (lower values = higher priority)
        IDENTIFIER_TYPE_PRIORITIES.put("ISIN", 10);
        IDENTIFIER_TYPE_PRIORITIES.put("CUSIP", 20);
        IDENTIFIER_TYPE_PRIORITIES.put("SEDOL", 30);
        IDENTIFIER_TYPE_PRIORITIES.put("BLOOMBERG_ID", 40);
        IDENTIFIER_TYPE_PRIORITIES.put("REUTERS_ID", 50);
        IDENTIFIER_TYPE_PRIORITIES.put("TICKER", 60);
        
        // Initialize source priorities (lower values = higher priority)
        SOURCE_PRIORITIES.put("REUTERS", 10);
        SOURCE_PRIORITIES.put("BLOOMBERG", 20);
        SOURCE_PRIORITIES.put("MARKIT", 30);
        SOURCE_PRIORITIES.put("ULTUMUS", 40);
        SOURCE_PRIORITIES.put("RIMES", 50);
        
        // Initialize ordered list of canonical identifier types
        CANONICAL_IDENTIFIER_TYPES.add("ISIN");
        CANONICAL_IDENTIFIER_TYPES.add("CUSIP");
        CANONICAL_IDENTIFIER_TYPES.add("SEDOL");
        CANONICAL_IDENTIFIER_TYPES.add("BLOOMBERG_ID");
        CANONICAL_IDENTIFIER_TYPES.add("REUTERS_ID");
    }

    /**
     * Finds a security by its identifier type and value.
     *
     * @param identifierType The type of identifier (e.g., ISIN, CUSIP)
     * @param identifierValue The value of the identifier
     * @param securities The list of securities to search
     * @return An Optional containing the found security, or empty if not found
     */
    public static Optional<Security> findSecurityByIdentifier(String identifierType, String identifierValue, List<Security> securities) {
        log.debug("Searching for security with identifierType: {}, identifierValue: {}", identifierType, identifierValue);
        
        return securities.stream()
                .filter(security -> security.getIdentifiers().stream()
                        .anyMatch(id -> id.getIdentifierType().equals(identifierType) && 
                                id.getIdentifierValue().equals(identifierValue)))
                .findFirst();
    }
    
    /**
     * Finds a security by its identifier type, value, and source.
     *
     * @param identifierType The type of identifier (e.g., ISIN, CUSIP)
     * @param identifierValue The value of the identifier
     * @param source The source of the identifier (e.g., REUTERS, BLOOMBERG)
     * @param securities The list of securities to search
     * @return An Optional containing the found security, or empty if not found
     */
    public static Optional<Security> findSecurityByIdentifierAndSource(String identifierType, String identifierValue, 
            String source, List<Security> securities) {
        log.debug("Searching for security with identifierType: {}, identifierValue: {}, source: {}", 
                identifierType, identifierValue, source);
        
        return securities.stream()
                .filter(security -> security.getIdentifiers().stream()
                        .anyMatch(id -> id.getIdentifierType().equals(identifierType) && 
                                id.getIdentifierValue().equals(identifierValue) &&
                                id.getSource().equals(source)))
                .findFirst();
    }
    
    /**
     * Gets a security by its identifier type and value, throwing an exception if not found.
     *
     * @param identifierType The type of identifier (e.g., ISIN, CUSIP)
     * @param identifierValue The value of the identifier
     * @param securities The list of securities to search
     * @return The found security
     * @throws NotFoundException if no security is found with the specified identifier
     */
    public static Security getSecurityByIdentifier(String identifierType, String identifierValue, List<Security> securities) {
        return findSecurityByIdentifier(identifierType, identifierValue, securities)
                .orElseThrow(() -> new NotFoundException("Security", identifierType + ":" + identifierValue)
                        .withResourceType("Security")
                        .withResourceId(identifierType + ":" + identifierValue));
    }
    
    /**
     * Gets a security by its identifier type, value, and source, throwing an exception if not found.
     *
     * @param identifierType The type of identifier (e.g., ISIN, CUSIP)
     * @param identifierValue The value of the identifier
     * @param source The source of the identifier (e.g., REUTERS, BLOOMBERG)
     * @param securities The list of securities to search
     * @return The found security
     * @throws NotFoundException if no security is found with the specified identifier and source
     */
    public static Security getSecurityByIdentifierAndSource(String identifierType, String identifierValue, 
            String source, List<Security> securities) {
        return findSecurityByIdentifierAndSource(identifierType, identifierValue, source, securities)
                .orElseThrow(() -> new NotFoundException("Security", identifierType + ":" + identifierValue + ":" + source)
                        .withResourceType("Security")
                        .withResourceId(identifierType + ":" + identifierValue + ":" + source));
    }
    
    /**
     * Resolves conflicts between identifiers from different sources based on source priority.
     *
     * @param identifiers List of identifiers with potential conflicts
     * @return The resolved identifier with highest priority (or null if no identifiers)
     */
    public static SecurityIdentifier resolveConflictingIdentifiers(List<SecurityIdentifier> identifiers) {
        if (identifiers == null || identifiers.isEmpty()) {
            return null;
        }
        
        Map<String, List<SecurityIdentifier>> groupedByType = identifiers.stream()
                .collect(Collectors.groupingBy(SecurityIdentifier::getIdentifierType));
        
        for (Map.Entry<String, List<SecurityIdentifier>> entry : groupedByType.entrySet()) {
            List<SecurityIdentifier> identifiersOfType = entry.getValue();
            if (identifiersOfType.size() > 1) {
                // Sort by source priority (lower value = higher priority)
                identifiersOfType.sort(Comparator.comparing(id -> {
                    String source = id.getSource();
                    return SOURCE_PRIORITIES.getOrDefault(source, Integer.MAX_VALUE);
                }));
            }
        }
        
        // Return the highest priority identifier
        return identifiers.stream()
                .min(Comparator.comparing(id -> {
                    String source = id.getSource();
                    return SOURCE_PRIORITIES.getOrDefault(source, Integer.MAX_VALUE);
                }))
                .orElse(null);
    }
    
    /**
     * Gets the canonical identifier for a security based on predefined priority.
     *
     * @param security The security to get the canonical identifier for
     * @return An Optional containing the canonical identifier, or empty if none found
     */
    public static Optional<SecurityIdentifier> getCanonicalIdentifier(Security security) {
        if (security == null || security.getIdentifiers() == null) {
            return Optional.empty();
        }
        
        // Try to find canonical identifier in order of priority
        for (String identifierType : CANONICAL_IDENTIFIER_TYPES) {
            SecurityIdentifier identifier = security.getIdentifierByType(identifierType);
            if (identifier != null) {
                return Optional.of(identifier);
            }
        }
        
        return Optional.empty();
    }
    
    /**
     * Checks if a security has conflicting identifiers from different sources.
     *
     * @param security The security to check for conflicts
     * @return True if conflicts exist, false otherwise
     */
    public static boolean hasConflictingIdentifiers(Security security) {
        if (security == null || security.getIdentifiers() == null) {
            return false;
        }
        
        Map<String, Set<String>> valuesByType = new HashMap<>();
        
        for (SecurityIdentifier identifier : security.getIdentifiers()) {
            String type = identifier.getIdentifierType();
            String value = identifier.getIdentifierValue();
            
            Set<String> values = valuesByType.computeIfAbsent(type, k -> new HashSet<>());
            values.add(value);
        }
        
        // Check if any identifier type has multiple different values
        return valuesByType.values().stream().anyMatch(values -> values.size() > 1);
    }
    
    /**
     * Logs details about identifier conflicts for a security.
     *
     * @param security The security to log conflicts for
     */
    public static void logIdentifierConflicts(Security security) {
        if (security == null || security.getIdentifiers() == null) {
            return;
        }
        
        Map<String, List<SecurityIdentifier>> identifiersByType = security.getIdentifiers().stream()
                .collect(Collectors.groupingBy(SecurityIdentifier::getIdentifierType));
        
        for (Map.Entry<String, List<SecurityIdentifier>> entry : identifiersByType.entrySet()) {
            String type = entry.getKey();
            List<SecurityIdentifier> identifiersOfType = entry.getValue();
            
            if (identifiersOfType.size() > 1) {
                // Group by value to check for conflicts
                Map<String, List<SecurityIdentifier>> valueGroups = identifiersOfType.stream()
                        .collect(Collectors.groupingBy(SecurityIdentifier::getIdentifierValue));
                
                if (valueGroups.size() > 1) {
                    log.warn("Security {} has conflicting {} identifiers:", security.getInternalId(), type);
                    
                    valueGroups.forEach((value, ids) -> {
                        String sources = ids.stream()
                                .map(id -> String.format("%s (priority: %d)", 
                                        id.getSource(), 
                                        SOURCE_PRIORITIES.getOrDefault(id.getSource(), Integer.MAX_VALUE)))
                                .collect(Collectors.joining(", "));
                        
                        log.warn("  Value: {} from sources: {}", value, sources);
                    });
                }
            }
        }
    }
    
    /**
     * Validates a security identifier according to format rules.
     *
     * @param identifierType The type of identifier
     * @param identifierValue The value of the identifier
     * @throws ValidationException if the identifier is invalid
     */
    public static void validateIdentifier(String identifierType, String identifierValue) {
        ValidationException validationException = new ValidationException("SecurityIdentifier", 
                "Invalid security identifier format");
        
        if (identifierType == null || identifierType.trim().isEmpty()) {
            throw validationException.addFieldError("identifierType", "Identifier type cannot be empty");
        }
        
        if (identifierValue == null || identifierValue.trim().isEmpty()) {
            throw validationException.addFieldError("identifierValue", "Identifier value cannot be empty");
        }
        
        switch (identifierType) {
            case "ISIN":
                // ISIN: 12 characters (2 letter country code + 9 alphanumeric + 1 check digit)
                if (!identifierValue.matches("[A-Z]{2}[A-Z0-9]{9}[0-9]")) {
                    throw validationException.addFieldError("identifierValue", 
                            "ISIN must be 12 characters in format: 2 letter country code + 9 alphanumeric + 1 check digit");
                }
                break;
                
            case "CUSIP":
                // CUSIP: 9 characters (8 alphanumeric + 1 check digit)
                if (!identifierValue.matches("[A-Z0-9]{8}[0-9]")) {
                    throw validationException.addFieldError("identifierValue", 
                            "CUSIP must be 9 characters in format: 8 alphanumeric + 1 check digit");
                }
                break;
                
            case "SEDOL":
                // SEDOL: 7 characters (6 alphanumeric + 1 check digit)
                if (!identifierValue.matches("[A-Z0-9]{6}[0-9]")) {
                    throw validationException.addFieldError("identifierValue", 
                            "SEDOL must be 7 characters in format: 6 alphanumeric + 1 check digit");
                }
                break;
                
            case "TICKER":
                // TICKER: 1-15 alphanumeric characters with optional dot or hyphen
                if (!identifierValue.matches("[A-Z0-9\\.\\-]{1,15}")) {
                    throw validationException.addFieldError("identifierValue", 
                            "TICKER must be 1-15 alphanumeric characters with optional dot or hyphen");
                }
                break;
                
            case "BLOOMBERG_ID":
                // Bloomberg ID validation (e.g., "BBG000B9XRY4")
                if (!identifierValue.matches("BBG[A-Z0-9]{9}")) {
                    throw validationException.addFieldError("identifierValue", 
                            "Bloomberg ID must start with 'BBG' followed by 9 alphanumeric characters");
                }
                break;
                
            case "REUTERS_ID":
                // Reuters ID validation (e.g., "RIC:AAPL.O")
                if (!identifierValue.matches("RIC:[A-Z0-9\\.]{2,10}")) {
                    throw validationException.addFieldError("identifierValue", 
                            "Reuters ID must start with 'RIC:' followed by 2-10 alphanumeric characters with optional dot");
                }
                break;
                
            default:
                // No specific validation for other identifier types
                break;
        }
    }
    
    /**
     * Generates a unique internal identifier for a security based on its canonical identifiers.
     *
     * @param security The security to generate an internal ID for
     * @return The generated internal identifier
     */
    public static String generateInternalId(Security security) {
        if (security == null) {
            throw new IllegalArgumentException("Security cannot be null");
        }
        
        // Try to get canonical identifier
        Optional<SecurityIdentifier> canonicalIdentifier = getCanonicalIdentifier(security);
        
        if (canonicalIdentifier.isPresent()) {
            SecurityIdentifier identifier = canonicalIdentifier.get();
            return String.format("IMS-%s-%s", identifier.getIdentifierType(), identifier.getIdentifierValue());
        }
        
        // If no canonical identifier, use security type and available identifiers
        String securityType = security.getSecurityType() != null ? security.getSecurityType() : "UNKNOWN";
        
        // Find any available identifier
        Optional<SecurityIdentifier> anyIdentifier = security.getIdentifiers().stream().findFirst();
        
        if (anyIdentifier.isPresent()) {
            SecurityIdentifier identifier = anyIdentifier.get();
            return String.format("IMS-%s-%s-%s", securityType, identifier.getIdentifierType(), identifier.getIdentifierValue());
        }
        
        // Last resort: use timestamp-based ID
        return String.format("IMS-%s-%d", securityType, System.currentTimeMillis());
    }
    
    /**
     * Merges identifiers from source security into target security, resolving conflicts.
     *
     * @param targetSecurity The security to merge identifiers into
     * @param sourceSecurity The security to merge identifiers from
     * @return The target security with merged identifiers
     */
    public static Security mergeSecurityIdentifiers(Security targetSecurity, Security sourceSecurity) {
        if (targetSecurity == null || sourceSecurity == null) {
            return targetSecurity;
        }
        
        for (SecurityIdentifier sourceIdentifier : sourceSecurity.getIdentifiers()) {
            // Check if target already has this identifier type and source
            SecurityIdentifier existingIdentifier = targetSecurity.getIdentifierByTypeAndSource(
                    sourceIdentifier.getIdentifierType(), sourceIdentifier.getSource());
            
            if (existingIdentifier == null) {
                // Add new identifier if target doesn't have it
                SecurityIdentifier newIdentifier = SecurityIdentifier.builder()
                        .identifierType(sourceIdentifier.getIdentifierType())
                        .identifierValue(sourceIdentifier.getIdentifierValue())
                        .source(sourceIdentifier.getSource())
                        .priority(sourceIdentifier.getPriority())
                        .isPrimary(sourceIdentifier.getIsPrimary())
                        .build();
                
                targetSecurity.addIdentifier(newIdentifier);
            } else if (!existingIdentifier.getIdentifierValue().equals(sourceIdentifier.getIdentifierValue())) {
                // Resolve conflict if values differ
                int existingPriority = SOURCE_PRIORITIES.getOrDefault(existingIdentifier.getSource(), Integer.MAX_VALUE);
                int sourcePriority = SOURCE_PRIORITIES.getOrDefault(sourceIdentifier.getSource(), Integer.MAX_VALUE);
                
                if (sourcePriority < existingPriority) {
                    // Source has higher priority, update existing identifier
                    existingIdentifier.setIdentifierValue(sourceIdentifier.getIdentifierValue());
                    log.info("Updated identifier {} from source {} (higher priority) for security {}", 
                            existingIdentifier.getIdentifierType(), 
                            sourceIdentifier.getSource(),
                            targetSecurity.getInternalId());
                } else {
                    log.info("Ignored identifier {} from source {} (lower priority) for security {}", 
                            sourceIdentifier.getIdentifierType(), 
                            sourceIdentifier.getSource(),
                            targetSecurity.getInternalId());
                }
            }
        }
        
        return targetSecurity;
    }
    
    /**
     * Attempts to determine the identifier type based on its format.
     *
     * @param identifierValue The identifier value to analyze
     * @return An Optional containing the detected identifier type, or empty if unknown
     */
    public static Optional<String> getIdentifierTypeByValue(String identifierValue) {
        if (identifierValue == null || identifierValue.trim().isEmpty()) {
            return Optional.empty();
        }
        
        // ISIN: 12 characters (2 letter country code + 9 alphanumeric + 1 check digit)
        if (identifierValue.matches("[A-Z]{2}[A-Z0-9]{9}[0-9]")) {
            return Optional.of("ISIN");
        }
        
        // CUSIP: 9 characters (8 alphanumeric + 1 check digit)
        if (identifierValue.matches("[A-Z0-9]{8}[0-9]")) {
            return Optional.of("CUSIP");
        }
        
        // SEDOL: 7 characters (6 alphanumeric + 1 check digit)
        if (identifierValue.matches("[A-Z0-9]{6}[0-9]")) {
            return Optional.of("SEDOL");
        }
        
        // Bloomberg ID
        if (identifierValue.matches("BBG[A-Z0-9]{9}")) {
            return Optional.of("BLOOMBERG_ID");
        }
        
        // Reuters ID
        if (identifierValue.startsWith("RIC:")) {
            return Optional.of("REUTERS_ID");
        }
        
        // If none of the above, it might be a ticker
        if (identifierValue.matches("[A-Z0-9\\.\\-]{1,15}")) {
            return Optional.of("TICKER");
        }
        
        return Optional.empty();
    }
}