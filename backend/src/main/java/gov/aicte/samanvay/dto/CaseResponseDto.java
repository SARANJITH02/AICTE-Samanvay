package gov.aicte.samanvay.dto;

import gov.aicte.samanvay.model.BureauType;
import gov.aicte.samanvay.model.ComplaintStatus;
import lombok.*;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseResponseDto {
    private String id;
    private String institutionPid;
    private String institutionName;
    private BureauType sourceBureau;
    private String complainantType;
    private String complainantMobile;
    private String category;
    private String subject;
    private String complaintText;
    private String sanitizedText;
    private ComplaintStatus status;
    private String assignedOfficerId;
    private String assignedBureau;
    private String region;
    private OffsetDateTime receivedDate;
    private OffsetDateTime slaDeadline;
    private Boolean isEscalated;
    private Double delayRiskScore;
    private String delayRiskReasons;
    private String resolutionNotes;
    private Long daysRemainingSla;
    private Boolean hasOverlap;
}
