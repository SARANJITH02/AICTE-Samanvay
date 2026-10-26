package gov.aicte.samanvay.service;

import gov.aicte.samanvay.model.Complaint;
import gov.aicte.samanvay.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContradictionDetectionService {

    private final ComplaintRepository complaintRepository;

    public record ContradictionResult(
            boolean hasContradiction,
            String contradictoryBureauA,
            String directiveA,
            String contradictoryBureauB,
            String directiveB,
            String alertMessage
    ) {}

    private static final List<String> REFUND_KEYWORDS = List.of("refund", "disburse", "pay back", "return deposit", "release caution");
    private static final List<String> HOLD_KEYWORDS = List.of("maintain status quo", "withhold", "stay order", "pending scrutiny", "frozen", "do not disburse");

    /**
     * Novelty 1: Contradiction Detection Engine
     * Detects conflicting directives issued to the same institution by different bureaus.
     */
    @Transactional(readOnly = true)
    public ContradictionResult detectContradictions(String institutionPid) {
        List<Complaint> activeCases = complaintRepository.findByInstitutionPid(institutionPid);

        Complaint refundOrderCase = null;
        Complaint holdOrderCase = null;

        for (Complaint c : activeCases) {
            String text = ((c.getResolutionNotes() != null ? c.getResolutionNotes() : "") + " " + c.getSubject()).toLowerCase();
            
            boolean hasRefund = REFUND_KEYWORDS.stream().anyMatch(text::contains);
            boolean hasHold = HOLD_KEYWORDS.stream().anyMatch(text::contains);

            if (hasRefund && refundOrderCase == null) {
                refundOrderCase = c;
            }
            if (hasHold && holdOrderCase == null) {
                holdOrderCase = c;
            }
        }

        if (refundOrderCase != null && holdOrderCase != null &&
                refundOrderCase.getSourceBureau() != holdOrderCase.getSourceBureau()) {
            String msg = String.format("Contradictory Bureau Orders Detected: %s orders immediate refund/restitution for Case #%s, while %s orders status quo / withholding for Case #%s.",
                    refundOrderCase.getSourceBureau(), refundOrderCase.getId(),
                    holdOrderCase.getSourceBureau(), holdOrderCase.getId());

            return new ContradictionResult(
                    true,
                    refundOrderCase.getSourceBureau().name(),
                    refundOrderCase.getSubject(),
                    holdOrderCase.getSourceBureau().name(),
                    holdOrderCase.getSubject(),
                    msg
            );
        }

        return new ContradictionResult(false, null, null, null, null, null);
    }
}
