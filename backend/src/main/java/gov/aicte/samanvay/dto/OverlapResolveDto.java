package gov.aicte.samanvay.dto;

import gov.aicte.samanvay.model.OverlapStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OverlapResolveDto {
    @NotNull
    private OverlapStatus action; // LINKED, MERGED, DISMISSED
    private String leadBureau;
    private String coordinationNotes;
    private String resolvedBy;
}
