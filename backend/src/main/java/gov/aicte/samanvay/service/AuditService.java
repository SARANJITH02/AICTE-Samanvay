package gov.aicte.samanvay.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import gov.aicte.samanvay.dto.AuditVerificationDto;
import gov.aicte.samanvay.model.AuditLog;
import gov.aicte.samanvay.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private static final String GENESIS_PREV_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /**
     * Standardized deterministic canonical serialization across backend and frontend:
     * raw_data = prev_hash + ":" + case_id + ":" + sequence_num + ":" + officer_id + ":" + action + ":" + remarks + ":" + canonical_json(payload_snapshot)
     */
    public static String buildRawDataString(String prevHash, String caseId, long sequenceNum,
                                            String officerId, String action, String remarks, String payloadJson) {
        String cleanPrevHash = (sequenceNum == 1L) ? GENESIS_PREV_HASH : (prevHash != null ? prevHash.trim() : GENESIS_PREV_HASH);
        String cleanRemarks = (remarks != null) ? remarks.trim() : "";
        String cleanPayload = canonicalJson(payloadJson);
        return cleanPrevHash + ":" + caseId.trim() + ":" + sequenceNum + ":" + officerId.trim() + ":" + action.trim() + ":" + cleanRemarks + ":" + cleanPayload;
    }

    /**
     * Normalizes and sorts keys of JSON objects for deterministic hashing.
     */
    public static String canonicalJson(String jsonString) {
        if (jsonString == null || jsonString.trim().isEmpty() || "null".equalsIgnoreCase(jsonString.trim())) {
            return "{}";
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(jsonString);
            TreeMap<String, Object> sortedMap = mapper.convertValue(node, new TypeReference<TreeMap<String, Object>>() {});
            return mapper.writeValueAsString(sortedMap);
        } catch (Exception e) {
            return "{}";
        }
    }

    private static Map<String, Object> toSortedMap(JsonNode node) {
        if (!node.isObject()) {
            return Collections.emptyMap();
        }
        Map<String, Object> sorted = new TreeMap<>();
        Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            JsonNode val = entry.getValue();
            if (val.isObject()) {
                sorted.put(entry.getKey(), toSortedMap(val));
            } else if (val.isNumber()) {
                sorted.put(entry.getKey(), val.numberValue());
            } else if (val.isBoolean()) {
                sorted.put(entry.getKey(), val.booleanValue());
            } else if (val.isNull()) {
                sorted.put(entry.getKey(), null);
            } else {
                sorted.put(entry.getKey(), val.asText());
            }
        }
        return sorted;
    }

    /**
     * Acquires a row-level pessimistic write lock on the latest audit log for the case,
     * deterministically computes the SHA-256 cryptographic hash, and appends the new block.
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public AuditLog appendAuditLog(String caseId, String officerId, String action, String remarks, String payloadJson) {
        Optional<AuditLog> latestLogOpt = auditLogRepository.findLatestLogWithPessimisticLock(caseId);

        long sequenceNum;
        String prevHash;

        if (latestLogOpt.isPresent()) {
            AuditLog latestLog = latestLogOpt.get();
            sequenceNum = latestLog.getSequenceNum() + 1;
            prevHash = latestLog.getCurrentHash();
        } else {
            sequenceNum = 1L;
            prevHash = GENESIS_PREV_HASH;
        }

        String rawData = buildRawDataString(prevHash, caseId, sequenceNum, officerId, action, remarks, payloadJson);
        String currentHash = computeSha256(rawData);

        AuditLog newLog = AuditLog.builder()
                .caseId(caseId)
                .sequenceNum(sequenceNum)
                .officerId(officerId)
                .action(action)
                .remarks(remarks != null ? remarks.trim() : "")
                .payloadSnapshot(payloadJson != null ? payloadJson : "{}")
                .prevHash(prevHash)
                .currentHash(currentHash)
                .timestamp(OffsetDateTime.now())
                .build();

        AuditLog saved = auditLogRepository.save(newLog);
        log.info("[AUDIT] Appended cryptographic block #{} for case {} with hash {}", sequenceNum, caseId, currentHash);
        return saved;
    }

    /**
     * Validates the cryptographic integrity of the audit chain from genesis to the latest block.
     * Enforces strict sequenceNum ASC integer order.
     */
    @Transactional(readOnly = true)
    public AuditVerificationDto verifyChain(String caseId) {
        List<AuditLog> logs = auditLogRepository.findByCaseIdOrderBySequenceNumAsc(caseId);

        if (logs.isEmpty()) {
            return AuditVerificationDto.builder()
                    .caseId(caseId)
                    .chainValid(true)
                    .isValid(true)
                    .brokenAtSeq(null)
                    .totalBlocks(0)
                    .genesisHash(GENESIS_PREV_HASH)
                    .latestHash(GENESIS_PREV_HASH)
                    .verificationDetails(new ArrayList<>())
                    .tamperAlertMessage(null)
                    .build();
        }

        // Enforce strict numerical integer ordering
        logs.sort(Comparator.comparingLong(AuditLog::getSequenceNum));

        List<AuditVerificationDto.BlockVerificationDetail> details = new ArrayList<>();
        boolean chainValid = true;
        Long brokenAtSeq = null;
        String expectedPrevHash = GENESIS_PREV_HASH;
        String tamperAlert = null;

        for (AuditLog logItem : logs) {
            // For Genesis (Seq 1), prev_hash must be exactly 64 zeroes
            if (logItem.getSequenceNum() == 1L) {
                expectedPrevHash = GENESIS_PREV_HASH;
            }

            String rawData = buildRawDataString(
                    logItem.getPrevHash(),
                    logItem.getCaseId(),
                    logItem.getSequenceNum(),
                    logItem.getOfficerId(),
                    logItem.getAction(),
                    logItem.getRemarks(),
                    logItem.getPayloadSnapshot()
            );
            String recomputedHash = computeSha256(rawData);

            boolean prevHashMatches = logItem.getPrevHash().equalsIgnoreCase(expectedPrevHash);
            boolean currentHashMatches = logItem.getCurrentHash().equalsIgnoreCase(recomputedHash);
            boolean blockValid = prevHashMatches && currentHashMatches;

            if (!blockValid) {
                chainValid = false;
                if (brokenAtSeq == null) {
                    brokenAtSeq = logItem.getSequenceNum();
                    if (!prevHashMatches) {
                        tamperAlert = String.format("Broken Link at Block #%d: expected prev_hash %s but found %s",
                                logItem.getSequenceNum(), expectedPrevHash, logItem.getPrevHash());
                    } else {
                        tamperAlert = String.format("Tampered Data at Block #%d: recomputed hash %s != recorded %s",
                                logItem.getSequenceNum(), recomputedHash, logItem.getCurrentHash());
                    }
                }
            }

            details.add(AuditVerificationDto.BlockVerificationDetail.builder()
                    .sequenceNum(logItem.getSequenceNum())
                    .action(logItem.getAction())
                    .officerId(logItem.getOfficerId())
                    .recordedPrevHash(logItem.getPrevHash())
                    .expectedPrevHash(expectedPrevHash)
                    .recordedCurrentHash(logItem.getCurrentHash())
                    .recomputedCurrentHash(recomputedHash)
                    .blockValid(blockValid)
                    .timestamp(logItem.getTimestamp().toString())
                    .build());

            expectedPrevHash = logItem.getCurrentHash();
        }

        return AuditVerificationDto.builder()
                .caseId(caseId)
                .chainValid(chainValid)
                .isValid(chainValid)
                .brokenAtSeq(brokenAtSeq)
                .totalBlocks(logs.size())
                .genesisHash(logs.get(0).getCurrentHash())
                .latestHash(logs.get(logs.size() - 1).getCurrentHash())
                .verificationDetails(details)
                .tamperAlertMessage(tamperAlert)
                .build();
    }

    public static String computeSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * encodedhash.length);
            for (byte b : encodedhash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
