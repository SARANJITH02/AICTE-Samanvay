package gov.aicte.samanvay.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * High-Assurance Cryptographic Service implementing Ed25519 Digital Signatures
 * for per-officer non-repudiation and Apex Witness Checkpoint Anchoring.
 * Native RFC 8032 EdDSA implementation via standard Java Security.
 */
@Service
@Slf4j
public class OfficerCryptoService {

    private static final String ALGORITHM = "Ed25519";
    private final Map<String, KeyPair> officerKeyStore = new ConcurrentHashMap<>();
    private final KeyPair witnessKeyPair;

    public OfficerCryptoService() {
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance(ALGORITHM);
            // Pre-seed known officer keys deterministically or on demand
            this.witnessKeyPair = kpg.generateKeyPair();
            log.info("[CRYPTO] Ed25519 Cryptographic Service initialized. National Witness Key active: {}",
                    getPublicKeyBase64(witnessKeyPair.getPublic()).substring(0, 16) + "...");
        } catch (NoSuchAlgorithmException e) {
            log.error("[CRYPTO] Fatal: Ed25519 algorithm not available in this JDK runtime: {}", e.getMessage());
            throw new IllegalStateException("Ed25519 algorithm required for high-assurance audit chain", e);
        }
    }

    /**
     * Retrieves or deterministically generates the Ed25519 KeyPair for a given officer.
     */
    public synchronized KeyPair getOrCreateOfficerKeyPair(String officerId) {
        String cleanId = (officerId != null && !officerId.isBlank()) ? officerId.trim().toLowerCase() : "officer.system";
        return officerKeyStore.computeIfAbsent(cleanId, id -> {
            try {
                // Use deterministic PRNG seeded with officer identity + salt for air-gapped continuity
                SecureRandom rng = SecureRandom.getInstance("SHA1PRNG");
                byte[] seed = ("AICTE_SAMANVAY_ED25519_STAMP_2026_" + id).getBytes(StandardCharsets.UTF_8);
                rng.setSeed(seed);

                KeyPairGenerator kpg = KeyPairGenerator.getInstance(ALGORITHM);
                kpg.initialize(new java.security.spec.NamedParameterSpec(ALGORITHM), rng);
                KeyPair kp = kpg.generateKeyPair();
                log.info("[CRYPTO] Generated Ed25519 keypair for officer: {} [Pub: {}...]",
                        id, getPublicKeyBase64(kp.getPublic()).substring(0, 16));
                return kp;
            } catch (Exception e) {
                log.error("[CRYPTO] Error generating key for {}: {}", id, e.getMessage());
                try {
                    return KeyPairGenerator.getInstance(ALGORITHM).generateKeyPair();
                } catch (NoSuchAlgorithmException ex) {
                    throw new RuntimeException(ex);
                }
            }
        });
    }

    /**
     * Signs data using the designated officer's Ed25519 private key.
     * @return Base64 encoded digital signature
     */
    public String signAsOfficer(String officerId, String data) {
        try {
            KeyPair kp = getOrCreateOfficerKeyPair(officerId);
            Signature sig = Signature.getInstance(ALGORITHM);
            sig.initSign(kp.getPrivate());
            sig.update(data.getBytes(StandardCharsets.UTF_8));
            byte[] signatureBytes = sig.sign();
            return Base64.getEncoder().encodeToString(signatureBytes);
        } catch (Exception e) {
            log.error("[CRYPTO] Failed to sign data for officer {}: {}", officerId, e.getMessage());
            throw new RuntimeException("Digital signature failed", e);
        }
    }

    /**
     * Verifies an Ed25519 digital signature against a Base64-encoded public key.
     */
    public boolean verifySignature(String publicKeyBase64, String data, String signatureBase64) {
        if (publicKeyBase64 == null || signatureBase64 == null || data == null) {
            return false;
        }
        try {
            byte[] pubBytes = Base64.getDecoder().decode(publicKeyBase64.trim());
            byte[] sigBytes = Base64.getDecoder().decode(signatureBase64.trim());

            KeyFactory kf = KeyFactory.getInstance(ALGORITHM);
            PublicKey pubKey = kf.generatePublic(new X509EncodedKeySpec(pubBytes));

            Signature sig = Signature.getInstance(ALGORITHM);
            sig.initVerify(pubKey);
            sig.update(data.getBytes(StandardCharsets.UTF_8));
            return sig.verify(sigBytes);
        } catch (Exception e) {
            log.warn("[CRYPTO] Signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Signs a periodic Merkle Checkpoint using the Apex National Witness Key.
     */
    public String signAsNationalWitness(String data) {
        try {
            Signature sig = Signature.getInstance(ALGORITHM);
            sig.initSign(witnessKeyPair.getPrivate());
            sig.update(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(sig.sign());
        } catch (Exception e) {
            log.error("[CRYPTO] Failed to sign witness checkpoint: {}", e.getMessage());
            throw new RuntimeException("Witness checkpoint signature failed", e);
        }
    }

    /**
     * Verifies the National Witness signature.
     */
    public boolean verifyWitnessSignature(String data, String signatureBase64) {
        return verifySignature(getWitnessPublicKeyBase64(), data, signatureBase64);
    }

    public String getOfficerPublicKeyBase64(String officerId) {
        return getPublicKeyBase64(getOrCreateOfficerKeyPair(officerId).getPublic());
    }

    public String getWitnessPublicKeyBase64() {
        return getPublicKeyBase64(witnessKeyPair.getPublic());
    }

    public static String getPublicKeyBase64(PublicKey pubKey) {
        return Base64.getEncoder().encodeToString(pubKey.getEncoded());
    }
}
