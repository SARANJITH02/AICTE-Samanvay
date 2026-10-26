-- ==============================================================================
-- AICTE SAMANVAY (समन्वय) - Seed Data Script
-- 10 Realistic Institutions, 20 Strategic Complaints, Overlap Pairs & Audit Hash Chains
-- ==============================================================================

-- 1. INSTITUTIONS SEED DATA (10 Diverse AICTE Approved Institutions)
INSERT INTO institutions (pid, name, normalized_name, region, state, district, address, institution_type, risk_score)
VALUES
('1-48920194', 'Delhi Institute of Advanced Studies', 'delhi institute of advanced studies', 'Northern', 'Delhi', 'North West Delhi', 'Sector 25, Rohini, Delhi 110085', 'MANAGEMENT_AND_TECH', 0.82),
('1-20938471', 'Apex College of Engineering & Technology', 'apex college of engineering technology', 'Southern', 'Tamil Nadu', 'Chennai', 'OMR Road, Sholinganallur, Chennai 600119', 'ENGINEERING_COLLEGE', 0.74),
('1-31849205', 'Vellore Advanced Polytechnic Institute', 'vellore advanced polytechnic institute', 'Southern', 'Tamil Nadu', 'Vellore', 'Katpadi Road, Vellore 632014', 'POLYTECHNIC', 0.35),
('1-59283741', 'Bengal Institute of Technology & Science', 'bengal institute of technology science', 'Eastern', 'West Bengal', 'Kolkata', 'EM Bypass, Sector V, Salt Lake, Kolkata 700091', 'ENGINEERING_COLLEGE', 0.45),
('1-68294012', 'Maharashtra Institute of Research and Technology', 'maharashtra institute of research and technology', 'Western', 'Maharashtra', 'Pune', 'Paud Road, Kothrud, Pune 411038', 'ENGINEERING_COLLEGE', 0.65),
('1-74920183', 'National Capital Regional Engineering Academy', 'national capital regional engineering academy', 'Northern', 'Uttar Pradesh', 'Noida', 'Knowledge Park III, Greater Noida 201306', 'ENGINEERING_COLLEGE', 0.58),
('1-85930274', 'Bangalore Global Institute of Management Studies', 'bangalore global institute of management studies', 'South-Western', 'Karnataka', 'Bengaluru', 'Electronic City Phase 1, Bengaluru 560100', 'MANAGEMENT_AND_TECH', 0.40),
('1-93820174', 'Hyderabad Institute of Pharmaceutical Sciences', 'hyderabad institute of pharmaceutical sciences', 'South-Central', 'Telangana', 'Hyderabad', 'Gachibowli, Hyderabad 500032', 'PHARMACY', 0.28),
('1-10293847', 'Rajasthan State Technical University Campus', 'rajasthan state technical university campus', 'Northern', 'Rajasthan', 'Jaipur', 'JLN Marg, Malviya Nagar, Jaipur 302017', 'GOVERNMENT_UNIVERSITY', 0.15),
('1-11829304', 'Kochi Marine Engineering & Architecture College', 'kochi marine engineering architecture college', 'South-Western', 'Kerala', 'Ernakulam', 'Willingdon Island, Kochi 682003', 'ENGINEERING_COLLEGE', 0.30)
ON CONFLICT (pid) DO NOTHING;

