package com.ims.auth.model;

import com.ims.common.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.time.LocalDateTime;

/**
 * Enumeration of token types supported by the system
 */
public enum TokenType {
    ACCESS,
    REFRESH,
    API,
    SERVICE,
    RESET_PASSWORD
}

/**
 * Entity class representing an authentication token in the Inventory Management System.
 * Supports various token types and provides functionality for token validation and lifecycle management.
 */
@Entity
@Table(name = "tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"user"})
public class Token extends BaseEntity {

    /**
     * The actual token value used for authentication
     */
    @Column(nullable = false, unique = true, length = 255)
    private String tokenValue;

    /**
     * The type of token (ACCESS, REFRESH, API, etc.)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TokenType tokenType;

    /**
     * The timestamp when this token expires
     */
    @Column(nullable = false)
    private LocalDateTime expiresAt;

    /**
     * Indicates whether this token has been revoked
     */
    @Column(nullable = false)
    private boolean revoked;

    /**
     * The system or service that issued this token
     */
    @Column(length = 50)
    private String issuedBy;

    /**
     * Information about the device used during token issuance
     */
    @Column(length = 255)
    private String deviceInfo;

    /**
     * The IP address from which the token was requested
     */
    @Column(length = 50)
    private String ipAddress;

    /**
     * The timestamp when this token was last used
     */
    private LocalDateTime lastUsedAt;

    /**
     * The user who owns this token
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    /**
     * Default constructor that initializes fields
     */
    public Token() {
        super();
        this.revoked = false;
        this.lastUsedAt = LocalDateTime.now();
    }

    /**
     * Checks if the token has expired
     *
     * @return True if the token has expired, false otherwise
     */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    /**
     * Checks if the token is valid (not expired and not revoked)
     *
     * @return True if the token is valid, false otherwise
     */
    public boolean isValid() {
        return !isExpired() && !revoked;
    }

    /**
     * Revokes the token
     */
    public void revoke() {
        this.revoked = true;
    }

    /**
     * Updates the last used timestamp to current time
     */
    public void updateLastUsed() {
        this.lastUsedAt = LocalDateTime.now();
    }

    /**
     * Sets the user who owns this token and updates the bidirectional relationship
     *
     * @param user The user who owns this token
     */
    public void setUser(User user) {
        this.user = user;
        if (user != null && !user.getTokens().contains(this)) {
            user.addToken(this);
        }
    }
}