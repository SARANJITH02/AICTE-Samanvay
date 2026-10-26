package gov.aicte.samanvay.service;

import gov.aicte.samanvay.model.*;
import gov.aicte.samanvay.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CaseWorkflowService {

    private final ComplaintRepository complaintRepository;
    private final CaseSubTaskRepository caseSubTaskRepository;
    private final SharedEvidencePackageRepository sharedEvidencePackageRepository;
    private final InstitutionalCorrectiveActionRepository correctiveActionRepository;
    private final AuditService auditService;

    /**
     * Novelty 5: Complaint-Splitting Intelligence
     * Splits a composite grievance into distinct bureau sub-tasks while maintaining the parent Case ID.
     */
    @Transactional
    public List<CaseSubTask> splitCompositeComplaint(String parentCaseId, List<CaseSubTask> subTasks, String officerId) {
        Complaint parent = complaintRepository.findById(parentCaseId)
                .orElseThrow(() -> new NoSuchElementException("Parent case not found: " + parentCaseId));

        List<CaseSubTask> savedTasks = new ArrayList<>();
        int seq = 1;
        for (CaseSubTask task : subTasks) {
            String subId = String.format("%s-SUB-%02d", parentCaseId, seq++);
            task.setParentCaseId(parentCaseId);
            task.setSubTaskId(subId);
            if (task.getStatus() == null) task.setStatus("RECEIVED");
            if (task.getSlaDeadline() == null) task.setSlaDeadline(parent.getSlaDeadline());
            savedTasks.add(caseSubTaskRepository.save(task));
        }

        String remarks = String.format("Complaint-Splitting Engine partitioned composite grievance into %d specialized bureau sub-tasks.", savedTasks.size());
        auditService.appendAuditLog(
                parentCaseId,
                officerId != null ? officerId : "SYSTEM_WORKFLOW",
                "COMPLAINT_SPLIT",
                remarks,
                String.format("{\"subtasks_count\":%d,\"parent_case\":\"%s\"}", savedTasks.size(), parentCaseId)
        );

        return savedTasks;
    }

    /**
     * Novelty 13: Transfer Accountability & Handshake Workflow
     * Initiates a transfer from Bureau A to Bureau B. Status changes to TRANSFER_PENDING.
     * Bureau A remains responsible until Bureau B accepts transfer jurisdiction.
     */
    @Transactional
    public Complaint initiateTransfer(String caseId, String targetBureau, String notes, String officerId, String currentBureau) {
        Complaint complaint = complaintRepository.findById(caseId)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found: " + caseId));

        complaint.setTransferStatus("TRANSFER_PENDING");
        complaint.setTransferTargetBureau(targetBureau);
        complaint.setTransferInitiatorBureau(currentBureau);
        complaint.setTransferNotes(notes);
        complaint.setStatus(ComplaintStatus.valueOf("TRANSFER_PENDING"));

        Complaint saved = complaintRepository.save(complaint);

        String auditRemarks = String.format("Transfer initiated from %s to %s. Awaiting jurisdictional handshake acceptance. Notes: %s",
                currentBureau, targetBureau, notes != null ? notes : "");
        auditService.appendAuditLog(caseId, officerId, "TRANSFER_INITIATED", auditRemarks,
                String.format("{\"from\":\"%s\",\"to\":\"%s\",\"status\":\"TRANSFER_PENDING\"}", currentBureau, targetBureau));

        return saved;
    }

    /**
     * Accepts jurisdiction for a pending transfer.
     */
    @Transactional
    public Complaint acceptTransferJurisdiction(String caseId, String acceptingOfficerId, String acceptingBureau, String remarks) {
        Complaint complaint = complaintRepository.findById(caseId)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found: " + caseId));

        if (!"TRANSFER_PENDING".equalsIgnoreCase(complaint.getTransferStatus())) {
            throw new IllegalStateException("Case is not in TRANSFER_PENDING status. Current: " + complaint.getTransferStatus());
        }

        complaint.setTransferStatus("ACCEPTED");
        complaint.setAssignedBureau(acceptingBureau);
        try {
            complaint.setSourceBureau(BureauType.valueOf(acceptingBureau));
        } catch (Exception ignored) {}
        complaint.setAssignedOfficerId(acceptingOfficerId);
        complaint.setStatus(ComplaintStatus.UNDER_SCRUTINY);

        Complaint saved = complaintRepository.save(complaint);

        String auditRemarks = String.format("Transfer jurisdiction officially accepted by %s officer %s. Accountability handoff completed. Remarks: %s",
                acceptingBureau, acceptingOfficerId, remarks != null ? remarks : "");
        auditService.appendAuditLog(caseId, acceptingOfficerId, "TRANSFER_ACCEPTED", auditRemarks,
                String.format("{\"new_lead_bureau\":\"%s\",\"officer\":\"%s\"}", acceptingBureau, acceptingOfficerId));

        return saved;
    }

    /**
     * Novelty 2: Duplicate Action Prevention
     * Checks if another bureau issued an identical notice/request to this institution within the last 90 days.
     */
    @Transactional(readOnly = true)
    public Optional<String> checkDuplicateNotice(String institutionPid, String noticeSubject) {
        OffsetDateTime ninetyDaysAgo = OffsetDateTime.now().minusDays(90);
        List<Complaint> recentCases = complaintRepository.findByInstitutionPid(institutionPid);

        for (Complaint c : recentCases) {
            if (c.getReceivedDate() != null && c.getReceivedDate().isAfter(ninetyDaysAgo)) {
                if (c.getSubject() != null && c.getSubject().toLowerCase().contains(noticeSubject.toLowerCase())) {
                    return Optional.of(String.format("Notice already issued by %s on %s for Case #%s. Attach existing institutional reply instead of re-issuing.",
                            c.getSourceBureau(), c.getReceivedDate().toLocalDate(), c.getId()));
                }
            }
        }
        return Optional.empty();
    }

    /**
     * Novelty 7: Recurrence-Aware Reopening & Chronic Offender Detection
     * Checks if institution had an identical grievance marked "DISPOSED" in prior 12 months.
     */
    @Transactional(readOnly = true)
    public Optional<String> checkRecurrence(String institutionPid, String category) {
        OffsetDateTime twelveMonthsAgo = OffsetDateTime.now().minusDays(365);
        List<Complaint> cases = complaintRepository.findByInstitutionPid(institutionPid);

        for (Complaint c : cases) {
            if (c.getStatus() == ComplaintStatus.DISPOSED &&
                    c.getCategory().equalsIgnoreCase(category) &&
                    c.getReceivedDate() != null && c.getReceivedDate().isAfter(twelveMonthsAgo)) {
                return Optional.of(String.format("Recurring Institutional Non-Compliance: Identical category '%s' resolved previously in Case #%s on %s. Re-examine prior corrective commitments.",
                        category, c.getId(), c.getReceivedDate().toLocalDate()));
            }
        }
        return Optional.empty();
    }
}
