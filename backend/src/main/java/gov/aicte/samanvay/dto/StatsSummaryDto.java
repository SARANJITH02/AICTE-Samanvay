package gov.aicte.samanvay.dto;

import lombok.*;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatsSummaryDto {
    private long totalCases;
    private long activePgrc;
    private long activeRegulationBureau;
    private long activeRegionalOffice;
    private long pendingOverlaps;
    private long breachedSla;
    private long nearBreachSla;
    private double overallResolutionRate;
    private Map<String, Long> casesByCategory;
    private Map<String, Long> casesByRegion;
    private Map<String, Long> casesByStatus;
}
