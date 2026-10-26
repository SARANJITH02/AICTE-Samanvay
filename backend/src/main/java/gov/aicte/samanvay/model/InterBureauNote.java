package gov.aicte.samanvay.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inter_bureau_notes", indexes = {
    @Index(name = "idx_notes_overlap", columnList = "overlap_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterBureauNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "overlap_id", nullable = false)
    private Long overlapId;

    @Column(name = "case_id", length = 64)
    private String caseId;

    @Column(name = "author_officer_id", length = 100, nullable = false)
    private String authorOfficerId;

    @Column(name = "author_bureau", length = 50, nullable = false)
    private String authorBureau;

    @Column(name = "author_role", length = 100, nullable = false)
    private String authorRole;

    @Column(name = "note_text", columnDefinition = "TEXT", nullable = false)
    private String noteText;

    @Column(name = "is_confidential")
    private Boolean isConfidential;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (isConfidential == null) isConfidential = false;
    }
}
