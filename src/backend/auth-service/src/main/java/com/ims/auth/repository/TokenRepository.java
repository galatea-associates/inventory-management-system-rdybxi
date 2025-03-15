package com.ims.auth.repository;

import com.ims.auth.model.Token;
import com.ims.auth.model.TokenType;
import com.ims.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Token entity that provides data access methods
 * for token management operations including finding, creating, updating, and revoking tokens.
 * Supports various token types and implements custom queries for token validation and lifecycle management.
 */
@Repository
public interface TokenRepository extends JpaRepository<Token, Long> {

    /**
     * Finds a token by its value
     *
     * @param tokenValue the value of the token to find
     * @return Optional containing the token if found
     */
    Optional<Token> findByTokenValue(String tokenValue);

    /**
     * Finds a token by its value and type
     *
     * @param tokenValue the value of the token to find
     * @param tokenType the type of the token to find
     * @return Optional containing the token if found
     */
    Optional<Token> findByTokenValueAndTokenType(String tokenValue, TokenType tokenType);

    /**
     * Finds all tokens belonging to a user
     *
     * @param user the user whose tokens to find
     * @return List of tokens belonging to the user
     */
    List<Token> findAllByUser(User user);

    /**
     * Finds all tokens of a specific type belonging to a user
     *
     * @param user the user whose tokens to find
     * @param tokenType the type of tokens to find
     * @return List of tokens of the specified type belonging to the user
     */
    List<Token> findAllByUserAndTokenType(User user, TokenType tokenType);

    /**
     * Finds all valid (not expired and not revoked) tokens belonging to a user
     *
     * @param user the user whose tokens to find
     * @param now the current timestamp for expiration check
     * @return List of valid tokens belonging to the user
     */
    @Query("SELECT t FROM Token t WHERE t.user = :user AND t.revoked = false AND t.expiresAt > :now")
    List<Token> findAllValidTokensByUser(@Param("user") User user, @Param("now") LocalDateTime now);

    /**
     * Finds all valid tokens of a specific type belonging to a user
     *
     * @param user the user whose tokens to find
     * @param tokenType the type of tokens to find
     * @param now the current timestamp for expiration check
     * @return List of valid tokens of the specified type belonging to the user
     */
    @Query("SELECT t FROM Token t WHERE t.user = :user AND t.tokenType = :tokenType AND t.revoked = false AND t.expiresAt > :now")
    List<Token> findAllValidTokensByUserAndTokenType(@Param("user") User user, @Param("tokenType") TokenType tokenType, @Param("now") LocalDateTime now);

    /**
     * Finds all expired tokens
     *
     * @param now the current timestamp for expiration check
     * @return List of expired tokens
     */
    @Query("SELECT t FROM Token t WHERE t.expiresAt <= :now")
    List<Token> findAllExpiredTokens(@Param("now") LocalDateTime now);

    /**
     * Revokes all tokens belonging to a user
     *
     * @param userId the ID of the user whose tokens to revoke
     * @return Number of tokens revoked
     */
    @Modifying
    @Query("UPDATE Token t SET t.revoked = true WHERE t.user.id = :userId AND t.revoked = false")
    int revokeAllUserTokens(@Param("userId") Long userId);

    /**
     * Revokes a specific token by its value
     *
     * @param tokenValue the value of the token to revoke
     * @return Number of tokens revoked (0 or 1)
     */
    @Modifying
    @Query("UPDATE Token t SET t.revoked = true WHERE t.tokenValue = :tokenValue AND t.revoked = false")
    int revokeToken(@Param("tokenValue") String tokenValue);

    /**
     * Deletes all expired tokens
     *
     * @param now the current timestamp for expiration check
     * @return Number of tokens deleted
     */
    @Modifying
    @Query("DELETE FROM Token t WHERE t.expiresAt <= :now")
    int deleteExpiredTokens(@Param("now") LocalDateTime now);

    /**
     * Updates the last used timestamp of a token
     *
     * @param tokenValue the value of the token to update
     * @param lastUsedAt the new last used timestamp
     * @return Number of tokens updated (0 or 1)
     */
    @Modifying
    @Query("UPDATE Token t SET t.lastUsedAt = :lastUsedAt WHERE t.tokenValue = :tokenValue")
    int updateLastUsed(@Param("tokenValue") String tokenValue, @Param("lastUsedAt") LocalDateTime lastUsedAt);

    /**
     * Counts the number of tokens of a specific type belonging to a user
     *
     * @param user the user whose tokens to count
     * @param tokenType the type of tokens to count
     * @return Number of tokens
     */
    int countByUserAndTokenType(User user, TokenType tokenType);

    /**
     * Checks if a valid token exists with the given value
     *
     * @param tokenValue the value of the token to check
     * @param now the current timestamp for expiration check
     * @return True if a valid token exists, false otherwise
     */
    boolean existsByTokenValueAndRevokedFalseAndExpiresAtAfter(String tokenValue, LocalDateTime now);
}