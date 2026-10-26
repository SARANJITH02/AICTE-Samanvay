package gov.aicte.samanvay.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponseDto {
    private String token;
    private String tokenType;
    private String username;
    private String role;
    private String bureau;
    private String region;
    private long expiresInMs;
}
