package gov.aicte.samanvay.service;

import gov.aicte.samanvay.model.BureauType;
import gov.aicte.samanvay.model.Complaint;
import gov.aicte.samanvay.repository.ComplaintRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContradictionDetectionServiceTest {

    @Mock
    private ComplaintRepository complaintRepository;

    @InjectMocks
    private ContradictionDetectionService contradictionService;

    @Test
    void testExtractDirectivesWithNegation() {
        String negatedText = "Do not withhold the certificates of the student.";
        var result = contradictionService.extractDirectives(negatedText);
        // Negated directive should NOT be returned
        assertFalse(result.getKey().contains("STATUS_QUO_HOLD"), "Negated phrase should not extract as active directive");

        String affirmativeText = "Maintain status quo on caution money and withhold disbursement.";
        var affirmativeResult = contradictionService.extractDirectives(affirmativeText);
        assertTrue(affirmativeResult.getKey().contains("STATUS_QUO_HOLD"), "Affirmative phrase must extract directive");
    }

    @Test
    void testDetectContradictionRefundVsHold() {
        String pid = "1-10972411";
        Complaint c1 = Complaint.builder()
                .id("CMP-001")
                .sourceBureau(BureauType.PGRC)
                .subject("Caution deposit refund dispute")
                .resolutionNotes("Mandate immediate refund of caution deposit to student within 7 days.")
                .build();

        Complaint c2 = Complaint.builder()
                .id("CMP-002")
                .sourceBureau(BureauType.REGULATION_BUREAU)
                .subject("Financial audit pending")
                .resolutionNotes("Maintain status quo and withhold all disbursements pending bank guarantee.")
                .build();

        when(complaintRepository.findByInstitutionPid(pid)).thenReturn(List.of(c1, c2));

        var result = contradictionService.detectContradictions(pid);
        assertTrue(result.hasContradiction(), "Refund vs Hold across bureaus must flag contradiction");
        assertEquals("PGRC", result.contradictoryBureauA());
        assertEquals("REGULATION_BUREAU", result.contradictoryBureauB());
        assertNotNull(result.alertMessage());
    }

    @Test
    void testNoContradictionSameBureauOrHarmonious() {
        String pid = "1-10972411";
        Complaint c1 = Complaint.builder()
                .id("CMP-001")
                .sourceBureau(BureauType.PGRC)
                .subject("Hostel water facility")
                .resolutionNotes("Repair water coolers in hostel.")
                .build();

        Complaint c2 = Complaint.builder()
                .id("CMP-002")
                .sourceBureau(BureauType.REGIONAL_OFFICE)
                .subject("Library books stock")
                .resolutionNotes("Procure additional engineering titles.")
                .build();

        when(complaintRepository.findByInstitutionPid(pid)).thenReturn(List.of(c1, c2));

        var result = contradictionService.detectContradictions(pid);
        assertFalse(result.hasContradiction(), "Distinct non-conflicting directives must not flag contradiction");
    }
}
