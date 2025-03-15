package com.ims.auth.repository;

import com.ims.auth.model.Permission;
import com.ims.auth.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Permission entity that extends JpaRepository to provide 
 * standard CRUD operations and custom query methods for permission management.
 * Supports the hierarchical permission model for granular access control in the
 * Inventory Management System.
 */
public interface PermissionRepository extends JpaRepository<Permission, UUID> {

    /**
     * Finds a permission by its name.
     *
     * @param name the name of the permission
     * @return Optional containing the permission if found, empty otherwise
     */
    Optional<Permission> findByName(String name);

    /**
     * Checks if a permission with the given name exists.
     *
     * @param name the name to check
     * @return true if a permission with the name exists, false otherwise
     */
    boolean existsByName(String name);

    /**
     * Finds all permissions for a specific resource.
     *
     * @param resource the resource to filter by
     * @return List of permissions for the specified resource
     */
    List<Permission> findByResource(String resource);

    /**
     * Finds all permissions for a specific action.
     *
     * @param action the action to filter by
     * @return List of permissions for the specified action
     */
    List<Permission> findByAction(String action);

    /**
     * Finds all permissions in a specific category.
     *
     * @param category the category to filter by
     * @return List of permissions in the specified category
     */
    List<Permission> findByCategory(String category);

    /**
     * Finds permissions matching a specific resource and action.
     *
     * @param resource the resource to filter by
     * @param action the action to filter by
     * @return List of permissions matching the resource and action
     */
    List<Permission> findByResourceAndAction(String resource, String action);

    /**
     * Finds all permissions assigned to a specific role.
     *
     * @param roleName the name of the role
     * @return List of permissions assigned to the specified role
     */
    List<Permission> findByRolesName(String roleName);

    /**
     * Finds all permissions assigned to a specific role by ID.
     *
     * @param roleId the ID of the role
     * @return List of permissions assigned to the specified role
     */
    List<Permission> findByRolesId(UUID roleId);

    /**
     * Finds all permissions not assigned to a specific role.
     * Useful for role management interfaces when adding permissions to roles.
     *
     * @param roleId the ID of the role
     * @return List of permissions not assigned to the specified role
     */
    @Query("SELECT p FROM Permission p WHERE p NOT IN (SELECT p2 FROM Permission p2 JOIN p2.roles r WHERE r.id = :roleId)")
    List<Permission> findPermissionsNotAssignedToRole(@Param("roleId") UUID roleId);

    /**
     * Counts the number of roles that have a specific permission.
     * Used to determine if a permission can be safely deleted.
     *
     * @param permissionId the ID of the permission
     * @return Count of roles with the permission
     */
    long countByRolesId(UUID permissionId);

    /**
     * Updates the category of a permission.
     * Allows for reorganizing permissions without having to recreate them.
     *
     * @param category the new category
     * @param permissionId the ID of the permission to update
     * @return Number of permissions updated (0 or 1)
     */
    @Modifying
    @Transactional
    @Query("UPDATE Permission p SET p.category = :category WHERE p.id = :permissionId")
    int updateCategory(@Param("category") String category, @Param("permissionId") UUID permissionId);

    /**
     * Updates the description of a permission.
     * Enables maintaining accurate documentation for permissions.
     *
     * @param description the new description
     * @param permissionId the ID of the permission to update
     * @return Number of permissions updated (0 or 1)
     */
    @Modifying
    @Transactional
    @Query("UPDATE Permission p SET p.description = :description WHERE p.id = :permissionId")
    int updateDescription(@Param("description") String description, @Param("permissionId") UUID permissionId);

    /**
     * Finds all permissions grouped by category.
     * Used for displaying permissions in management interfaces organized by category.
     *
     * @return List of arrays containing category and permissions
     */
    @Query("SELECT p.category, p FROM Permission p ORDER BY p.category, p.name")
    List<Object[]> findAllGroupedByCategory();

    /**
     * Finds all permissions grouped by resource.
     * Used for resource-focused permission management.
     *
     * @return List of arrays containing resource and permissions
     */
    @Query("SELECT p.resource, p FROM Permission p ORDER BY p.resource, p.name")
    List<Object[]> findAllGroupedByResource();

    /**
     * Finds all permissions for a resource with their actions.
     * Supports resource-based authorization in the UI and API.
     *
     * @param resource the resource to filter by
     * @return List of permissions for the resource with actions loaded
     */
    @Query("SELECT p FROM Permission p WHERE p.resource = :resource ORDER BY p.action")
    List<Permission> findAllByResourceWithActions(@Param("resource") String resource);
}