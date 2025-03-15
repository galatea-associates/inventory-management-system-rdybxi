package com.ims.auth.service;

import com.ims.auth.model.Token;
import com.ims.auth.model.TokenType;
import com.ims.auth.model.User;
import com.ims.auth.repository.TokenRepository;
import com.ims.common.exception.ServiceException;
import com.ims.common.exception.NotFoundException;
import com.ims.common.exception.ValidationException;
import com.ims.common.exception.SecurityException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.JwtException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Base64;
import java.security.Key;
import javax.servlet.http.HttpServletRequest;

/**
 * Service class that provides comprehensive token management functionality including token generation, 
 * validation, revocation, and lifecycle management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TokenService {

    private static final String SERVICE_NAME = "TokenService";
    
    private final TokenRepository tokenRepository;
    private final UserService userService;
    
    @Value("${auth.jwt.secret}")
    private String jwtSecret;
    
    @Value("${auth.token.access.expiration-minutes:60}")
    private long accessTokenExpirationMinutes;
    
    @Value("${auth.token.refresh.expiration-days:7}")
    private long refreshTokenExpirationDays;
    
    @Value("${auth.token.api.expiration-days:30}")
    private long apiTokenExpirationDays;
    
    @Value("${auth.token.service.expiration-hours:24}")
    private long serviceTokenExpirationHours;
    
    @Value("${auth.token.reset.expiration-minutes:15}")
    private long resetTokenExpirationMinutes;
    
    private Key signingKey;
    
    /**
     * Constructor with required dependencies and configuration values
     */
    public TokenService(
            TokenRepository tokenRepository,
            UserService userService,
            @Value("${auth.jwt.secret}") String jwtSecret,
            @Value("${auth.token.access.expiration-minutes:60}") long accessTokenExpirationMinutes,
            @Value("${auth.token.refresh.expiration-days:7}") long refreshTokenExpirationDays,
            @Value("${auth.token.api.expiration-days:30}") long apiTokenExpirationDays,
            @Value("${auth.token.service.expiration-hours:24}") long serviceTokenExpirationHours,
            @Value("${auth.token.reset.expiration-minutes:15}") long resetTokenExpirationMinutes) {
        this.tokenRepository = tokenRepository;
        this.userService = userService;
        this.jwtSecret = jwtSecret;
        this.accessTokenExpirationMinutes = accessTokenExpirationMinutes;
        this.refreshTokenExpirationDays = refreshTokenExpirationDays;
        this.apiTokenExpirationDays = apiTokenExpirationDays;
        this.serviceTokenExpirationHours = serviceTokenExpirationHours;
        this.resetTokenExpirationMinutes = resetTokenExpirationMinutes;
        this.signingKey = Keys.hmacShaKeyFor(Base64.getDecoder().decode(jwtSecret));
    }

    /**
     * Generates a new access token for a user
     *
     * @param username the username of the user
     * @param request the HTTP request containing client information
     * @return the generated JWT access token
     */
    public String generateAccessToken(String username, HttpServletRequest request) {
        log.debug("Generating access token for user: {}", username);
        
        try {
            User user = userService.getUserByUsername(username);
            
            Date now = new Date();
            Date expiryDate = Date.from(now.toInstant().plus(accessTokenExpirationMinutes, ChronoUnit.MINUTES));
            
            String tokenValue = Jwts.builder()
                    .setSubject(username)
                    .setIssuedAt(now)
                    .setExpiration(expiryDate)
                    .claim("userId", user.getId())
                    .claim("tokenType", TokenType.ACCESS.name())
                    .signWith(signingKey)
                    .compact();
            
            LocalDateTime expiresAt = LocalDateTime.ofInstant(expiryDate.toInstant(), ZoneId.systemDefault());
            String deviceInfo = extractDeviceInfo(request);
            String ipAddress = extractIpAddress(request);
            
            Token token = new Token();
            token.setTokenValue(tokenValue);
            token.setTokenType(TokenType.ACCESS);
            token.setExpiresAt(expiresAt);
            token.setRevoked(false);
            token.setIssuedBy(SERVICE_NAME);
            token.setDeviceInfo(deviceInfo);
            token.setIpAddress(ipAddress);
            token.setLastUsedAt(LocalDateTime.now());
            
            user.addToken(token);
            tokenRepository.save(token);
            
            log.info("Access token generated for user: {}", username);
            return tokenValue;
        } catch (NotFoundException e) {
            log.error("Failed to generate access token - user not found: {}", username, e);
            throw new ServiceException(SERVICE_NAME, "generateAccessToken", "User not found: " + username, e);
        } catch (Exception e) {
            log.error("Failed to generate access token for user: {}", username, e);
            throw new ServiceException(SERVICE_NAME, "generateAccessToken", "Failed to generate access token", e);
        }
    }

    /**
     * Generates a new refresh token for a user
     *
     * @param username the username of the user
     * @param request the HTTP request containing client information
     * @return the generated refresh token
     */
    public String generateRefreshToken(String username, HttpServletRequest request) {
        log.debug("Generating refresh token for user: {}", username);
        
        try {
            User user = userService.getUserByUsername(username);
            
            String tokenValue = UUID.randomUUID().toString();
            LocalDateTime expiresAt = LocalDateTime.now().plusDays(refreshTokenExpirationDays);
            String deviceInfo = extractDeviceInfo(request);
            String ipAddress = extractIpAddress(request);
            
            Token token = new Token();
            token.setTokenValue(tokenValue);
            token.setTokenType(TokenType.REFRESH);
            token.setExpiresAt(expiresAt);
            token.setRevoked(false);
            token.setIssuedBy(SERVICE_NAME);
            token.setDeviceInfo(deviceInfo);
            token.setIpAddress(ipAddress);
            token.setLastUsedAt(LocalDateTime.now());
            
            user.addToken(token);
            tokenRepository.save(token);
            
            log.info("Refresh token generated for user: {}", username);
            return tokenValue;
        } catch (NotFoundException e) {
            log.error("Failed to generate refresh token - user not found: {}", username, e);
            throw new ServiceException(SERVICE_NAME, "generateRefreshToken", "User not found: " + username, e);
        } catch (Exception e) {
            log.error("Failed to generate refresh token for user: {}", username, e);
            throw new ServiceException(SERVICE_NAME, "generateRefreshToken", "Failed to generate refresh token", e);
        }
    }

    /**
     * Generates a new API token for a user
     *
     * @param username the username of the user
     * @param description a description of the token's purpose
     * @return the generated API token
     */
    public String generateApiToken(String username, String description) {
        log.debug("Generating API token for user: {}", username);
        
        try {
            User user = userService.getUserByUsername(username);
            
            String tokenValue = UUID.randomUUID().toString();
            LocalDateTime expiresAt = LocalDateTime.now().plusDays(apiTokenExpirationDays);
            
            Token token = new Token();
            token.setTokenValue(tokenValue);
            token.setTokenType(TokenType.API);
            token.setExpiresAt(expiresAt);
            token.setRevoked(false);
            token.setIssuedBy(SERVICE_NAME);
            token.setDeviceInfo(description); // Store description in deviceInfo field
            token.setLastUsedAt(LocalDateTime.now());
            
            user.addToken(token);
            tokenRepository.save(token);
            
            log.info("API token generated for user: {}", username);
            return tokenValue;
        } catch (NotFoundException e) {
            log.error("Failed to generate API token - user not found: {}", username, e);
            throw new ServiceException(SERVICE_NAME, "generateApiToken", "User not found: " + username, e);
        } catch (Exception e) {
            log.error("Failed to generate API token for user: {}", username, e);
            throw new ServiceException(SERVICE_NAME, "generateApiToken", "Failed to generate API token", e);
        }
    }

    /**
     * Generates a new service token for system-to-system communication
     *
     * @param serviceName the name of the service requesting the token
     * @return the generated service token
     */
    public String generateServiceToken(String serviceName) {
        log.debug("Generating service token for: {}", serviceName);
        
        try {
            Date now = new Date();
            Date expiryDate = Date.from(now.toInstant().plus(serviceTokenExpirationHours, ChronoUnit.HOURS));
            
            String tokenValue = Jwts.builder()
                    .setSubject(serviceName)
                    .setIssuedAt(now)
                    .setExpiration(expiryDate)
                    .claim("tokenType", TokenType.SERVICE.name())
                    .claim("service", serviceName)
                    .signWith(signingKey)
                    .compact();
            
            LocalDateTime expiresAt = LocalDateTime.ofInstant(expiryDate.toInstant(), ZoneId.systemDefault());
            
            Token token = new Token();
            token.setTokenValue(tokenValue);
            token.setTokenType(TokenType.SERVICE);
            token.setExpiresAt(expiresAt);
            token.setRevoked(false);
            token.setIssuedBy(SERVICE_NAME);
            token.setLastUsedAt(LocalDateTime.now());
            
            tokenRepository.save(token);
            
            log.info("Service token generated for: {}", serviceName);
            return tokenValue;
        } catch (Exception e) {
            log.error("Failed to generate service token for: {}", serviceName, e);
            throw new ServiceException(SERVICE_NAME, "generateServiceToken", "Failed to generate service token", e);
        }
    }

    /**
     * Generates a password reset token for a user
     *
     * @param username the username of the user
     * @return the generated password reset token
     */
    public String generatePasswordResetToken(String username) {
        log.debug("Generating password reset token for user: {}", username);
        
        try {
            User user = userService.getUserByUsername(username);
            
            String tokenValue = UUID.randomUUID().toString();
            LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(resetTokenExpirationMinutes);
            
            Token token = new Token();
            token.setTokenValue(tokenValue);
            token.setTokenType(TokenType.RESET_PASSWORD);
            token.setExpiresAt(expiresAt);
            token.setRevoked(false);
            token.setIssuedBy(SERVICE_NAME);
            token.setLastUsedAt(LocalDateTime.now());
            
            user.addToken(token);
            tokenRepository.save(token);
            
            log.info("Password reset token generated for user: {}", username);
            return tokenValue;
        } catch (NotFoundException e) {
            log.error("Failed to generate password reset token - user not found: {}", username, e);
            throw new ServiceException(SERVICE_NAME, "generatePasswordResetToken", "User not found: " + username, e);
        } catch (Exception e) {
            log.error("Failed to generate password reset token for user: {}", username, e);
            throw new ServiceException(SERVICE_NAME, "generatePasswordResetToken", "Failed to generate password reset token", e);
        }
    }

    /**
     * Validates a token's authenticity and expiration
     *
     * @param tokenValue the token value to validate
     * @return true if token is valid, false otherwise
     */
    public boolean validateToken(String tokenValue) {
        try {
            Optional<Token> tokenOptional = tokenRepository.findByTokenValue(tokenValue);
            if (!tokenOptional.isPresent()) {
                return false;
            }
            
            Token token = tokenOptional.get();
            boolean isValid = token.isValid();
            
            if (isValid) {
                // Update last used timestamp
                token.updateLastUsed();
                tokenRepository.save(token);
            }
            
            return isValid;
        } catch (Exception e) {
            log.error("Failed to validate token", e);
            return false;
        }
    }

    /**
     * Validates a token's authenticity, expiration, and type
     *
     * @param tokenValue the token value to validate
     * @param tokenType the expected token type
     * @return true if token is valid and of the specified type, false otherwise
     */
    public boolean validateTokenByType(String tokenValue, TokenType tokenType) {
        try {
            Optional<Token> tokenOptional = tokenRepository.findByTokenValueAndTokenType(tokenValue, tokenType);
            if (!tokenOptional.isPresent()) {
                return false;
            }
            
            Token token = tokenOptional.get();
            boolean isValid = token.isValid();
            
            if (isValid) {
                // Update last used timestamp
                token.updateLastUsed();
                tokenRepository.save(token);
            }
            
            return isValid;
        } catch (Exception e) {
            log.error("Failed to validate token by type: {}", tokenType, e);
            return false;
        }
    }

    /**
     * Validates a JWT token's signature and claims
     *
     * @param jwtToken the JWT token to validate
     * @return the token claims if valid, null otherwise
     */
    public Claims validateJwtToken(String jwtToken) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(signingKey)
                    .build()
                    .parseClaimsJws(jwtToken)
                    .getBody();
        } catch (JwtException | IllegalArgumentException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extracts the username from a JWT token
     *
     * @param jwtToken the JWT token
     * @return the username from the token, or null if invalid
     */
    public String getUsernameFromJwtToken(String jwtToken) {
        Claims claims = validateJwtToken(jwtToken);
        if (claims == null) {
            return null;
        }
        return claims.getSubject();
    }

    /**
     * Generates a new access token using a valid refresh token
     *
     * @param refreshToken the refresh token
     * @param request the HTTP request containing client information
     * @return the new access token, or null if refresh token is invalid
     */
    public String refreshAccessToken(String refreshToken, HttpServletRequest request) {
        log.debug("Refreshing access token with refresh token");
        
        boolean isValid = validateTokenByType(refreshToken, TokenType.REFRESH);
        if (!isValid) {
            log.warn("Invalid refresh token provided");
            return null;
        }
        
        try {
            Token token = tokenRepository.findByTokenValueAndTokenType(refreshToken, TokenType.REFRESH)
                    .orElseThrow(() -> new SecurityException("TOKEN_INVALID", "Invalid refresh token"));
            
            User user = token.getUser();
            if (user == null) {
                log.error("No user associated with refresh token");
                return null;
            }
            
            String accessToken = generateAccessToken(user.getUsername(), request);
            log.info("Access token refreshed for user: {}", user.getUsername());
            return accessToken;
        } catch (SecurityException e) {
            log.error("Failed to refresh access token: {}", e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("Failed to refresh access token", e);
            return null;
        }
    }

    /**
     * Revokes a specific token
     *
     * @param tokenValue the token value to revoke
     * @return true if token was revoked successfully
     */
    public boolean revokeToken(String tokenValue) {
        log.debug("Revoking token: {}", tokenValue);
        
        try {
            Optional<Token> tokenOptional = tokenRepository.findByTokenValue(tokenValue);
            if (!tokenOptional.isPresent()) {
                log.warn("Token not found for revocation: {}", tokenValue);
                return false;
            }
            
            Token token = tokenOptional.get();
            token.revoke();
            tokenRepository.save(token);
            
            log.info("Token revoked successfully: {}", tokenValue);
            return true;
        } catch (Exception e) {
            log.error("Failed to revoke token: {}", tokenValue, e);
            return false;
        }
    }

    /**
     * Revokes all tokens for a user
     *
     * @param username the username of the user
     * @return the number of tokens revoked
     */
    public int revokeAllUserTokens(String username) {
        log.debug("Revoking all tokens for user: {}", username);
        
        try {
            User user = userService.getUserByUsername(username);
            int count = tokenRepository.revokeAllUserTokens(user.getId());
            
            log.info("Revoked {} tokens for user: {}", count, username);
            return count;
        } catch (NotFoundException e) {
            log.error("Failed to revoke tokens - user not found: {}", username, e);
            throw new ServiceException(SERVICE_NAME, "revokeAllUserTokens", "User not found: " + username, e);
        } catch (Exception e) {
            log.error("Failed to revoke tokens for user: {}", username, e);
            throw new ServiceException(SERVICE_NAME, "revokeAllUserTokens", "Failed to revoke user tokens", e);
        }
    }

    /**
     * Revokes all tokens of a specific type for a user
     *
     * @param username the username of the user
     * @param tokenType the type of tokens to revoke
     * @return the number of tokens revoked
     */
    public int revokeAllUserTokensByType(String username, TokenType tokenType) {
        log.debug("Revoking all {} tokens for user: {}", tokenType, username);
        
        try {
            User user = userService.getUserByUsername(username);
            List<Token> tokens = tokenRepository.findAllByUserAndTokenType(user, tokenType);
            
            int count = 0;
            for (Token token : tokens) {
                token.revoke();
                tokenRepository.save(token);
                count++;
            }
            
            log.info("Revoked {} {} tokens for user: {}", count, tokenType, username);
            return count;
        } catch (NotFoundException e) {
            log.error("Failed to revoke tokens by type - user not found: {}", username, e);
            throw new ServiceException(SERVICE_NAME, "revokeAllUserTokensByType", "User not found: " + username, e);
        } catch (Exception e) {
            log.error("Failed to revoke {} tokens for user: {}", tokenType, username, e);
            throw new ServiceException(SERVICE_NAME, "revokeAllUserTokensByType", "Failed to revoke user tokens by type", e);
        }
    }

    /**
     * Retrieves a token by its value
     *
     * @param tokenValue the token value to retrieve
     * @return the token with the given value
     * @throws NotFoundException if the token is not found
     */
    public Token getTokenByValue(String tokenValue) {
        return tokenRepository.findByTokenValue(tokenValue)
                .orElseThrow(() -> new NotFoundException("Token", tokenValue));
    }

    /**
     * Retrieves all tokens for a user
     *
     * @param username the username of the user
     * @return a list of tokens for the user
     */
    public List<Token> getUserTokens(String username) {
        User user = userService.getUserByUsername(username);
        return tokenRepository.findAllByUser(user);
    }

    /**
     * Retrieves all tokens of a specific type for a user
     *
     * @param username the username of the user
     * @param tokenType the type of tokens to retrieve
     * @return a list of tokens of the specified type for the user
     */
    public List<Token> getUserTokensByType(String username, TokenType tokenType) {
        User user = userService.getUserByUsername(username);
        return tokenRepository.findAllByUserAndTokenType(user, tokenType);
    }

    /**
     * Retrieves all valid tokens for a user
     *
     * @param username the username of the user
     * @return a list of valid tokens for the user
     */
    public List<Token> getValidUserTokens(String username) {
        User user = userService.getUserByUsername(username);
        return tokenRepository.findAllValidTokensByUser(user, LocalDateTime.now());
    }

    /**
     * Retrieves all valid tokens of a specific type for a user
     *
     * @param username the username of the user
     * @param tokenType the type of tokens to retrieve
     * @return a list of valid tokens of the specified type for the user
     */
    public List<Token> getValidUserTokensByType(String username, TokenType tokenType) {
        User user = userService.getUserByUsername(username);
        return tokenRepository.findAllValidTokensByUserAndTokenType(user, tokenType, LocalDateTime.now());
    }

    /**
     * Updates the last used timestamp of a token
     *
     * @param tokenValue the token value to update
     * @return true if token was updated successfully
     */
    public boolean updateTokenLastUsed(String tokenValue) {
        return tokenRepository.updateLastUsed(tokenValue, LocalDateTime.now()) > 0;
    }

    /**
     * Scheduled task to clean up expired tokens
     * Runs at 2:00 AM every day
     *
     * @return the number of tokens deleted
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public int cleanupExpiredTokens() {
        log.info("Starting cleanup of expired tokens");
        
        LocalDateTime now = LocalDateTime.now();
        List<Token> expiredTokens = tokenRepository.findAllExpiredTokens(now);
        
        log.info("Found {} expired tokens to clean up", expiredTokens.size());
        
        int deleted = tokenRepository.deleteExpiredTokens(now);
        
        log.info("Deleted {} expired tokens", deleted);
        return deleted;
    }

    /**
     * Extracts device information from an HTTP request
     *
     * @param request the HTTP request
     * @return a string containing device information
     */
    private String extractDeviceInfo(HttpServletRequest request) {
        if (request == null) {
            return "Unknown";
        }
        
        String userAgent = request.getHeader("User-Agent");
        return userAgent != null ? userAgent : "Unknown";
    }

    /**
     * Extracts the client IP address from an HTTP request
     *
     * @param request the HTTP request
     * @return the client IP address
     */
    private String extractIpAddress(HttpServletRequest request) {
        if (request == null) {
            return "Unknown";
        }
        
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }

    /**
     * Calculates token expiration time based on token type
     *
     * @param tokenType the type of token
     * @return the calculated expiration time
     */
    private LocalDateTime calculateExpirationTime(TokenType tokenType) {
        LocalDateTime now = LocalDateTime.now();
        
        switch (tokenType) {
            case ACCESS:
                return now.plusMinutes(accessTokenExpirationMinutes);
            case REFRESH:
                return now.plusDays(refreshTokenExpirationDays);
            case API:
                return now.plusDays(apiTokenExpirationDays);
            case SERVICE:
                return now.plusHours(serviceTokenExpirationHours);
            case RESET_PASSWORD:
                return now.plusMinutes(resetTokenExpirationMinutes);
            default:
                return now.plusHours(1); // Default 1 hour expiration
        }
    }
}