-- 2. COMPLAINTS SEED DATA (20 Strategic Cases)
-- Note: Case CMP-2026-PGRC-001 and CMP-2026-REG-002 share PID 1-48920194 (High Overlap: Fee Dispute / Caution Money)
INSERT INTO complaints (
    id, institution_pid, source_bureau, complainant_type, category, 
    subject, complaint_text, sanitized_text, status, assigned_officer_id, 
    assigned_bureau, region, received_date, sla_deadline, is_escalated, 
    delay_risk_score, delay_risk_reasons
) VALUES
-- Case 1: Primary Target Case (PGRC)
(
    'CMP-2026-PGRC-001',
    '1-48920194',
    'PGRC',
    'Student',
    'Fee Dispute',
    'Student caution money deposit of Rs. 40,000 withheld after graduation',
    'I graduated in July 2025 from B.Tech CSE. The accounts office refuses to refund my Rs. 40,000 caution deposit citing bogus library dues despite having a signed clearance slip. Contact: 9811223344, Aadhaar: 2341-9876-1234, email: rahul.verma@gmail.com.',
    'I graduated in July 2025 from B.Tech CSE. The accounts office refuses to refund my Rs. 40,000 caution deposit citing bogus library dues despite having a signed clearance slip. Contact: [PHONE_REDACTED], Aadhaar: [AADHAAR_REDACTED], email: [EMAIL_REDACTED].',
    'UNDER_SCRUTINY',
    'OFF-PGRC-104',
    'PGRC',
    'Northern',
    NOW() - INTERVAL '8 days',
    NOW() + INTERVAL '22 days',
    FALSE,
    0.72,
    '[{"factor": "Institution risk history", "weight": 0.4}, {"factor": "Repeated caution fee withholdings", "weight": 0.32}]'::jsonb
),
-- Case 2: Matching Regulation Bureau Overlap Case
(
    'CMP-2026-REG-002',
    '1-48920194',
    'REGULATION_BUREAU',
    'Public',
    'Fee Dispute',
    'Institution non-compliant with AICTE norms on unauthorized fee retention and caution money refund',
    'Formal inspection audit request: Delhi Institute of Advanced Studies has systematically retained security deposits and caution funds exceeding Rs. 1.2 Crores from the 2021-2025 batch in blatant violation of AICTE Approval Process Handbook Clause 13.4. Notice was served by Regional Office on 12/01/2026 without compliance.',
    'Formal inspection audit request: Delhi Institute of Advanced Studies has systematically retained security deposits and caution funds exceeding Rs. 1.2 Crores from the 2021-2025 batch in blatant violation of AICTE Approval Process Handbook Clause 13.4. Notice was served by Regional Office on 12/01/2026 without compliance.',
    'RECEIVED',
    'OFF-REG-201',
    'REGULATION_BUREAU',
    'Northern',
    NOW() - INTERVAL '3 days',
    NOW() + INTERVAL '27 days',
    FALSE,
    0.65,
    '[{"factor": "Systemic financial non-compliance", "weight": 0.45}, {"factor": "Cross-bureau inquiry warranted", "weight": 0.20}]'::jsonb
),
-- Case 3: Document Withholding (Apex College, Southern)
(
    'CMP-2026-PGRC-003',
    '1-20938471',
    'PGRC',
    'Faculty',
    'Document Withholding',
    'Original PhD degree certificates and service book forcibly withheld upon resignation',
    'I tendered my formal resignation after 4 years of teaching in ECE dept with 3 months notice. Management is refusing to release my original 10th, 12th, M.Tech and PhD certificates unless I pay an illegal bond penalty of Rs. 3 Lakhs. Phone: 9444123456.',
    'I tendered my formal resignation after 4 years of teaching in ECE dept with 3 months notice. Management is refusing to release my original 10th, 12th, M.Tech and PhD certificates unless I pay an illegal bond penalty of Rs. 3 Lakhs. Phone: [PHONE_REDACTED].',
    'UNDER_SCRUTINY',
    'OFF-PGRC-109',
    'PGRC',
    'Southern',
    NOW() - INTERVAL '14 days',
    NOW() + INTERVAL '16 days',
    FALSE,
    0.55,
    '[{"factor": "Faculty document retention violation", "weight": 0.55}]'::jsonb
),
-- Case 4: Overlapping Regulation Case (Apex College)
(
    'CMP-2026-REG-004',
    '1-20938471',
    'REGULATION_BUREAU',
    'Faculty',
    'Document Withholding',
    'Faculty collective petition against mandatory original certificate retention and unapproved bond agreements',
    'Over 14 faculty members have reported confiscation of original certificates by Apex College management violating AICTE Regulation 2019 on faculty rights. Case pending state labor commissioner review as well.',
    'Over 14 faculty members have reported confiscation of original certificates by Apex College management violating AICTE Regulation 2019 on faculty rights. Case pending state labor commissioner review as well.',
    'JOINT_INQUIRY',
    'OFF-REG-205',
    'REGULATION_BUREAU',
    'Southern',
    NOW() - INTERVAL '20 days',
    NOW() + INTERVAL '10 days',
    TRUE,
    0.85,
    '[{"factor": "High volume faculty grievances", "weight": 0.50}, {"factor": "EVC Inspection required", "weight": 0.35}]'::jsonb
),
-- Case 5: Infrastructure & Fire Safety (Bengal Institute, Eastern)
(
    'CMP-2026-REG-005',
    '1-59283741',
    'REGULATION_BUREAU',
    'Student',
    'Infrastructure',
    'Laboratories operating without mandated equipment, emergency fire exits blocked in main academic block',
    'The chemistry and VLSI labs have had non-functional equipment for over two semesters. Building fire NOC expired in November 2025. Over 1200 students are exposed to severe hazard.',
    'The chemistry and VLSI labs have had non-functional equipment for over two semesters. Building fire NOC expired in November 2025. Over 1200 students are exposed to severe hazard.',
    'RECEIVED',
    'OFF-REG-203',
    'REGULATION_BUREAU',
    'Eastern',
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '25 days',
    FALSE,
    0.40,
    '[{"factor": "Safety compliance gap", "weight": 0.40}]'::jsonb
),
-- Case 6: Admission Anomaly (Maharashtra Institute, Western) - SLA BREACHED
(
    'CMP-2026-REG-006',
    '1-68294012',
    'REGULATION_BUREAU',
    'Parent',
    'Admission Anomaly',
    'Excess enrollment in AI & Data Science quota beyond approved AICTE sanctioned intake of 60 seats',
    'College admitted 84 students against an approved intake capacity of 60, charging capitation fees between 3 to 5 Lakhs under management quota. Parents were not given legitimate receipts.',
    'College admitted 84 students against an approved intake capacity of 60, charging capitation fees between 3 to 5 Lakhs under management quota. Parents were not given legitimate receipts.',
    'ESCALATED',
    'OFF-REG-208',
    'REGULATION_BUREAU',
    'Western',
    NOW() - INTERVAL '35 days',
    NOW() - INTERVAL '5 days', -- Breached SLA
    TRUE,
    0.92,
    '[{"factor": "Critical intake quota violation", "weight": 0.55}, {"factor": "SLA deadline exceeded by 5 days", "weight": 0.37}]'::jsonb
),
-- Case 7: Fee Dispute (Vellore Polytechnic, Southern)
(
    'CMP-2026-PGRC-007',
    '1-31849205',
    'PGRC',
    'Student',
    'Fee Dispute',
    'Compulsory examination and laboratory development fee levied twice in the same semester',
    'Polytechnic administration has added an unapproved fee head of Rs. 12,500 under institutional development charges on student portals without governing body approval.',
    'Polytechnic administration has added an unapproved fee head of Rs. 12,500 under institutional development charges on student portals without governing body approval.',
    'UNDER_SCRUTINY',
    'OFF-PGRC-102',
    'PGRC',
    'Southern',
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '20 days',
    FALSE,
    0.35,
    '[{"factor": "Moderate fee discrepancy", "weight": 0.35}]'::jsonb
),
-- Case 8: Infrastructure (National Capital Regional, Northern) - SLA Near Breach
(
    'CMP-2026-RO-008',
    '1-74920183',
    'REGIONAL_OFFICE',
    'Public',
    'Infrastructure',
    'Hostel sanitation failure and contamination of drinking water supplies causing hospitalizations',
    'Over 18 resident hostel students were admitted to district hospital due to sewage contamination in water tanks. Administration did not respond for 48 hours.',
    'Over 18 resident hostel students were admitted to district hospital due to sewage contamination in water tanks. Administration did not respond for 48 hours.',
    'ESCALATED',
    'OFF-RO-301',
    'REGIONAL_OFFICE',
    'Northern',
    NOW() - INTERVAL '28 days',
    NOW() + INTERVAL '2 days', -- Near breach (Amber)
    TRUE,
    0.88,
    '[{"factor": "Health and sanitation emergency", "weight": 0.50}, {"factor": "SLA expiring in 48 hours", "weight": 0.38}]'::jsonb
),
-- Case 9: Document Withholding (Bangalore Global, South-Western)
(
    'CMP-2026-PGRC-009',
    '1-85930274',
    'PGRC',
    'Student',
    'Document Withholding',
    'Refusal to issue migration certificate and official transcript for higher study visa deadline',
    'Student completed PGDM in 2025. Registrar office delaying official migration certificates demanding advance alumni corpus donation. Student visa deadline is within 15 days.',
    'Student completed PGDM in 2025. Registrar office delaying official migration certificates demanding advance alumni corpus donation. Student visa deadline is within 15 days.',
    'UNDER_SCRUTINY',
    'OFF-PGRC-106',
    'PGRC',
    'South-Western',
    NOW() - INTERVAL '12 days',
    NOW() + INTERVAL '18 days',
    FALSE,
    0.45,
    '[{"factor": "Time sensitive visa dependency", "weight": 0.45}]'::jsonb
),
-- Case 10: Admission Anomaly (Hyderabad Institute, South-Central)
(
    'CMP-2026-REG-010',
    '1-93820174',
    'REGULATION_BUREAU',
    'Faculty',
    'Admission Anomaly',
    'Illegal reduction of faculty roster below AICTE cadre ratio of 1:15 in B.Pharm program',
    'Management terminated 8 senior faculty members and replaced them with unqualified ad-hoc tutors to reduce salary expenses while charging full tuition from students.',
    'Management terminated 8 senior faculty members and replaced them with unqualified ad-hoc tutors to reduce salary expenses while charging full tuition from students.',
    'RECEIVED',
    'OFF-REG-207',
    'REGULATION_BUREAU',
    'South-Central',
    NOW() - INTERVAL '6 days',
    NOW() + INTERVAL '24 days',
    FALSE,
    0.30,
    '[{"factor": "Cadre ratio compliance check", "weight": 0.30}]'::jsonb
),
-- Case 11: Fee Dispute (Rajasthan State Technical, Northern) - Disposed
(
    'CMP-2026-PGRC-011',
    '1-10293847',
    'PGRC',
    'Student',
    'Fee Dispute',
    'Hostel refund claim following mid-term government hostel closure',
    'Hostel closed due to state renovation works. Pro-rated refund of hostel fee Rs. 18,000 was processed successfully by finance division.',
    'Hostel closed due to state renovation works. Pro-rated refund of hostel fee Rs. 18,000 was processed successfully by finance division.',
    'DISPOSED',
    'OFF-PGRC-101',
    'PGRC',
    'Northern',
    NOW() - INTERVAL '40 days',
    NOW() - INTERVAL '10 days',
    FALSE,
    0.10,
    '[]'::jsonb
),
-- Case 12: Infrastructure (Kochi Marine, South-Western)
(
    'CMP-2026-RO-012',
    '1-11829304',
    'REGIONAL_OFFICE',
    'Faculty',
    'Infrastructure',
    'Marine engine workshop ventilation failure violating maritime training council guidelines',
    'Diesel exhaust fumes in basement workshop accumulating due to broken blowers. Three technicians suffered smoke irritation.',
    'Diesel exhaust fumes in basement workshop accumulating due to broken blowers. Three technicians suffered smoke irritation.',
    'UNDER_SCRUTINY',
    'OFF-RO-304',
    'REGIONAL_OFFICE',
    'South-Western',
    NOW() - INTERVAL '11 days',
    NOW() + INTERVAL '19 days',
    FALSE,
    0.35,
    '[{"factor": "Workshop equipment repair ongoing", "weight": 0.35}]'::jsonb
),
-- Case 13: Fee Dispute (Bengal Institute, Eastern)
(
    'CMP-2026-PGRC-013',
    '1-59283741',
    'PGRC',
    'Parent',
    'Fee Dispute',
    'Unauthorized bus transport levy imposed on day-scholar students residing within 1 km radius',
    'Institute made college bus fee mandatory for all students regardless of residence location. Complaint filed by parent association.',
    'Institute made college bus fee mandatory for all students regardless of residence location. Complaint filed by parent association.',
    'RECEIVED',
    'OFF-PGRC-105',
    'PGRC',
    'Eastern',
    NOW() - INTERVAL '4 days',
    NOW() + INTERVAL '26 days',
    FALSE,
    0.25,
    '[]'::jsonb
),
-- Case 14: Document Withholding (Delhi Institute, Northern) - Third case on high risk inst!
(
    'CMP-2026-PGRC-014',
    '1-48920194',
    'PGRC',
    'Student',
    'Document Withholding',
    'Marksheets withheld demanding payment of unapproved campus placement service charges',
    'Semester 8 final grade card withheld unless student pays Rs. 15,000 placement training fees despite obtaining off-campus job.',
    'Semester 8 final grade card withheld unless student pays Rs. 15,000 placement training fees despite obtaining off-campus job.',
    'JOINT_INQUIRY',
    'OFF-PGRC-104',
    'PGRC',
    'Northern',
    NOW() - INTERVAL '15 days',
    NOW() + INTERVAL '15 days',
    TRUE,
    0.80,
    '[{"factor": "High institution repeat offender index", "weight": 0.50}, {"factor": "Concurrent ongoing regulatory probe", "weight": 0.30}]'::jsonb
),
-- Case 15: Admission Anomaly (Apex College, Southern) - Third case on Apex!
(
    'CMP-2026-REG-015',
    '1-20938471',
    'REGULATION_BUREAU',
    'Public',
    'Admission Anomaly',
    'Admission brochure misrepresenting NBA accreditation status of Mechanical & Civil engineering',
    'College claims tier-1 NBA accreditation on website and regional newspapers, however accreditation expired in 2024.',
    'College claims tier-1 NBA accreditation on website and regional newspapers, however accreditation expired in 2024.',
    'UNDER_SCRUTINY',
    'OFF-REG-205',
    'REGULATION_BUREAU',
    'Southern',
    NOW() - INTERVAL '18 days',
    NOW() + INTERVAL '12 days',
    FALSE,
    0.50,
    '[{"factor": "Misrepresentation in public domain", "weight": 0.50}]'::jsonb
),
-- Case 16: Infrastructure (Maharashtra Institute, Western)
(
    'CMP-2026-PGRC-016',
    '1-68294012',
    'PGRC',
    'Student',
    'Infrastructure',
    'Wheelchair accessibility ramps missing across all library and laboratory blocks for Divyangjan',
    'Differently-abled students are unable to access central library on 2nd floor as elevators remain perpetually switched off to save power.',
    'Differently-abled students are unable to access central library on 2nd floor as elevators remain perpetually switched off to save power.',
    'UNDER_SCRUTINY',
    'OFF-PGRC-108',
    'PGRC',
    'Western',
    NOW() - INTERVAL '9 days',
    NOW() + INTERVAL '21 days',
    FALSE,
    0.40,
    '[{"factor": "Accessibility guidelines compliance", "weight": 0.40}]'::jsonb
),
-- Case 17: Fee Dispute (Hyderabad Institute, South-Central)
(
    'CMP-2026-PGRC-017',
    '1-93820174',
    'PGRC',
    'Student',
    'Fee Dispute',
    'Excessive dissertation submission penalty fee charged after natural medical emergency absence',
    'Student underwent emergency appendectomy with documented hospital records, but college levied Rs. 25,000 late fee.',
    'Student underwent emergency appendectomy with documented hospital records, but college levied Rs. 25,000 late fee.',
    'DISPOSED',
    'OFF-PGRC-107',
    'PGRC',
    'South-Central',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '2 days',
    FALSE,
    0.05,
    '[]'::jsonb
),
-- Case 18: Admission Anomaly (National Capital Regional, Northern)
(
    'CMP-2026-REG-018',
    '1-74920183',
    'REGULATION_BUREAU',
    'Student',
    'Admission Anomaly',
    'Unlawful cancellation of admission and forfeiture of entire 1st year fee upon seat withdrawal',
    'Student withdrew seat 12 days prior to AICTE cut-off date. Institute deducted 100% of the Rs. 1,40,000 paid fee instead of processing standard Rs. 1,000 deduction.',
    'Student withdrew seat 12 days prior to AICTE cut-off date. Institute deducted 100% of the Rs. 1,40,000 paid fee instead of processing standard Rs. 1,000 deduction.',
    'UNDER_SCRUTINY',
    'OFF-REG-202',
    'REGULATION_BUREAU',
    'Northern',
    NOW() - INTERVAL '13 days',
    NOW() + INTERVAL '17 days',
    FALSE,
    0.60,
    '[{"factor": "APH refund guidelines deviation", "weight": 0.60}]'::jsonb
),
-- Case 19: Document Withholding (Rajasthan State, Northern)
(
    'CMP-2026-RO-019',
    '1-10293847',
    'REGIONAL_OFFICE',
    'Faculty',
    'Document Withholding',
    'Relieving letter delayed past 60 days following faculty transfer notification',
    'Associate professor transfer to government college delayed due to administrative backlog at campus registrar desk.',
    'Associate professor transfer to government college delayed due to administrative backlog at campus registrar desk.',
    'RECEIVED',
    'OFF-RO-302',
    'REGIONAL_OFFICE',
    'Northern',
    NOW() - INTERVAL '2 days',
    NOW() + INTERVAL '28 days',
    FALSE,
    0.20,
    '[]'::jsonb
),
-- Case 20: Infrastructure (Delhi Institute, Northern) - SLA Breached
(
    'CMP-2026-RO-020',
    '1-48920194',
    'REGIONAL_OFFICE',
    'Public',
    'Infrastructure',
    'Unauthorized building expansion on municipal easement land without structural stability certificate',
    'Institute constructing additional 4th floor over 30-year-old load-bearing masonry without municipal sanction or approved structural engineer safety audit.',
    'Institute constructing additional 4th floor over 30-year-old load-bearing masonry without municipal sanction or approved structural engineer safety audit.',
    'ESCALATED',
    'OFF-RO-301',
    'REGIONAL_OFFICE',
    'Northern',
    NOW() - INTERVAL '34 days',
    NOW() - INTERVAL '4 days',
    TRUE,
    0.95,
    '[{"factor": "Structural safety hazard", "weight": 0.60}, {"factor": "SLA breached by 4 days", "weight": 0.35}]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 3. CASE OVERLAPS SEED DATA
-- Key pair: CMP-2026-PGRC-001 vs CMP-2026-REG-002
INSERT INTO case_overlaps (
    case_a_id, case_b_id, institution_pid, hybrid_score, semantic_score, 
    category_match_score, keyword_match_score, status, lead_bureau, coordination_notes
) VALUES
(
    'CMP-2026-PGRC-001',
    'CMP-2026-REG-002',
    '1-48920194',
    0.88,
    0.84,
    1.00,
    0.91,
    'PENDING_COORDINATION',
    NULL,
    'Critical cross-bureau overlap detected between PGRC individual student grievance and Regulation Bureau systemic audit regarding unauthorized caution money retention at Delhi Institute.'
),
(
    'CMP-2026-PGRC-003',
    'CMP-2026-REG-004',
    '1-20938471',
    0.91,
    0.89,
    1.00,
    0.88,
    'LINKED',
    'REGULATION_BUREAU',
    'Joint inquiry established under Regulation Bureau lead. Both faculty certificate retention complaints linked for EVC inspection.'
)
ON CONFLICT (case_a_id, case_b_id) DO NOTHING;

-- 4. CRYPTOGRAPHIC AUDIT LOGS (Hash Chain for CMP-2026-PGRC-001)
-- Genesis block: prev_hash is 64 zeros
-- current_hash = SHA-256(prev_hash + ":" + case_id + ":" + seq + ":" + officer_id + ":" + action + ":" + remarks)
-- Precomputed deterministic SHA-256 hashes for seed integrity demonstration
INSERT INTO audit_logs (
    case_id, sequence_num, officer_id, action, remarks, 
    payload_snapshot, prev_hash, current_hash, timestamp
) VALUES
(
    'CMP-2026-PGRC-001',
    1,
    'SYSTEM',
    'CASE_INGESTION',
    'Grievance registered via PGRC Portal with automatic PII sanitization applied.',
    '{"category": "Fee Dispute", "complainant": "Student", "source": "PGRC_PORTAL"}'::jsonb,
    '0000000000000000000000000000000000000000000000000000000000000000',
    '90a3c0f1c1e66a1b450e7c57ad3c31de2e53edfab18b15b44bd855d9ed63b96e',
    NOW() - INTERVAL '8 days'
),
(
    'CMP-2026-PGRC-001',
    2,
    'OFF-PGRC-104',
    'ASSIGNMENT',
    'Case assigned to Northern Region Grievance Scrutiny Officer.',
    '{"assigned_to": "OFF-PGRC-104", "status": "UNDER_SCRUTINY"}'::jsonb,
    '90a3c0f1c1e66a1b450e7c57ad3c31de2e53edfab18b15b44bd855d9ed63b96e',
    '8ff9640196516a893c69189712a9e245101916c626582f6f204e8a13487af8d4',
    NOW() - INTERVAL '7 days'
),
(
    'CMP-2026-PGRC-001',
    3,
    'SYSTEM_AI_ENGINE',
    'OVERLAP_DETECTED',
    'AI Hybrid Similarity Engine detected 88% correlation with Regulation Bureau Case CMP-2026-REG-002.',
    '{"hybrid_score": 0.88, "overlap_case": "CMP-2026-REG-002", "semantic_score": 0.84}'::jsonb,
    '8ff9640196516a893c69189712a9e245101916c626582f6f204e8a13487af8d4',
    'eaf87c9ce3c54ace6e02ff0aeabd322f5d91aff87e9e12000f9b77e008dc1231',
    NOW() - INTERVAL '3 days'
)
ON CONFLICT (case_id, sequence_num) DO NOTHING;

-- 5. NOVELTY SEED: POLICY VERSIONS (APH 2024-27 & APH 2026)
INSERT INTO policy_versions (handbook_version, clause_number, clause_title, description, mandated_penalty, sla_days_ceiling, effective_date, is_active)
VALUES
('APH 2024-27', 'Clause 13.4', 'Refund of Caution Money and Tuition Fees', 'Institutions must refund security/caution deposits within 15 days of program completion or formal clearance.', 'Refund with 12% p.a. penal interest plus forfeiture of 10% unspent development grants', 30, '2024-04-01', TRUE),
('APH 2024-27', 'Clause 11.2', 'Prohibition of Original Certificate Confiscation', 'Under no circumstances shall an AICTE-approved institution retain original academic or personal credentials of faculty or students.', 'Immediate revocation of AICTE approval for the concerned department and Rs. 5 Lakh penalty', 21, '2024-04-01', TRUE),
('APH 2026 Regulations', 'Clause 8.2', 'Institutional Fire Safety & Structural Compliance', 'Mandatory periodic submission of State Fire Service NOC and structural safety certifications.', 'Suspension of student intake for upcoming academic session until EVC clearance', 45, '2026-01-01', TRUE)
ON CONFLICT DO NOTHING;

-- 6. NOVELTY SEED: REUSABLE EVIDENCE PACKAGES
INSERT INTO shared_evidence_packages (institution_pid, case_id, document_type, title, file_hash, verified_by_bureau, verified_date, access_granted_bureaus, source_provenance)
VALUES
('1-48920194', 'CMP-2026-REG-002', 'AUDITED_BALANCE_SHEET', 'Audited Caution Fund Ledger & Bank Statements (FY 2023-25)', '3f7a1c4b9e2d8a5f0123456789abcdef0123456789abcdef0123456789abcdef', 'REGULATION_BUREAU', NOW() - INTERVAL '5 days', '["PGRC","REGULATION_BUREAU","REGIONAL_OFFICE"]'::jsonb, 'Uploaded by DIAS Accounts Registrar during RB compliance audit'),
('1-20938471', 'CMP-2026-REG-004', 'FACULTY_SERVICE_REGISTER', 'Faculty Service Rules & Bond Agreement Register 2025', 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef', 'REGULATION_BUREAU', NOW() - INTERVAL '10 days', '["PGRC","REGULATION_BUREAU"]'::jsonb, 'Seized during Southern Regional Office surprise inspection')
ON CONFLICT DO NOTHING;

-- 7. NOVELTY SEED: COMPLAINT-SPLITTING SUB-TASKS
INSERT INTO case_sub_tasks (parent_case_id, sub_task_id, bureau, category, title, description, status, assigned_officer_id, sla_deadline)
VALUES
('CMP-2026-PGRC-001', 'SUB-001-A', 'PGRC', 'Fee Dispute', 'Individual Complainant Caution Deposit Restitution', 'Expedite individual student caution deposit refund of Rs. 40,000 via direct bank transfer.', 'UNDER_SCRUTINY', 'OFF-PGRC-104', NOW() + INTERVAL '10 days'),
('CMP-2026-PGRC-001', 'SUB-001-B', 'REGULATION_BUREAU', 'Regulatory Non-Compliance', 'Systemic Audit of Institutional Security Deposit Ledger', 'Scrutiny of total caution fund withholding of Rs. 1.2 Crores for the entire 2021-25 batch under APH Clause 13.4.', 'RECEIVED', 'OFF-REG-201', NOW() + INTERVAL '25 days')
ON CONFLICT DO NOTHING;

-- 8. NOVELTY SEED: INSTITUTIONAL CORRECTIVE-ACTION TRACKING (CAPA)
INSERT INTO institutional_corrective_actions (institution_pid, case_id, undertaking_text, target_date, status, evidence_reference, verified_by_officer)
VALUES
('1-48920194', 'CMP-2026-PGRC-001', 'Institute committed to establishing automated online fee refund portal and clearing all batch dues by Nov 30, 2026.', NOW() + INTERVAL '35 days', 'PENDING_VERIFICATION', 'DIAS/OFFICIAL-UNDERTAKING/2026/89', 'OFF-REG-201'),
('1-20938471', 'CMP-2026-PGRC-003', 'Apex College Board of Governors undertaken to unconditionally return all original faculty certificates and abolish illegal bond penalties.', NOW() + INTERVAL '14 days', 'PENDING_VERIFICATION', 'APEX/BOG/RESOLUTION-44-A', 'OFF-REG-205')
ON CONFLICT DO NOTHING;

-- 9. NOVELTY SEED: INTER-BUREAU COLLABORATIVE NOTES
INSERT INTO inter_bureau_notes (overlap_id, case_id, author_officer_id, author_bureau, author_role, note_text, is_confidential, created_at)
VALUES
(1, 'CMP-2026-PGRC-001', 'OFF-PGRC-104', 'PGRC', 'PGRC Scrutiny Officer', 'Requesting joint inspection before show-cause issuance. Complainant provided clearance slip.', FALSE, NOW() - INTERVAL '2 days'),
(1, 'CMP-2026-REG-002', 'OFF-REG-201', 'REGULATION_BUREAU', 'Regulation Enforcement Officer', 'Evidence received from institution; cross-verifying fee refund ledger against total 2021-25 intake.', FALSE, NOW() - INTERVAL '1 day'),
(1, 'CMP-2026-PGRC-001', 'DIR-RO-NORTH', 'REGIONAL_OFFICE', 'Regional Director', 'Agree to merge under Regulation Bureau as lead authority. Regional Office will depute EVC inspectors.', FALSE, NOW() - INTERVAL '4 hours')
ON CONFLICT DO NOTHING;

