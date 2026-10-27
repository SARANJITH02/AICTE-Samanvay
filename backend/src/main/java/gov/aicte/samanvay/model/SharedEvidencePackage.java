package gov.aicte.samanvay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "shared_evidence_packages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SharedEvidencePackage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "institution_pid", nullable = false)
    private String institutionPid;

    @Column(name = "case_id")
    private String caseId;

    @Column(name = "document_type", nullable = false)
    private String documentType;

    @Column(nullable = false)
    private String title;

    @Column(name = "file_hash", nullable = false)
    private String fileHash;

    @Column(name = "verified_by_bureau", nullable = false)
    private String verifiedByBureau;

    @Column(name = "verified_date")
    private OffsetDateTime verifiedDate;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "access_granted_bureaus", columnDefinition = "JSONB")
    private String accessGrantedBureaus;

    @Column(name = "document_url")
    private String documentUrl;

    @Column(name = "source_provenance", columnDefinition = "TEXT")
    private String sourceProvenance;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
