package gov.aicte.samanvay.service;

import gov.aicte.samanvay.dto.OverlapResolveDto;
import gov.aicte.samanvay.model.*;
import gov.aicte.samanvay.repository.CaseOverlapRepository;
import gov.aicte.samanvay.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OverlapService {

    private final CaseOverlapRepository caseOverlapRepository;
    private final ComplaintRepository complaintRepository;
    private final AiClientService aiClientService;
    private final AuditService auditService;

    /**
     * Evaluates cross-bureau conflicts between the new/updated complaint and existing complaints.
     */
    @Transactional
    public void scanAndEvaluateOverlaps(Complaint targetCase) {
        // Find existing complaints filed against the same institution or across bureaus
        List<Complaint> candidates = complaintRepository.findByInstitutionPid(targetCase.getInstitution().getPid());

        for (Complaint candidate : candidates) {
            if (candidate.getId().equals(targetCase.getId())) continue;
            // Cross-bureau or multi-case check
            boolean isCrossBureau = candidate.getSourceBureau() != targetCase.getSourceBureau();

            AiClientService.OverlapCalculationResult result = aiClientService.calculateOverlap(
                    targetCase.getInstitution().getPid(),
                    candidate.getInstitution().getPid(),
                    targetCase.getCategory(),
                    candidate.getCategory(),
                    targetCase.getSanitizedText(),
                    candidate.getSanitizedText()
            );

            if (result.isOverlapping()) {
                // Ensure deterministic ordering for unique pair constraint
                Complaint caseA = targetCase.getId().compareTo(candidate.getId()) < 0 ? targetCase : candidate;
                Complaint caseB = targetCase.getId().compareTo(candidate.getId()) < 0 ? candidate : targetCase;

                Optional<CaseOverlap> existingOpt = caseOverlapRepository.findByPair(caseA.getId(), caseB.getId());
                CaseOverlap overlap;
                if (existingOpt.isPresent()) {
                    overlap = existingOpt.get();
                    overlap.setHybridScore(result.totalScore());
                    overlap.setSemanticScore(result.semanticScore());
                    overlap.setCategoryMatchScore(result.categoryScore());
                    overlap.setKeywordMatchScore(result.keywordScore());
                } else {
                    overlap = CaseOverlap.builder()
                            .caseA(caseA)
                            .caseB(caseB)
                            .institution(targetCase.getInstitution())
                            .hybridScore(result.totalScore())
                            .semanticScore(result.semanticScore())
                            .categoryMatchScore(result.categoryScore())
                            .keywordMatchScore(result.keywordScore())
                            .status(OverlapStatus.PENDING_COORDINATION)
                            .build();

                    // Audit both cases
                    String overlapMsg = String.format("Cross-bureau overlap detected (Score: %.0f%%) with case %s",
                            result.totalScore() * 100, candidate.getId());
                    auditService.appendAuditLog(targetCase.getId(), "SYSTEM_AI_ENGINE", "OVERLAP_DETECTED", overlapMsg,
                            String.format("{\"correlated_case\": \"%s\", \"score\": %.2f}", candidate.getId(), result.totalScore()));
                }

                caseOverlapRepository.save(overlap);
                log.info("[OVERLAP] Flagged correlation between {} and {} (Score: {})", caseA.getId(), caseB.getId(), result.totalScore());
            }
        }
    }

    /**
     * Resolves an overlap by assigning a lead bureau, linking, merging, or dismissing.
     */
    @Transactional
    public CaseOverlap resolveOverlap(Long overlapId, OverlapResolveDto dto) {
        CaseOverlap overlap = caseOverlapRepository.findById(overlapId)
                .orElseThrow(() -> new IllegalArgumentException("Overlap record not found: " + overlapId));

        if (overlap.getStatus() == dto.getAction()) {
            log.info("[IDEMPOTENT] Overlap {} is already resolved with action {}. Skipping duplicate operation.", overlapId, dto.getAction());
            return overlap;
        }

        overlap.setStatus(dto.getAction());
        overlap.setLeadBureau(dto.getLeadBureau());
        overlap.setCoordinationNotes(dto.getCoordinationNotes());
        overlap.setResolvedBy(dto.getResolvedBy() != null ? dto.getResolvedBy() : "OFFICER");
        overlap.setResolvedAt(OffsetDateTime.now());

        CaseOverlap saved = caseOverlapRepository.save(overlap);

        // If linked or merged, update case statuses to JOINT_INQUIRY and record audit blocks
        if (dto.getAction() == OverlapStatus.LINKED || dto.getAction() == OverlapStatus.MERGED) {
            Complaint caseA = overlap.getCaseA();
            Complaint caseB = overlap.getCaseB();

            boolean updatedA = false;
            boolean updatedB = false;

            if (caseA.getStatus() != ComplaintStatus.DISPOSED && caseA.getStatus() != ComplaintStatus.JOINT_INQUIRY) {
                caseA.setStatus(ComplaintStatus.JOINT_INQUIRY);
                complaintRepository.save(caseA);
                updatedA = true;
            }
            if (caseB.getStatus() != ComplaintStatus.DISPOSED && caseB.getStatus() != ComplaintStatus.JOINT_INQUIRY) {
                caseB.setStatus(ComplaintStatus.JOINT_INQUIRY);
                complaintRepository.save(caseB);
                updatedB = true;
            }

            String auditAction = (dto.getAction() == OverlapStatus.MERGED) ? "CASE_MERGED" : "JOINT_INQUIRY_INITIATED";
            String remarksA = String.format("Coordinated resolution applied: %s with Case %s. Lead bureau: %s. Notes: %s",
                    dto.getAction(), caseB.getId(), dto.getLeadBureau(), dto.getCoordinationNotes());
            String remarksB = String.format("Coordinated resolution applied: %s with Case %s. Lead bureau: %s. Notes: %s",
                    dto.getAction(), caseA.getId(), dto.getLeadBureau(), dto.getCoordinationNotes());

            if (updatedA) {
                auditService.appendAuditLog(caseA.getId(), overlap.getResolvedBy(), auditAction, remarksA, "{\"action\":\"" + dto.getAction() + "\"}");
            }
            if (updatedB) {
                auditService.appendAuditLog(caseB.getId(), overlap.getResolvedBy(), auditAction, remarksB, "{\"action\":\"" + dto.getAction() + "\"}");
            }
        }

        return saved;
    }
}
