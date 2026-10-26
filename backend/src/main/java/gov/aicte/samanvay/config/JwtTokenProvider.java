package gov.aicte.samanvay.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
@Slf4j
public class JwtTokenProvider {

    private final SecretKey key;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtTokenProvider(
            @Value("${app.jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}") String secret,
            @Value("${app.jwt.access-expiration-ms:900000}") long accessTokenExpirationMs, // 15 mins default
            @Value("${app.jwt.refresh-expiration-ms:604800000}") long refreshTokenExpirationMs) { // 7 days default
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    public String generateToken(String username, String role, String bureau, String region) {
        return generateAccessToken(username, role, bureau, region, null);
    }

    public String generateAccessToken(String username, String role, String bureau, String region) {
        return generateAccessToken(username, role, bureau, region, null);
    }

    public String generateAccessToken(String username, String role, String bureau, String region, String institutionPid) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpirationMs);

        var builder = Jwts.builder()
                .subject(username)
                .claim("token_type", "ACCESS")
                .claim("role", role)
                .claim("bureau", bureau)
                .claim("region", region)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key);

        if (institutionPid != null && !institutionPid.isBlank()) {
            builder.claim("institutionPid", institutionPid);
        }

        return builder.compact();
    }

    public String generateRefreshToken(String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpirationMs);

        return Jwts.builder()
                .subject(username)
                .claim("token_type", "REFRESH")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public Claims getClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.error("[JWT] Invalid token: {}", e.getMessage());
            return false;
        }
    }

    public boolean validateRefreshToken(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return "REFRESH".equals(claims.get("token_type"));
        } catch (JwtException | IllegalArgumentException e) {
            log.error("[JWT] Invalid refresh token: {}", e.getMessage());
            return false;
        }
    }

    public long getAccessTokenExpirationMs() {
        return accessTokenExpirationMs;
    }
}
