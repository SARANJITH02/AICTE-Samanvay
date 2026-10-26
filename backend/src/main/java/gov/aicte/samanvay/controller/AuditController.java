package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.dto.AuditVerificationDto;
import gov.aicte.samanvay.model.AuditCheckpoint;
import gov.aicte.samanvay.model.AuditLog;
import gov.aicte.samanvay.repository.AuditCheckpointRepository;
import gov.aicte.samanvay.repository.AuditLogRepository;
import gov.aicte.samanvay.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;
    private final AuditLogRepository auditLogRepository;
    private final AuditCheckpointRepository auditCheckpointRepository;

    @GetMapping("/{caseId}")
    public ResponseEntity<List<AuditLog>> getAuditLogs(@PathVariable String caseId) {
        return ResponseEntity.ok(auditLogRepository.findByCaseIdOrderBySequenceNumAsc(caseId));
    }

    @GetMapping("/verify/{caseId}")
    public ResponseEntity<AuditVerificationDto> verifyChain(@PathVariable String caseId) {
        return ResponseEntity.ok(auditService.verifyChain(caseId));
    }

    @PostMapping("/checkpoints/create")
    public ResponseEntity<AuditCheckpoint> createCheckpoint(@RequestParam String caseId) {
        return ResponseEntity.ok(auditService.createCheckpoint(caseId));
    }

    @GetMapping("/checkpoints/{caseId}")
    public ResponseEntity<List<AuditCheckpoint>> getCheckpoints(@PathVariable String caseId) {
        return ResponseEntity.ok(auditCheckpointRepository.findByCaseIdOrderByCheckpointNumDesc(caseId));
    }

    @GetMapping("/checkpoints/export/{checkpointId}")
    public ResponseEntity<Map<String, Object>> exportCheckpointWitness(@PathVariable String checkpointId) {
        return auditCheckpointRepository.findByCheckpointId(checkpointId)
                .map(chk -> {
                    String printableProof = String.format(
                            "--- AICTE SAMANVAY AUDIT WITNESS ANCHOR ---\n" +
                            "Checkpoint ID:  %s\n" +
                            "Case Reference: %s\n" +
                            "Block Range:    #%d to #%d (Total: %d blocks)\n" +
                            "Merkle Root:    %s\n" +
                            "Chain Head:     %s\n" +
                            "Witness Public: %s\n" +
                            "Witness Sig:    %s\n" +
                            "Anchor Date:    %s\n" +
                            "Evidentiary Ref: Section 63 Bharatiya Sakshya Adhiniyam, 2023\n" +
                            "-------------------------------------------",
                            chk.getCheckpointId(), chk.getCaseId(), chk.getFromSeq(), chk.getToSeq(),
                            chk.getTotalBlocks(), chk.getMerkleRoot(), chk.getChainHeadHash(),
                            chk.getWitnessPublicKey(), chk.getWitnessSignature(), chk.getCreatedAt()
                    );

                    String qrPayload = String.format("AICTE|CHK|%s|%s|%s|%s",
                            chk.getCheckpointId(), chk.getCaseId(), chk.getMerkleRoot(),
                            chk.getWitnessSignature() != null ? chk.getWitnessSignature().substring(0, 16) : "");

                    Map<String, Object> exportData = new java.util.LinkedHashMap<>();
                    exportData.put("checkpointId", chk.getCheckpointId());
                    exportData.put("caseId", chk.getCaseId());
                    exportData.put("merkleRoot", chk.getMerkleRoot());
                    exportData.put("chainHeadHash", chk.getChainHeadHash());
                    exportData.put("fromSeq", chk.getFromSeq());
                    exportData.put("toSeq", chk.getToSeq());
                    exportData.put("totalBlocks", chk.getTotalBlocks());
                    exportData.put("witnessSignature", chk.getWitnessSignature() != null ? chk.getWitnessSignature() : "");
                    exportData.put("witnessPublicKey", chk.getWitnessPublicKey() != null ? chk.getWitnessPublicKey() : "");
                    exportData.put("createdAt", chk.getCreatedAt().toString());
                    exportData.put("printableProof", printableProof);
                    exportData.put("qrPayload", qrPayload);

                    return ResponseEntity.ok(exportData);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/simulate-tamper")
    public ResponseEntity<Map<String, Object>> simulateTamper(
            @RequestParam String caseId,
            @RequestParam(required = false) Long seq) {
        return ResponseEntity.ok(auditService.simulateTamper(caseId, seq));
    }

    @PostMapping("/repair-tamper")
    public ResponseEntity<Map<String, Object>> repairTamper(@RequestParam String caseId) {
        return ResponseEntity.ok(auditService.repairTamper(caseId));
    }
}
