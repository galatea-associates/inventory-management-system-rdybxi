package com.ims.auth.repository;

import com.ims.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository; // version 3.0.4
import org.springframework.data.jpa.repository.Query; // version 3.0.4
import org.springframework.data.jpa.repository.Modifying; // version 3.0.4
import org.springframework.data.repository.query.Param; // version 3.0.4
import org.springframework.transaction.annotation.Transactional; // version 6.0.6

import java.util.List; // version 17
import java.util.Optional; // version 17
import java.util.UUID; // version 17
import java.time.LocalDateTime; // version 17

/**
 * Repository interface for User entity that provides data access methods for user management,
 * authentication, and security operations in the Inventory Management System.
 */
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Finds a user by username.
     *
     * @param username The username to search for
     * @return Optional containing the user if found, empty otherwise
     */
    Optional<User> findByUsername(String username);

    /**
     * Finds a user by email address.
     *
     * @param email The email to search for
     * @return Optional containing the user if found, empty otherwise
     */
    Optional<User> findByEmail(String email);

    /**
     * Finds a user by username or email address.
     *
     * @param username The username to search for
     * @param email The email to search for
     * @return Optional containing the user if found, empty otherwise
     */
    Optional<User> findByUsernameOrEmail(String username, String email);

    /**
     * Checks if a user with the given username exists.
     *
     * @param username The username to check
     * @return True if a user with the username exists, false otherwise
     */
    boolean existsByUsername(String username);

    /**
     * Checks if a user with the given email exists.
     *
     * @param email The email to check
     * @return True if a user with the email exists, false otherwise
     */
    boolean existsByEmail(String email);

    /**
     * Finds all users with a specific role.
     *
     * @param roleName The name of the role to search for
     * @return List of users with the specified role
     */
    List<User> findByRolesName(String roleName);

    /**
     * Finds all users in a specific department.
     *
     * @param department The department to search for
     * @return List of users in the specified department
     */
    List<User> findByDepartment(String department);

    /**
     * Finds all enabled users.
     *
     * @return List of all enabled users
     */
    List<User> findByEnabledTrue();

    /**
     * Finds all disabled users.
     *
     * @return List of all disabled users
     */
    List<User> findByEnabledFalse();

    /**
     * Finds all locked user accounts.
     *
     * @return List of all locked users
     */
    List<User> findByAccountNonLockedFalse();

    /**
     * Finds all users with MFA enabled.
     *
     * @return List of all users with MFA enabled
     */
    List<User> findByMfaEnabledTrue();

    /**
     * Finds users who haven't logged in since a specific date.
     *
     * @param date The date to check against
     * @return List of users who haven't logged in since the specified date
     */
    List<User> findByLastLoginAtBefore(LocalDateTime date);

    /**
     * Finds users with failed login attempts exceeding a threshold.
     *
     * @param threshold The threshold value
     * @return List of users with failed login attempts exceeding the threshold
     */
    List<User> findByFailedLoginAttemptsGreaterThan(int threshold);

    /**
     * Updates the failed login attempts for a user.
     *
     * @param failedAttempts The new failed attempts count
     * @param userId The ID of the user to update
     * @return Number of users updated (0 or 1)
     */
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.failedLoginAttempts = :failedAttempts WHERE u.id = :userId")
    int updateFailedLoginAttempts(@Param("failedAttempts") int failedAttempts, @Param("userId") UUID userId);

    /**
     * Resets the failed login attempts for a user.
     *
     * @param userId The ID of the user to update
     * @return Number of users updated (0 or 1)
     */
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.failedLoginAttempts = 0 WHERE u.id = :userId")
    int resetFailedLoginAttempts(@Param("userId") UUID userId);

    /**
     * Updates the last login timestamp for a user.
     *
     * @param lastLoginAt The new last login timestamp
     * @param userId The ID of the user to update
     * @return Number of users updated (0 or 1)
     */
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.lastLoginAt = :lastLoginAt WHERE u.id = :userId")
    int updateLastLogin(@Param("lastLoginAt") LocalDateTime lastLoginAt, @Param("userId") UUID userId);

    /**
     * Updates the account locked status for a user.
     *
     * @param accountNonLocked The new account locked status
     * @param userId The ID of the user to update
     * @return Number of users updated (0 or 1)
     */
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.accountNonLocked = :accountNonLocked WHERE u.id = :userId")
    int updateAccountLocked(@Param("accountNonLocked") boolean accountNonLocked, @Param("userId") UUID userId);

    /**
     * Updates the enabled status for a user.
     *
     * @param enabled The new enabled status
     * @param userId The ID of the user to update
     * @return Number of users updated (0 or 1)
     */
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.enabled = :enabled WHERE u.id = :userId")
    int updateEnabled(@Param("enabled") boolean enabled, @Param("userId") UUID userId);

    /**
     * Updates the MFA enabled status for a user.
     *
     * @param mfaEnabled The new MFA enabled status
     * @param userId The ID of the user to update
     * @return Number of users updated (0 or 1)
     */
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.mfaEnabled = :mfaEnabled WHERE u.id = :userId")
    int updateMfaEnabled(@Param("mfaEnabled") boolean mfaEnabled, @Param("userId") UUID userId);

    /**
     * Updates the MFA secret for a user.
     *
     * @param mfaSecret The new MFA secret
     * @param userId The ID of the user to update
     * @return Number of users updated (0 or 1)
     */
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.mfaSecret = :mfaSecret WHERE u.id = :userId")
    int updateMfaSecret(@Param("mfaSecret") String mfaSecret, @Param("userId") UUID userId);

    /**
     * Updates the password for a user.
     *
     * @param password The new password
     * @param passwordChangedAt The password change timestamp
     * @param userId The ID of the user to update
     * @return Number of users updated (0 or 1)
     */
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.password = :password, u.passwordChangedAt = :passwordChangedAt WHERE u.id = :userId")
    int updatePassword(@Param("password") String password, @Param("passwordChangedAt") LocalDateTime passwordChangedAt, @Param("userId") UUID userId);

    /**
     * Counts the number of users with a specific role.
     *
     * @param roleName The name of the role to count
     * @return Count of users with the specified role
     */
    long countByRolesName(String roleName);

    /**
     * Counts the number of users in a specific department.
     *
     * @param department The department to count
     * @return Count of users in the specified department
     */
    long countByDepartment(String department);
}