package gov.aicte.samanvay.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "audit_logs", uniqueConstraints = {
    @UniqueConstraint(name = "uq_audit_case_seq", columnNames = {"case_id", "sequence_num"})
}, indexes = {
    @Index(name = "idx_audit_logs_case", columnList = "case_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_id", length = 64, nullable = false)
    private String caseId;

    @Column(name = "sequence_num", nullable = false)
    private Long sequenceNum;

    @Column(name = "officer_id", length = 64, nullable = false)
    private String officerId;

    @Column(name = "action", length = 64, nullable = false)
    private String action;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "payload_snapshot", columnDefinition = "JSONB")
    private String payloadSnapshot;

    @Column(name = "prev_hash", length = 64, nullable = false)
    private String prevHash;

    @Column(name = "current_hash", length = 64, nullable = false)
    private String currentHash;

    @Column(name = "officer_signature", length = 256)
    private String officerSignature;

    @Column(name = "officer_public_key", length = 256)
    private String officerPublicKey;

    @Column(name = "timestamp", nullable = false)
    private OffsetDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) timestamp = OffsetDateTime.now();
        if (payloadSnapshot == null) payloadSnapshot = "{}";
    }
}
