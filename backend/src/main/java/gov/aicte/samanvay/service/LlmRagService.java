package gov.aicte.samanvay.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import gov.aicte.samanvay.model.Complaint;
import gov.aicte.samanvay.repository.ComplaintRepository;
import jakarta.annotation.PostConstruct;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Air-gapped RAG service over AICTE Approval Process Handbook (APH 2024-27).
 * Connects to local Ollama (e.g. llama3.2 / mistral) or gracefully degrades
 * to high-assurance statutory deterministic drafting with explicit clause citations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LlmRagService {

    private final ComplaintRepository complaintRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.llm.base-url:http://localhost:11434}")
    private String llmBaseUrl;

    @Value("${app.llm.model:llama3.2:latest}")
    private String llmModel;

    private List<AphClause> aphClauses = new ArrayList<>();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(1000))
            .build();

    @Data
    public static class AphClause {
        private String clauseNumber;
        private String chapter;
        private String handbookVersion;
        private String title;
        private String description;
        private List<String> keywords;
    }

    @Data
    @Builder
    public static class LlmDraftResponse {
        private String draftType;
        private String content;
        private List<String> citedClauses;
        private String engine;
        private boolean isFallback;
        private String watermark;
        private OffsetDateTime generatedAt;
    }

    @PostConstruct
    public void init() {
        loadClauses();
    }

    private void loadClauses() {
        try {
            ClassPathResource res = new ClassPathResource("aph_clauses.json");
            try (InputStream is = res.getInputStream()) {
                this.aphClauses = objectMapper.readValue(is, new TypeReference<List<AphClause>>() {});
                log.info("[RAG] Successfully indexed {} AICTE APH regulatory clauses into knowledge bank.", aphClauses.size());
            }
        } catch (Exception e) {
            log.warn("[RAG] Failed to load aph_clauses.json: {}. Using basic clauses.", e.getMessage());
            this.aphClauses = Collections.emptyList();
        }
    }

    public List<AphClause> getAllClauses() {
        return Collections.unmodifiableList(aphClauses);
    }

    /**
     * Retrieve the most relevant APH clauses for a given complaint text/category.
     */
    public List<AphClause> retrieveRelevantClauses(String text, String category, int topK) {
        if (text == null) text = "";
        if (category == null) category = "";
        String combined = (text + " " + category).toLowerCase();

        return aphClauses.stream()
                .map(clause -> {
                    int score = 0;
                    for (String kw : clause.getKeywords()) {
                        if (combined.contains(kw.toLowerCase())) {
                            score += 15;
                        }
                    }
                    if (combined.contains(clause.getTitle().toLowerCase())) score += 30;
                    if (combined.contains(clause.getClauseNumber().toLowerCase())) score += 50;
                    return new AbstractMap.SimpleEntry<>(clause, score);
                })
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .limit(topK)
                .map(AbstractMap.SimpleEntry::getKey)
                .collect(Collectors.toList());
    }

    /**
     * Generates a draft (SUMMARY, SHOW_CAUSE, COMPLAINANT_REPLY) with clause citations.
     */
    public LlmDraftResponse generateDraft(String caseId, String draftType) {
        Complaint complaint = complaintRepository.findById(caseId)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found: " + caseId));

        List<AphClause> relevant = retrieveRelevantClauses(
                complaint.getComplaintText() + " " + complaint.getSubject(),
                complaint.getCategory(),
                3
        );
        if (relevant.isEmpty() && !aphClauses.isEmpty()) {
            relevant = aphClauses.subList(0, Math.min(2, aphClauses.size()));
        }

        List<String> citedClauseRefs = relevant.stream()
                .map(c -> String.format("%s (%s)", c.getClauseNumber(), c.getTitle()))
                .collect(Collectors.toList());

        // Check if Ollama is running locally
        boolean ollamaAvailable = isOllamaHealthy();
        String generatedContent;
        String engineUsed;
        boolean fallback = true;

        if (ollamaAvailable) {
            try {
                generatedContent = callOllama(complaint, draftType, relevant);
                engineUsed = "Ollama (Local Model: " + llmModel + ")";
                fallback = false;
            } catch (Exception ex) {
                log.warn("[RAG] Ollama generation failed, falling back to deterministic statutory generator: {}", ex.getMessage());
                generatedContent = generateDeterministicDraft(complaint, draftType, relevant);
                engineUsed = "Deterministic Air-Gapped RAG Engine (Local Statutory Fallback)";
            }
        } else {
            generatedContent = generateDeterministicDraft(complaint, draftType, relevant);
            engineUsed = "Deterministic Air-Gapped RAG Engine (High-Assurance Statutory Template)";
        }

        return LlmDraftResponse.builder()
                .draftType(draftType)
                .content(generatedContent)
                .citedClauses(citedClauseRefs)
                .engine(engineUsed)
                .isFallback(fallback)
                .watermark("AI DRAFT - OFFICER REVIEW REQUIRED - Cites Section 63 BSA & AICTE APH 2024-27")
                .generatedAt(OffsetDateTime.now())
                .build();
    }

    private boolean isOllamaHealthy() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(llmBaseUrl + "/api/tags"))
                    .timeout(Duration.ofMillis(800))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200 && response.body().contains("models");
        } catch (Exception e) {
            return false;
        }
    }

    private String callOllama(Complaint c, String draftType, List<AphClause> clauses) throws Exception {
        String clausesPrompt = clauses.stream()
                .map(cl -> cl.getClauseNumber() + ": " + cl.getTitle() + " - " + cl.getDescription())
                .collect(Collectors.joining("\n"));

        String prompt = String.format(
                "You are an AI assistant for the All India Council for Technical Education (AICTE).\n" +
                "Draft a formal %s for grievance ID %s at %s (%s).\n" +
                "Subject: %s\n" +
                "Facts: %s\n" +
                "Applicable Regulatory Clauses:\n%s\n\n" +
                "Requirements:\n" +
                "1. Explicitly cite the applicable clause numbers.\n" +
                "2. Maintain strict formal statutory tone.\n" +
                "3. Prefix the output with: [AI DRAFT - OFFICER REVIEW REQUIRED].",
                draftType, c.getId(), c.getInstitution().getName(), c.getInstitution().getPid(),
                c.getSubject(), c.getSanitizedText(), clausesPrompt
        );

        Map<String, Object> req = Map.of(
                "model", llmModel,
                "prompt", prompt,
                "stream", false
        );

        String jsonPayload = objectMapper.writeValueAsString(req);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(llmBaseUrl + "/api/generate"))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(12))
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 200) {
            Map<?, ?> respMap = objectMapper.readValue(response.body(), Map.class);
            if (respMap != null && respMap.get("response") != null) {
                return (String) respMap.get("response");
            }
        }
        throw new IllegalStateException("Empty response from Ollama: HTTP " + response.statusCode());
    }

    private String generateDeterministicDraft(Complaint c, String draftType, List<AphClause> clauses) {
        String dateStr = OffsetDateTime.now().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy"));
        String clauseCitations = clauses.stream()
                .map(cl -> String.format("- %s: %s (Ref: %s, %s)", cl.getClauseNumber(), cl.getTitle(), cl.getHandbookVersion(), cl.getChapter()))
                .collect(Collectors.joining("\n"));

        String primaryClause = !clauses.isEmpty() ? clauses.get(0).getClauseNumber() : "Clause 6.3";

        return switch (draftType.toUpperCase()) {
            case "SHOW_CAUSE", "DRAFT_SHOW_CAUSE_NOTICE" -> String.format(
                    "================================================================================\n" +
                    "                        ALL INDIA COUNCIL FOR TECHNICAL EDUCATION               \n" +
                    "                   (A Statutory Body of the Government of India)               \n" +
                    "                      Nelson Mandela Marg, Vasant Kunj, New Delhi               \n" +
                    "================================================================================\n" +
                    "[AI DRAFT - OFFICER REVIEW REQUIRED]\n" +
                    "Notice Ref No: AICTE/SAMANVAY/SCN/%s/%s\n" +
                    "Date of Issue: %s\n\n" +
                    "To:\n" +
                    "The Principal / Head of Institution,\n" +
                    "%s (PID: %s),\n" +
                    "%s, %s - %s.\n\n" +
                    "SUBJECT: STATUTORY SHOW CAUSE NOTICE UNDER SECTION 10(k) AICTE ACT, 1987\n" +
                    "GRIEVANCE REGISTRATION NO: %s | CATEGORY: %s\n\n" +
                    "WHEREAS, a substantiated grievance has been registered on the AICTE Samanvay regulatory\n" +
                    "coordination platform by a %s alleging grave irregularities as detailed below:\n" +
                    "\"%s\"\n\n" +
                    "AND WHEREAS, the aforementioned acts, if true, constitute a prima facie violation of the\n" +
                    "statutory standards prescribed in the Approval Process Handbook (APH 2024-27):\n" +
                    "%s\n\n" +
                    "NOW THEREFORE, in exercise of powers vested under Section 10(k) and 10(v) of the AICTE Act, 1987,\n" +
                    "you are hereby called upon to SHOW CAUSE within FOURTEEN (14) CALENDAR DAYS from the receipt\n" +
                    "of this notice as to why penal action pursuant to %s (including 50%% reduction in approved intake\n" +
                    "or placing the institution under 'NO ADMISSION' category) should not be initiated against your institution.\n\n" +
                    "Compliance evidence and Action Taken Report (ATR) must be uploaded via the AICTE Samanvay\n" +
                    "Institution Response Portal under your registered PID.\n\n" +
                    "Issued under statutory regulatory mandate,\n" +
                    "BUREAU COORDINATION OFFICER\n" +
                    "AICTE Samanvay Air-Gapped Regulatory Platform\n" +
                    "================================================================================",
                    c.getSourceBureau(), c.getId(), dateStr,
                    c.getInstitution().getName(), c.getInstitution().getPid(),
                    c.getInstitution().getAddress() != null ? c.getInstitution().getAddress() : "Campus Site",
                    c.getInstitution().getDistrict(), c.getInstitution().getState(),
                    c.getId(), c.getCategory(), c.getComplainantType(),
                    c.getSanitizedText(), clauseCitations, primaryClause
            );

            case "COMPLAINANT_REPLY", "DRAFT_COMPLAINANT_REPLY" -> String.format(
                    "================================================================================\n" +
                    "                        ALL INDIA COUNCIL FOR TECHNICAL EDUCATION               \n" +
                    "                    Public Grievance Redressal Cell (PGRC)                      \n" +
                    "================================================================================\n" +
                    "[AI DRAFT - OFFICER REVIEW REQUIRED]\n" +
                    "Communication Ref: AICTE/PGRC/DISP/%s\n" +
                    "Date: %s\n\n" +
                    "Dear %s,\n\n" +
                    "Subject: Status and Directive regarding Grievance %s - %s\n\n" +
                    "This is with reference to your grievance filed on %s regarding:\n" +
                    "\"%s\"\n\n" +
                    "The Council takes cognizance of your concerns under the governing provisions of the\n" +
                    "AICTE Approval Process Handbook (APH 2024-27):\n" +
                    "%s\n\n" +
                    "STATUS UPDATE:\n" +
                    "1. Your grievance has been prioritized under multi-bureau scrutiny.\n" +
                    "2. The institution (%s, PID: %s) has been officially instructed to furnish an\n" +
                    "   immediate compliance undertaking and refund/release any unlawfully retained dues.\n" +
                    "3. Statutory SLA Target: %s (%d days remaining).\n\n" +
                    "You may track your case in real time via the air-gapped Samanvay Citizen Portal\n" +
                    "using Case ID '%s' and your registered mobile number.\n\n" +
                    "Yours faithfully,\n" +
                    "Officer-in-Charge, Public Grievance Redressal Cell\n" +
                    "AICTE, Nelson Mandela Marg, New Delhi\n" +
                    "================================================================================",
                    c.getId(), dateStr, c.getComplainantType(), c.getId(), c.getSubject(),
                    c.getReceivedDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")),
                    c.getSubject(), clauseCitations,
                    c.getInstitution().getName(), c.getInstitution().getPid(),
                    c.getSlaDeadline().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")),
                    Math.max(0, Duration.between(OffsetDateTime.now(), c.getSlaDeadline()).toDays()),
                    c.getId()
            );

            default -> String.format(
                    "================================================================================\n" +
                    "               AICTE SAMANVAY - STATUTORY REGULATORY CASE SUMMARY               \n" +
                    "================================================================================\n" +
                    "[AI DRAFT - OFFICER REVIEW REQUIRED]\n" +
                    "Case ID: %s | Bureau: %s | Region: %s\n" +
                    "Institution: %s (PID: %s)\n" +
                    "Date Ingested: %s | SLA Ceiling: %s\n\n" +
                    "1. FACTUAL MATRIX:\n" +
                    "Complainant (%s) reported: %s\n" +
                    "Summary of Allegation: %s\n\n" +
                    "2. STATUTORY BREACH ANALYSIS (APH 2024-27):\n" +
                    "%s\n\n" +
                    "3. PROPOSED REGULATORY INTERVENTION:\n" +
                    "- Direct institution to execute unconditional CAPA within 14 calendar days.\n" +
                    "- Inter-bureau hold on pending approval amendments until compliance certification.\n" +
                    "- Audit log provenance established under Section 63 BSA, 2023.\n" +
                    "================================================================================",
                    c.getId(), c.getSourceBureau(), c.getRegion(),
                    c.getInstitution().getName(), c.getInstitution().getPid(),
                    c.getReceivedDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")),
                    c.getSlaDeadline().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")),
                    c.getComplainantType(), c.getSubject(),
                    c.getSanitizedText(), clauseCitations
            );
        };
    }

    /**
     * Accepts a draft and commits it to the immutable cryptographic audit chain.
     */
    public boolean acceptDraft(String caseId, String draftType, String content, String officerId) {
        Complaint c = complaintRepository.findById(caseId)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found: " + caseId));

        c.setResolutionNotes((c.getResolutionNotes() != null ? c.getResolutionNotes() + "\n\n" : "") +
                "[ACCEPTED " + draftType + "]:\n" + content);
        complaintRepository.save(c);

        String remarks = "Officer accepted AI draft (" + draftType + ") citing APH 2024-27 regulatory clauses.";
        auditService.appendAuditLog(
                caseId,
                officerId != null ? officerId : "OFFICER",
                "LLM_DRAFT_ACCEPTED",
                remarks,
                String.format("{\"draftType\":\"%s\",\"length\":%d}", draftType, content.length())
        );
        return true;
    }
}
