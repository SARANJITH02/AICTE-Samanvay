package gov.aicte.samanvay.repository;

import gov.aicte.samanvay.model.Institution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InstitutionRepository extends JpaRepository<Institution, String> {

    List<Institution> findByRegionIgnoreCase(String region);

    @Query(value = "SELECT * FROM institutions ORDER BY similarity(normalized_name, :normalizedQuery) DESC LIMIT 1", nativeQuery = true)
    Optional<Institution> findClosestByTrigram(@Param("normalizedQuery") String normalizedQuery);

    @Query(value = "SELECT * FROM institutions WHERE similarity(normalized_name, :normalizedQuery) >= :threshold ORDER BY similarity(normalized_name, :normalizedQuery) DESC", nativeQuery = true)
    List<Institution> searchByTrigramSimilarity(@Param("normalizedQuery") String normalizedQuery, @Param("threshold") double threshold);
}
