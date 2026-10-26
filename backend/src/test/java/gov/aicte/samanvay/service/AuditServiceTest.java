package gov.aicte.samanvay.service;

import gov.aicte.samanvay.dto.AuditVerificationDto;
import gov.aicte.samanvay.model.AuditLog;
import gov.aicte.samanvay.repository.AuditCheckpointRepository;
import gov.aicte.samanvay.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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

    @Mock
    private AuditCheckpointRepository auditCheckpointRepository;

    private OfficerCryptoService officerCryptoService;
    private AuditService auditService;

    private static final String GENESIS_PREV_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

    @BeforeEach
    void setUp() {
        officerCryptoService = new OfficerCryptoService();
        auditService = new AuditService(auditLogRepository, auditCheckpointRepository, officerCryptoService);
    }

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

        String hash1 = AuditService.computeSha256(raw1);
        String hash2 = AuditService.computeSha256(raw2);

        assertEquals(hash1, hash2);
        assertEquals(64, hash1.length(), "SHA-256 hash must be 64 hexadecimal characters");
    }

    @Test
    void testEd25519SignatureAndVerification() {
        String officerId = "officer.pgrc";
        String blockHash = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

        String sig = officerCryptoService.signAsOfficer(officerId, blockHash);
        String pubKey = officerCryptoService.getOfficerPublicKeyBase64(officerId);

        assertNotNull(sig);
        assertNotNull(pubKey);
        assertTrue(officerCryptoService.verifySignature(pubKey, blockHash, sig), "Valid Ed25519 signature must verify");

        // Verify that altering block hash invalidates signature
        String tamperedHash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
        assertFalse(officerCryptoService.verifySignature(pubKey, tamperedHash, sig), "Tampered hash must fail signature verification");
    }

    @Test
    void testMerkleRootCalculation() {
        List<String> hashes = List.of(
                "1111111111111111111111111111111111111111111111111111111111111111",
                "2222222222222222222222222222222222222222222222222222222222222222",
                "3333333333333333333333333333333333333333333333333333333333333333"
        );
        String root1 = AuditService.computeMerkleRoot(hashes);
        String root2 = AuditService.computeMerkleRoot(hashes);

        assertNotNull(root1);
        assertEquals(64, root1.length());
        assertEquals(root1, root2, "Merkle root calculation must be deterministic");
    }

    @Test
    void testVerifyValidChainWithEd25519Signatures() {
        String caseId = "CMP-TEST-001";
        String raw1 = AuditService.buildRawDataString(GENESIS_PREV_HASH, caseId, 1L, "OFF-1", "INGESTION", "Created", "{}");
        String hash1 = AuditService.computeSha256(raw1);
        String sig1 = officerCryptoService.signAsOfficer("OFF-1", hash1);
        String pub1 = officerCryptoService.getOfficerPublicKeyBase64("OFF-1");

        String raw2 = AuditService.buildRawDataString(hash1, caseId, 2L, "OFF-2", "ASSIGNED", "Assigned officer", "{}");
        String hash2 = AuditService.computeSha256(raw2);
        String sig2 = officerCryptoService.signAsOfficer("OFF-2", hash2);
        String pub2 = officerCryptoService.getOfficerPublicKeyBase64("OFF-2");

        AuditLog log1 = AuditLog.builder()
                .caseId(caseId)
                .sequenceNum(1L)
                .officerId("OFF-1")
                .action("INGESTION")
                .remarks("Created")
                .payloadSnapshot("{}")
                .prevHash(GENESIS_PREV_HASH)
                .currentHash(hash1)
                .officerSignature(sig1)
                .officerPublicKey(pub1)
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
                .officerSignature(sig2)
                .officerPublicKey(pub2)
                .timestamp(OffsetDateTime.now())
                .build();

        when(auditLogRepository.findByCaseIdOrderBySequenceNumAsc(caseId)).thenReturn(List.of(log1, log2));

        AuditVerificationDto result = auditService.verifyChain(caseId);
        assertTrue(result.isValid(), "Intact chain with valid Ed25519 signatures must pass verification");
        assertEquals(2, result.getTotalBlocks());
        assertNull(result.getBrokenAtSeq());
        assertTrue(result.getVerificationDetails().get(0).isSignatureValid());
        assertTrue(result.getVerificationDetails().get(1).isSignatureValid());
    }

    @Test
    void testVerifyTamperedChainFails() {
        String caseId = "CMP-TAMPER-001";
        String raw1 = AuditService.buildRawDataString(GENESIS_PREV_HASH, caseId, 1L, "OFF-1", "INGESTION", "Created", "{}");
        String hash1 = AuditService.computeSha256(raw1);

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
