package gov.aicte.samanvay.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "institutions", indexes = {
    @Index(name = "idx_institutions_region", columnList = "region")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Institution {

    @Id
    @Column(name = "pid", length = 64, nullable = false)
    private String pid;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "normalized_name", nullable = false)
    private String normalized_name;

    @Column(name = "region", length = 64, nullable = false)
    private String region;

    @Column(name = "state", length = 64, nullable = false)
    private String state;

    @Column(name = "district", length = 64, nullable = false)
    private String district;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "institution_type", length = 64)
    private String institutionType;

    @Column(name = "risk_score")
    private Double riskScore;

    @Column(name = "cii_score")
    private Integer ciiScore;

    @Column(name = "cii_grade", length = 2)
    private String ciiGrade;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "cii_breakdown", columnDefinition = "JSONB")
    private String ciiBreakdown;

    @Column(name = "cii_appeal_status", length = 64)
    private String ciiAppealStatus;

    @Column(name = "cii_appeal_remarks", columnDefinition = "TEXT")
    private String ciiAppealRemarks;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();
        if (riskScore == null) riskScore = 0.0;
        if (normalized_name == null && name != null) {
            normalized_name = name.toLowerCase().replaceAll("[^a-z0-9 ]", "").trim();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
