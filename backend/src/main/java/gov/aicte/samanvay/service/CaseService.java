package gov.aicte.samanvay.service;

import gov.aicte.samanvay.dto.BulkImportResultDto;
import gov.aicte.samanvay.dto.CaseCreateDto;
import gov.aicte.samanvay.dto.CaseResponseDto;
import gov.aicte.samanvay.model.*;
import gov.aicte.samanvay.repository.CaseOverlapRepository;
import gov.aicte.samanvay.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CaseService {

    private final ComplaintRepository complaintRepository;
    private final CaseOverlapRepository caseOverlapRepository;
    private final EntityResolverService entityResolverService;
    private final AiClientService aiClientService;
    private final AuditService auditService;
    private final OverlapService overlapService;

    public static String getCleanBureauCode(BureauType bureau) {
        if (bureau == null) return "PGRC";
        return switch (bureau) {
            case REGIONAL_OFFICE -> "RO";
            case REGULATION_BUREAU -> "RB";
            default -> "PGRC";
        };
    }

    /**
     * Ingests a new grievance/regulatory case with automated PII redaction,
     * genesis cryptographic block creation, and cross-bureau overlap analysis.
     */
    @Transactional
    public CaseResponseDto createCase(CaseCreateDto dto, String officerId) {
        EntityResolverService.ResolutionResult res = entityResolverService.resolveInstitution(
                dto.getInstitutionPid(), dto.getInstitutionName(), dto.getRegion()
        );

        String bureauCode = getCleanBureauCode(dto.getSourceBureau());
        String caseId = (dto.getId() != null && !dto.getId().isBlank())
                ? dto.getId().trim()
                : String.format("CMP-%d-%s-%03d",
                OffsetDateTime.now().getYear(),
                bureauCode,
                (int) (System.currentTimeMillis() % 1000));

        String sanitizedText = aiClientService.redactPii(dto.getComplaintText());
        int slaDays = (dto.getSlaDays() != null && dto.getSlaDays() > 0) ? dto.getSlaDays() : 30;
        OffsetDateTime now = OffsetDateTime.now();

        Complaint complaint = Complaint.builder()
                .id(caseId)
                .institution(res.institution())
                .sourceBureau(dto.getSourceBureau())
                .complainantType(dto.getComplainantType())
                .category(dto.getCategory())
                .subject(dto.getSubject())
                .complaintText(dto.getComplaintText())
                .sanitizedText(sanitizedText)
                .status(ComplaintStatus.RECEIVED)
                .assignedOfficerId(dto.getAssignedOfficerId())
                .assignedBureau(dto.getSourceBureau().name())
                .region(dto.getRegion() != null ? dto.getRegion() : res.institution().getRegion())
                .receivedDate(now)
                .slaDeadline(now.plusDays(slaDays))
                .isEscalated(false)
                .delayRiskScore(res.institution().getRiskScore() != null ? res.institution().getRiskScore() * 0.5 : 0.15)
                .delayRiskReasons("[]")
                .build();

        Complaint saved = complaintRepository.save(complaint);

        // Genesis cryptographic audit log
        String auditRemarks = "Case ingested into Samanvay repository. PII sanitization applied. " + res.resolutionMessage();
        auditService.appendAuditLog(
                saved.getId(),
                officerId != null ? officerId : "SYSTEM",
                "CASE_INGESTION",
                auditRemarks,
                String.format("{\"source_bureau\":\"%s\",\"complainant\":\"%s\",\"category\":\"%s\"}",
                        dto.getSourceBureau(), dto.getComplainantType(), dto.getCategory())
        );

        // Check for cross-bureau overlaps
        overlapService.scanAndEvaluateOverlaps(saved);

        return mapToDto(saved);
    }

    /**
     * Bulk imports cases from CSV with fuzzy entity resolution.
     */
    @Transactional
    public BulkImportResultDto bulkImport(InputStream inputStream, String officerId) {
        List<BulkImportResultDto.ImportRowStatus> statuses = new ArrayList<>();
        int successCount = 0;
        int fuzzyCount = 0;
        int failCount = 0;
        int rowNum = 1;

        try (CSVParser parser = new CSVParser(new InputStreamReader(inputStream, StandardCharsets.UTF_8),
                CSVFormat.DEFAULT.withFirstRecordAsHeader().withIgnoreHeaderCase().withTrim())) {

            for (CSVRecord record : parser) {
                rowNum++;
                try {
                    String pidInput = record.isMapped("institution_pid") ? record.get("institution_pid") : "";
                    String nameInput = record.isMapped("institution_name") ? record.get("institution_name") : "";
                    String bureauStr = record.isMapped("source_bureau") ? record.get("source_bureau") : "PGRC";
                    String complainant = record.isMapped("complainant_type") ? record.get("complainant_type") : "Student";
                    String category = record.isMapped("category") ? record.get("category") : "Fee Dispute";
                    String subject = record.isMapped("subject") ? record.get("subject") : "Bulk Grievance";
                    String text = record.isMapped("complaint_text") ? record.get("complaint_text") : subject;
                    String region = record.isMapped("region") ? record.get("region") : "Northern";

                    BureauType bureau;
                    try {
                        bureau = BureauType.valueOf(bureauStr.toUpperCase());
                    } catch (Exception ex) {
                        bureau = BureauType.PGRC;
                    }

                    CaseCreateDto createDto = CaseCreateDto.builder()
                            .institutionPid(pidInput)
                            .institutionName(nameInput)
                            .sourceBureau(bureau)
                            .complainantType(complainant)
                            .category(category)
                            .subject(subject)
                            .complaintText(text)
                            .region(region)
                            .assignedOfficerId(officerId)
                            .build();

                    CaseResponseDto created = createCase(createDto, officerId);
                    boolean isFuzzy = pidInput.isBlank() || !created.getInstitutionPid().equalsIgnoreCase(pidInput);
                    if (isFuzzy) fuzzyCount++;
                    successCount++;

                    statuses.add(BulkImportResultDto.ImportRowStatus.builder()
                            .rowNumber(rowNum)
                            .caseId(created.getId())
                            .originalInstitutionInput(pidInput.isBlank() ? nameInput : pidInput)
                            .resolvedPid(created.getInstitutionPid())
                            .resolvedInstitutionName(created.getInstitutionName())
                            .resolutionConfidence(isFuzzy ? 0.78 : 1.0)
                            .success(true)
                            .build());

                } catch (Exception rowEx) {
                    failCount++;
                    statuses.add(BulkImportResultDto.ImportRowStatus.builder()
                            .rowNumber(rowNum)
                            .success(false)
                            .errorMessage(rowEx.getMessage())
                            .build());
                }
            }
        } catch (Exception e) {
            log.error("[BULK IMPORT] Error reading CSV stream: {}", e.getMessage());
            throw new RuntimeException("Failed to parse CSV file: " + e.getMessage());
        }

        return BulkImportResultDto.builder()
                .totalProcessed(statuses.size())
                .successCount(successCount)
                .fuzzyMatchedCount(fuzzyCount)
                .failureCount(failCount)
                .details(statuses)
                .build();
    }

    /**
     * Retrieves filtered complaints with RBAC regional boundaries.
     */
    @Transactional(readOnly = true)
    public List<CaseResponseDto> getCases(
            String userRole, String userRegion,
            String filterRegion, BureauType bureau, ComplaintStatus status,
            String search) {

        List<Complaint> list = complaintRepository.findAll();

        // RBAC Regional Boundary Enforcement
        boolean isRegionalOfficer = "ROLE_REGIONAL_OFFICER".equalsIgnoreCase(userRole);
        if (isRegionalOfficer && userRegion != null && !userRegion.isBlank()) {
            list = list.stream()
                    .filter(c -> c.getRegion().equalsIgnoreCase(userRegion) || Boolean.TRUE.equals(c.getIsEscalated()))
                    .collect(Collectors.toList());
        }

        // Additional optional filters
        if (filterRegion != null && !filterRegion.isBlank() && !filterRegion.equalsIgnoreCase("ALL")) {
            list = list.stream()
                    .filter(c -> c.getRegion().equalsIgnoreCase(filterRegion))
                    .collect(Collectors.toList());
        }

        if (bureau != null) {
            list = list.stream()
                    .filter(c -> c.getSourceBureau() == bureau)
                    .collect(Collectors.toList());
        }

        if (status != null) {
            list = list.stream()
                    .filter(c -> c.getStatus() == status)
                    .collect(Collectors.toList());
        }

        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            list = list.stream()
                    .filter(c -> c.getId().toLowerCase().contains(q) ||
                            c.getSubject().toLowerCase().contains(q) ||
                            c.getInstitution().getName().toLowerCase().contains(q) ||
                            c.getInstitution().getPid().toLowerCase().contains(q))
                    .collect(Collectors.toList());
        }

        return list.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CaseResponseDto getCaseById(String id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found: " + id));
        return mapToDto(complaint);
    }

    @Transactional
    public CaseResponseDto updateStatus(String id, ComplaintStatus newStatus, String remarks, String officerId) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found: " + id));

        ComplaintStatus oldStatus = complaint.getStatus();

        // 1. Strict Idempotency check: if status is already target status, return cleanly without appending duplicate audit blocks
        if (oldStatus == newStatus) {
            log.info("[IDEMPOTENT] Case {} is already in status {}. Skipping duplicate transition.", id, newStatus);
            return mapToDto(complaint);
        }

        // 2. FSM Rules Enforcement
        if (oldStatus == ComplaintStatus.DISPOSED) {
            if (newStatus != ComplaintStatus.UNDER_SCRUTINY) {
                throw new IllegalStateException("Disposed cases cannot transition to " + newStatus + ". Only authorized administrative reopening to UNDER_SCRUTINY is permitted.");
            }
            if (remarks == null || remarks.trim().isEmpty()) {
                throw new IllegalArgumentException("Mandatory justification remarks required to reopen a disposed case.");
            }
        } else if (oldStatus == ComplaintStatus.JOINT_INQUIRY && newStatus == ComplaintStatus.UNDER_SCRUTINY) {
            throw new IllegalStateException("Cannot revert from JOINT_INQUIRY back to UNDER_SCRUTINY directly.");
        }

        complaint.setStatus(newStatus);
        if (remarks != null && !remarks.isBlank()) {
            complaint.setResolutionNotes(remarks);
        }
        Complaint saved = complaintRepository.save(complaint);

        String action = "STATUS_CHANGE_" + newStatus.name();
        String auditRemarks = String.format("Status transition: %s -> %s. %s", oldStatus, newStatus, remarks != null ? remarks : "");
        auditService.appendAuditLog(id, officerId != null ? officerId : "OFFICER", action, auditRemarks,
                String.format("{\"old\":\"%s\",\"new\":\"%s\"}", oldStatus, newStatus));

        return mapToDto(saved);
    }

    public CaseResponseDto mapToDto(Complaint c) {
        // Freeze SLA Proximity Countdown for DISPOSED cases
        long daysRemaining = (c.getStatus() == ComplaintStatus.DISPOSED)
                ? 0L
                : Duration.between(OffsetDateTime.now(), c.getSlaDeadline()).toDays();
        boolean hasOverlap = !caseOverlapRepository.findOverlapsForCase(c.getId()).isEmpty();

        return CaseResponseDto.builder()
                .id(c.getId())
                .institutionPid(c.getInstitution().getPid())
                .institutionName(c.getInstitution().getName())
                .sourceBureau(c.getSourceBureau())
                .complainantType(c.getComplainantType())
                .category(c.getCategory())
                .subject(c.getSubject())
                .complaintText(c.getComplaintText())
                .sanitizedText(c.getSanitizedText())
                .status(c.getStatus())
                .assignedOfficerId(c.getAssignedOfficerId())
                .assignedBureau(c.getAssignedBureau())
                .region(c.getRegion())
                .receivedDate(c.getReceivedDate())
                .slaDeadline(c.getSlaDeadline())
                .isEscalated(c.getIsEscalated())
                .delayRiskScore(c.getDelayRiskScore())
                .delayRiskReasons(c.getDelayRiskReasons())
                .resolutionNotes(c.getResolutionNotes())
                .daysRemainingSla(daysRemaining)
                .hasOverlap(hasOverlap)
                .build();
    }
}
