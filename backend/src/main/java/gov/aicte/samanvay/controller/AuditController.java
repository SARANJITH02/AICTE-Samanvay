package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.dto.AuditVerificationDto;
import gov.aicte.samanvay.model.AuditLog;
import gov.aicte.samanvay.repository.AuditLogRepository;
import gov.aicte.samanvay.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;
    private final AuditLogRepository auditLogRepository;

    @GetMapping("/{caseId}")
    public ResponseEntity<List<AuditLog>> getAuditLogs(@PathVariable String caseId) {
        return ResponseEntity.ok(auditLogRepository.findByCaseIdOrderBySequenceNumAsc(caseId));
    }

    @GetMapping("/verify/{caseId}")
    public ResponseEntity<AuditVerificationDto> verifyChain(@PathVariable String caseId) {
        return ResponseEntity.ok(auditService.verifyChain(caseId));
    }
}
