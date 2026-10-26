package gov.aicte.samanvay.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiClientService {

    @Value("${ai-service.base-url:http://ai-engine:8000}")
    private String aiServiceBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Air-gapped fallback regex patterns
    private static final Pattern PHONE_PATTERN = Pattern.compile("(?i)(\\+91[\\-\\s]?)?[6-9]\\d{9}");
    private static final Pattern AADHAAR_PATTERN = Pattern.compile("\\b\\d{4}[\\s\\-]\\d{4}[\\s\\-]\\d{4}\\b|\\b\\d{12}\\b");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");

    /**
     * Sanitizes PII from grievance text.
     */
    public String redactPii(String rawText) {
        if (rawText == null || rawText.isBlank()) return "";

        try {
            String url = aiServiceBaseUrl + "/redact-pii";
            Map<String, String> body = Map.of("text", rawText);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                return root.path("sanitized_text").asText(rawText);
            }
        } catch (Exception e) {
            log.warn("[AI-Client] FastAPI microservice offline or unreachable: {}. Falling back to internal air-gapped regex sanitizer.", e.getMessage());
        }

        // Offline deterministic fallback
        String sanitized = PHONE_PATTERN.matcher(rawText).replaceAll("[PHONE_REDACTED]");
        sanitized = AADHAAR_PATTERN.matcher(sanitized).replaceAll("[AADHAAR_REDACTED]");
        sanitized = EMAIL_PATTERN.matcher(sanitized).replaceAll("[EMAIL_REDACTED]");
        return sanitized;
    }

    /**
     * Calculates explainable multi-bureau hybrid overlap score:
     * S_total = 0.35 * I_pid + 0.25 * S_cat + 0.25 * S_semantic + 0.15 * S_keyword
     */
    public OverlapCalculationResult calculateOverlap(
            String pidA, String pidB,
            String catA, String catB,
            String textA, String textB) {

        try {
            String url = aiServiceBaseUrl + "/calculate-overlap";
            Map<String, Object> body = new HashMap<>();
            body.put("case_a_pid", pidA);
            body.put("case_b_pid", pidB);
            body.put("case_a_category", catA);
            body.put("case_b_category", catB);
            body.put("case_a_text", textA);
            body.put("case_b_text", textB);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                return new OverlapCalculationResult(
                        root.path("pid_score").asDouble(),
                        root.path("category_score").asDouble(),
                        root.path("semantic_score").asDouble(),
                        root.path("keyword_score").asDouble(),
                        root.path("total_score").asDouble(),
                        root.path("is_overlapping").asBoolean(),
                        root.path("is_critical_coordination").asBoolean()
                );
            }
        } catch (Exception e) {
            log.warn("[AI-Client] FastAPI calculate-overlap unreachable: {}. Using native air-gapped hybrid formula.", e.getMessage());
        }

        // Air-gapped internal calculation
        double pidScore = (pidA != null && pidA.equalsIgnoreCase(pidB)) ? 1.0 : 0.0;
        double catScore = (catA != null && catA.equalsIgnoreCase(catB)) ? 1.0 : 0.0;

        // Keyword Jaccard
        Set<String> setA = new HashSet<>(Arrays.asList(textA.toLowerCase().split("\\W+")));
        Set<String> setB = new HashSet<>(Arrays.asList(textB.toLowerCase().split("\\W+")));
        Set<String> intersect = new HashSet<>(setA);
        intersect.retainAll(setB);
        Set<String> union = new HashSet<>(setA);
        union.addAll(setB);
        double kwScore = union.isEmpty() ? 0.0 : (double) intersect.size() / union.size();

        // Semantic estimate
        double semanticScore = (pidScore * 0.4) + (catScore * 0.3) + (kwScore * 0.3);

        double total = (0.35 * pidScore) + (0.25 * catScore) + (0.25 * semanticScore) + (0.15 * kwScore);
        total = Math.round(total * 1000.0) / 1000.0;

        return new OverlapCalculationResult(
                pidScore, catScore, semanticScore, kwScore, total,
                total >= 0.65, total >= 0.72
        );
    }

    public record OverlapCalculationResult(
            double pidScore,
            double categoryScore,
            double semanticScore,
            double keywordScore,
            double totalScore,
            boolean isOverlapping,
            boolean isCriticalCoordination
    ) {}
}
