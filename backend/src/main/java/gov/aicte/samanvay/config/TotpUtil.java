package gov.aicte.samanvay.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;

/**
 * Air-gapped RFC 6238 Time-Based One-Time Password (TOTP) Generator & Verifier.
 * Operates completely offline with 30-second time steps and HMAC-SHA1.
 */
@Component
@Slf4j
public class TotpUtil {

    private static final int TIME_STEP_SECONDS = 30;
    private static final int DIGITS = 6;
    private static final int MODULUS = 1_000_000;
    private static final String HMAC_ALGO = "HmacSHA1";
    private static final String BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    public static final String DEMO_BYPASS_CODE = "123456";

    /**
     * Generates a 16-character Base32 TOTP secret key for an officer.
     */
    public String generateSecret() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[10];
        random.nextBytes(bytes);
        return encodeBase32(bytes);
    }

    /**
     * Computes the current 6-digit TOTP code for a given Base32 secret.
     */
    public String getCurrentCode(String base32Secret) {
        long currentWindow = System.currentTimeMillis() / 1000L / TIME_STEP_SECONDS;
        return generateCodeForWindow(base32Secret, currentWindow);
    }

    /**
     * Validates a candidate TOTP code against the secret key.
     * Checks current window, previous window (-1), and next window (+1) to accommodate clock drift.
     */
    public boolean verifyCode(String base32Secret, String candidateCode, boolean allowDemoBypass) {
        if (candidateCode == null || candidateCode.trim().isEmpty()) {
            return false;
        }
        String cleanCode = candidateCode.trim();

        if (allowDemoBypass && DEMO_BYPASS_CODE.equals(cleanCode)) {
            log.info("[TOTP] Accepted demo master bypass code: {}", cleanCode);
            return true;
        }

        if (base32Secret == null || base32Secret.trim().isEmpty()) {
            return false;
        }

        long currentWindow = System.currentTimeMillis() / 1000L / TIME_STEP_SECONDS;

        // Check drift window [-1, 0, +1]
        for (long window = currentWindow - 1; window <= currentWindow + 1; window++) {
            String expected = generateCodeForWindow(base32Secret, window);
            if (expected != null && expected.equals(cleanCode)) {
                return true;
            }
        }

        log.warn("[TOTP] Code verification failed for candidate: {}", cleanCode);
        return false;
    }

    private String generateCodeForWindow(String base32Secret, long window) {
        try {
            byte[] key = decodeBase32(base32Secret);
            byte[] data = ByteBuffer.allocate(8).putLong(window).array();

            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(key, HMAC_ALGO));
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);

            int otp = binary % MODULUS;
            return String.format("%06d", otp);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            log.error("[TOTP] Error generating code: {}", e.getMessage());
            return null;
        }
    }

    public static String encodeBase32(byte[] data) {
        StringBuilder result = new StringBuilder();
        int buffer = 0;
        int next = 0;
        int bitsLeft = 0;
        while (next < data.length || bitsLeft > 0) {
            if (bitsLeft < 5) {
                if (next < data.length) {
                    buffer <<= 8;
                    buffer |= (data[next++] & 0xFF);
                    bitsLeft += 8;
                } else {
                    int pad = 5 - bitsLeft;
                    buffer <<= pad;
                    bitsLeft += pad;
                }
            }
            int index = 0x1F & (buffer >> (bitsLeft - 5));
            bitsLeft -= 5;
            result.append(BASE32_CHARS.charAt(index));
        }
        return result.toString();
    }

    public static byte[] decodeBase32(String base32) {
        String clean = base32.toUpperCase().replaceAll("[^A-Z2-7]", "");
        byte[] bytes = new byte[clean.length() * 5 / 8];
        int buffer = 0;
        int bitsLeft = 0;
        int count = 0;
        for (char c : clean.toCharArray()) {
            int val = BASE32_CHARS.indexOf(c);
            if (val < 0) continue;
            buffer <<= 5;
            buffer |= val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                bytes[count++] = (byte) ((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }
        return Arrays.copyOf(bytes, count);
    }
}
