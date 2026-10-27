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
    private final gov.aicte.samanvay.repository.InterBureauNoteRepository interBureauNoteRepository;

    @GetMapping("/{id}/notes")
    public ResponseEntity<List<gov.aicte.samanvay.model.InterBureauNote>> getOverlapNotes(@PathVariable Long id) {
        return ResponseEntity.ok(interBureauNoteRepository.findByOverlapIdOrderByCreatedAtAsc(id));
    }

    @PostMapping("/{id}/notes")
    public ResponseEntity<gov.aicte.samanvay.model.InterBureauNote> addOverlapNote(
            @PathVariable Long id,
            @RequestBody gov.aicte.samanvay.model.InterBureauNote note,
            Authentication auth) {
        note.setOverlapId(id);
        if ((note.getAuthorOfficerId() == null || note.getAuthorOfficerId().isBlank()) && auth != null) {
            note.setAuthorOfficerId(auth.getName());
        }
        if (note.getAuthorRole() == null || note.getAuthorRole().isBlank()) {
            note.setAuthorRole("Officer");
        }
        if (note.getAuthorBureau() == null || note.getAuthorBureau().isBlank()) {
            note.setAuthorBureau("AICTE");
        }
        return ResponseEntity.ok(interBureauNoteRepository.save(note));
    }

    @GetMapping
    public ResponseEntity<List<CaseOverlap>> getAllOverlaps() {
        return ResponseEntity.ok(caseOverlapRepository.findAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<CaseOverlap>> getActiveOverlaps() {
        return ResponseEntity.ok(caseOverlapRepository.findByStatus(gov.aicte.samanvay.model.OverlapStatus.PENDING_COORDINATION));
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
