package gov.aicte.samanvay.repository;

import gov.aicte.samanvay.model.InterBureauNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterBureauNoteRepository extends JpaRepository<InterBureauNote, Long> {
    List<InterBureauNote> findByOverlapIdOrderByCreatedAtAsc(Long overlapId);
}
