package gov.aicte.samanvay.dto;

import gov.aicte.samanvay.model.BureauType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseCreateDto {
    private String id;
    private String institutionPid;
    private String institutionName; // Optional for fuzzy resolution
    @NotNull
    private BureauType sourceBureau;
    @NotBlank
    private String complainantType;
    private String complainantMobile;
    @NotBlank
    private String category;
    @NotBlank
    private String subject;
    @NotBlank
    private String complaintText;
    private String assignedOfficerId;
    private String region;
    private Integer slaDays;
}
