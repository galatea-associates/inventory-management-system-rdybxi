package com.ims.common.model;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Abstract base class for all entity models in the Inventory Management System.
 * Provides common fields and functionality such as unique identifiers, audit information,
 * and version control that are shared across all entity classes.
 */
@MappedSuperclass
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@EqualsAndHashCode(of = "id")
public abstract class BaseEntity implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * Unique identifier for the entity.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * User who created the entity.
     */
    private String createdBy;

    /**
     * Timestamp when the entity was created.
     */
    private LocalDateTime createdAt;

    /**
     * User who last modified the entity.
     */
    private String lastModifiedBy;

    /**
     * Timestamp when the entity was last modified.
     */
    private LocalDateTime lastModifiedAt;

    /**
     * Version number for optimistic locking.
     */
    @Version
    private Long version;

    /**
     * JPA lifecycle callback that sets creation timestamp before entity is persisted.
     */
    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (lastModifiedAt == null) {
            lastModifiedAt = LocalDateTime.now();
        }
    }

    /**
     * JPA lifecycle callback that updates the last modified timestamp before entity is updated.
     */
    @PreUpdate
    public void preUpdate() {
        lastModifiedAt = LocalDateTime.now();
    }

    /**
     * Determines if the entity is new (not yet persisted).
     *
     * @return True if the entity is new, false otherwise
     */
    public boolean isNew() {
        return id == null;
    }
}