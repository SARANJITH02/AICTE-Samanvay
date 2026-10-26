package gov.aicte.samanvay.dto;

import gov.aicte.samanvay.model.BureauType;
import gov.aicte.samanvay.model.ComplaintStatus;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DuplicateWarningDto {
    private String caseId;
    private String title;
    private BureauType bureau;
    private ComplaintStatus status;
    private String institutionName;
    private int similarityPercent;
    private String warning;
}
