package gov.aicte.samanvay.config;

import gov.aicte.samanvay.model.User;
import gov.aicte.samanvay.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Air-gapped database initializer ensuring all standard officer accounts
 * are pre-seeded with BCrypt hashes and TOTP keys on startup.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UserInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TotpUtil totpUtil;

    @Override
    public void run(String... args) {
        seedUserIfNotExists("admin.apex", "Admin@Samanvay2026!", "Dr. Ramesh Unnikrishnan (Advisor, Apex)",
                "ROLE_APEX_ADMIN", "APEX_HEADQUARTERS", "All Regions", "JBSWY3DPEHPK3PXP");

        seedUserIfNotExists("officer.pgrc", "Pgrc@Samanvay2026!", "Shri A. K. Sharma (PGRC Chief Officer)",
                "ROLE_PGRC_OFFICER", "PGRC", "All Regions", "JBSWY3DPEHPK3PXQ");

        seedUserIfNotExists("officer.regulation", "Reg@Samanvay2026!", "Prof. Rajive Kumar (Member Secretary, Regulation)",
                "ROLE_REGULATION_OFFICER", "REGULATION_BUREAU", "All Regions", "JBSWY3DPEHPK3PXR");

        seedUserIfNotExists("officer.south", "South@Samanvay2026!", "Dr. K. Sundararajan (Regional Officer - Southern)",
                "ROLE_REGIONAL_OFFICER", "REGIONAL_OFFICE", "Southern", "JBSWY3DPEHPK3PXS");

        seedUserIfNotExists("officer.north", "North@Samanvay2026!", "Dr. V. K. Mathur (Regional Officer - Northern)",
                "ROLE_REGIONAL_OFFICER", "REGIONAL_OFFICE", "Northern", "JBSWY3DPEHPK3PXT");

        seedUserIfNotExists("nodal.inst", "Nodal@Samanvay2026!", "Prof. S. Ranganathan (Registrar & Nodal Officer)",
                "ROLE_INSTITUTION_NODAL", "NODAL_INSTITUTION", "Southern", "JBSWY3DPEHPK3PXU", "INST-SOU-001");

        log.info("[AUTH] Verified standard air-gapped officer accounts and BCrypt security credentials.");
    }

    private void seedUserIfNotExists(String username, String rawPassword, String fullName,
                                     String role, String bureau, String region, String defaultTotpSecret) {
        seedUserIfNotExists(username, rawPassword, fullName, role, bureau, region, defaultTotpSecret, null);
    }

    private void seedUserIfNotExists(String username, String rawPassword, String fullName,
                                     String role, String bureau, String region, String defaultTotpSecret, String institutionPid) {
        if (userRepository.findByUsername(username).isEmpty()) {
            User user = User.builder()
                    .username(username)
                    .passwordHash(passwordEncoder.encode(rawPassword))
                    .fullName(fullName)
                    .role(role)
                    .bureau(bureau)
                    .region(region)
                    .institutionPid(institutionPid)
                    .totpSecret(defaultTotpSecret)
                    .totpEnabled(true)
                    .failedAttempts(0)
                    .lockedUntil(null)
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build();
            userRepository.save(user);
            log.info("[AUTH] Seeded user account: {} [{}]", username, role);
        }
    }
}
