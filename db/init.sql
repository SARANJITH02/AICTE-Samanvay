-- ==============================================================================
-- AICTE SAMANVAY (समन्वय) - Air-Gapped Cross-Bureau Grievance & Regulatory Platform
-- Database Initialization & Schema Definition (PostgreSQL 16 + pgvector + pg_trgm)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. DROP TABLES IN REVERSE DEPENDENCY ORDER
DROP TABLE IF EXISTS institutional_corrective_actions CASCADE;
DROP TABLE IF EXISTS shared_evidence_packages CASCADE;
DROP TABLE IF EXISTS case_sub_tasks CASCADE;
DROP TABLE IF EXISTS policy_versions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS case_overlaps CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;

-- 3. INSTITUTIONS TABLE
CREATE TABLE institutions (
    pid VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    region VARCHAR(64) NOT NULL,
    state VARCHAR(64) NOT NULL,
    district VARCHAR(64) NOT NULL,
    address TEXT,
    institution_type VARCHAR(64) DEFAULT 'ENGINEERING_COLLEGE',
    risk_score DOUBLE PRECISION DEFAULT 0.0,
    cii_score INT DEFAULT 850,
    cii_grade VARCHAR(2) DEFAULT 'A',
    cii_breakdown JSONB DEFAULT '{"volumePenalty":0,"recurringPenalty":0,"overduePenalty":0,"disobeyedPenalty":0}'::jsonb,
    cii_appeal_status VARCHAR(64) DEFAULT 'NONE',
    cii_appeal_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigram Index for fuzzy institution resolution
CREATE INDEX idx_institutions_normalized_name_trgm ON institutions USING gin (normalized_name gin_trgm_ops);
CREATE INDEX idx_institutions_region ON institutions(region);

-- 4. COMPLAINTS TABLE (Expanded for 14 Regulatory Novelties)
CREATE TABLE complaints (
    id VARCHAR(64) PRIMARY KEY,
    institution_pid VARCHAR(64) NOT NULL REFERENCES institutions(pid) ON DELETE CASCADE,
    source_bureau VARCHAR(64) NOT NULL, -- 'PGRC', 'REGULATION_BUREAU', 'REGIONAL_OFFICE'
    complainant_type VARCHAR(64) NOT NULL, -- 'Student', 'Faculty', 'Parent', 'Public'
    complainant_mobile VARCHAR(32) DEFAULT '9876543210',
    category VARCHAR(64) NOT NULL, -- 'Fee Dispute', 'Document Withholding', 'Infrastructure', 'Admission Anomaly'
    subject VARCHAR(500) NOT NULL,
    complaint_text TEXT NOT NULL,
    sanitized_text TEXT NOT NULL,
    embedding vector(384),
    status VARCHAR(64) NOT NULL DEFAULT 'RECEIVED', -- 'RECEIVED', 'UNDER_SCRUTINY', 'JOINT_INQUIRY', 'ESCALATED', 'DISPOSED', 'TRANSFER_PENDING'
    assigned_officer_id VARCHAR(64),
    assigned_bureau VARCHAR(64) NOT NULL,
    region VARCHAR(64) NOT NULL,
    received_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
    delay_risk_score DOUBLE PRECISION DEFAULT 0.0,
    delay_risk_reasons JSONB DEFAULT '[]'::jsonb,
    resolution_notes TEXT,
    -- Novelty Capabilities Fields
    confidential_from_institution BOOLEAN NOT NULL DEFAULT FALSE,
    share_with_coordinating_bureaus BOOLEAN NOT NULL DEFAULT TRUE,
    governing_policy_version VARCHAR(64) DEFAULT 'APH 2024-27',
    governing_policy_clause VARCHAR(64) DEFAULT 'Clause 13.4',
    pending_evidence_blockers JSONB DEFAULT '[]'::jsonb,
    transfer_target_bureau VARCHAR(64),
    transfer_status VARCHAR(64) DEFAULT 'NONE', -- 'NONE', 'TRANSFER_PENDING', 'ACCEPTED', 'REJECTED'
    transfer_initiator_bureau VARCHAR(64),
    transfer_notes TEXT,
    affected_students_count INT DEFAULT 1,
    total_relief_amount_inr DOUBLE PRECISION DEFAULT 0.0,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    prior_case_reference VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_complaints_inst_pid ON complaints(institution_pid);
CREATE INDEX idx_complaints_source_bureau ON complaints(source_bureau);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_region ON complaints(region);
CREATE INDEX idx_complaints_sla_deadline ON complaints(sla_deadline);
CREATE INDEX idx_complaints_is_escalated ON complaints(is_escalated);

-- Cosine distance index for pgvector
CREATE INDEX idx_complaints_embedding_hnsw ON complaints USING hnsw (embedding vector_cosine_ops);

-- 5. CASE OVERLAPS TABLE
CREATE TABLE case_overlaps (
    id BIGSERIAL PRIMARY KEY,
    case_a_id VARCHAR(64) NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    case_b_id VARCHAR(64) NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    institution_pid VARCHAR(64) NOT NULL REFERENCES institutions(pid) ON DELETE CASCADE,
    hybrid_score DOUBLE PRECISION NOT NULL,
    semantic_score DOUBLE PRECISION NOT NULL,
    category_match_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    keyword_match_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    status VARCHAR(64) NOT NULL DEFAULT 'PENDING_COORDINATION', -- 'PENDING_COORDINATION', 'LINKED', 'MERGED', 'DISMISSED'
    lead_bureau VARCHAR(64),
    coordination_notes TEXT,
    resolved_by VARCHAR(64),
    resolved_at TIMESTAMP WITH TIME ZONE,
    linking_factors JSONB DEFAULT '[]'::jsonb,
    differentiating_factors JSONB DEFAULT '[]'::jsonb,
    has_contradictory_directives BOOLEAN DEFAULT FALSE,
    contradiction_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_case_pair UNIQUE (case_a_id, case_b_id)
);

CREATE INDEX idx_case_overlaps_inst ON case_overlaps(institution_pid);
CREATE INDEX idx_case_overlaps_status ON case_overlaps(status);

-- 6. AUDIT LOGS (Cryptographic Hash Chain with Ed25519 Signatures)
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    sequence_num BIGINT NOT NULL,
    officer_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    remarks TEXT,
    payload_snapshot JSONB DEFAULT '{}'::jsonb,
    prev_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    officer_signature VARCHAR(256),
    officer_public_key VARCHAR(256),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_audit_case_seq UNIQUE (case_id, sequence_num)
);

CREATE INDEX idx_audit_logs_case ON audit_logs(case_id);

-- 6B. AUDIT CHECKPOINTS (Merkle Root Anchoring & National Witness Signatures)
CREATE TABLE audit_checkpoints (
    id BIGSERIAL PRIMARY KEY,
    checkpoint_id VARCHAR(64) NOT NULL UNIQUE,
    checkpoint_num BIGINT NOT NULL,
    case_id VARCHAR(64) NOT NULL,
    from_seq BIGINT NOT NULL,
    to_seq BIGINT NOT NULL,
    total_blocks INT NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    chain_head_hash VARCHAR(64) NOT NULL,
    witness_signature VARCHAR(256),
    witness_public_key VARCHAR(256),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checkpoint_case ON audit_checkpoints(case_id);
CREATE INDEX idx_checkpoint_num ON audit_checkpoints(checkpoint_num);

-- 7. NOVELTY: COMPLAINT-SPLITTING SUB-TASKS (case_sub_tasks)
CREATE TABLE case_sub_tasks (
    id BIGSERIAL PRIMARY KEY,
    parent_case_id VARCHAR(64) NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    sub_task_id VARCHAR(64) NOT NULL UNIQUE,
    bureau VARCHAR(64) NOT NULL,
    category VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(64) NOT NULL DEFAULT 'RECEIVED',
    assigned_officer_id VARCHAR(64),
    sla_deadline TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subtasks_parent ON case_sub_tasks(parent_case_id);

-- 8. NOVELTY: REUSABLE EVIDENCE PACKAGES (shared_evidence_packages)
CREATE TABLE shared_evidence_packages (
    id BIGSERIAL PRIMARY KEY,
    institution_pid VARCHAR(64) NOT NULL REFERENCES institutions(pid) ON DELETE CASCADE,
    case_id VARCHAR(64) REFERENCES complaints(id) ON DELETE SET NULL,
    document_type VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    verified_by_bureau VARCHAR(64) NOT NULL,
    verified_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_granted_bureaus JSONB DEFAULT '["PGRC","REGULATION_BUREAU","REGIONAL_OFFICE"]'::jsonb,
    document_url TEXT,
    source_provenance TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evidence_inst ON shared_evidence_packages(institution_pid);

-- 9. NOVELTY: INSTITUTIONAL CORRECTIVE-ACTION TRACKING (CAPA)
CREATE TABLE institutional_corrective_actions (
    id BIGSERIAL PRIMARY KEY,
    institution_pid VARCHAR(64) NOT NULL REFERENCES institutions(pid) ON DELETE CASCADE,
    case_id VARCHAR(64) REFERENCES complaints(id) ON DELETE CASCADE,
    undertaking_text TEXT NOT NULL,
    target_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'PENDING_VERIFICATION', -- 'PENDING_VERIFICATION', 'COMPLIED', 'DEFAULTED'
    evidence_reference TEXT,
    verified_by_officer VARCHAR(64),
    compliance_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_capa_inst ON institutional_corrective_actions(institution_pid);
CREATE INDEX idx_capa_case ON institutional_corrective_actions(case_id);

-- 10. NOVELTY: POLICY-VERSION-AWARE WORKFLOWS
CREATE TABLE policy_versions (
    id BIGSERIAL PRIMARY KEY,
    handbook_version VARCHAR(64) NOT NULL, -- e.g. 'APH 2024-27', 'APH 2026 Regulations'
    clause_number VARCHAR(64) NOT NULL,
    clause_title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    mandated_penalty TEXT,
    sla_days_ceiling INT DEFAULT 30,
    effective_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_policy_version ON policy_versions(handbook_version, clause_number);

-- 11. NOVELTY: CONTEXTUAL INTER-BUREAU COLLABORATIVE NOTES
CREATE TABLE IF NOT EXISTS inter_bureau_notes (
    id BIGSERIAL PRIMARY KEY,
    overlap_id BIGINT REFERENCES case_overlaps(id) ON DELETE CASCADE,
    case_id VARCHAR(50) REFERENCES complaints(id) ON DELETE SET NULL,
    author_officer_id VARCHAR(100) NOT NULL,
    author_bureau VARCHAR(50) NOT NULL,
    author_role VARCHAR(100) NOT NULL,
    note_text TEXT NOT NULL,
    is_confidential BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_overlap ON inter_bureau_notes(overlap_id);

-- 12. ENTERPRISE USERS TABLE (BCrypt + TOTP + RBAC + Institution Scope)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    role VARCHAR(64) NOT NULL,
    bureau VARCHAR(64) NOT NULL,
    region VARCHAR(64) NOT NULL,
    institution_pid VARCHAR(64),
    totp_secret VARCHAR(64),
    totp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_region ON users(region);

-- 13. AIR-GAPPED NOTIFICATION OUTBOX TABLE (SMS / Email / In-App Simulator)
CREATE TABLE IF NOT EXISTS notification_outbox (
    id BIGSERIAL PRIMARY KEY,
    recipient VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL, -- 'SMS', 'EMAIL', 'IN_APP'
    channel VARCHAR(64) NOT NULL, -- 'OFFICER_ALERT', 'SUPERVISOR_ALERT', 'APEX_ESCALATION', 'COMPLAINANT_OTP', 'COMPLAINANT_UPDATE', 'CAPA_NOTICE'
    case_id VARCHAR(64),
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DISPATCHED',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outbox_channel ON notification_outbox(channel);
CREATE INDEX IF NOT EXISTS idx_outbox_case_id ON notification_outbox(case_id);
CREATE INDEX IF NOT EXISTS idx_outbox_recipient ON notification_outbox(recipient);
CREATE INDEX IF NOT EXISTS idx_outbox_is_read ON notification_outbox(is_read);
