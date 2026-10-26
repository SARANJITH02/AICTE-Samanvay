package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.model.BureauType;
import gov.aicte.samanvay.model.Complaint;
import gov.aicte.samanvay.model.ComplaintStatus;
import gov.aicte.samanvay.model.Institution;
import gov.aicte.samanvay.repository.ComplaintRepository;
import gov.aicte.samanvay.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class TrackingControllerTest {

    private ComplaintRepository complaintRepository;
    private NotificationService notificationService;
    private TrackingController trackingController;

    private Complaint mockComplaint;

    @BeforeEach
    void setUp() {
        complaintRepository = Mockito.mock(ComplaintRepository.class);
        notificationService = Mockito.mock(NotificationService.class);
        trackingController = new TrackingController(complaintRepository, notificationService);

        Institution inst = Institution.builder()
                .pid("INST-TEST-001")
                .name("National Institute of Technology")
                .region("Southern")
                .build();

        mockComplaint = Complaint.builder()
                .id("CMP-2026-PGRC-999")
                .institution(inst)
                .sourceBureau(BureauType.PGRC)
                .complainantType("Student")
                .category("Fee Dispute")
                .subject("Retention of B.Tech 1st Year Caution Deposit")
                .complaintText("Institution refuses to disburse caution deposit of Rs. 50,000.")
                .sanitizedText("Institution refuses to disburse caution deposit.")
                .status(ComplaintStatus.UNDER_SCRUTINY)
                .receivedDate(OffsetDateTime.now().minusDays(5))
                .slaDeadline(OffsetDateTime.now().plusDays(25))
                .build();
    }

    @Test
    void testRequestOtp_Success() {
        when(complaintRepository.findById("CMP-2026-PGRC-999")).thenReturn(Optional.of(mockComplaint));

        ResponseEntity<Map<String, Object>> resp = trackingController.requestOtp(
                Map.of("caseId", "CMP-2026-PGRC-999", "mobileNumber", "9876543210")
        );

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertTrue((Boolean) resp.getBody().get("success"));
        assertNotNull(resp.getBody().get("simulatedOtp"));
        verify(notificationService, atLeastOnce()).dispatchNotification(
                eq("9876543210"), eq("SMS"), eq("COMPLAINANT_OTP"), eq("CMP-2026-PGRC-999"), anyString(), anyString()
        );
    }

    @Test
    void testRequestOtp_CaseNotFound() {
        when(complaintRepository.findById("CMP-INVALID")).thenReturn(Optional.empty());

        ResponseEntity<Map<String, Object>> resp = trackingController.requestOtp(
                Map.of("caseId", "CMP-INVALID", "mobileNumber", "9876543210")
        );

        assertEquals(HttpStatus.NOT_FOUND, resp.getStatusCode());
    }

    @Test
    void testVerifyOtp_BypassCode_ReturnsSanitizedTimeline() {
        when(complaintRepository.findById("CMP-2026-PGRC-999")).thenReturn(Optional.of(mockComplaint));

        ResponseEntity<?> resp = trackingController.verifyOtpAndGetTimeline(
                Map.of("caseId", "CMP-2026-PGRC-999", "otp", "123456")
        );

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertTrue(resp.getBody() instanceof TrackingController.PublicCaseTimelineDto);
        TrackingController.PublicCaseTimelineDto dto = (TrackingController.PublicCaseTimelineDto) resp.getBody();
        assertEquals("CMP-2026-PGRC-999", dto.getCaseId());
        assertEquals("National Institute of Technology", dto.getInstitutionName());
        assertNotNull(dto.getMilestones());
        assertFalse(dto.getMilestones().isEmpty());
    }

    @Test
    void testVerifyOtp_InvalidCode_Fails() {
        ResponseEntity<?> resp = trackingController.verifyOtpAndGetTimeline(
                Map.of("caseId", "CMP-2026-PGRC-999", "otp", "999999")
        );

        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }
}
