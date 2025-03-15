package com.ims.auth;

import com.ims.auth.AuthServiceApplication;
import com.ims.auth.service.UserService;
import com.ims.auth.service.TokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Integration test class that verifies the proper initialization of the Authentication Service
 * application context and its components.
 */
@SpringBootTest
public class AuthServiceApplicationTests {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private UserService userService;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Tests that the Spring application context loads successfully
     */
    @Test
    void contextLoads() {
        assertNotNull(applicationContext, "Application context should not be null");
        System.out.println("Application context loaded successfully");
    }

    /**
     * Tests that the UserService bean is properly initialized
     */
    @Test
    void userServiceLoads() {
        assertNotNull(userService, "UserService should not be null");
        System.out.println("UserService initialized successfully");
    }

    /**
     * Tests that the TokenService bean is properly initialized
     */
    @Test
    void tokenServiceLoads() {
        assertNotNull(tokenService, "TokenService should not be null");
        System.out.println("TokenService initialized successfully");
    }

    /**
     * Tests that the AuthenticationManager bean is properly initialized
     */
    @Test
    void authenticationManagerLoads() {
        assertNotNull(authenticationManager, "AuthenticationManager should not be null");
        System.out.println("AuthenticationManager initialized successfully");
    }

    /**
     * Tests that the PasswordEncoder bean is properly initialized
     */
    @Test
    void passwordEncoderLoads() {
        assertNotNull(passwordEncoder, "PasswordEncoder should not be null");
        System.out.println("PasswordEncoder initialized successfully");
    }
}