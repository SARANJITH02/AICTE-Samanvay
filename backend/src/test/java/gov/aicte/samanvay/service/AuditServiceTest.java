package gov.aicte.samanvay.service;

import gov.aicte.samanvay.dto.AuditVerificationDto;
import gov.aicte.samanvay.model.AuditLog;
import gov.aicte.samanvay.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AuditService auditService;

    private static final String GENESIS_PREV_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

    @Test
    void testCanonicalJsonOrdering() {
        String json1 = "{\"bureau\":\"PGRC\",\"category\":\"Fee Dispute\"}";
        String json2 = "{\"category\":\"Fee Dispute\",\"bureau\":\"PGRC\"}";

        String canon1 = AuditService.canonicalJson(json1);
        String canon2 = AuditService.canonicalJson(json2);

        assertEquals(canon1, canon2, "Canonical JSON must sort keys alphabetically");
    }

    @Test
    void testSha256Determinism() {
        String raw1 = AuditService.buildRawDataString(GENESIS_PREV_HASH, "CMP-001", 1L, "OFFICER-1", "INGESTION", "Initial filing", "{}");
        String raw2 = AuditService.buildRawDataString(GENESIS_PREV_HASH, "CMP-001", 1L, "OFFICER-1", "INGESTION", "Initial filing", "{}");

        String hash1 = auditService.computeSha256(raw1);
        String hash2 = auditService.computeSha256(raw2);

        assertEquals(hash1, hash2);
        assertEquals(64, hash1.length(), "SHA-256 hash must be 64 hexadecimal characters");
    }

    @Test
    void testVerifyValidChain() {
        String caseId = "CMP-TEST-001";
        String raw1 = AuditService.buildRawDataString(GENESIS_PREV_HASH, caseId, 1L, "OFF-1", "INGESTION", "Created", "{}");
        String hash1 = auditService.computeSha256(raw1);

        String raw2 = AuditService.buildRawDataString(hash1, caseId, 2L, "OFF-2", "ASSIGNED", "Assigned officer", "{}");
        String hash2 = auditService.computeSha256(raw2);

        AuditLog log1 = AuditLog.builder()
                .caseId(caseId)
                .sequenceNum(1L)
                .officerId("OFF-1")
                .action("INGESTION")
                .remarks("Created")
                .payloadSnapshot("{}")
                .prevHash(GENESIS_PREV_HASH)
                .currentHash(hash1)
                .timestamp(OffsetDateTime.now().minusDays(1))
                .build();

        AuditLog log2 = AuditLog.builder()
                .caseId(caseId)
                .sequenceNum(2L)
                .officerId("OFF-2")
                .action("ASSIGNED")
                .remarks("Assigned officer")
                .payloadSnapshot("{}")
                .prevHash(hash1)
                .currentHash(hash2)
                .timestamp(OffsetDateTime.now())
                .build();

        when(auditLogRepository.findByCaseIdOrderBySequenceNumAsc(caseId)).thenReturn(List.of(log1, log2));

        AuditVerificationDto result = auditService.verifyChain(caseId);
        assertTrue(result.isValid(), "Intact chain must pass verification");
        assertEquals(2, result.getTotalBlocks());
        assertNull(result.getBrokenAtSeq());
    }

    @Test
    void testVerifyTamperedChainFails() {
        String caseId = "CMP-TAMPER-001";
        String raw1 = AuditService.buildRawDataString(GENESIS_PREV_HASH, caseId, 1L, "OFF-1", "INGESTION", "Created", "{}");
        String hash1 = auditService.computeSha256(raw1);

        AuditLog log1 = AuditLog.builder()
                .caseId(caseId)
                .sequenceNum(1L)
                .officerId("OFF-1")
                .action("INGESTION")
                .remarks("TAMPERED REMARKS - MALICIOUS EDIT")
                .payloadSnapshot("{}")
                .prevHash(GENESIS_PREV_HASH)
                .currentHash(hash1) // Hash no longer matches tampered remarks!
                .timestamp(OffsetDateTime.now())
                .build();

        when(auditLogRepository.findByCaseIdOrderBySequenceNumAsc(caseId)).thenReturn(List.of(log1));

        AuditVerificationDto result = auditService.verifyChain(caseId);
        assertFalse(result.isValid(), "Tampered block must fail cryptographic verification");
        assertEquals(1L, result.getBrokenAtSeq());
        assertNotNull(result.getTamperAlertMessage());
    }
}
