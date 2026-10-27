package gov.aicte.samanvay.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GraphDataDto {
    private List<GraphNode> nodes;
    private List<GraphEdge> edges;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GraphNode {
        private String id;
        private String pid;
        private String label;
        private String type; // INSTITUTION, COMPLAINT, BUREAU, OFFICER
        private String status;
        private Double riskScore;
        private Integer caseCount;
        private Integer activeGrievances;
        private String region;
        private Integer ciiScore;
        private String ciiGrade;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GraphEdge {
        private String id;
        private String source;
        private String target;
        private String label;
        private Double weight;
        private String type; // FILED_AGAINST, ASSIGNED_TO, OVERLAP_RELATION
    }
}
