package gov.aicte.samanvay.repository;

import gov.aicte.samanvay.model.NotificationOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationOutboxRepository extends JpaRepository<NotificationOutbox, Long> {
    List<NotificationOutbox> findAllByOrderByCreatedAtDesc();
    List<NotificationOutbox> findByRecipientOrderByCreatedAtDesc(String recipient);
    List<NotificationOutbox> findByCaseIdOrderByCreatedAtDesc(String caseId);
    List<NotificationOutbox> findByTypeOrderByCreatedAtDesc(String type);
    List<NotificationOutbox> findByTypeAndIsReadFalseOrderByCreatedAtDesc(String type);
}
