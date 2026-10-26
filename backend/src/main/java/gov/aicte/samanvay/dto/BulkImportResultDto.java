package gov.aicte.samanvay.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkImportResultDto {
    private int totalProcessed;
    private int successCount;
    private int fuzzyMatchedCount;
    private int failureCount;
    private List<ImportRowStatus> details;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ImportRowStatus {
        private int rowNumber;
        private String caseId;
        private String originalInstitutionInput;
        private String resolvedPid;
        private String resolvedInstitutionName;
        private Double resolutionConfidence;
        private boolean success;
        private String errorMessage;
    }
}
