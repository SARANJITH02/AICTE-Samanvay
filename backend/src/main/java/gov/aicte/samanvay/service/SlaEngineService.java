package gov.aicte.samanvay.service;

import gov.aicte.samanvay.model.Complaint;
import gov.aicte.samanvay.model.ComplaintStatus;
import gov.aicte.samanvay.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SlaEngineService {

    private final ComplaintRepository complaintRepository;
    private final AuditService auditService;

    /**
     * Hourly automated SLA scanner.
     * Evaluates deadlines, auto-escalates breached cases to REGIONAL_DIRECTOR,
     * and appends a tamper-evident audit block for regulatory compliance.
     */
    @Scheduled(fixedRate = 3600000) // 1 hour
    @Transactional
    public void scanAndEscalateSlaBreaches() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Complaint> breachedCases = complaintRepository.findBreachedSlaComplaints(now);

        for (Complaint c : breachedCases) {
            if (!Boolean.TRUE.equals(c.getIsEscalated())) {
                c.setIsEscalated(true);
                if (c.getStatus() != ComplaintStatus.DISPOSED && c.getStatus() != ComplaintStatus.JOINT_INQUIRY) {
                    c.setStatus(ComplaintStatus.ESCALATED);
                }
                c.setDelayRiskScore(Math.max(c.getDelayRiskScore() != null ? c.getDelayRiskScore() : 0.0, 0.90));
                complaintRepository.save(c);

                String remarks = String.format("Automated SLA Engine: Case exceeded 30-day turnaround deadline (%s). Escalated to Regional Director.",
                        c.getSlaDeadline());

                auditService.appendAuditLog(
                        c.getId(),
                        "SLA_ENGINE_DAEMON",
                        "SLA_BREACH_ESCALATED",
                        remarks,
                        "{\"escalated_to\": \"REGIONAL_DIRECTOR\", \"sla_deadline\": \"" + c.getSlaDeadline() + "\"}"
                );

                log.warn("[SLA ENGINE] Auto-escalated breached case {} to Regional Director", c.getId());
            }
        }
    }
}
