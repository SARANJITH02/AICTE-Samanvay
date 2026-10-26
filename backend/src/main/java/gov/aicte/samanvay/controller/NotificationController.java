package gov.aicte.samanvay.controller;

import gov.aicte.samanvay.model.NotificationOutbox;
import gov.aicte.samanvay.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/outbox")
    public ResponseEntity<List<NotificationOutbox>> getOutbox() {
        return ResponseEntity.ok(notificationService.getAllOutboxMessages());
    }

    @GetMapping("/in-app")
    public ResponseEntity<List<NotificationOutbox>> getInAppNotifications(
            @RequestParam(required = false) String recipient,
            Authentication auth) {
        String target = (recipient != null && !recipient.isBlank())
                ? recipient
                : ((auth != null) ? auth.getName() : "ALL");
        return ResponseEntity.ok(notificationService.getInAppNotifications(target));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(@PathVariable Long id) {
        boolean success = notificationService.markAsRead(id);
        return ResponseEntity.ok(Map.of("success", success));
    }

    @PostMapping("/evaluate-sla")
    public ResponseEntity<Map<String, Object>> triggerSlaEvaluation() {
        int escalated = notificationService.evaluateSlaEscalations();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "escalatedCount", escalated,
                "message", "SLA Escalation Matrix successfully evaluated across all active grievances."
        ));
    }
}
