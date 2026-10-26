package gov.aicte.samanvay.repository;

import gov.aicte.samanvay.model.PolicyVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PolicyVersionRepository extends JpaRepository<PolicyVersion, Long> {
    List<PolicyVersion> findByIsActiveTrue();
    Optional<PolicyVersion> findByHandbookVersionAndClauseNumber(String handbookVersion, String clauseNumber);
}
