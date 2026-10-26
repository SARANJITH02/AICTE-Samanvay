package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.config.JwtTokenProvider;
import gov.aicte.samanvay.config.TotpUtil;
import gov.aicte.samanvay.dto.AuthRequestDto;
import gov.aicte.samanvay.dto.AuthResponseDto;
import gov.aicte.samanvay.model.User;
import gov.aicte.samanvay.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TotpUtil totpUtil;

    @Value("${app.demo-mode:true}")
    private boolean demoMode;

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequestDto request) {
        // 1. Check if quick persona switch is used under DEMO_MODE
        if (demoMode && request.getPersona() != null && !request.getPersona().isBlank() && (request.getPassword() == null || request.getPassword().isBlank())) {
            return handleDemoPersonaLogin(request);
        }

        // 2. Strict Credential-Based Authentication (Production Path)
        String username = request.getUsername() != null ? request.getUsername().trim() : "";
        String rawPassword = request.getPassword() != null ? request.getPassword() : "";

        if (username.isBlank() || rawPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required."));
        }

        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username);
        if (userOpt.isEmpty()) {
            log.warn("[AUTH] Login failed: User '{}' not found", username);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid username or password."));
        }

        User user = userOpt.get();

        // 3. Account Lockout Check
        if (user.isAccountLocked()) {
            log.warn("[AUTH] Blocked login for locked user '{}' until {}", username, user.getLockedUntil());
            return ResponseEntity.status(HttpStatus.LOCKED).body(Map.of(
                    "error", "Account is temporarily locked due to 5 consecutive failed attempts. Please retry after: " + user.getLockedUntil(),
                    "lockedUntil", user.getLockedUntil().toString()
            ));
        }

        // 4. BCrypt Password Verification
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            int attempts = user.getFailedAttempts() + 1;
            user.setFailedAttempts(attempts);
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                user.setLockedUntil(OffsetDateTime.now().plusMinutes(LOCKOUT_MINUTES));
                userRepository.save(user);
                log.error("[AUTH] Account '{}' LOCKED for {} minutes after {} failed attempts", username, LOCKOUT_MINUTES, attempts);
                return ResponseEntity.status(HttpStatus.LOCKED).body(Map.of(
                        "error", "Account has been locked for 15 minutes due to 5 consecutive failed authentication attempts."
                ));
            }
            userRepository.save(user);
            log.warn("[AUTH] Password mismatch for user '{}'. Failed attempts: {}/{}", username, attempts, MAX_FAILED_ATTEMPTS);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", String.format("Invalid username or password. %d attempts remaining before account lockout.", MAX_FAILED_ATTEMPTS - attempts)
            ));
        }

        // 5. TOTP MFA Verification (Air-Gapped RFC 6238)
        if (user.isTotpEnabled()) {
            String totpCode = request.getTotpCode();
            if (totpCode == null || totpCode.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "error", "TOTP MFA code required for officer authentication.",
                        "totpRequired", true
                ));
            }

            boolean validTotp = totpUtil.verifyCode(user.getTotpSecret(), totpCode, demoMode);
            if (!validTotp) {
                log.warn("[AUTH] Invalid TOTP code '{}' provided for user '{}'", totpCode, username);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "error", "Invalid 6-digit TOTP authenticator code.",
                        "totpRequired", true
                ));
            }
        }

        // 6. Reset failed attempts on success
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        // 7. Issue short-lived access token + refresh token
        String accessToken = jwtTokenProvider.generateAccessToken(user.getUsername(), user.getRole(), user.getBureau(), user.getRegion());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getUsername());

        log.info("[AUTH] Successful enterprise login for user '{}' [{}]", username, user.getRole());

        return ResponseEntity.ok(AuthResponseDto.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole())
                .bureau(user.getBureau())
                .region(user.getRegion())
                .expiresInMs(jwtTokenProvider.getAccessTokenExpirationMs())
                .totpRequired(false)
                .build());
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        if (refreshToken == null || !jwtTokenProvider.validateRefreshToken(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid or expired refresh token."));
        }

        String username = jwtTokenProvider.getUsernameFromToken(refreshToken);
        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username);
        if (userOpt.isEmpty() || !userOpt.get().isActive()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User account inactive or not found."));
        }

        User user = userOpt.get();
        String newAccessToken = jwtTokenProvider.generateAccessToken(user.getUsername(), user.getRole(), user.getBureau(), user.getRegion());

        return ResponseEntity.ok(Map.of(
                "token", newAccessToken,
                "tokenType", "Bearer",
                "expiresInMs", jwtTokenProvider.getAccessTokenExpirationMs()
        ));
    }

    /**
     * Demo Helper: Returns live TOTP code for presentation evaluation without phone app.
     */
    @GetMapping("/current-totp")
    public ResponseEntity<?> getCurrentTotp(@RequestParam String username) {
        if (!demoMode) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "TOTP inspector disabled in production mode."));
        }
        return userRepository.findByUsernameIgnoreCase(username)
                .map(u -> {
                    String code = totpUtil.getCurrentCode(u.getTotpSecret());
                    return ResponseEntity.ok(Map.of(
                            "username", u.getUsername(),
                            "currentTotpCode", code,
                            "demoBypassCode", TotpUtil.DEMO_BYPASS_CODE,
                            "timeStepSeconds", 30
                    ));
                })
                .orElseGet(() -> ResponseEntity.badRequest().body(Map.of("error", "User not found.")));
    }

    private ResponseEntity<AuthResponseDto> handleDemoPersonaLogin(AuthRequestDto request) {
        String persona = request.getPersona().toUpperCase();
        String targetUsername;
        switch (persona) {
            case "PGRC_OFFICER" -> targetUsername = "officer.pgrc";
            case "REGULATION_OFFICER" -> targetUsername = "officer.regulation";
            case "REGIONAL_OFFICER" -> targetUsername = "officer.south";
            case "INSTITUTION_NODAL" -> targetUsername = "nodal.inst";
            default -> targetUsername = "admin.apex";
        }

        User user = userRepository.findByUsernameIgnoreCase(targetUsername)
                .orElseGet(() -> User.builder()
                        .username(targetUsername)
                        .fullName("Officer " + persona)
                        .role("ROLE_" + persona)
                        .bureau(persona.contains("REGIONAL") ? "REGIONAL_OFFICE" : persona)
                        .region("All Regions")
                        .build());

        String accessToken = jwtTokenProvider.generateAccessToken(user.getUsername(), user.getRole(), user.getBureau(), user.getRegion());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getUsername());

        return ResponseEntity.ok(AuthResponseDto.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole())
                .bureau(user.getBureau())
                .region(user.getRegion())
                .expiresInMs(jwtTokenProvider.getAccessTokenExpirationMs())
                .totpRequired(false)
                .build());
    }
}
