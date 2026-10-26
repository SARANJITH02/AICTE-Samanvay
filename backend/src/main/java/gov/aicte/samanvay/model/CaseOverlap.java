package gov.aicte.samanvay.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "case_overlaps", uniqueConstraints = {
    @UniqueConstraint(name = "uq_case_pair", columnNames = {"case_a_id", "case_b_id"})
}, indexes = {
    @Index(name = "idx_case_overlaps_inst", columnList = "institution_pid"),
    @Index(name = "idx_case_overlaps_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseOverlap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "case_a_id", nullable = false)
    private Complaint caseA;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "case_b_id", nullable = false)
    private Complaint caseB;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "institution_pid", nullable = false)
    private Institution institution;

    @Column(name = "hybrid_score", nullable = false)
    private Double hybridScore;

    @Column(name = "semantic_score", nullable = false)
    private Double semanticScore;

    @Column(name = "category_match_score", nullable = false)
    private Double categoryMatchScore;

    @Column(name = "keyword_match_score", nullable = false)
    private Double keywordMatchScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 64, nullable = false)
    private OverlapStatus status;

    @Column(name = "lead_bureau", length = 64)
    private String leadBureau;

    @Column(name = "coordination_notes", columnDefinition = "TEXT")
    private String coordinationNotes;

    @Column(name = "resolved_by", length = 64)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (status == null) status = OverlapStatus.PENDING_COORDINATION;
    }
}
