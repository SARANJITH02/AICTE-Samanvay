package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.dto.BulkImportResultDto;
import gov.aicte.samanvay.dto.CaseCreateDto;
import gov.aicte.samanvay.dto.CaseResponseDto;
import gov.aicte.samanvay.model.BureauType;
import gov.aicte.samanvay.model.ComplaintStatus;
import gov.aicte.samanvay.service.CaseService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cases")
@RequiredArgsConstructor
public class CaseController {

    private final CaseService caseService;

    @GetMapping
    public ResponseEntity<List<CaseResponseDto>> getCases(
            @RequestParam(required = false) String region,
            @RequestParam(required = false) BureauType bureau,
            @RequestParam(required = false) ComplaintStatus status,
            @RequestParam(required = false) String search,
            Authentication auth) {

        String userRole = "ROLE_APEX_ADMIN";
        String userRegion = null;

        if (auth != null && auth.getDetails() instanceof Claims claims) {
            userRole = claims.get("role", String.class);
            userRegion = claims.get("region", String.class);
        }

        List<CaseResponseDto> cases = caseService.getCases(userRole, userRegion, region, bureau, status, search);
        return ResponseEntity.ok(cases);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CaseResponseDto> getCaseById(@PathVariable String id) {
        return ResponseEntity.ok(caseService.getCaseById(id));
    }

    @PostMapping
    public ResponseEntity<CaseResponseDto> createCase(
            @Valid @RequestBody CaseCreateDto dto,
            Authentication auth) {
        String officerId = (auth != null) ? auth.getName() : "OFFICER";
        return ResponseEntity.ok(caseService.createCase(dto, officerId));
    }

    @PostMapping(value = "/bulk-import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BulkImportResultDto> bulkImport(
            @RequestParam("file") MultipartFile file,
            Authentication auth) throws IOException {
        String officerId = (auth != null) ? auth.getName() : "OFFICER";
        return ResponseEntity.ok(caseService.bulkImport(file.getInputStream(), officerId));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<CaseResponseDto> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        ComplaintStatus status = ComplaintStatus.valueOf(body.get("status"));
        String remarks = body.get("remarks");
        String officerId = (auth != null) ? auth.getName() : "OFFICER";
        return ResponseEntity.ok(caseService.updateStatus(id, status, remarks, officerId));
    }
}
