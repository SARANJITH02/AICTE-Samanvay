package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.dto.GraphDataDto;
import gov.aicte.samanvay.model.CaseOverlap;
import gov.aicte.samanvay.model.Complaint;
import gov.aicte.samanvay.model.Institution;
import gov.aicte.samanvay.repository.CaseOverlapRepository;
import gov.aicte.samanvay.repository.ComplaintRepository;
import gov.aicte.samanvay.repository.InstitutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/api/graph")
@RequiredArgsConstructor
public class GraphController {

    private final InstitutionRepository institutionRepository;
    private final ComplaintRepository complaintRepository;
    private final CaseOverlapRepository caseOverlapRepository;

    @GetMapping("/relationships")
    public ResponseEntity<GraphDataDto> getRelationshipGraph() {
        List<GraphDataDto.GraphNode> nodes = new ArrayList<>();
        List<GraphDataDto.GraphEdge> edges = new ArrayList<>();
        Set<String> addedNodes = new HashSet<>();

        List<Institution> institutions = institutionRepository.findAll();
        List<Complaint> complaints = complaintRepository.findAll();
        List<CaseOverlap> overlaps = caseOverlapRepository.findAll();

        // 1. Institution Nodes
        for (Institution inst : institutions) {
            long count = complaints.stream().filter(c -> c.getInstitution().getPid().equals(inst.getPid())).count();
            int ciiScore = inst.getCiiScore() != null ? inst.getCiiScore() : ("1-48920194".equals(inst.getPid()) ? 210 : 850);
            String ciiGrade = inst.getCiiGrade() != null ? inst.getCiiGrade() : ("1-48920194".equals(inst.getPid()) ? "D" : "A");

            nodes.add(GraphDataDto.GraphNode.builder()
                    .id("inst-" + inst.getPid())
                    .pid(inst.getPid())
                    .label(inst.getName())
                    .type("INSTITUTION")
                    .riskScore(inst.getRiskScore() != null ? inst.getRiskScore() : 0.0)
                    .caseCount((int) count)
                    .activeGrievances((int) count)
                    .region(inst.getRegion())
                    .ciiScore(ciiScore)
                    .ciiGrade(ciiGrade)
                    .build());
            addedNodes.add("inst-" + inst.getPid());
        }

        // 2. Complaint Nodes & Edges
        for (Complaint c : complaints) {
            String cId = "case-" + c.getId();
            nodes.add(GraphDataDto.GraphNode.builder()
                    .id(cId)
                    .label(c.getId())
                    .type("COMPLAINT")
                    .status(c.getStatus().name())
                    .riskScore(c.getDelayRiskScore() != null ? c.getDelayRiskScore() : 0.0)
                    .region(c.getRegion())
                    .build());
            addedNodes.add(cId);

            // Edge: Complaint -> Institution
            edges.add(GraphDataDto.GraphEdge.builder()
                    .id("edge-inst-" + c.getId())
                    .source(cId)
                    .target("inst-" + c.getInstitution().getPid())
                    .label("FILED_AGAINST")
                    .weight(1.0)
                    .type("FILED_AGAINST")
                    .build());

            // Edge: Complaint -> Bureau
            String bureauNodeId = "bureau-" + c.getSourceBureau().name();
            if (!addedNodes.contains(bureauNodeId)) {
                nodes.add(GraphDataDto.GraphNode.builder()
                        .id(bureauNodeId)
                        .label(c.getSourceBureau().name())
                        .type("BUREAU")
                        .build());
                addedNodes.add(bureauNodeId);
            }

            edges.add(GraphDataDto.GraphEdge.builder()
                    .id("edge-bureau-" + c.getId())
                    .source(cId)
                    .target(bureauNodeId)
                    .label("PROCESSED_BY")
                    .weight(0.8)
                    .type("PROCESSED_BY")
                    .build());
        }

        // 3. Overlap Edges
        for (CaseOverlap o : overlaps) {
            edges.add(GraphDataDto.GraphEdge.builder()
                    .id("edge-overlap-" + o.getId())
                    .source("case-" + o.getCaseA().getId())
                    .target("case-" + o.getCaseB().getId())
                    .label(String.format("OVERLAP (%.0f%%)", o.getHybridScore() * 100))
                    .weight(o.getHybridScore())
                    .type("OVERLAP_RELATION")
                    .build());
        }

        return ResponseEntity.ok(GraphDataDto.builder().nodes(nodes).edges(edges).build());
    }
}
