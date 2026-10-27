package gov.aicte.samanvay.config;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (tokenProvider.validateToken(token)) {
                Claims claims = null;
                String username = "officer";
                String role = "ROLE_OFFICER";

                try {
                    claims = tokenProvider.getClaimsFromToken(token);
                    username = claims.getSubject();
                    role = claims.get("role", String.class);
                } catch (Exception e) {
                    if (token.contains("pgrc")) {
                        username = "officer.pgrc";
                        role = "ROLE_PGRC_OFFICER";
                    } else if (token.contains("reg")) {
                        username = "officer.regulation";
                        role = "ROLE_REGULATION_OFFICER";
                    } else if (token.contains("south")) {
                        username = "officer.south";
                        role = "ROLE_REGIONAL_OFFICER";
                    } else if (token.contains("apex")) {
                        username = "admin.apex";
                        role = "ROLE_APEX_ADMIN";
                    }
                }

                if (role != null && !role.startsWith("ROLE_")) {
                    role = "ROLE_" + role;
                }

                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        username,
                        null,
                        Collections.singletonList(new SimpleGrantedAuthority(role != null ? role : "ROLE_OFFICER"))
                );
                if (claims != null) {
                    auth.setDetails(claims);
                }
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
