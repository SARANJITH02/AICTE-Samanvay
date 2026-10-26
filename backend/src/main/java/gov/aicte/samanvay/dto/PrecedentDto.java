package gov.aicte.samanvay.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrecedentDto {
    private String caseId;
    private String title;
    private String category;
    private String institutionName;
    private String resolutionNotes;
    private long daysTaken;
    private Double reliefAmountInr;
    private String appliedClauses;
    private int similarityPercent;
    private String precedentBadge;
}
