package gov.aicte.samanvay.service;

import gov.aicte.samanvay.model.BureauType;
import gov.aicte.samanvay.model.Complaint;
import gov.aicte.samanvay.model.ComplaintStatus;
import gov.aicte.samanvay.model.Institution;
import gov.aicte.samanvay.repository.ComplaintRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class LlmRagServiceTest {

    private ComplaintRepository complaintRepository;
    private AuditService auditService;
    private LlmRagService llmRagService;

    private Complaint sampleComplaint;

    @BeforeEach
    void setUp() {
        complaintRepository = Mockito.mock(ComplaintRepository.class);
        auditService = Mockito.mock(AuditService.class);
        llmRagService = new LlmRagService(complaintRepository, auditService);
        llmRagService.init();

        Institution inst = Institution.builder()
                .pid("INST-TEST-RAG")
                .name("Apex Engineering College")
                .district("Bengaluru")
                .state("Karnataka")
                .region("Southern")
                .build();

        sampleComplaint = Complaint.builder()
                .id("CMP-2026-PGRC-777")
                .institution(inst)
                .sourceBureau(BureauType.PGRC)
                .complainantType("Student")
                .category("Document Withholding")
                .subject("Retention of Original 10th and 12th Certificates")
                .complaintText("College administration withheld original marksheets and migration certificates.")
                .sanitizedText("College administration withheld original marksheets and migration certificates.")
                .status(ComplaintStatus.UNDER_SCRUTINY)
                .receivedDate(OffsetDateTime.now().minusDays(3))
                .slaDeadline(OffsetDateTime.now().plusDays(27))
                .build();
    }

    @Test
    void testRetrieveRelevantClauses_MatchesClause6_3() {
        var clauses = llmRagService.retrieveRelevantClauses("withholding original certificates and fee refund", "Document Withholding", 3);
        assertNotNull(clauses);
        assertFalse(clauses.isEmpty());
        boolean hasClause6_3 = clauses.stream().anyMatch(c -> c.getClauseNumber().contains("6.3"));
        assertTrue(hasClause6_3, "Should match Clause 6.3 on original certificate withholding");
    }

    @Test
    void testGenerateDraft_ShowCauseNotice_ContainsWatermarkAndCitations() {
        when(complaintRepository.findById("CMP-2026-PGRC-777")).thenReturn(Optional.of(sampleComplaint));

        LlmRagService.LlmDraftResponse resp = llmRagService.generateDraft("CMP-2026-PGRC-777", "SHOW_CAUSE");

        assertNotNull(resp);
        assertEquals("SHOW_CAUSE", resp.getDraftType());
        assertNotNull(resp.getContent());
        assertTrue(resp.getContent().contains("[AI DRAFT - OFFICER REVIEW REQUIRED]"));
        assertTrue(resp.getContent().contains("STATUTORY SHOW CAUSE NOTICE"));
        assertNotNull(resp.getCitedClauses());
        assertFalse(resp.getCitedClauses().isEmpty());
    }

    @Test
    void testAcceptDraft_AppendsAuditLog() {
        when(complaintRepository.findById("CMP-2026-PGRC-777")).thenReturn(Optional.of(sampleComplaint));

        boolean accepted = llmRagService.acceptDraft("CMP-2026-PGRC-777", "SUMMARY", "Summary Text Content", "officer.pgrc");

        assertTrue(accepted);
        verify(complaintRepository).save(sampleComplaint);
        verify(auditService).appendAuditLog(
                eq("CMP-2026-PGRC-777"), eq("officer.pgrc"), eq("LLM_DRAFT_ACCEPTED"), anyString(), anyString()
        );
    }
}
