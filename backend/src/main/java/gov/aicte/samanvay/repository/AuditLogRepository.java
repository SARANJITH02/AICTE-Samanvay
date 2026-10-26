package gov.aicte.samanvay.repository;

import gov.aicte.samanvay.model.AuditLog;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByCaseIdOrderBySequenceNumAsc(String caseId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM AuditLog a WHERE a.caseId = :caseId ORDER BY a.sequenceNum DESC LIMIT 1")
    Optional<AuditLog> findLatestLogWithPessimisticLock(@Param("caseId") String caseId);

    Optional<AuditLog> findTopByCaseIdOrderBySequenceNumDesc(String caseId);
}
