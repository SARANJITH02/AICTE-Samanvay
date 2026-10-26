package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.model.*;
import gov.aicte.samanvay.repository.*;
import gov.aicte.samanvay.service.AuditService;
import gov.aicte.samanvay.service.CaseWorkflowService;
import gov.aicte.samanvay.service.ConsistencyCheckService;
import gov.aicte.samanvay.service.ContradictionDetectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workflow")
@RequiredArgsConstructor
public class WorkflowController {

    private final CaseWorkflowService caseWorkflowService;
    private final ContradictionDetectionService contradictionDetectionService;
    private final ConsistencyCheckService consistencyCheckService;
    private final CaseSubTaskRepository caseSubTaskRepository;
    private final SharedEvidencePackageRepository sharedEvidencePackageRepository;
    private final InstitutionalCorrectiveActionRepository correctiveActionRepository;
    private final PolicyVersionRepository policyVersionRepository;
    private final AuditService auditService;
    private final ComplaintRepository complaintRepository;

    // 1. Subtasks
    @GetMapping("/subtasks/{parentCaseId}")
    public ResponseEntity<List<CaseSubTask>> getSubTasks(@PathVariable String parentCaseId) {
        return ResponseEntity.ok(caseSubTaskRepository.findByParentCaseIdOrderByCreatedAtAsc(parentCaseId));
    }

    @PostMapping("/split")
    public ResponseEntity<List<CaseSubTask>> splitCompositeCase(@RequestBody Map<String, Object> body) {
        String parentCaseId = (String) body.get("parentCaseId");
        String officerId = (String) body.get("officerId");
        // Convert subtasks list from body
        return ResponseEntity.ok(caseSubTaskRepository.findByParentCaseIdOrderByCreatedAtAsc(parentCaseId));
    }

    // 2. Transfer Workflow Handshake
    @PostMapping("/transfer/initiate")
    public ResponseEntity<Complaint> initiateTransfer(@RequestBody Map<String, String> body) {
        Complaint c = caseWorkflowService.initiateTransfer(
                body.get("caseId"),
                body.get("targetBureau"),
                body.get("notes"),
                body.get("officerId"),
                body.get("currentBureau")
        );
        return ResponseEntity.ok(c);
    }

    @PostMapping("/transfer/accept")
    public ResponseEntity<Complaint> acceptTransfer(@RequestBody Map<String, String> body) {
        Complaint c = caseWorkflowService.acceptTransferJurisdiction(
                body.get("caseId"),
                body.get("officerId"),
                body.get("acceptingBureau"),
                body.get("remarks")
        );
        return ResponseEntity.ok(c);
    }

    // 3. Contradiction Detection
    @GetMapping("/contradictions/{institutionPid}")
    public ResponseEntity<ContradictionDetectionService.ContradictionResult> checkContradictions(@PathVariable String institutionPid) {
        return ResponseEntity.ok(contradictionDetectionService.detectContradictions(institutionPid));
    }

    // 4. Duplicate Notice Check (90-day lookback)
    @GetMapping("/duplicate-notice")
    public ResponseEntity<Map<String, Object>> checkDuplicateNotice(
            @RequestParam String institutionPid,
            @RequestParam String noticeSubject) {
        var opt = caseWorkflowService.checkDuplicateNotice(institutionPid, noticeSubject);
        return ResponseEntity.ok(Map.of(
                "hasDuplicate", opt.isPresent(),
                "warningMessage", opt.orElse("")
        ));
    }

    // 5. Recurrence Check (12-month lookback)
    @GetMapping("/recurrence")
    public ResponseEntity<Map<String, Object>> checkRecurrence(
            @RequestParam String institutionPid,
            @RequestParam String category) {
        var opt = caseWorkflowService.checkRecurrence(institutionPid, category);
        return ResponseEntity.ok(Map.of(
                "isRecurring", opt.isPresent(),
                "warningMessage", opt.orElse("")
        ));
    }

    // 6. Resolution Consistency Check
    @PostMapping("/consistency-check")
    public ResponseEntity<ConsistencyCheckService.ConsistencyResult> checkConsistency(@RequestBody Map<String, String> body) {
        var res = consistencyCheckService.checkResolutionConsistency(
                body.get("caseId"),
                body.get("proposedPenalty"),
                body.get("policyClause")
        );
        return ResponseEntity.ok(res);
    }

    // 7. Shared Evidence Packages
    @GetMapping("/evidence/{institutionPid}")
    public ResponseEntity<List<SharedEvidencePackage>> getEvidencePackages(@PathVariable String institutionPid) {
        return ResponseEntity.ok(sharedEvidencePackageRepository.findByInstitutionPidOrderByCreatedAtDesc(institutionPid));
    }

    // 8. Institutional CAPA Tracking
    @GetMapping("/capa/{institutionPid}")
    public ResponseEntity<List<InstitutionalCorrectiveAction>> getCorrectiveActions(@PathVariable String institutionPid) {
        return ResponseEntity.ok(correctiveActionRepository.findByInstitutionPidOrderByTargetDateAsc(institutionPid));
    }

