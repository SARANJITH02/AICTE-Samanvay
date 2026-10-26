package gov.aicte.samanvay.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/**
 * Enterprise User Entity supporting BCrypt password hashing,
 * TOTP MFA secret, account lockout policy, and regional RBAC jurisdiction.
 */
@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_users_username", columnList = "username", unique = true),
    @Index(name = "idx_users_role", columnList = "role"),
    @Index(name = "idx_users_region", columnList = "region")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", length = 64, nullable = false, unique = true)
    private String username;

    @Column(name = "password_hash", length = 128, nullable = false)
    private String passwordHash;

    @Column(name = "full_name", length = 128, nullable = false)
    private String fullName;

    @Column(name = "role", length = 64, nullable = false)
    private String role; // ROLE_APEX_ADMIN, ROLE_PGRC_OFFICER, ROLE_REGULATION_OFFICER, ROLE_REGIONAL_OFFICER, ROLE_INSTITUTION_NODAL

    @Column(name = "bureau", length = 64, nullable = false)
    private String bureau; // APEX_HEADQUARTERS, PGRC, REGULATION_BUREAU, REGIONAL_OFFICE

    @Column(name = "region", length = 64, nullable = false)
    private String region; // "All Regions", "Southern", "Northern", "Eastern", "Western", "Central"

    @Column(name = "institution_pid", length = 64)
    private String institutionPid; // Non-null for ROLE_INSTITUTION_NODAL accounts

    @Column(name = "totp_secret", length = 64)
    private String totpSecret;

    @Column(name = "totp_enabled", nullable = false)
    private boolean totpEnabled;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    @Column(name = "locked_until")
    private OffsetDateTime lockedUntil;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public boolean isAccountLocked() {
        return lockedUntil != null && lockedUntil.isAfter(OffsetDateTime.now());
    }
}
