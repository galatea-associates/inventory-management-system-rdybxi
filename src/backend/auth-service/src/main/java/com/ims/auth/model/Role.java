package com.ims.auth.model;

import com.ims.common.model.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Entity class representing a role in the Inventory Management System.
 * Implements GrantedAuthority for Spring Security integration and provides
 * comprehensive role-based access control capabilities with hierarchical structure.
 */
@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"users", "permissions", "childRoles", "parentRoles"})
public class Role extends BaseEntity implements GrantedAuthority {

    /**
     * The name of the role, used to identify it in the system.
     */
    @Column(nullable = false, unique = true, length = 50)
    private String name;

    /**
     * A description of what this role represents and its purpose.
     */
    @Column(length = 255)
    private String description;

    /**
     * Indicates if this is a default role automatically assigned to new users.
     */
    @Column(nullable = false)
    private boolean isDefault;

    /**
     * The users who have been assigned this role.
     */
    @ManyToMany(mappedBy = "roles", fetch = FetchType.LAZY)
    @Builder.Default
    private Set<User> users = new HashSet<>();

    /**
     * The permissions granted to this role.
     */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @Builder.Default
    private Set<Permission> permissions = new HashSet<>();

    /**
     * Child roles that inherit permissions from this role.
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "role_hierarchy",
        joinColumns = @JoinColumn(name = "parent_role_id"),
        inverseJoinColumns = @JoinColumn(name = "child_role_id")
    )
    @Builder.Default
    private Set<Role> childRoles = new HashSet<>();

    /**
     * Parent roles from which this role inherits permissions.
     */
    @ManyToMany(mappedBy = "childRoles", fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Role> parentRoles = new HashSet<>();

    /**
     * Default constructor that initializes collections.
     */
    public Role() {
        super();
        this.users = new HashSet<>();
        this.permissions = new HashSet<>();
        this.childRoles = new HashSet<>();
        this.parentRoles = new HashSet<>();
        this.isDefault = false;
    }

    /**
     * Returns the authority string representation of this role.
     * Required by the GrantedAuthority interface.
     *
     * @return The authority string in format 'ROLE_' + name
     */
    @Override
    public String getAuthority() {
        return "ROLE_" + name.toUpperCase();
    }

    /**
     * Adds a user to this role.
     *
     * @param user The user to add
     */
    public void addUser(User user) {
        this.users.add(user);
        user.getRoles().add(this);
    }

    /**
     * Removes a user from this role.
     *
     * @param user The user to remove
     */
    public void removeUser(User user) {
        this.users.remove(user);
        user.getRoles().remove(this);
    }

    /**
     * Adds a permission to this role.
     *
     * @param permission The permission to add
     */
    public void addPermission(Permission permission) {
        this.permissions.add(permission);
        permission.getRoles().add(this);
    }

    /**
     * Removes a permission from this role.
     *
     * @param permission The permission to remove
     */
    public void removePermission(Permission permission) {
        this.permissions.remove(permission);
        permission.getRoles().remove(this);
    }

    /**
     * Adds a child role to this role, establishing a hierarchical relationship.
     *
     * @param childRole The child role to add
     */
    public void addChildRole(Role childRole) {
        this.childRoles.add(childRole);
        childRole.getParentRoles().add(this);
    }

    /**
     * Removes a child role from this role.
     *
     * @param childRole The child role to remove
     */
    public void removeChildRole(Role childRole) {
        this.childRoles.remove(childRole);
        childRole.getParentRoles().remove(this);
    }

    /**
     * Returns all permissions associated with this role, including those inherited
     * from parent roles.
     *
     * @return Collection of all permissions
     */
    public Collection<Permission> getAllPermissions() {
        Set<Permission> allPermissions = new HashSet<>(this.permissions);
        
        for (Role parent : this.parentRoles) {
            allPermissions.addAll(parent.getAllPermissions());
        }
        
        return allPermissions;
    }

    /**
     * Checks if this role has a specific permission.
     *
     * @param permissionName The name of the permission to check
     * @return True if the role has the permission, false otherwise
     */
    public boolean hasPermission(String permissionName) {
        return getAllPermissions().stream()
                .anyMatch(p -> p.getName().equalsIgnoreCase(permissionName));
    }

    /**
     * Checks if this role is a child of the specified parent role.
     *
     * @param parentRole The potential parent role
     * @return True if this role is a child of the parent role, false otherwise
     */
    public boolean isChildOf(Role parentRole) {
        return this.parentRoles.contains(parentRole);
    }

    /**
     * Checks if this role is a parent of the specified child role.
     *
     * @param childRole The potential child role
     * @return True if this role is a parent of the child role, false otherwise
     */
    public boolean isParentOf(Role childRole) {
        return this.childRoles.contains(childRole);
    }
}