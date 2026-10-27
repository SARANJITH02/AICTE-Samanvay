package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.model.Institution;
import gov.aicte.samanvay.repository.InstitutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/institutions")
@RequiredArgsConstructor
public class InstitutionController {

    private final InstitutionRepository institutionRepository;

    @GetMapping
    public ResponseEntity<List<Institution>> getInstitutions(
            @RequestParam(required = false) String region) {
        if (region != null && !region.isBlank() && !"All Regions".equalsIgnoreCase(region)) {
            return ResponseEntity.ok(institutionRepository.findByRegionIgnoreCase(region));
        }
        return ResponseEntity.ok(institutionRepository.findAll());
    }

    @GetMapping("/{pid}")
    public ResponseEntity<Institution> getInstitutionByPid(@PathVariable String pid) {
        return institutionRepository.findById(pid)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
