package com.ims.auth.repository;

import com.ims.auth.model.Role;
import org.springframework.data.jpa.repository.JpaRepository; // version 3.0.4
import org.springframework.data.jpa.repository.Query; // version 3.0.4
import org.springframework.data.jpa.repository.Modifying; // version 3.0.4
import org.springframework.data.repository.query.Param; // version 3.0.4
import org.springframework.transaction.annotation.Transactional; // version 6.0.6

import java.util.List; // version 17
import java.util.Optional; // version 17
import java.util.UUID; // version 17

/**
 * Repository interface for Role entity that extends JpaRepository to provide standard CRUD operations
 * and custom query methods for role management, role-permission relationships, and hierarchical role structures.
 */
public interface RoleRepository extends JpaRepository<Role, UUID> {

    /**
     * Finds a role by its name.
     *
     * @param name the name of the role to find
     * @return an Optional containing the role if found, empty otherwise
     */
    Optional<Role> findByName(String name);

    /**
     * Checks if a role with the given name exists.
     *
     * @param name the name to check
     * @return true if a role with the name exists, false otherwise
     */
    boolean existsByName(String name);

    /**
     * Finds all default roles.
     *
     * @return a list of default roles
     */
    List<Role> findByIsDefaultTrue();

    /**
     * Finds all roles assigned to a specific user by username.
     *
     * @param username the username of the user
     * @return a list of roles assigned to the specified user
     */
    List<Role> findByUsersUsername(String username);

    /**
     * Finds all roles assigned to a specific user by ID.
     *
     * @param userId the ID of the user
     * @return a list of roles assigned to the specified user
     */
    List<Role> findByUsersId(UUID userId);

    /**
     * Finds all roles that have a specific permission.
     *
     * @param permissionName the name of the permission
     * @return a list of roles with the specified permission
     */
    List<Role> findByPermissionsName(String permissionName);

    /**
     * Finds all roles that have a specific permission by ID.
     *
     * @param permissionId the ID of the permission
     * @return a list of roles with the specified permission
     */
    List<Role> findByPermissionsId(UUID permissionId);

    /**
     * Finds all child roles of a specific parent role.
     *
     * @param parentRoleId the ID of the parent role
     * @return a list of child roles for the specified parent role
     */
    List<Role> findByParentRolesId(UUID parentRoleId);

    /**
     * Finds all parent roles of a specific child role.
     *
     * @param childRoleId the ID of the child role
     * @return a list of parent roles for the specified child role
     */
    List<Role> findByChildRolesId(UUID childRoleId);

    /**
     * Counts the number of users assigned to a specific role.
     *
     * @param roleId the ID of the role
     * @return the number of users assigned to the role
     */
    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.id = :roleId")
    long countUsersByRoleId(@Param("roleId") UUID roleId);

    /**
     * Counts the number of permissions assigned to a specific role.
     *
     * @param roleId the ID of the role
     * @return the number of permissions assigned to the role
     */
    @Query("SELECT COUNT(p) FROM Permission p JOIN p.roles r WHERE r.id = :roleId")
    long countPermissionsByRoleId(@Param("roleId") UUID roleId);

    /**
     * Finds all roles not assigned to a specific user.
     *
     * @param userId the ID of the user
     * @return a list of roles not assigned to the specified user
     */
    @Query("SELECT r FROM Role r WHERE r NOT IN (SELECT r2 FROM Role r2 JOIN r2.users u WHERE u.id = :userId)")
    List<Role> findRolesNotAssignedToUser(@Param("userId") UUID userId);

    /**
     * Finds all roles that don't have a specific permission.
     *
     * @param permissionId the ID of the permission
     * @return a list of roles without the specified permission
     */
    @Query("SELECT r FROM Role r WHERE r NOT IN (SELECT r2 FROM Role r2 JOIN r2.permissions p WHERE p.id = :permissionId)")
    List<Role> findRolesWithoutPermission(@Param("permissionId") UUID permissionId);

    /**
     * Updates the default status of a role.
     *
     * @param isDefault the new default status
     * @param roleId the ID of the role to update
     * @return the number of roles updated (0 or 1)
     */
    @Modifying
    @Transactional
    @Query("UPDATE Role r SET r.isDefault = :isDefault WHERE r.id = :roleId")
    int updateDefaultStatus(@Param("isDefault") boolean isDefault, @Param("roleId") UUID roleId);

    /**
     * Finds all roles with their hierarchical relationships.
     *
     * @return a list of all roles with parent and child relationships loaded
     */
    @Query("SELECT DISTINCT r FROM Role r LEFT JOIN FETCH r.parentRoles LEFT JOIN FETCH r.childRoles")
    List<Role> findAllHierarchical();

    /**
     * Finds a role with its complete hierarchy by name.
     *
     * @param name the name of the role
     * @return an Optional containing the role with its hierarchy if found, empty otherwise
     */
    @Query("SELECT DISTINCT r FROM Role r LEFT JOIN FETCH r.parentRoles LEFT JOIN FETCH r.childRoles WHERE r.name = :name")
    Optional<Role> findRoleHierarchyByName(@Param("name") String name);
}