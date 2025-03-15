package com.ims.auth.model;

import com.ims.common.model.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Entity class representing a user in the Inventory Management System.
 * Implements UserDetails for Spring Security integration and provides
 * comprehensive user management capabilities including authentication,
 * authorization, and security controls.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"password", "roles", "tokens"})
public class User extends BaseEntity implements UserDetails {

    /**
     * The username used for authentication.
     */
    @Column(nullable = false, unique = true, length = 50)
    private String username;

    /**
     * The user's email address.
     */
    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /**
     * The hashed password used for authentication.
     */
    @Column(nullable = false, length = 255)
    private String password;

    /**
     * The user's first name.
     */
    @Column(length = 50)
    private String firstName;

    /**
     * The user's last name.
     */
    @Column(length = 50)
    private String lastName;

    /**
     * The department the user belongs to.
     */
    @Column(length = 100)
    private String department;

    /**
     * The user's job title.
     */
    @Column(length = 100)
    private String jobTitle;

    /**
     * The user's phone number.
     */
    @Column(length = 20)
    private String phoneNumber;

    /**
     * Indicates whether the user is enabled or disabled.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    /**
     * Indicates whether the user's account has expired.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean accountNonExpired = true;

    /**
     * Indicates whether the user's account is locked.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean accountNonLocked = true;

    /**
     * Indicates whether the user's credentials (password) has expired.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean credentialsNonExpired = true;

    /**
     * The number of consecutive failed login attempts.
     */
    @Column(nullable = false)
    @Builder.Default
    private int failedLoginAttempts = 0;

    /**
     * The timestamp of the user's last successful login.
     */
    private LocalDateTime lastLoginAt;

    /**
     * The timestamp when the user's password was last changed.
     */
    private LocalDateTime passwordChangedAt;

    /**
     * Indicates whether multi-factor authentication is enabled for this user.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean mfaEnabled = false;

    /**
     * The secret key used for multi-factor authentication.
     */
    @Column(length = 255)
    private String mfaSecret;

    /**
     * The roles assigned to this user.
     */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    /**
     * The authentication tokens associated with this user.
     */
    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<Token> tokens = new HashSet<>();

    /**
     * Default constructor that initializes collections.
     */
    public User() {
        super();
        this.roles = new HashSet<>();
        this.tokens = new HashSet<>();
        this.enabled = true;
        this.accountNonExpired = true;
        this.accountNonLocked = true;
        this.credentialsNonExpired = true;
        this.failedLoginAttempts = 0;
    }

    /**
     * Returns the authorities granted to the user, combining role and permission authorities.
     *
     * @return Collection of granted authorities
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<GrantedAuthority> authorities = new HashSet<>();
        
        // Add role authorities
        authorities.addAll(roles);
        
        // Add all permission authorities from all roles
        roles.forEach(role -> {
            authorities.addAll(role.getAllPermissions());
        });
        
        return authorities;
    }

    /**
     * Indicates whether the user's account has expired.
     *
     * @return true if the account is valid (non-expired), false otherwise
     */
    @Override
    public boolean isAccountNonExpired() {
        return accountNonExpired;
    }

    /**
     * Indicates whether the user's account is locked.
     *
     * @return true if the account is not locked, false otherwise
     */
    @Override
    public boolean isAccountNonLocked() {
        return accountNonLocked;
    }

    /**
     * Indicates whether the user's credentials (password) has expired.
     *
     * @return true if the credentials are valid (non-expired), false otherwise
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return credentialsNonExpired;
    }

    /**
     * Indicates whether the user is enabled or disabled.
     *
     * @return true if the user is enabled, false otherwise
     */
    @Override
    public boolean isEnabled() {
        return enabled;
    }

    /**
     * Adds a role to this user.
     *
     * @param role The role to add
     */
    public void addRole(Role role) {
        this.roles.add(role);
        role.addUser(this);
    }

    /**
     * Removes a role from this user.
     *
     * @param role The role to remove
     */
    public void removeRole(Role role) {
        this.roles.remove(role);
        role.removeUser(this);
    }

    /**
     * Adds a token to this user.
     *
     * @param token The token to add
     */
    public void addToken(Token token) {
        this.tokens.add(token);
        token.setUser(this);
    }

    /**
     * Removes a token from this user.
     *
     * @param token The token to remove
     */
    public void removeToken(Token token) {
        this.tokens.remove(token);
        token.setUser(null);
    }

    /**
     * Increments the failed login attempts counter.
     *
     * @return The new count of failed attempts
     */
    public int incrementFailedLoginAttempts() {
        return ++failedLoginAttempts;
    }

    /**
     * Resets the failed login attempts counter to zero.
     */
    public void resetFailedLoginAttempts() {
        this.failedLoginAttempts = 0;
    }

    /**
     * Updates the last login timestamp to current time.
     */
    public void updateLastLogin() {
        this.lastLoginAt = LocalDateTime.now();
    }

    /**
     * Checks if the user has a specific role.
     *
     * @param roleName The name of the role to check
     * @return True if the user has the role, false otherwise
     */
    public boolean hasRole(String roleName) {
        return roles.stream()
                .anyMatch(role -> role.getName().equalsIgnoreCase(roleName));
    }

    /**
     * Returns the user's full name.
     *
     * @return The user's full name (firstName + lastName)
     */
    public String getFullName() {
        return firstName + " " + lastName;
    }
}