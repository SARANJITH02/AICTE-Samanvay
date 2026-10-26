package gov.aicte.samanvay.service;

import gov.aicte.samanvay.model.Institution;
import gov.aicte.samanvay.repository.InstitutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EntityResolverService {

    private final InstitutionRepository institutionRepository;

    public record ResolutionResult(
            Institution institution,
            boolean isFuzzyMatched,
            double confidence,
            String resolutionMessage
    ) {}

    /**
     * Resolves an institution from either a PID or raw name, applying fuzzy trigram matching if needed.
     */
    public ResolutionResult resolveInstitution(String inputPid, String inputName, String region) {
        // 1. Direct PID lookup
        if (inputPid != null && !inputPid.isBlank()) {
            Optional<Institution> exactOpt = institutionRepository.findById(inputPid.trim());
            if (exactOpt.isPresent()) {
                return new ResolutionResult(exactOpt.get(), false, 1.0, "Exact AICTE PID match");
            }
        }

        // 2. Fuzzy Trigram / Levenshtein Name lookup
        String targetName = (inputName != null && !inputName.isBlank()) ? inputName : inputPid;
        if (targetName != null && !targetName.isBlank()) {
            String normalized = normalize(targetName);
            try {
                Optional<Institution> trigramMatch = institutionRepository.findClosestByTrigram(normalized);
                if (trigramMatch.isPresent()) {
                    Institution match = trigramMatch.get();
                    double similarity = computeLevenshteinSimilarity(normalized, match.getNormalized_name());
                    if (similarity >= 0.50) {
                        return new ResolutionResult(
                                match,
                                true,
                                Math.round(similarity * 100.0) / 100.0,
                                String.format("Fuzzy Trigram match resolved to '%s' (PID: %s) with %.0f%% confidence",
                                        match.getName(), match.getPid(), similarity * 100)
                        );
                    }
                }
            } catch (Exception e) {
                log.warn("[RESOLVER] Native trigram query fallback: {}", e.getMessage());
            }

            // In-memory fallback across all institutions
            List<Institution> allInst = institutionRepository.findAll();
            Institution bestMatch = null;
            double highestSim = 0.0;

            for (Institution inst : allInst) {
                double sim = computeLevenshteinSimilarity(normalized, inst.getNormalized_name());
                if (sim > highestSim) {
                    highestSim = sim;
                    bestMatch = inst;
                }
            }

            if (bestMatch != null && highestSim >= 0.45) {
                return new ResolutionResult(
                        bestMatch,
                        true,
                        Math.round(highestSim * 100.0) / 100.0,
                        String.format("Fuzzy match resolved to '%s' (PID: %s)", bestMatch.getName(), bestMatch.getPid())
                );
            }
        }

        // 3. Fallback: auto-register placeholder institution if none matched
        String defaultPid = (inputPid != null && !inputPid.isBlank()) ? inputPid.trim() : "1-" + System.currentTimeMillis() % 100000000;
        String defaultName = (inputName != null && !inputName.isBlank()) ? inputName.trim() : "Unregistered AICTE Institution (" + defaultPid + ")";
        String defaultRegion = (region != null && !region.isBlank()) ? region.trim() : "Northern";

        Institution fallbackInst = Institution.builder()
                .pid(defaultPid)
                .name(defaultName)
                .normalized_name(normalize(defaultName))
                .region(defaultRegion)
                .state("National")
                .district("General")
                .riskScore(0.20)
                .build();

        Institution saved = institutionRepository.save(fallbackInst);
        return new ResolutionResult(saved, false, 0.40, "New institution entity provisioned");
    }

    private String normalize(String s) {
        return s.toLowerCase().replaceAll("[^a-z0-9 ]", " ").replaceAll("\\s+", " ").trim();
    }

    private double computeLevenshteinSimilarity(String s1, String s2) {
        if (s1.equals(s2)) return 1.0;
        int maxLen = Math.max(s1.length(), s2.length());
        if (maxLen == 0) return 1.0;
        int distance = computeLevenshteinDistance(s1, s2);
        return 1.0 - ((double) distance / maxLen);
    }

    private int computeLevenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];
        for (int i = 0; i <= s1.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= s2.length(); j++) dp[0][j] = j;

        for (int i = 1; i <= s1.length(); i++) {
            for (int j = 1; j <= s2.length(); j++) {
                int cost = (s1.charAt(i - 1) == s2.charAt(j - 1)) ? 0 : 1;
                dp[i][j] = Math.min(
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[s1.length()][s2.length()];
    }
}
