package gov.aicte.samanvay.repository;

import gov.aicte.samanvay.model.InstitutionalCorrectiveAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InstitutionalCorrectiveActionRepository extends JpaRepository<InstitutionalCorrectiveAction, Long> {
    List<InstitutionalCorrectiveAction> findByInstitutionPidOrderByTargetDateAsc(String institutionPid);
    List<InstitutionalCorrectiveAction> findByCaseId(String caseId);
}
