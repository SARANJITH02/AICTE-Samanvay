package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.config.JwtTokenProvider;
import gov.aicte.samanvay.dto.AuthRequestDto;
import gov.aicte.samanvay.dto.AuthResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@RequestBody AuthRequestDto request) {
        String persona = request.getPersona() != null ? request.getPersona().toUpperCase() : "APEX_ADMIN";
        String username = request.getUsername() != null && !request.getUsername().isBlank()
                ? request.getUsername()
                : "officer." + persona.toLowerCase();

        String role;
        String bureau;
        String region = request.getRegion() != null && !request.getRegion().isBlank() ? request.getRegion() : "All Regions";

        switch (persona) {
            case "PGRC_OFFICER" -> {
                role = "ROLE_PGRC_OFFICER";
                bureau = "PGRC";
            }
            case "REGULATION_OFFICER" -> {
                role = "ROLE_REGULATION_OFFICER";
                bureau = "REGULATION_BUREAU";
            }
            case "REGIONAL_OFFICER" -> {
                role = "ROLE_REGIONAL_OFFICER";
                bureau = "REGIONAL_OFFICE";
                if ("All Regions".equalsIgnoreCase(region)) {
                    region = "Southern";
                }
            }
            default -> {
                role = "ROLE_APEX_ADMIN";
                bureau = "APEX_HEADQUARTERS";
                region = "All Regions";
            }
        }

        String token = jwtTokenProvider.generateToken(username, role, bureau, region);

        return ResponseEntity.ok(AuthResponseDto.builder()
                .token(token)
                .tokenType("Bearer")
                .username(username)
                .role(role)
                .bureau(bureau)
                .region(region)
                .expiresInMs(86400000L)
                .build());
    }
}
