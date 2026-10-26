package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.dto.StatsSummaryDto;
import gov.aicte.samanvay.model.BureauType;
import gov.aicte.samanvay.model.Complaint;
import gov.aicte.samanvay.model.ComplaintStatus;
import gov.aicte.samanvay.repository.CaseOverlapRepository;
import gov.aicte.samanvay.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final ComplaintRepository complaintRepository;
    private final CaseOverlapRepository caseOverlapRepository;

    @GetMapping("/summary")
    public ResponseEntity<StatsSummaryDto> getSummaryStats() {
        List<Complaint> all = complaintRepository.findAll();
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime nearThreshold = now.plusDays(3);

        long total = all.size();
        long activePgrc = all.stream().filter(c -> c.getSourceBureau() == BureauType.PGRC && c.getStatus() != ComplaintStatus.DISPOSED).count();
        long activeRb = all.stream().filter(c -> c.getSourceBureau() == BureauType.REGULATION_BUREAU && c.getStatus() != ComplaintStatus.DISPOSED).count();
        long activeRo = all.stream().filter(c -> c.getSourceBureau() == BureauType.REGIONAL_OFFICE && c.getStatus() != ComplaintStatus.DISPOSED).count();

        long pendingOverlaps = caseOverlapRepository.countPendingCoordination();
        long breachedSla = all.stream().filter(c -> c.getSlaDeadline().isBefore(now) && c.getStatus() != ComplaintStatus.DISPOSED).count();
        long nearBreachSla = all.stream().filter(c -> c.getSlaDeadline().isAfter(now) && c.getSlaDeadline().isBefore(nearThreshold) && c.getStatus() != ComplaintStatus.DISPOSED).count();

        long disposedCount = all.stream().filter(c -> c.getStatus() == ComplaintStatus.DISPOSED).count();
        double resolutionRate = total > 0 ? (double) disposedCount / total : 0.0;

        Map<String, Long> byCategory = all.stream().collect(Collectors.groupingBy(Complaint::getCategory, Collectors.counting()));
        Map<String, Long> byRegion = all.stream().collect(Collectors.groupingBy(Complaint::getRegion, Collectors.counting()));
        Map<String, Long> byStatus = all.stream().collect(Collectors.groupingBy(c -> c.getStatus().name(), Collectors.counting()));

        return ResponseEntity.ok(StatsSummaryDto.builder()
                .totalCases(total)
                .activePgrc(activePgrc)
                .activeRegulationBureau(activeRb)
                .activeRegionalOffice(activeRo)
                .pendingOverlaps(pendingOverlaps)
                .breachedSla(breachedSla)
                .nearBreachSla(nearBreachSla)
                .overallResolutionRate(Math.round(resolutionRate * 100.0) / 100.0)
                .casesByCategory(byCategory)
                .casesByRegion(byRegion)
                .casesByStatus(byStatus)
                .build());
    }
}
