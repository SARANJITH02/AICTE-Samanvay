package gov.aicte.samanvay.repository;

import gov.aicte.samanvay.model.AuditCheckpoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuditCheckpointRepository extends JpaRepository<AuditCheckpoint, Long> {
    List<AuditCheckpoint> findByCaseIdOrderByCheckpointNumDesc(String caseId);
    Optional<AuditCheckpoint> findByCheckpointId(String checkpointId);
    Optional<AuditCheckpoint> findTopByOrderByCheckpointNumDesc();
}
