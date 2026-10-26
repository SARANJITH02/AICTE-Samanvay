package gov.aicte.samanvay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

/**
 * Air-gapped outbox for simulated SMS, Email, and In-App notification logs.
 * Supports zero-leakage local compliance tracking for SIH evaluation.
 */
@Entity
@Table(name = "notification_outbox", indexes = {
    @Index(name = "idx_outbox_channel", columnList = "channel"),
    @Index(name = "idx_outbox_case_id", columnList = "case_id"),
    @Index(name = "idx_outbox_recipient", columnList = "recipient"),
    @Index(name = "idx_outbox_is_read", columnList = "is_read")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient", length = 128, nullable = false)
    private String recipient; // Phone number, email, or officer username

    @Column(name = "type", length = 32, nullable = false)
    private String type; // "SMS", "EMAIL", "IN_APP"

    @Column(name = "channel", length = 64, nullable = false)
    private String channel; // "OFFICER_ALERT", "SUPERVISOR_ALERT", "APEX_ESCALATION", "COMPLAINANT_OTP", "COMPLAINANT_UPDATE", "CAPA_NOTICE"

    @Column(name = "case_id", length = 64)
    private String caseId;

    @Column(name = "subject", length = 255, nullable = false)
    private String subject;

    @Column(name = "body", columnDefinition = "TEXT", nullable = false)
    private String body;

    @Column(name = "status", length = 32, nullable = false)
    @Builder.Default
    private String status = "DISPATCHED"; // "DISPATCHED", "SIMULATED", "QUEUED"

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
