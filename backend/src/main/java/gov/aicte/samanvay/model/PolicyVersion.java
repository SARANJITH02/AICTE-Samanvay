package gov.aicte.samanvay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "policy_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PolicyVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "handbook_version", nullable = false)
    private String handbookVersion;

    @Column(name = "clause_number", nullable = false)
    private String clauseNumber;

    @Column(name = "clause_title", nullable = false)
    private String clauseTitle;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "mandated_penalty", columnDefinition = "TEXT")
    private String mandatedPenalty;

    @Column(name = "sla_days_ceiling")
    @Builder.Default
    private Integer slaDaysCeiling = 30;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
