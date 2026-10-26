package gov.aicte.samanvay.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/**
 * AuditCheckpoint stores periodically anchored Merkle roots of the audit ledger
 * signed by the Apex National Witness Key for external, air-gapped non-repudiation.
 */
@Entity
@Table(name = "audit_checkpoints", indexes = {
    @Index(name = "idx_checkpoint_case", columnList = "case_id"),
    @Index(name = "idx_checkpoint_num", columnList = "checkpoint_num")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditCheckpoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "checkpoint_id", length = 64, nullable = false, unique = true)
    private String checkpointId;

    @Column(name = "checkpoint_num", nullable = false)
    private Long checkpointNum;

    @Column(name = "case_id", length = 64, nullable = false)
    private String caseId;

    @Column(name = "from_seq", nullable = false)
    private Long fromSeq;

    @Column(name = "to_seq", nullable = false)
    private Long toSeq;

    @Column(name = "total_blocks", nullable = false)
    private Integer totalBlocks;

    @Column(name = "merkle_root", length = 64, nullable = false)
    private String merkleRoot;

    @Column(name = "chain_head_hash", length = 64, nullable = false)
    private String chainHeadHash;

    @Column(name = "witness_signature", length = 256)
    private String witnessSignature;

    @Column(name = "witness_public_key", length = 256)
    private String witnessPublicKey;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
