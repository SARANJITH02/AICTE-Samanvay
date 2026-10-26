package gov.aicte.samanvay.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthRequestDto {
    private String username;
    private String password;
    private String persona; // PGRC_OFFICER, REGULATION_OFFICER, REGIONAL_OFFICER, APEX_ADMIN
    private String region;
}
