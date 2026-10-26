package gov.aicte.samanvay.service;

import gov.aicte.samanvay.model.Complaint;
import gov.aicte.samanvay.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Pattern;

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
            String alertMessage,
            List<String> conflictingDirectiveTypes,
            List<String> evidencePhrasesA,
            List<String> evidencePhrasesB
    ) {}

    // Structured Directive Definitions
    private static final Map<String, List<String>> DIRECTIVE_DEFINITIONS = Map.of(
            "REFUND_ORDER", List.of("refund", "disburse", "pay back", "return deposit", "release caution", "immediate restitution"),
            "STATUS_QUO_HOLD", List.of("maintain status quo", "withhold", "stay order", "pending scrutiny", "frozen", "do not disburse"),
            "INTAKE_FREEZE", List.of("freeze admissions", "zero intake", "intake reduction", "revoke approval", "block seat matrix"),
            "PROVISIONAL_APPROVAL", List.of("provisional approval", "grant approval", "approve intake", "extension of approval", "allow admissions"),
            "FACULTY_REINSTATE", List.of("reinstate faculty", "return service book", "withdraw termination"),
            "FACULTY_DISMISSAL", List.of("terminate faculty", "disqualify faculty", "remove teacher", "dismiss from rolls"),
            "CAMPUS_INSPECTION", List.of("depute surprise evc", "surprise physical verification", "conduct inspection"),
            "INSPECTION_DEFERRED", List.of("stay inspection", "defer evc", "waive physical visit")
    );

    private static final Map<String, String> INCOMPATIBLE_PAIRS = Map.of(
            "REFUND_ORDER:STATUS_QUO_HOLD", "One bureau mandates student refund/restitution while another mandates maintaining status quo / withholding disbursements.",
            "INTAKE_FREEZE:PROVISIONAL_APPROVAL", "One bureau has frozen student intake/admissions while another has granted extension of approval (EOA).",
            "FACULTY_REINSTATE:FACULTY_DISMISSAL", "One bureau directs reinstatement of terminated faculty while another directs dismissal/derecognition.",
            "CAMPUS_INSPECTION:INSPECTION_DEFERRED", "One bureau mandates an expedited surprise physical inspection while another has deferred or stayed inspection."
    );

    private static final List<String> NEGATION_TOKENS = List.of("not", "no", "never", "without", "shall not", "do not", "refuse");

    /**
     * Extracts non-negated directive types and evidence phrases from text.
     */
    public Map.Entry<List<String>, List<String>> extractDirectives(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return Map.entry(List.of(), List.of());
        }

        String lower = rawText.toLowerCase();
        List<String> matchedTypes = new ArrayList<>();
        List<String> matchedPhrases = new ArrayList<>();

        for (Map.Entry<String, List<String>> entry : DIRECTIVE_DEFINITIONS.entrySet()) {
            String type = entry.getKey();
            for (String phrase : entry.getValue()) {
                int idx = lower.indexOf(phrase);
                if (idx != -1) {
                    // Check 30-char window preceding phrase for negations
                    int startWindow = Math.max(0, idx - 30);
                    String window = lower.substring(startWindow, idx);
                    boolean isNegated = NEGATION_TOKENS.stream().anyMatch(neg ->
                            Pattern.compile("\\b" + Pattern.quote(neg) + "\\b").matcher(window).find());

                    if (!isNegated) {
                        matchedTypes.add(type);
                        matchedPhrases.add(phrase);
                        break;
                    }
                }
            }
        }
        return Map.entry(matchedTypes, matchedPhrases);
    }

    /**
     * Novelty 1: Contradiction Detection Engine
     * Detects conflicting directives issued to the same institution by different bureaus.
     */
    @Transactional(readOnly = true)
    public ContradictionResult detectContradictions(String institutionPid) {
        List<Complaint> activeCases = complaintRepository.findByInstitutionPid(institutionPid);

        for (int i = 0; i < activeCases.size(); i++) {
            Complaint caseA = activeCases.get(i);
            String textA = ((caseA.getResolutionNotes() != null ? caseA.getResolutionNotes() : "") + " " + caseA.getSubject());
            var extractedA = extractDirectives(textA);

            for (int j = i + 1; j < activeCases.size(); j++) {
                Complaint caseB = activeCases.get(j);
                if (caseA.getSourceBureau() == caseB.getSourceBureau()) continue;

                String textB = ((caseB.getResolutionNotes() != null ? caseB.getResolutionNotes() : "") + " " + caseB.getSubject());
                var extractedB = extractDirectives(textB);

                for (String typeA : extractedA.getKey()) {
                    for (String typeB : extractedB.getKey()) {
                        String key1 = typeA + ":" + typeB;
                        String key2 = typeB + ":" + typeA;

                        String explanation = INCOMPATIBLE_PAIRS.get(key1);
                        if (explanation == null) {
                            explanation = INCOMPATIBLE_PAIRS.get(key2);
                        }

                        if (explanation != null) {
                            String msg = String.format("Contradictory Bureau Orders Detected between %s (#%s) and %s (#%s): %s",
                                    caseA.getSourceBureau(), caseA.getId(),
                                    caseB.getSourceBureau(), caseB.getId(),
                                    explanation);

                            log.warn("[CONTRADICTION] Flagged institutional conflict for PID {}: {}", institutionPid, msg);

                            return new ContradictionResult(
                                    true,
                                    caseA.getSourceBureau().name(),
                                    caseA.getSubject(),
                                    caseB.getSourceBureau().name(),
                                    caseB.getSubject(),
                                    msg,
                                    List.of(typeA, typeB),
                                    extractedA.getValue(),
                                    extractedB.getValue()
                            );
                        }
                    }
                }
            }
        }

        return new ContradictionResult(false, null, null, null, null, null, List.of(), List.of(), List.of());
    }
}
