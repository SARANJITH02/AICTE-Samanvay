package gov.aicte.samanvay.repository;

import gov.aicte.samanvay.model.SharedEvidencePackage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SharedEvidencePackageRepository extends JpaRepository<SharedEvidencePackage, Long> {
    List<SharedEvidencePackage> findByInstitutionPidOrderByCreatedAtDesc(String institutionPid);
    List<SharedEvidencePackage> findByCaseId(String caseId);
}
