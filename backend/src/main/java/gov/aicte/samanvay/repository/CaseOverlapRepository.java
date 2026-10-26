package gov.aicte.samanvay.repository;

import gov.aicte.samanvay.model.CaseOverlap;
import gov.aicte.samanvay.model.OverlapStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CaseOverlapRepository extends JpaRepository<CaseOverlap, Long> {

    List<CaseOverlap> findByStatus(OverlapStatus status);

    @Query("SELECT o FROM CaseOverlap o WHERE (o.caseA.id = :caseId OR o.caseB.id = :caseId)")
    List<CaseOverlap> findOverlapsForCase(@Param("caseId") String caseId);

    @Query("SELECT o FROM CaseOverlap o WHERE (o.caseA.id = :caseA AND o.caseB.id = :caseB) OR (o.caseA.id = :caseB AND o.caseB.id = :caseA)")
    Optional<CaseOverlap> findByPair(@Param("caseA") String caseA, @Param("caseB") String caseB);

    @Query("SELECT COUNT(o) FROM CaseOverlap o WHERE o.status = 'PENDING_COORDINATION'")
    long countPendingCoordination();
}
