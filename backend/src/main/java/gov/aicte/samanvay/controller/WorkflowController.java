package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.model.*;
import gov.aicte.samanvay.repository.*;
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

    // 9. Policy Versions
    @GetMapping("/policies")
    public ResponseEntity<List<PolicyVersion>> getPolicies() {
        return ResponseEntity.ok(policyVersionRepository.findByIsActiveTrue());
    }
}
