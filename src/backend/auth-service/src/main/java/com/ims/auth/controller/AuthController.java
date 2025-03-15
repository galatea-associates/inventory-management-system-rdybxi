package com.ims.auth.controller;

import com.ims.auth.dto.AuthRequest;
import com.ims.auth.dto.AuthResponse;
import com.ims.auth.dto.UserDTO;
import com.ims.auth.dto.PasswordChangeRequest;
import com.ims.auth.dto.PasswordResetRequest;
import com.ims.auth.dto.MfaVerificationRequest;
import com.ims.auth.model.User;
import com.ims.auth.service.UserService;
import com.ims.auth.service.TokenService;
import com.ims.common.exception.ValidationException;
import com.ims.common.exception.SecurityException;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.util.HashMap;
import java.util.Map;

/**
 * REST controller that provides authentication and user management endpoints for the Inventory Management System.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserService userService;
    private final TokenService tokenService;
    private final AuthenticationManager authenticationManager;

    /**
     * Authenticates a user and returns access and refresh tokens
     *
     * @param authRequest Request containing username and password
     * @param request The HTTP request
     * @return Response containing authentication tokens
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest authRequest, 
                                             HttpServletRequest request) {
        log.debug("Login attempt for username: {}", authRequest.getUsername());
        
        // Create authentication token with username and password
        UsernamePasswordAuthenticationToken authToken = 
                new UsernamePasswordAuthenticationToken(authRequest.getUsername(), authRequest.getPassword());
        
        try {
            // Attempt authentication
            Authentication authentication = authenticationManager.authenticate(authToken);
            
            // If authentication is successful, handle the login success
            userService.handleLoginSuccess(authRequest.getUsername());
            
            // Get the authenticated user
            User user = userService.getUserByUsername(authRequest.getUsername());
            
            // Check if MFA is enabled for the user
            if (user.isMfaEnabled()) {
                // If MFA code is not provided in the request, return response indicating MFA is required
                if (authRequest.getMfaCode() == null || authRequest.getMfaCode().isEmpty()) {
                    return ResponseEntity.ok(AuthResponse.builder()
                            .success(true)
                            .mfaRequired(true)
                            .build());
                }
                
                // Verify MFA code
                boolean isValidMfa = userService.verifyMfaCode(user.getId(), authRequest.getMfaCode());
                if (!isValidMfa) {
                    throw new SecurityException("AUTHENTICATION_FAILURE", "Invalid MFA code");
                }
            }
            
            // Generate tokens
            String accessToken = tokenService.generateAccessToken(user.getUsername(), request);
            String refreshToken = tokenService.generateRefreshToken(user.getUsername(), request);
            
            // Create and return response
            AuthResponse response = AuthResponse.builder()
                    .success(true)
                    .mfaRequired(false)
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .tokenType("Bearer")
                    .userId(user.getId().toString())
                    .username(user.getUsername())
                    .build();
            
            return ResponseEntity.ok(response);
            
        } catch (AuthenticationException e) {
            // Handle authentication failure
            userService.handleLoginFailure(authRequest.getUsername());
            throw new SecurityException("AUTHENTICATION_FAILURE", "Invalid username or password");
        }
    }

    /**
     * Registers a new user
     *
     * @param userDTO Data for creating the new user
     * @return Response indicating registration success
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody UserDTO userDTO) {
        log.debug("User registration attempt for username: {}", userDTO.getUsername());
        
        User user = userService.createUser(userDTO);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "User registered successfully");
        response.put("userId", user.getId().toString());
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Refreshes an access token using a valid refresh token
     *
     * @param refreshToken The refresh token
     * @param request The HTTP request
     * @return Response containing new access token
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refreshToken(@RequestParam("refreshToken") String refreshToken,
                                                           HttpServletRequest request) {
        log.debug("Token refresh attempt");
        
        // Validate refresh token
        boolean isValid = tokenService.validateToken(refreshToken);
        if (!isValid) {
            throw new SecurityException("TOKEN_INVALID", "Invalid or expired refresh token");
        }
        
        // Generate new access token
        String accessToken = tokenService.refreshAccessToken(refreshToken, request);
        
        Map<String, String> response = new HashMap<>();
        response.put("accessToken", accessToken);
        response.put("tokenType", "Bearer");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Logs out a user by revoking their tokens
     *
     * @param accessToken The access token to revoke
     * @return Response indicating logout success
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(@RequestParam("accessToken") String accessToken) {
        log.debug("Logout attempt");
        
        String username = tokenService.getUsernameFromJwtToken(accessToken);
        tokenService.revokeToken(accessToken);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Logout successful");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Changes a user's password
     *
     * @param request Request containing old and new passwords
     * @return Response indicating password change success
     */
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody PasswordChangeRequest request) {
        log.debug("Password change attempt");
        
        // Get current authenticated user
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userService.getUserByUsername(username);
        
        // Change password
        userService.changePassword(user.getId(), request.getCurrentPassword(), request.getNewPassword());
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password changed successfully");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Requests a password reset token for a user
     *
     * @param email Email address of the user
     * @return Response indicating reset token creation
     */
    @PostMapping("/request-password-reset")
    public ResponseEntity<Map<String, String>> requestPasswordReset(@RequestParam("email") String email) {
        log.debug("Password reset request for email: {}", email);
        
        userService.createPasswordResetToken(email);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password reset instructions sent to email if account exists");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Resets a user's password using a reset token
     *
     * @param request Request containing reset token and new password
     * @return Response indicating password reset success
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody PasswordResetRequest request) {
        log.debug("Password reset attempt");
        
        userService.resetPassword(request.getResetToken(), request.getNewPassword());
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password reset successfully");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Enables multi-factor authentication for a user
     *
     * @return Response containing MFA secret
     */
    @PostMapping("/enable-mfa")
    public ResponseEntity<Map<String, String>> enableMfa() {
        log.debug("MFA enablement attempt");
        
        // Get current authenticated user
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userService.getUserByUsername(username);
        
        // Enable MFA
        String secret = userService.enableMfa(user.getId());
        
        Map<String, String> response = new HashMap<>();
        response.put("secret", secret);
        response.put("message", "MFA enabled successfully");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Disables multi-factor authentication for a user
     *
     * @param request Request containing MFA verification code
     * @return Response indicating MFA disablement
     */
    @PostMapping("/disable-mfa")
    public ResponseEntity<Map<String, String>> disableMfa(@Valid @RequestBody MfaVerificationRequest request) {
        log.debug("MFA disablement attempt");
        
        // Get current authenticated user
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userService.getUserByUsername(username);
        
        // Verify MFA code before disabling
        boolean isValid = userService.verifyMfaCode(user.getId(), request.getMfaCode());
        if (!isValid) {
            throw new SecurityException("AUTHENTICATION_FAILURE", "Invalid MFA code");
        }
        
        // Disable MFA
        userService.disableMfa(user.getId());
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "MFA disabled successfully");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Verifies a multi-factor authentication code
     *
     * @param request Request containing MFA code
     * @return Response indicating verification result
     */
    @PostMapping("/verify-mfa")
    public ResponseEntity<Map<String, Boolean>> verifyMfa(@Valid @RequestBody MfaVerificationRequest request) {
        log.debug("MFA verification attempt");
        
        // Get current authenticated user
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userService.getUserByUsername(username);
        
        // Verify MFA code
        boolean isValid = userService.verifyMfaCode(user.getId(), request.getMfaCode());
        
        Map<String, Boolean> response = new HashMap<>();
        response.put("valid", isValid);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Validates a token's authenticity and expiration
     *
     * @param token The token to validate
     * @return Response indicating token validity
     */
    @PostMapping("/validate-token")
    public ResponseEntity<Map<String, Boolean>> validateToken(@RequestParam("token") String token) {
        log.debug("Token validation attempt");
        
        boolean isValid = tokenService.validateToken(token);
        
        Map<String, Boolean> response = new HashMap<>();
        response.put("valid", isValid);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves information about the current authenticated user
     *
     * @return Response containing user information
     */
    @GetMapping("/user-info")
    public ResponseEntity<Map<String, Object>> getUserInfo() {
        log.debug("User info request");
        
        // Get current authenticated user
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userService.getUserByUsername(username);
        
        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getId().toString());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("firstName", user.getFirstName());
        response.put("lastName", user.getLastName());
        response.put("fullName", user.getFullName());
        response.put("department", user.getDepartment());
        response.put("jobTitle", user.getJobTitle());
        response.put("mfaEnabled", user.isMfaEnabled());
        
        return ResponseEntity.ok(response);
    }
}