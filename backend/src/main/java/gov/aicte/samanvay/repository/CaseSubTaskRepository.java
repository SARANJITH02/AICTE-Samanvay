package gov.aicte.samanvay.repository;

import gov.aicte.samanvay.model.CaseSubTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CaseSubTaskRepository extends JpaRepository<CaseSubTask, Long> {
    List<CaseSubTask> findByParentCaseIdOrderByCreatedAtAsc(String parentCaseId);
    Optional<CaseSubTask> findBySubTaskId(String subTaskId);
}
