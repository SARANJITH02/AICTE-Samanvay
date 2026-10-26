package gov.aicte.samanvay.repository;

import gov.aicte.samanvay.model.BureauType;
import gov.aicte.samanvay.model.Complaint;
import gov.aicte.samanvay.model.ComplaintStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, String> {

    List<Complaint> findByRegionIgnoreCase(String region);

    List<Complaint> findBySourceBureau(BureauType bureauType);

    List<Complaint> findByStatus(ComplaintStatus status);

    List<Complaint> findByInstitutionPid(String institutionPid);

    @Query("SELECT c FROM Complaint c WHERE c.slaDeadline < :now AND c.status <> 'DISPOSED'")
    List<Complaint> findBreachedSlaComplaints(@Param("now") OffsetDateTime now);

    @Query("SELECT c FROM Complaint c WHERE c.slaDeadline >= :now AND c.slaDeadline <= :threshold AND c.status <> 'DISPOSED'")
    List<Complaint> findApproachingSlaComplaints(@Param("now") OffsetDateTime now, @Param("threshold") OffsetDateTime threshold);

    @Query("SELECT COUNT(c) FROM Complaint c WHERE c.status <> 'DISPOSED'")
    long countActiveCases();

    @Query("SELECT COUNT(c) FROM Complaint c WHERE c.sourceBureau = :bureau AND c.status <> 'DISPOSED'")
    long countActiveByBureau(@Param("bureau") BureauType bureau);

    @Query("SELECT COUNT(c) FROM Complaint c WHERE c.slaDeadline < :now AND c.status <> 'DISPOSED'")
    long countBreachedSla(@Param("now") OffsetDateTime now);
}
