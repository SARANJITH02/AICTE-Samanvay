package gov.aicte.samanvay.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthRequestDto {
    private String username;
    private String password;
    
    @JsonProperty("totp_code")
    private String totpCode;

    @JsonProperty("totpCode")
    public void setTotpCodeAlt(String code) {
        this.totpCode = code;
    }
    
    private String persona; // PGRC_OFFICER, REGULATION_OFFICER, REGIONAL_OFFICER, APEX_ADMIN
    private String region;

    @JsonProperty("refresh_token")
    private String refreshToken;

    @JsonProperty("refreshToken")
    public void setRefreshTokenAlt(String token) {
        this.refreshToken = token;
    }
}
