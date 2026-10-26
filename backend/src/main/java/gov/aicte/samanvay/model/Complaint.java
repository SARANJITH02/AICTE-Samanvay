package gov.aicte.samanvay.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "complaints", indexes = {
    @Index(name = "idx_complaints_inst_pid", columnList = "institution_pid"),
    @Index(name = "idx_complaints_source_bureau", columnList = "source_bureau"),
    @Index(name = "idx_complaints_status", columnList = "status"),
    @Index(name = "idx_complaints_region", columnList = "region"),
    @Index(name = "idx_complaints_sla_deadline", columnList = "sla_deadline")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Complaint {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "institution_pid", nullable = false)
    private Institution institution;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_bureau", length = 64, nullable = false)
    private BureauType sourceBureau;

    @Column(name = "complainant_type", length = 64, nullable = false)
    private String complainantType;

    @Column(name = "category", length = 64, nullable = false)
    private String category;

    @Column(name = "subject", length = 500, nullable = false)
    private String subject;

    @Column(name = "complaint_text", columnDefinition = "TEXT", nullable = false)
    private String complaintText;

    @Column(name = "sanitized_text", columnDefinition = "TEXT", nullable = false)
    private String sanitizedText;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 64, nullable = false)
    private ComplaintStatus status;

    @Column(name = "assigned_officer_id", length = 64)
    private String assignedOfficerId;

    @Column(name = "assigned_bureau", length = 64, nullable = false)
    private String assignedBureau;

    @Column(name = "region", length = 64, nullable = false)
    private String region;

    @Column(name = "received_date", nullable = false)
    private OffsetDateTime receivedDate;

    @Column(name = "sla_deadline", nullable = false)
    private OffsetDateTime slaDeadline;

    @Column(name = "is_escalated", nullable = false)
    private Boolean isEscalated;

    @Column(name = "delay_risk_score")
    private Double delayRiskScore;

    @Column(name = "delay_risk_reasons", columnDefinition = "JSONB")
    private String delayRiskReasons;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    // Regulatory Novelty Capabilities Fields
    @Column(name = "confidential_from_institution")
    @Builder.Default
    private Boolean confidentialFromInstitution = false;

    @Column(name = "share_with_coordinating_bureaus")
    @Builder.Default
    private Boolean shareWithCoordinatingBureaus = true;

    @Column(name = "governing_policy_version")
    @Builder.Default
    private String governingPolicyVersion = "APH 2024-27";

    @Column(name = "governing_policy_clause")
    @Builder.Default
    private String governingPolicyClause = "Clause 13.4";

    @Column(name = "pending_evidence_blockers", columnDefinition = "JSONB")
    private String pendingEvidenceBlockers;

    @Column(name = "transfer_target_bureau")
    private String transferTargetBureau;

    @Column(name = "transfer_status")
    @Builder.Default
    private String transferStatus = "NONE";

    @Column(name = "transfer_initiator_bureau")
    private String transferInitiatorBureau;

    @Column(name = "transfer_notes", columnDefinition = "TEXT")
    private String transferNotes;

    @Column(name = "affected_students_count")
    @Builder.Default
    private Integer affectedStudentsCount = 1;

    @Column(name = "total_relief_amount_inr")
    @Builder.Default
    private Double totalReliefAmountInr = 0.0;

    @Column(name = "is_recurring")
    @Builder.Default
    private Boolean isRecurring = false;

    @Column(name = "prior_case_reference")
    private String priorCaseReference;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();
        if (receivedDate == null) receivedDate = OffsetDateTime.now();
        if (slaDeadline == null) slaDeadline = receivedDate.plusDays(30);
        if (status == null) status = ComplaintStatus.RECEIVED;
        if (isEscalated == null) isEscalated = false;
        if (delayRiskScore == null) delayRiskScore = 0.0;
        if (delayRiskReasons == null) delayRiskReasons = "[]";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
