package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.config.JwtTokenProvider;
import gov.aicte.samanvay.config.TotpUtil;
import gov.aicte.samanvay.dto.AuthRequestDto;
import gov.aicte.samanvay.dto.AuthResponseDto;
import gov.aicte.samanvay.model.User;
import gov.aicte.samanvay.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private JwtTokenProvider jwtTokenProvider;
    private TotpUtil totpUtil;
    private AuthController authController;

    private final String SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(SECRET, 900000, 604800000);
        totpUtil = new TotpUtil();
        authController = new AuthController(jwtTokenProvider, userRepository, passwordEncoder, totpUtil);
        ReflectionTestUtils.setField(authController, "demoMode", true);
    }

    @Test
    void testSuccessfulLogin() {
        User user = User.builder()
                .username("officer.pgrc")
                .passwordHash("$2a$10$hashed")
                .fullName("Shri A. K. Sharma")
                .role("ROLE_PGRC_OFFICER")
                .bureau("PGRC")
                .region("All Regions")
                .totpSecret("JBSWY3DPEHPK3PXP")
                .totpEnabled(true)
                .failedAttempts(0)
                .isActive(true)
                .build();

        when(userRepository.findByUsernameIgnoreCase("officer.pgrc")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Pgrc@Samanvay2026!", "$2a$10$hashed")).thenReturn(true);

        String validTotp = totpUtil.getCurrentCode("JBSWY3DPEHPK3PXP");
        AuthRequestDto req = AuthRequestDto.builder()
                .username("officer.pgrc")
                .password("Pgrc@Samanvay2026!")
                .totpCode(validTotp)
                .build();

        ResponseEntity<?> response = authController.login(req);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof AuthResponseDto);

        AuthResponseDto resDto = (AuthResponseDto) response.getBody();
        assertNotNull(resDto.getToken());
        assertNotNull(resDto.getRefreshToken());
        assertEquals("officer.pgrc", resDto.getUsername());
        assertEquals("ROLE_PGRC_OFFICER", resDto.getRole());
    }

    @Test
    void testInvalidPasswordIncrementsFailedAttempts() {
        User user = User.builder()
                .username("officer.pgrc")
                .passwordHash("$2a$10$hashed")
                .fullName("Officer")
                .role("ROLE_PGRC_OFFICER")
                .failedAttempts(2)
                .build();

        when(userRepository.findByUsernameIgnoreCase("officer.pgrc")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong_pwd", "$2a$10$hashed")).thenReturn(false);

        AuthRequestDto req = AuthRequestDto.builder()
                .username("officer.pgrc")
                .password("wrong_pwd")
                .build();

        ResponseEntity<?> response = authController.login(req);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(3, user.getFailedAttempts());
        verify(userRepository).save(user);
    }

    @Test
    void testFifthFailedAttemptLocksAccount() {
        User user = User.builder()
                .username("officer.pgrc")
                .passwordHash("$2a$10$hashed")
                .fullName("Officer")
                .role("ROLE_PGRC_OFFICER")
                .failedAttempts(4) // 5th will trigger lock
                .build();

        when(userRepository.findByUsernameIgnoreCase("officer.pgrc")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong_pwd", "$2a$10$hashed")).thenReturn(false);

        AuthRequestDto req = AuthRequestDto.builder()
                .username("officer.pgrc")
                .password("wrong_pwd")
                .build();

        ResponseEntity<?> response = authController.login(req);
        assertEquals(HttpStatus.LOCKED, response.getStatusCode());
        assertEquals(5, user.getFailedAttempts());
        assertNotNull(user.getLockedUntil());
        assertTrue(user.isAccountLocked());
        verify(userRepository).save(user);
    }

    @Test
    void testLockedAccountRejectsLogin() {
        User user = User.builder()
                .username("officer.pgrc")
                .passwordHash("$2a$10$hashed")
                .fullName("Officer")
                .role("ROLE_PGRC_OFFICER")
                .lockedUntil(OffsetDateTime.now().plusMinutes(10))
                .build();

        when(userRepository.findByUsernameIgnoreCase("officer.pgrc")).thenReturn(Optional.of(user));

        AuthRequestDto req = AuthRequestDto.builder()
                .username("officer.pgrc")
                .password("Pgrc@Samanvay2026!")
                .build();

        ResponseEntity<?> response = authController.login(req);
        assertEquals(HttpStatus.LOCKED, response.getStatusCode());
    }

    @Test
    void testRefreshToken() {
        User user = User.builder()
                .username("admin.apex")
                .role("ROLE_APEX_ADMIN")
                .bureau("APEX_HEADQUARTERS")
                .region("All Regions")
                .isActive(true)
                .build();

        String refreshToken = jwtTokenProvider.generateRefreshToken("admin.apex");
        when(userRepository.findByUsernameIgnoreCase("admin.apex")).thenReturn(Optional.of(user));

        ResponseEntity<?> response = authController.refreshToken(Map.of("refreshToken", refreshToken));
        assertEquals(HttpStatus.OK, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body.get("token"));
        assertEquals("Bearer", body.get("tokenType"));
    }
}
