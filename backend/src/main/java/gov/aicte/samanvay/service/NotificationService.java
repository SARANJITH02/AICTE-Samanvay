package gov.aicte.samanvay.service;

import gov.aicte.samanvay.model.Complaint;
import gov.aicte.samanvay.model.ComplaintStatus;
import gov.aicte.samanvay.model.NotificationOutbox;
import gov.aicte.samanvay.repository.ComplaintRepository;
import gov.aicte.samanvay.repository.NotificationOutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Air-gapped Escalation Matrix and Notification Outbox Dispatcher.
 * Evaluates statutory SLA timelines (70% officer warning, 90% supervisor alert, 100% Apex escalation)
 * and dispatches zero-leakage local alerts for the SMS / Email Simulator.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationOutboxRepository outboxRepository;
    private final ComplaintRepository complaintRepository;
    private final AuditService auditService;

    public NotificationOutbox dispatchNotification(
            String recipient, String type, String channel,
            String caseId, String subject, String body) {

        NotificationOutbox notif = NotificationOutbox.builder()
                .recipient(recipient)
                .type(type)
                .channel(channel)
                .caseId(caseId)
                .subject(subject)
                .body(body)
                .status("DISPATCHED")
                .isRead(false)
                .build();

        NotificationOutbox saved = outboxRepository.save(notif);
        log.info("[OUTBOX-{}] To: {} | Subject: {} | Case: {}", type, recipient, subject, caseId);
        return saved;
    }

    public List<NotificationOutbox> getAllOutboxMessages() {
        return outboxRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<NotificationOutbox> getInAppNotifications(String recipient) {
        if (recipient == null || recipient.isBlank() || recipient.equalsIgnoreCase("ALL")) {
            return outboxRepository.findByTypeOrderByCreatedAtDesc("IN_APP");
        }
        return outboxRepository.findByRecipientOrderByCreatedAtDesc(recipient);
    }

    @Transactional
    public boolean markAsRead(Long id) {
        return outboxRepository.findById(id).map(notif -> {
            notif.setIsRead(true);
            outboxRepository.save(notif);
            return true;
        }).orElse(false);
    }

    /**
     * Periodic scheduled evaluation of SLA thresholds (70%, 90%, 100%+ breach).
     * Runs every 5 minutes in background or on demand.
     */
    @Scheduled(fixedRate = 300000)
    @Transactional
    public int evaluateSlaEscalations() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Complaint> activeCases = complaintRepository.findAll().stream()
                .filter(c -> c.getStatus() != ComplaintStatus.DISPOSED)
                .toList();

        int escalatedCount = 0;

        for (Complaint c : activeCases) {
            OffsetDateTime start = c.getReceivedDate() != null ? c.getReceivedDate() : now.minusDays(1);
            OffsetDateTime deadline = c.getSlaDeadline() != null ? c.getSlaDeadline() : now.plusDays(30);

            long totalSeconds = Math.max(1, Duration.between(start, deadline).getSeconds());
            long elapsedSeconds = Duration.between(start, now).getSeconds();
            double pct = ((double) elapsedSeconds / totalSeconds) * 100.0;

            String instName = (c.getInstitution() != null) ? c.getInstitution().getName() : "Institution";

            if (pct >= 100.0) {
                // 100%+ Statutory Breach
                if (!Boolean.TRUE.equals(c.getIsEscalated())) {
                    c.setIsEscalated(true);
                    complaintRepository.save(c);
                    escalatedCount++;

                    // Cryptographic audit chain log
                    auditService.appendAuditLog(
                            c.getId(),
                            "SYSTEM_SLA_ENGINE",
                            "SLA_BREACH_ESCALATION",
                            "Statutory SLA threshold (100%) elapsed. Grievance escalated to Apex Coordination Cell.",
                            String.format("{\"elapsedPercent\":%.1f,\"deadline\":\"%s\"}", pct, deadline)
                    );

                    // Dispatch Apex Alerts
                    dispatchNotification(
                            "apex.admin@aicte-india.org",
                            "EMAIL",
                            "APEX_ESCALATION",
                            c.getId(),
                            "🔥 STATUTORY BREACH: " + c.getId() + " - " + instName,
                            String.format("Case %s has exceeded its statutory SLA deadline (%s). Escalated to Apex Coordination Cell for direct council intervention.", c.getId(), deadline)
                    );
                    dispatchNotification(
                            "+91-11-29581000",
                            "SMS",
                            "APEX_ESCALATION",
                            c.getId(),
                            "AICTE APEX ALERT: SLA BREACH",
                            String.format("AICTE Samanvay: Case %s (%s) breached SLA. Auto-escalated to Apex Coordination.", c.getId(), instName)
                    );
                    dispatchNotification(
                            "admin.apex",
                            "IN_APP",
                            "APEX_ESCALATION",
                            c.getId(),
                            "SLA Breach Escalation: " + c.getId(),
                            String.format("Case %s has breached resolution ceiling. Immediate Apex intervention required.", c.getId())
                    );
                }
            } else if (pct >= 90.0) {
                // 90% Supervisor Alert
                dispatchNotification(
                        "supervisor." + c.getSourceBureau().name().toLowerCase() + "@aicte-india.org",
                        "EMAIL",
                        "SUPERVISOR_ALERT",
                        c.getId(),
                        "🚨 CRITICAL SLA ALERT (90% elapsed): " + c.getId(),
                        String.format("Case %s has elapsed 90%% of allowable resolution time. Expedited multi-bureau inquiry scheduled.", c.getId())
                );
                dispatchNotification(
                        "officer." + c.getSourceBureau().name().toLowerCase(),
                        "IN_APP",
                        "SUPERVISOR_ALERT",
                        c.getId(),
                        "Critical SLA (90%): " + c.getId(),
                        String.format("Case %s is nearing breach. Expedite regulatory findings.", c.getId())
                );
            } else if (pct >= 70.0) {
                // 70% Officer Alert
                dispatchNotification(
                        c.getAssignedOfficerId() != null ? c.getAssignedOfficerId() : "officer.pgrc",
                        "IN_APP",
                        "OFFICER_ALERT",
                        c.getId(),
                        "SLA Warning (70%): " + c.getId(),
                        String.format("Case %s has consumed 70%% of standard resolution timeline.", c.getId())
                );
            }
        }

        log.info("[SLA-ENGINE] Evaluated {} active cases. Newly escalated to Apex: {}", activeCases.size(), escalatedCount);
        return escalatedCount;
    }
}
