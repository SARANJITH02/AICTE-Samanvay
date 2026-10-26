package gov.aicte.samanvay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "institutional_corrective_actions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InstitutionalCorrectiveAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "institution_pid", nullable = false)
    private String institutionPid;

    @Column(name = "case_id", nullable = false)
    private String caseId;

    @Column(name = "undertaking_text", nullable = false, columnDefinition = "TEXT")
    private String undertakingText;

    @Column(name = "target_date", nullable = false)
    private OffsetDateTime targetDate;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING_VERIFICATION";

    @Column(name = "evidence_reference")
    private String evidenceReference;

    @Column(name = "verified_by_officer")
    private String verifiedByOfficer;

    @Column(name = "compliance_date")
    private OffsetDateTime complianceDate;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
