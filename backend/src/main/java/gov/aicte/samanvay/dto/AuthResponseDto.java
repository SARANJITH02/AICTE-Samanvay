package gov.aicte.samanvay.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponseDto {
    private String token; // access token

    @JsonProperty("refresh_token")
    private String refreshToken;

    @JsonProperty("token_type")
    private String tokenType;

    private String username;

    @JsonProperty("full_name")
    private String fullName;

    private String role;
    private String bureau;
    private String region;
    @JsonProperty("institution_pid")
    private String institutionPid;

    @JsonProperty("expires_in_ms")
    private long expiresInMs;

    @JsonProperty("totp_required")
    private boolean totpRequired;

    @JsonProperty("refreshToken")
    public String getRefreshTokenCamel() {
        return refreshToken;
    }

    @JsonProperty("tokenType")
    public String getTokenTypeCamel() {
        return tokenType;
    }

    @JsonProperty("fullName")
    public String getFullNameCamel() {
        return fullName;
    }

    @JsonProperty("expiresInMs")
    public long getExpiresInMsCamel() {
        return expiresInMs;
    }

    @JsonProperty("totpRequired")
    public boolean isTotpRequiredCamel() {
        return totpRequired;
    }
}
