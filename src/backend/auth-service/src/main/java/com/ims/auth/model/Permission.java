package com.ims.auth.model;

import com.ims.common.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.security.core.GrantedAuthority;

import java.util.HashSet;
import java.util.Set;

/**
 * Entity class representing a permission in the Inventory Management System.
 * Implements GrantedAuthority for Spring Security integration and provides
 * granular access control capabilities for the role-based security model.
 */
@Entity
@Table(name = "permissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"roles"})
public class Permission extends BaseEntity implements GrantedAuthority {

    /**
     * The name of the permission, used to identify it in the system.
     */
    @Column(nullable = false, unique = true, length = 100)
    private String name;

    /**
     * A description of what this permission allows.
     */
    @Column(length = 255)
    private String description;

    /**
     * The category this permission belongs to (e.g., "INVENTORY", "POSITION", "ADMIN").
     */
    @Column(nullable = false, length = 50)
    private String category;

    /**
     * The resource this permission applies to (e.g., "LOCATE", "POSITION", "USER").
     */
    @Column(nullable = false, length = 50)
    private String resource;

    /**
     * The action allowed on the resource (e.g., "READ", "WRITE", "APPROVE").
     */
    @Column(nullable = false, length = 50)
    private String action;

    /**
     * The roles that have this permission.
     */
    @ManyToMany(mappedBy = "permissions", fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    /**
     * Default constructor that initializes collections.
     */
    public Permission() {
        super();
        this.roles = new HashSet<>();
    }

    /**
     * Returns the authority string representation of this permission.
     * Required by the GrantedAuthority interface.
     *
     * @return The authority string in format 'PERMISSION_' + name
     */
    @Override
    public String getAuthority() {
        return "PERMISSION_" + name.toUpperCase();
    }

    /**
     * Adds a role to this permission.
     *
     * @param role The role to add
     */
    public void addRole(Role role) {
        this.roles.add(role);
        role.getPermissions().add(this);
    }

    /**
     * Removes a role from this permission.
     *
     * @param role The role to remove
     */
    public void removeRole(Role role) {
        this.roles.remove(role);
        role.getPermissions().remove(this);
    }

    /**
     * Checks if this permission is for a specific resource.
     *
     * @param resourceName The resource name to check
     * @return True if the permission is for the specified resource, false otherwise
     */
    public boolean isForResource(String resourceName) {
        return resource.equalsIgnoreCase(resourceName);
    }

    /**
     * Checks if this permission is for a specific action.
     *
     * @param actionName The action name to check
     * @return True if the permission is for the specified action, false otherwise
     */
    public boolean isForAction(String actionName) {
        return action.equalsIgnoreCase(actionName);
    }

    /**
     * Checks if this permission belongs to a specific category.
     *
     * @param categoryName The category name to check
     * @return True if the permission belongs to the specified category, false otherwise
     */
    public boolean isInCategory(String categoryName) {
        return category.equalsIgnoreCase(categoryName);
    }

    /**
     * Checks if this permission matches the specified resource and action.
     *
     * @param resourceName The resource name to check
     * @param actionName The action name to check
     * @return True if the permission matches both resource and action, false otherwise
     */
    public boolean matches(String resourceName, String actionName) {
        return isForResource(resourceName) && isForAction(actionName);
    }
}