    @PostMapping("/capa")
    public ResponseEntity<InstitutionalCorrectiveAction> submitCorrectiveAction(
            @RequestBody Map<String, String> body,
            org.springframework.security.core.Authentication auth) {
        String instPid = body.get("institutionPid");
        String caseId = body.get("caseId");
        String undertaking = body.get("undertakingText");
        String targetDateStr = body.get("targetDate");
        String evidenceRef = body.get("evidenceReference");
        String officerId = (auth != null) ? auth.getName() : "INSTITUTION_NODAL";

        java.time.OffsetDateTime targetDate = (targetDateStr != null && !targetDateStr.isBlank())
                ? java.time.OffsetDateTime.parse(targetDateStr)
                : java.time.OffsetDateTime.now().plusDays(30);

        InstitutionalCorrectiveAction capa = InstitutionalCorrectiveAction.builder()
                .institutionPid(instPid)
                .caseId(caseId)
                .undertakingText(undertaking)
                .targetDate(targetDate)
                .status("PENDING_VERIFICATION")
                .evidenceReference(evidenceRef)
                .build();

        InstitutionalCorrectiveAction saved = correctiveActionRepository.save(capa);

        if (caseId != null && !caseId.isBlank()) {
            auditService.appendAuditLog(
                    caseId,
                    officerId,
                    "CAPA_SUBMITTED_BY_INSTITUTION",
                    "Institution submitted formal CAPA undertaking: " + undertaking,
                    String.format("{\"capaId\":%d,\"targetDate\":\"%s\"}", saved.getId(), targetDate)
            );
        }

        return ResponseEntity.ok(saved);
    }

    @PostMapping("/capa/{id}/verify")
    public ResponseEntity<InstitutionalCorrectiveAction> verifyCorrectiveAction(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            org.springframework.security.core.Authentication auth) {
        InstitutionalCorrectiveAction capa = correctiveActionRepository.findById(id)
                .orElseThrow(() -> new java.util.NoSuchElementException("CAPA record not found: " + id));

        String newStatus = body.getOrDefault("status", "COMPLIED");
        String remarks = body.get("remarks");
        String officerId = (auth != null) ? auth.getName() : "OFFICER";

        capa.setStatus(newStatus);
        capa.setVerifiedByOfficer(officerId);
        if ("COMPLIED".equalsIgnoreCase(newStatus)) {
            capa.setComplianceDate(java.time.OffsetDateTime.now());
        }
        InstitutionalCorrectiveAction saved = correctiveActionRepository.save(capa);

        if (capa.getCaseId() != null && !capa.getCaseId().isBlank()) {
            auditService.appendAuditLog(
                    capa.getCaseId(),
                    officerId,
                    "CAPA_VERIFIED_BY_BUREAU",
                    String.format("Bureau verified institutional CAPA as %s. %s", newStatus, remarks != null ? remarks : ""),
                    String.format("{\"capaId\":%d,\"status\":\"%s\"}", id, newStatus)
            );
        }

        return ResponseEntity.ok(saved);
    }

    @PostMapping("/evidence/register")
    public ResponseEntity<SharedEvidencePackage> registerEvidencePackage(
            @RequestBody Map<String, String> body,
            org.springframework.security.core.Authentication auth) {
        String instPid = body.get("institutionPid");
        String caseId = body.get("caseId");
        String docType = body.getOrDefault("documentType", "COMPLIANCE_PROOF");
        String title = body.get("title");
        String fileHash = body.get("fileHash");
        String bureau = body.getOrDefault("verifiedByBureau", "PGRC");
        String docUrl = body.get("documentUrl");
        String officerId = (auth != null) ? auth.getName() : "OFFICER";

        SharedEvidencePackage pkg = SharedEvidencePackage.builder()
                .institutionPid(instPid)
                .caseId(caseId)
                .documentType(docType)
                .title(title)
                .fileHash(fileHash != null ? fileHash : "SHA256-SYNTHETIC-HASH")
                .verifiedByBureau(bureau)
                .documentUrl(docUrl)
                .sourceProvenance("Registered via Samanvay Verified Evidence Vault")
                .build();

        SharedEvidencePackage saved = sharedEvidencePackageRepository.save(pkg);

        if (caseId != null && !caseId.isBlank()) {
            auditService.appendAuditLog(
                    caseId,
                    officerId,
                    "EVIDENCE_PACKAGE_REGISTERED",
                    "New reusable verified evidence package registered: " + title,
                    String.format("{\"evidenceId\":%d,\"hash\":\"%s\"}", saved.getId(), saved.getFileHash())
            );
        }

        return ResponseEntity.ok(saved);
    }

    // 9. Policy Versions
    @GetMapping("/policies")
    public ResponseEntity<List<PolicyVersion>> getPolicies() {
        return ResponseEntity.ok(policyVersionRepository.findByIsActiveTrue());
    }
}
