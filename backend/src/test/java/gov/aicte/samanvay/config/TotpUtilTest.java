package gov.aicte.samanvay.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TotpUtilTest {

    private TotpUtil totpUtil;

    @BeforeEach
    void setUp() {
        totpUtil = new TotpUtil();
    }

    @Test
    void testSecretGeneration() {
        String secret = totpUtil.generateSecret();
        assertNotNull(secret);
        assertEquals(16, secret.length());
        assertTrue(secret.matches("^[A-Z2-7]+$"), "Base32 secret must only contain A-Z and 2-7");
    }

    @Test
    void testCurrentCodeGenerationAndVerification() {
        String secret = "JBSWY3DPEHPK3PXP";
        String currentCode = totpUtil.getCurrentCode(secret);

        assertNotNull(currentCode);
        assertEquals(6, currentCode.length());
        assertTrue(currentCode.matches("^[0-9]{6}$"), "TOTP must be a 6-digit numeric string");

        boolean verified = totpUtil.verifyCode(secret, currentCode, false);
        assertTrue(verified, "Current TOTP code must pass verification");
    }

    @Test
    void testInvalidCodeRejected() {
        String secret = "JBSWY3DPEHPK3PXP";
        boolean verified = totpUtil.verifyCode(secret, "000000", false);
        // Unless 000000 is coincidentally the current code (1 in a million chance)
        String currentCode = totpUtil.getCurrentCode(secret);
        if (!"000000".equals(currentCode)) {
            assertFalse(verified, "Invalid TOTP code must fail verification");
        }
    }

    @Test
    void testDemoBypassAcceptedOnlyWhenEnabled() {
        String secret = "JBSWY3DPEHPK3PXP";
        assertTrue(totpUtil.verifyCode(secret, TotpUtil.DEMO_BYPASS_CODE, true),
                "Demo bypass code must be accepted when demoMode=true");

        // When demoMode=false, unless 123456 happens to be the active code, it should fail
        String currentCode = totpUtil.getCurrentCode(secret);
        if (!TotpUtil.DEMO_BYPASS_CODE.equals(currentCode)) {
            assertFalse(totpUtil.verifyCode(secret, TotpUtil.DEMO_BYPASS_CODE, false),
                    "Demo bypass code must be rejected when demoMode=false");
        }
    }

    @Test
    void testBase32Roundtrip() {
        byte[] original = "HelloAirGapped!".getBytes();
        String encoded = TotpUtil.encodeBase32(original);
        byte[] decoded = TotpUtil.decodeBase32(encoded);
        assertArrayEquals(original, decoded, "Base32 encoding and decoding must be lossless");
    }
}
