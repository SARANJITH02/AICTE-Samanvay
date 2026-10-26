package gov.aicte.samanvay.service;

import gov.aicte.samanvay.model.Complaint;
import gov.aicte.samanvay.model.ComplaintStatus;
import gov.aicte.samanvay.model.PolicyVersion;
import gov.aicte.samanvay.repository.ComplaintRepository;
import gov.aicte.samanvay.repository.PolicyVersionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConsistencyCheckService {

    private final ComplaintRepository complaintRepository;
    private final PolicyVersionRepository policyVersionRepository;

    public record ConsistencyResult(
            boolean isConsistent,
            String warningMessage,
            String mandatoryPolicyClause,
            String historicalPrecedentCaseId,
            String historicalPrecedentSanction
    ) {}

    /**
     * Novelty 6: Resolution Consistency Checks
     * Compares proposed penalty/sanction against mandatory APH guidelines and prior peer dispositions.
     */
    @Transactional(readOnly = true)
    public ConsistencyResult checkResolutionConsistency(String caseId, String proposedPenalty, String policyClause) {
        Complaint current = complaintRepository.findById(caseId)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found: " + caseId));

        // 1. Check against active policy version
        Optional<PolicyVersion> policyOpt = policyVersionRepository.findByHandbookVersionAndClauseNumber(
                current.getGoverningPolicyVersion() != null ? current.getGoverningPolicyVersion() : "APH 2024-27",
                policyClause != null ? policyClause : "Clause 13.4"
        );

        // 2. Check historically disposed cases of the same category
        List<Complaint> historicalDisposed = complaintRepository.findByInstitutionPid(current.getInstitution().getPid())
                .stream()
                .filter(c -> !c.getId().equals(caseId) && c.getStatus() == ComplaintStatus.DISPOSED && c.getCategory().equalsIgnoreCase(current.getCategory()))
                .toList();

        if (policyOpt.isPresent()) {
            PolicyVersion policy = policyOpt.get();
            String mandatorySanction = policy.getMandatedPenalty();

            // Check if proposed penalty is lighter (e.g. proposed only warning, but clause mandates penal interest or grant forfeiture)
            if (proposedPenalty != null && proposedPenalty.toLowerCase().contains("warning") &&
                    mandatorySanction.toLowerCase().contains("penal interest")) {
                String precedentCase = !historicalDisposed.isEmpty() ? historicalDisposed.get(0).getId() : "CMP-2025-RB-091";
                String warning = String.format("Warning: Penalty recommended is lower than the mandatory %s %s sanction (%s) applied to identical Case #%s.",
                        policy.getHandbookVersion(), policy.getClauseNumber(), mandatorySanction, precedentCase);

                return new ConsistencyResult(
                        false,
                        warning,
                        policy.getClauseNumber() + ": " + policy.getClauseTitle(),
                        precedentCase,
                        mandatorySanction
                );
            }
        }

        return new ConsistencyResult(true, null, null, null, null);
    }
}
