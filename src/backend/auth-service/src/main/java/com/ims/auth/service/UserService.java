package com.ims.auth.service;

import com.ims.auth.model.User;
import com.ims.auth.model.Role;
import com.ims.auth.model.Token;
import com.ims.auth.model.TokenType;
import com.ims.auth.repository.UserRepository;
import com.ims.auth.repository.RoleRepository;
import com.ims.auth.repository.TokenRepository;
import com.ims.common.exception.ServiceException;
import com.ims.common.exception.NotFoundException;
import com.ims.common.exception.ValidationException;
import com.ims.auth.dto.UserDTO;

import org.springframework.security.crypto.password.PasswordEncoder; // version 6.0.2
import org.springframework.security.core.userdetails.UserDetailsService; // version 6.0.2
import org.springframework.security.core.userdetails.UsernameNotFoundException; // version 6.0.2
import org.springframework.stereotype.Service; // version 6.0.6
import org.springframework.transaction.annotation.Transactional; // version 6.0.6
import org.springframework.beans.factory.annotation.Autowired; // version 6.0.6
import org.springframework.beans.factory.annotation.Value; // version 6.0.6
import lombok.RequiredArgsConstructor; // version 1.18.26
import lombok.extern.slf4j.Slf4j; // version 1.18.26
import dev.samstevens.totp.secret.SecretGenerator; // version 1.7.1
import dev.samstevens.totp.code.CodeVerifier; // version 1.7.1

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class that implements UserDetailsService and provides comprehensive user management 
 * functionality including user creation, authentication, role management, and security operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserService implements UserDetailsService {

    private static final String SERVICE_NAME = "UserService";
    private static final int MAX_FAILED_ATTEMPTS = 5;
    
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final TokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecretGenerator secretGenerator;
    private final CodeVerifier codeVerifier;
    private final int maxFailedAttempts;
    private final boolean lockUserOnFailedAttempts;

    /**
     * Constructor with required dependencies and configuration values
     */
    @Autowired
    public UserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            TokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            SecretGenerator secretGenerator,
            CodeVerifier codeVerifier,
            @Value("${security.login.max-failed-attempts:" + MAX_FAILED_ATTEMPTS + "}") int maxFailedAttempts,
            @Value("${security.login.lock-user-on-failed-attempts:true}") boolean lockUserOnFailedAttempts) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.secretGenerator = secretGenerator;
        this.codeVerifier = codeVerifier;
        this.maxFailedAttempts = maxFailedAttempts;
        this.lockUserOnFailedAttempts = lockUserOnFailedAttempts;
    }

    /**
     * Loads a user by username for Spring Security authentication
     *
     * @param username Username or email to search for
     * @return The user with the given username
     * @throws UsernameNotFoundException if no user is found
     */
    @Override
    public User loadUserByUsername(String username) throws UsernameNotFoundException {
        log.debug("Loading user by username: {}", username);
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username or email: " + username));
    }

    /**
     * Creates a new user with the provided details
     *
     * @param userDTO Data transfer object containing user details
     * @return The created user
     * @throws ValidationException if user data is invalid
     */
    public User createUser(UserDTO userDTO) {
        log.debug("Creating new user with username: {}", userDTO.getUsername());
        
        // Validate user data
        validateUserData(userDTO, null);
        
        // Create and populate user entity
        User user = new User();
        user.setUsername(userDTO.getUsername());
        user.setEmail(userDTO.getEmail());
        user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        user.setFirstName(userDTO.getFirstName());
        user.setLastName(userDTO.getLastName());
        user.setDepartment(userDTO.getDepartment());
        user.setJobTitle(userDTO.getJobTitle());
        user.setPhoneNumber(userDTO.getPhoneNumber());
        
        // Set default account status
        user.setEnabled(true);
        user.setAccountNonExpired(true);
        user.setAccountNonLocked(true);
        user.setCredentialsNonExpired(true);
        user.setFailedLoginAttempts(0);
        user.setPasswordChangedAt(LocalDateTime.now());
        
        // Save the user
        user = userRepository.save(user);
        
        // Assign default roles
        assignDefaultRolesToUser(user);
        
        log.info("User created successfully: {}", user.getUsername());
        return user;
    }

    /**
     * Updates an existing user with the provided details
     *
     * @param userId ID of the user to update
     * @param userDTO Data transfer object containing updated user details
     * @return The updated user
     * @throws NotFoundException if the user is not found
     * @throws ValidationException if user data is invalid
     */
    public User updateUser(UUID userId, UserDTO userDTO) {
        log.debug("Updating user with ID: {}", userId);
        
        // Find user
        User user = getUserById(userId);
        
        // Validate update data
        validateUserData(userDTO, user);
        
        // Update user fields
        user.setFirstName(userDTO.getFirstName());
        user.setLastName(userDTO.getLastName());
        user.setDepartment(userDTO.getDepartment());
        user.setJobTitle(userDTO.getJobTitle());
        user.setPhoneNumber(userDTO.getPhoneNumber());
        
        // Only update username and email if they have changed
        if (userDTO.getUsername() != null && !user.getUsername().equals(userDTO.getUsername())) {
            user.setUsername(userDTO.getUsername());
        }
        
        if (userDTO.getEmail() != null && !user.getEmail().equals(userDTO.getEmail())) {
            user.setEmail(userDTO.getEmail());
        }
        
        // Save the updated user
        user = userRepository.save(user);
        
        log.info("User updated successfully: {}", user.getUsername());
        return user;
    }

    /**
     * Retrieves a user by their ID
     *
     * @param userId ID of the user to retrieve
     * @return The user with the given ID
     * @throws NotFoundException if the user is not found
     */
    public User getUserById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User", userId.toString()));
    }

    /**
     * Retrieves a user by their username
     *
     * @param username Username to search for
     * @return The user with the given username
     * @throws NotFoundException if the user is not found
     */
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User", "username: " + username));
    }

    /**
     * Retrieves a user by their email address
     *
     * @param email Email address to search for
     * @return The user with the given email
     * @throws NotFoundException if the user is not found
     */
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User", "email: " + email));
    }

    /**
     * Retrieves all users in the system
     *
     * @return List of all users
     */
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Deletes a user by their ID
     *
     * @param userId ID of the user to delete
     * @throws NotFoundException if the user is not found
     */
    public void deleteUser(UUID userId) {
        log.debug("Deleting user with ID: {}", userId);
        
        // Find user
        User user = getUserById(userId);
        
        // Revoke all tokens
        tokenRepository.revokeAllUserTokens(user.getId());
        
        // Delete user
        userRepository.delete(user);
        
        log.info("User deleted successfully: {}", user.getUsername());
    }

    /**
     * Changes a user's password
     *
     * @param userId ID of the user
     * @param currentPassword The current password
     * @param newPassword The new password
     * @return True if password was changed successfully
     * @throws NotFoundException if the user is not found
     * @throws ValidationException if the current password is incorrect
     */
    public boolean changePassword(UUID userId, String currentPassword, String newPassword) {
        log.debug("Changing password for user with ID: {}", userId);
        
        // Find user
        User user = getUserById(userId);
        
        // Verify current password
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new ValidationException("User", "Current password is incorrect");
        }
        
        // Encode and update new password
        String encodedPassword = passwordEncoder.encode(newPassword);
        LocalDateTime now = LocalDateTime.now();
        userRepository.updatePassword(encodedPassword, now, userId);
        
        // Revoke all user tokens
        tokenRepository.revokeAllUserTokens(user.getId());
        
        log.info("Password changed successfully for user: {}", user.getUsername());
        return true;
    }

    /**
     * Resets a user's password using a reset token
     *
     * @param resetToken The password reset token
     * @param newPassword The new password
     * @return True if password was reset successfully
     * @throws ValidationException if the token is invalid or expired
     */
    public boolean resetPassword(String resetToken, String newPassword) {
        log.debug("Resetting password with token");
        
        // Find token
        Token token = tokenRepository.findByTokenValueAndTokenType(resetToken, TokenType.RESET_PASSWORD)
                .orElseThrow(() -> new ValidationException("Token", "Invalid or expired password reset token"));
        
        // Verify token validity
        if (token.isExpired() || token.isRevoked()) {
            throw new ValidationException("Token", "Invalid or expired password reset token");
        }
        
        // Get user from token
        User user = token.getUser();
        
        // Encode and update new password
        String encodedPassword = passwordEncoder.encode(newPassword);
        LocalDateTime now = LocalDateTime.now();
        userRepository.updatePassword(encodedPassword, now, user.getId());
        
        // Revoke the reset token
        token.revoke();
        tokenRepository.save(token);
        
        // Revoke all user access and refresh tokens
        List<Token> tokens = tokenRepository.findAllByUserAndTokenType(user, TokenType.ACCESS);
        tokens.addAll(tokenRepository.findAllByUserAndTokenType(user, TokenType.REFRESH));
        
        for (Token t : tokens) {
            t.revoke();
            tokenRepository.save(t);
        }
        
        log.info("Password reset successfully for user: {}", user.getUsername());
        return true;
    }

    /**
     * Creates a password reset token for a user
     *
     * @param email Email address of the user
     * @return The generated reset token
     * @throws NotFoundException if the user is not found
     */
    public String createPasswordResetToken(String email) {
        log.debug("Creating password reset token for email: {}", email);
        
        // Find user by email
        User user = getUserByEmail(email);
        
        // Generate token
        String tokenValue = UUID.randomUUID().toString();
        
        // Create token entity
        Token token = new Token();
        token.setTokenValue(tokenValue);
        token.setTokenType(TokenType.RESET_PASSWORD);
        token.setExpiresAt(LocalDateTime.now().plusHours(24)); // 24-hour expiry
        token.setRevoked(false);
        token.setUser(user);
        
        // Save token
        tokenRepository.save(token);
        
        log.info("Password reset token created for user: {}", user.getUsername());
        return tokenValue;
    }

    /**
     * Enables a user account
     *
     * @param userId ID of the user
     * @return True if user was enabled successfully
     * @throws NotFoundException if the user is not found
     */
    public boolean enableUser(UUID userId) {
        log.debug("Enabling user with ID: {}", userId);
        
        // Find user
        User user = getUserById(userId);
        
        // Update enabled status
        userRepository.updateEnabled(true, userId);
        
        log.info("User enabled successfully: {}", user.getUsername());
        return true;
    }

    /**
     * Disables a user account
     *
     * @param userId ID of the user
     * @return True if user was disabled successfully
     * @throws NotFoundException if the user is not found
     */
    public boolean disableUser(UUID userId) {
        log.debug("Disabling user with ID: {}", userId);
        
        // Find user
        User user = getUserById(userId);
        
        // Update enabled status
        userRepository.updateEnabled(false, userId);
        
        // Revoke all user tokens
        tokenRepository.revokeAllUserTokens(user.getId());
        
        log.info("User disabled successfully: {}", user.getUsername());
        return true;
    }

    /**
     * Locks a user account
     *
     * @param userId ID of the user
     * @return True if user was locked successfully
     * @throws NotFoundException if the user is not found
     */
    public boolean lockUser(UUID userId) {
        log.debug("Locking user with ID: {}", userId);
        
        // Find user
        User user = getUserById(userId);
        
        // Update account locked status
        userRepository.updateAccountLocked(false, userId);
        
        // Revoke all user tokens
        tokenRepository.revokeAllUserTokens(user.getId());
        
        log.info("User locked successfully: {}", user.getUsername());
        return true;
    }

    /**
     * Unlocks a user account
     *
     * @param userId ID of the user
     * @return True if user was unlocked successfully
     * @throws NotFoundException if the user is not found
     */
    public boolean unlockUser(UUID userId) {
        log.debug("Unlocking user with ID: {}", userId);
        
        // Find user
        User user = getUserById(userId);
        
        // Update account locked status
        userRepository.updateAccountLocked(true, userId);
        
        // Reset failed login attempts
        userRepository.resetFailedLoginAttempts(userId);
        
        log.info("User unlocked successfully: {}", user.getUsername());
        return true;
    }

    /**
     * Assigns a role to a user
     *
     * @param userId ID of the user
     * @param roleName Name of the role to assign
     * @return True if role was assigned successfully
     * @throws NotFoundException if the user or role is not found
     */
    public boolean assignRoleToUser(UUID userId, String roleName) {
        log.debug("Assigning role {} to user with ID: {}", roleName, userId);
        
        // Find user
        User user = getUserById(userId);
        
        // Find role
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new NotFoundException("Role", roleName));
        
        // Check if user already has the role
        if (user.hasRole(roleName)) {
            return true;
        }
        
        // Add role to user
        user.addRole(role);
        userRepository.save(user);
        
        log.info("Role {} assigned to user: {}", roleName, user.getUsername());
        return true;
    }

    /**
     * Removes a role from a user
     *
     * @param userId ID of the user
     * @param roleName Name of the role to remove
     * @return True if role was removed successfully
     * @throws NotFoundException if the user or role is not found
     */
    public boolean removeRoleFromUser(UUID userId, String roleName) {
        log.debug("Removing role {} from user with ID: {}", roleName, userId);
        
        // Find user
        User user = getUserById(userId);
        
        // Find role
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new NotFoundException("Role", roleName));
        
        // Check if user has the role
        if (!user.hasRole(roleName)) {
            return true;
        }
        
        // Remove role from user
        user.removeRole(role);
        userRepository.save(user);
        
        log.info("Role {} removed from user: {}", roleName, user.getUsername());
        return true;
    }

    /**
     * Gets all roles assigned to a user
     *
     * @param userId ID of the user
     * @return Set of roles assigned to the user
     * @throws NotFoundException if the user is not found
     */
    public Set<Role> getUserRoles(UUID userId) {
        // Find user
        User user = getUserById(userId);
        
        return user.getRoles();
    }

    /**
     * Checks if a user has a specific role
     *
     * @param userId ID of the user
     * @param roleName Name of the role to check
     * @return True if user has the role, false otherwise
     * @throws NotFoundException if the user is not found
     */
    public boolean hasUserRole(UUID userId, String roleName) {
        // Find user
        User user = getUserById(userId);
        
        return user.hasRole(roleName);
    }

    /**
     * Enables multi-factor authentication for a user
     *
     * @param userId ID of the user
     * @return The generated MFA secret
     * @throws NotFoundException if the user is not found
     */
    public String enableMfa(UUID userId) {
        log.debug("Enabling MFA for user with ID: {}", userId);
        
        // Find user
        User user = getUserById(userId);
        
        // Generate MFA secret
        String secret = secretGenerator.generate();
        
        // Update MFA status and secret
        userRepository.updateMfaEnabled(true, userId);
        userRepository.updateMfaSecret(secret, userId);
        
        log.info("MFA enabled for user: {}", user.getUsername());
        return secret;
    }

    /**
     * Disables multi-factor authentication for a user
     *
     * @param userId ID of the user
     * @return True if MFA was disabled successfully
     * @throws NotFoundException if the user is not found
     */
    public boolean disableMfa(UUID userId) {
        log.debug("Disabling MFA for user with ID: {}", userId);
        
        // Find user
        User user = getUserById(userId);
        
        // Update MFA status and clear secret
        userRepository.updateMfaEnabled(false, userId);
        userRepository.updateMfaSecret(null, userId);
        
        log.info("MFA disabled for user: {}", user.getUsername());
        return true;
    }

    /**
     * Verifies a multi-factor authentication code
     *
     * @param userId ID of the user
     * @param code MFA code to verify
     * @return True if code is valid, false otherwise
     * @throws NotFoundException if the user is not found
     * @throws ValidationException if MFA is not enabled for the user
     */
    public boolean verifyMfaCode(UUID userId, String code) {
        // Find user
        User user = getUserById(userId);
        
        // Check if MFA is enabled
        if (!user.isMfaEnabled()) {
            throw new ValidationException("User", "MFA is not enabled for this user");
        }
        
        // Verify code
        return codeVerifier.isValidCode(user.getMfaSecret(), code);
    }

    /**
     * Handles successful login attempt
     *
     * @param username Username of the user who logged in
     */
    public void handleLoginSuccess(String username) {
        Optional<User> userOptional = userRepository.findByUsername(username);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            user.resetFailedLoginAttempts();
            user.updateLastLogin();
            userRepository.resetFailedLoginAttempts(user.getId());
            userRepository.updateLastLogin(LocalDateTime.now(), user.getId());
        }
    }

    /**
     * Handles failed login attempt
     *
     * @param username Username that was used in the failed login attempt
     */
    public void handleLoginFailure(String username) {
        Optional<User> userOptional = userRepository.findByUsername(username);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            int attempts = user.incrementFailedLoginAttempts();
            userRepository.updateFailedLoginAttempts(attempts, user.getId());
            
            // Lock account if needed
            if (lockUserOnFailedAttempts && attempts >= maxFailedAttempts) {
                userRepository.updateAccountLocked(false, user.getId());
                log.warn("User account locked due to {} failed login attempts: {}", 
                        attempts, user.getUsername());
            }
        }
    }

    /**
     * Revokes all tokens for a user
     *
     * @param userId ID of the user
     * @return Number of tokens revoked
     * @throws NotFoundException if the user is not found
     */
    public int revokeUserTokens(UUID userId) {
        // Find user
        User user = getUserById(userId);
        
        // Revoke all tokens
        return tokenRepository.revokeAllUserTokens(user.getId());
    }

    /**
     * Revokes a specific token
     *
     * @param tokenValue Value of the token to revoke
     * @return True if token was revoked successfully
     */
    public boolean revokeToken(String tokenValue) {
        return tokenRepository.revokeToken(tokenValue) > 0;
    }

    /**
     * Gets all tokens for a user
     *
     * @param userId ID of the user
     * @return List of tokens for the user
     * @throws NotFoundException if the user is not found
     */
    public List<Token> getUserTokens(UUID userId) {
        // Find user
        User user = getUserById(userId);
        
        // Get all user tokens
        return tokenRepository.findAllByUser(user);
    }

    /**
     * Assigns default roles to a user
     *
     * @param user User to assign roles to
     */
    private void assignDefaultRolesToUser(User user) {
        List<Role> defaultRoles = roleRepository.findByIsDefaultTrue();
        for (Role role : defaultRoles) {
            user.addRole(role);
        }
        userRepository.save(user);
    }

    /**
     * Validates user data for creation or update
     *
     * @param userDTO User data to validate
     * @param existingUser Existing user for update scenarios, null for creation
     * @throws ValidationException if validation fails
     */
    private void validateUserData(UserDTO userDTO, User existingUser) {
        ValidationException validationException = new ValidationException("User", "Validation failed for user data");
        
        // Username validation
        if (userDTO.getUsername() == null || userDTO.getUsername().isEmpty()) {
            validationException.addFieldError("username", "Username cannot be empty");
        }
        
        // Email validation
        if (userDTO.getEmail() == null || userDTO.getEmail().isEmpty()) {
            validationException.addFieldError("email", "Email cannot be empty");
        }
        
        // If creating a new user
        if (existingUser == null) {
            // Password validation
            if (userDTO.getPassword() == null || userDTO.getPassword().isEmpty()) {
                validationException.addFieldError("password", "Password cannot be empty");
            }
            
            // Check username uniqueness
            if (userDTO.getUsername() != null && !userDTO.getUsername().isEmpty() && 
                userRepository.existsByUsername(userDTO.getUsername())) {
                validationException.addFieldError("username", "Username is already taken");
            }
            
            // Check email uniqueness
            if (userDTO.getEmail() != null && !userDTO.getEmail().isEmpty() && 
                userRepository.existsByEmail(userDTO.getEmail())) {
                validationException.addFieldError("email", "Email is already in use");
            }
        } 
        // If updating existing user
        else {
            // Check username uniqueness only if changed
            if (userDTO.getUsername() != null && !userDTO.getUsername().isEmpty() && 
                !userDTO.getUsername().equals(existingUser.getUsername()) && 
                userRepository.existsByUsername(userDTO.getUsername())) {
                validationException.addFieldError("username", "Username is already taken");
            }
            
            // Check email uniqueness only if changed
            if (userDTO.getEmail() != null && !userDTO.getEmail().isEmpty() && 
                !userDTO.getEmail().equals(existingUser.getEmail()) && 
                userRepository.existsByEmail(userDTO.getEmail())) {
                validationException.addFieldError("email", "Email is already in use");
            }
        }
        
        // Throw exception if there are validation errors
        if (validationException.hasFieldErrors()) {
            throw validationException;
        }
    }
}