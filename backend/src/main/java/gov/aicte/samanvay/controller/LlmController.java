package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.service.LlmRagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/llm")
@RequiredArgsConstructor
public class LlmController {

    private final LlmRagService llmRagService;

    @GetMapping("/clauses")
    public ResponseEntity<List<LlmRagService.AphClause>> getIndexedClauses() {
        return ResponseEntity.ok(llmRagService.getAllClauses());
    }

    @PostMapping("/draft")
    public ResponseEntity<LlmRagService.LlmDraftResponse> generateDraft(@RequestBody Map<String, String> body) {
        String caseId = body.get("caseId");
        String draftType = body.getOrDefault("draftType", "SUMMARY");
        return ResponseEntity.ok(llmRagService.generateDraft(caseId, draftType));
    }

    @PostMapping("/accept-draft")
    public ResponseEntity<Map<String, Object>> acceptDraft(
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String caseId = body.get("caseId");
        String draftType = body.getOrDefault("draftType", "SUMMARY");
        String content = body.get("content");
        String officerId = (auth != null) ? auth.getName() : "OFFICER";

        boolean success = llmRagService.acceptDraft(caseId, draftType, content, officerId);
        return ResponseEntity.ok(Map.of(
                "success", success,
                "message", "AI draft accepted and recorded into cryptographic audit chain."
        ));
    }
}
