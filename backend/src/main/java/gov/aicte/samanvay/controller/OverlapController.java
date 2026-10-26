package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.dto.OverlapResolveDto;
import gov.aicte.samanvay.model.CaseOverlap;
import gov.aicte.samanvay.repository.CaseOverlapRepository;
import gov.aicte.samanvay.service.OverlapService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/overlaps")
@RequiredArgsConstructor
public class OverlapController {

    private final CaseOverlapRepository caseOverlapRepository;
    private final OverlapService overlapService;

    @GetMapping
    public ResponseEntity<List<CaseOverlap>> getAllOverlaps() {
        return ResponseEntity.ok(caseOverlapRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CaseOverlap> getOverlapById(@PathVariable Long id) {
        return caseOverlapRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<CaseOverlap> resolveOverlap(
            @PathVariable Long id,
            @Valid @RequestBody OverlapResolveDto dto,
            Authentication auth) {
        if (dto.getResolvedBy() == null && auth != null) {
            dto.setResolvedBy(auth.getName());
        }
        return ResponseEntity.ok(overlapService.resolveOverlap(id, dto));
    }
}
