package gov.aicte.samanvay;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SamanvayApplication {
    public static void main(String[] args) {
        SpringApplication.run(SamanvayApplication.class, args);
    }
}
