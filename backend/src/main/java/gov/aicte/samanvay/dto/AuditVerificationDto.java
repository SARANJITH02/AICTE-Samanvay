package gov.aicte.samanvay.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditVerificationDto {
    private String caseId;
    
    @JsonProperty("chain_valid")
    private boolean chainValid;
    
    @JsonProperty("is_valid")
    private boolean isValid;
    
    @JsonProperty("broken_at_seq")
    private Long brokenAtSeq;
    
    @JsonProperty("total_blocks")
    private int totalBlocks;
    
    @JsonProperty("genesis_hash")
    private String genesisHash;
    
    @JsonProperty("latest_hash")
    private String latestHash;

    @JsonProperty("checkpoint_count")
    private int checkpointCount;

    @JsonProperty("latest_checkpoint_id")
    private String latestCheckpointId;

    @JsonProperty("latest_merkle_root")
    private String latestMerkleRoot;

    @JsonProperty("witness_signature_valid")
    private boolean witnessSignatureValid;
    
    @JsonProperty("verification_details")
    private List<BlockVerificationDetail> verificationDetails;
    
    @JsonProperty("tamper_alert_message")
    private String tamperAlertMessage;

    @JsonProperty("chainValid")
    public boolean getChainValidCamel() {
        return chainValid;
    }

    @JsonProperty("isValid")
    public boolean getIsValidCamel() {
        return isValid;
    }

    @JsonProperty("totalBlocks")
    public int getTotalBlocksCamel() {
        return totalBlocks;
    }

    @JsonProperty("verificationDetails")
    public List<BlockVerificationDetail> getVerificationDetailsCamel() {
        return verificationDetails;
    }

    @JsonProperty("tamperAlertMessage")
    public String getTamperAlertMessageCamel() {
        return tamperAlertMessage;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BlockVerificationDetail {
        @JsonProperty("sequence_num")
        private Long sequenceNum;
        
        private String action;
        
        @JsonProperty("officer_id")
        private String officerId;
        
        @JsonProperty("recorded_prev_hash")
        private String recordedPrevHash;
        
        @JsonProperty("expected_prev_hash")
        private String expectedPrevHash;
        
        @JsonProperty("recorded_current_hash")
        private String recordedCurrentHash;
        
        @JsonProperty("recomputed_current_hash")
        private String recomputedCurrentHash;

        @JsonProperty("officer_signature")
        private String officerSignature;

        @JsonProperty("officer_public_key")
        private String officerPublicKey;

        @JsonProperty("signature_valid")
        private boolean signatureValid;

        @JsonProperty("checkpoint_status")
        private String checkpointStatus;
        
        @JsonProperty("block_valid")
        private boolean blockValid;
        
        private String timestamp;

        @JsonProperty("sequenceNum")
        public Long getSequenceNumCamel() { return sequenceNum; }

        @JsonProperty("blockValid")
        public boolean getBlockValidCamel() { return blockValid; }

        @JsonProperty("signatureValid")
        public boolean getSignatureValidCamel() { return signatureValid; }

        @JsonProperty("checkpointStatus")
        public String getCheckpointStatusCamel() { return checkpointStatus; }

        @JsonProperty("recordedPrevHash")
        public String getRecordedPrevHashCamel() { return recordedPrevHash; }

        @JsonProperty("expectedPrevHash")
        public String getExpectedPrevHashCamel() { return expectedPrevHash; }

        @JsonProperty("recordedCurrentHash")
        public String getRecordedCurrentHashCamel() { return recordedCurrentHash; }

        @JsonProperty("recomputedCurrentHash")
        public String getRecomputedCurrentHashCamel() { return recomputedCurrentHash; }
    }
}
