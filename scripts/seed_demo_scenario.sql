-- AICTE Samanvay (समन्वय) - Canonical Demo Scenario Seed Script
-- Target Institution: Madras Institute of Technology (PID: INST-SOU-001)

BEGIN;

-- 1. Ensure Target Institution exists with calibrated CII breakdown
INSERT INTO institutions (pid, name, region, state, district, address, institution_type, risk_score, cii_score, cii_grade, approved_intake)
VALUES (
    'INST-SOU-001',
    'Madras Institute of Technology',
    'Southern',
    'Tamil Nadu',
    'Chennai',
    'MIT Road, Chromepet, Chennai 600044',
    'ENGINEERING_AND_TECH',
    0.85,
    340,
    'D',
    720
) ON CONFLICT (pid) DO UPDATE SET
    risk_score = 0.85,
    cii_score = 340,
    cii_grade = 'D';

-- 2. Seed Primary PGRC Complaint (Student Fee Refund Request)
INSERT INTO complaints (
    id, institution_pid, institution_name, complainant_name, complainant_type, complainant_masked_id,
    subject, grievance_text, category, severity, status, source_bureau, region,
    received_date, sla_deadline, days_remaining_sla, assigned_officer_id, delay_risk_score,
    affected_students_count, total_relief_amount_inr, directive_type
) VALUES (
    'CMP-2026-PGRC-001',
    'INST-SOU-001',
    'Madras Institute of Technology',
    'Karthik Raman',
    'STUDENT',
    'XXXX-XXXX-8921',
    'Unlawful withholding of B.Tech capitation deposit and refusal to refund admission fee upon withdrawal',
    'I withdrew my admission from Computer Science within the UGC/AICTE stipulated withdrawal window. The college administration refused to refund the ₹1,85,000 security deposit citing management policy under Clause 6.1(e).',
    'FEE_REFUND',
    'HIGH',
    'UNDER_SCRUTINY',
    'PGRC',
    'Southern',
    '2026-10-18',
    '2026-11-17',
    14,
    'officer.pgrc',
    0.78,
    42,
    185000,
    'RELEASE'
) ON CONFLICT (id) DO UPDATE SET
    status = 'UNDER_SCRUTINY',
    directive_type = 'RELEASE';

-- 3. Seed Overlapping Regulation Bureau Complaint (Institutional Disaffiliation & Fund Freeze Notice)
INSERT INTO complaints (
    id, institution_pid, institution_name, complainant_name, complainant_type, complainant_masked_id,
    subject, grievance_text, category, severity, status, source_bureau, region,
    received_date, sla_deadline, days_remaining_sla, assigned_officer_id, delay_risk_score,
    affected_students_count, total_relief_amount_inr, directive_type
) VALUES (
    'CMP-2026-REG-002',
    'INST-SOU-001',
    'Madras Institute of Technology',
    'Regional Inspection Vigilance Squad',
    'REGULATORY_AUDIT',
    'INSP-RO-SOU-99',
    'Regulatory show-cause and interim disbursement freeze for unapproved intake quota expansion',
    'Surprise inspection discovered 42 unapproved NRI quota admissions in Computer Science and Information Technology. Standing Hearing Committee directives mandate freezing all tuition fee adjustments and withholding institutional disbursements.',
    'INFRASTRUCTURE_DEFICIENCY',
    'CRITICAL',
    'UNDER_SCRUTINY',
    'REGULATION_BUREAU',
    'Southern',
    '2026-10-19',
    '2026-11-03',
    6,
    'officer.regulation',
    0.88,
    42,
    0,
    'WITHHOLD'
) ON CONFLICT (id) DO UPDATE SET
    status = 'UNDER_SCRUTINY',
    directive_type = 'WITHHOLD';

-- 4. Seed Overlap Relation with 92% Cosine/RapidFuzz Score and Directive Contradiction
DELETE FROM case_overlaps WHERE (case_id_a = 'CMP-2026-PGRC-001' AND case_id_b = 'CMP-2026-REG-002') OR (case_id_a = 'CMP-2026-REG-002' AND case_id_b = 'CMP-2026-PGRC-001');

INSERT INTO case_overlaps (
    case_id_a, case_id_b, institution_pid, institution_name, overlap_score, status,
    detected_at, lead_bureau, resolution_notes, is_contradiction, contradiction_reason
) VALUES (
    'CMP-2026-PGRC-001',
    'CMP-2026-REG-002',
    'INST-SOU-001',
    'Madras Institute of Technology',
    0.92,
    'PENDING_COORDINATION',
    NOW(),
    'APEX_HEADQUARTERS',
    'Contradictory directives detected between PGRC (#CMP-2026-PGRC-001 directive RELEASE) and Regulation Bureau (#CMP-2026-REG-002 directive WITHHOLD). Joint Hearing Docket mandatory under APH Chapter VI.',
    TRUE,
    'DIRECTIVE_CONFLICT: PGRC directive RELEASE directly opposes Regulation Bureau directive WITHHOLD for target institution INST-SOU-001'
);

-- 5. Seed Initial Audit Log Chain for PGRC case
INSERT INTO audit_logs (case_id, action, officer_id, officer_role, previous_hash, current_hash, timestamp, details)
VALUES (
    'CMP-2026-PGRC-001',
    'GRIEVANCE_REGISTERED',
    'system.intake',
    'ROLE_PGRC_OFFICER',
    '0000000000000000000000000000000000000000000000000000000000000000',
    '90a3c0f1c1e66a1b450e7c57ad3c31de2e53edfab18b15b44bd855d9ed63b96e',
    NOW() - INTERVAL '5 days',
    'Initial grievance filing registered via air-gapped intake portal. Verhoeff Aadhaar verification passed.'
) ON CONFLICT DO NOTHING;

COMMIT;
