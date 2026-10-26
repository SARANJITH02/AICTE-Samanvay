package gov.aicte.samanvay.service;

import gov.aicte.samanvay.model.*;
import gov.aicte.samanvay.repository.ComplaintRepository;
import gov.aicte.samanvay.repository.NotificationOutboxRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NotificationServiceTest {

    private NotificationOutboxRepository outboxRepository;
    private ComplaintRepository complaintRepository;
    private AuditService auditService;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        outboxRepository = Mockito.mock(NotificationOutboxRepository.class);
        complaintRepository = Mockito.mock(ComplaintRepository.class);
        auditService = Mockito.mock(AuditService.class);
        notificationService = new NotificationService(outboxRepository, complaintRepository, auditService);

        when(outboxRepository.save(any(NotificationOutbox.class))).thenAnswer(i -> {
            NotificationOutbox notif = i.getArgument(0);
            notif.setId(101L);
            return notif;
        });
    }

    @Test
    void testDispatchNotification_CreatesOutboxEntry() {
        NotificationOutbox notif = notificationService.dispatchNotification(
                "+91-9876543210", "SMS", "COMPLAINANT_OTP", "CMP-001", "OTP Alert", "Your OTP is 123456"
        );

        assertNotNull(notif);
        assertEquals("+91-9876543210", notif.getRecipient());
        assertEquals("DISPATCHED", notif.getStatus());
        verify(outboxRepository).save(any(NotificationOutbox.class));
    }

    @Test
    void testEvaluateSlaEscalations_100PercentBreach_EscalatesToApex() {
        Institution inst = Institution.builder().pid("PID-1").name("Tech College").build();

        // Expired SLA (breach)
        Complaint expired = Complaint.builder()
                .id("CMP-BREACH-001")
                .institution(inst)
                .sourceBureau(BureauType.PGRC)
                .status(ComplaintStatus.UNDER_SCRUTINY)
                .receivedDate(OffsetDateTime.now().minusDays(35))
                .slaDeadline(OffsetDateTime.now().minusDays(5))
                .isEscalated(false)
                .build();

        when(complaintRepository.findAll()).thenReturn(List.of(expired));

        int count = notificationService.evaluateSlaEscalations();

        assertEquals(1, count);
        assertTrue(expired.getIsEscalated());
        verify(complaintRepository).save(expired);
        verify(auditService).appendAuditLog(
                eq("CMP-BREACH-001"), eq("SYSTEM_SLA_ENGINE"), eq("SLA_BREACH_ESCALATION"), anyString(), anyString()
        );
        verify(outboxRepository, atLeastOnce()).save(any(NotificationOutbox.class));
    }
}
