export type BureauType = 'PGRC' | 'REGULATION_BUREAU' | 'REGIONAL_OFFICE';
export type ComplaintStatus = 'RECEIVED' | 'UNDER_SCRUTINY' | 'JOINT_INQUIRY' | 'ESCALATED' | 'DISPOSED' | 'TRANSFER_PENDING';
export type OverlapStatus = 'PENDING_COORDINATION' | 'LINKED' | 'MERGED' | 'DISMISSED';

export type UserRole =
  | 'ROLE_PGRC_OFFICER'
  | 'ROLE_REGULATION_OFFICER'
  | 'ROLE_REGIONAL_OFFICER'
  | 'ROLE_APEX_ADMIN'
  | 'ROLE_INSTITUTION_NODAL';

export interface Persona {
  id: string;
  name: string;
  role: UserRole;
  bureau: string;
  defaultRegion: string;
  badgeColor: string;
  avatarText: string;
  description?: string;
}

export interface CiiBreakdown {
  volumePenalty: number;
  recurringPenalty: number;
  overduePenalty: number;
  disobeyedPenalty: number;
  volumeCount?: number;
  recurringCount?: number;
  overdueCount?: number;
  disobeyedCount?: number;
}

export interface Institution {
  pid: string;
  name: string;
  normalized_name?: string;
  region: string;
  state: string;
  district: string;
  address?: string;
  institutionType?: string;
  riskScore: number;
  ciiScore?: number;
  ciiGrade?: 'A' | 'B' | 'C' | 'D' | string;
  ciiBreakdown?: CiiBreakdown;
  approvedIntake?: number;
}

export interface CaseSubTask {
  id?: number;
  parentCaseId: string;
  subTaskId: string;
  bureau: string;
  category: string;
  title: string;
  description?: string;
  status: string;
  assignedOfficerId?: string;
  slaDeadline?: string;
  resolutionNotes?: string;
}

export interface SharedEvidencePackage {
  id?: number;
  institutionPid: string;
  caseId?: string;
  documentType: string;
  title: string;
  fileHash: string;
  verifiedByBureau: string;
  verifiedDate: string;
  accessGrantedBureaus?: string[];
  documentUrl?: string;
  sourceProvenance?: string;
}

export interface InstitutionalCorrectiveAction {
  id?: number;
  institutionPid: string;
  caseId: string;
  undertakingText: string;
  targetDate: string;
  status: 'PENDING_VERIFICATION' | 'COMPLIED' | 'DEFAULTED';
  evidenceReference?: string;
  verifiedByOfficer?: string;
  complianceDate?: string;
}

export interface PolicyVersion {
  id?: number;
  handbookVersion: string;
  clauseNumber: string;
  clauseTitle: string;
  description: string;
  mandatedPenalty?: string;
  slaDaysCeiling?: number;
  effectiveDate: string;
  isActive?: boolean;
}

export interface ExplainableFactor {
  title: string;
  weight: string;
  detail: string;
  isPositive: boolean;
}

export interface Complaint {
  id: string;
  institutionPid: string;
  institutionName: string;
  sourceBureau: BureauType;
  complainantType: string;
  complainantMobile?: string;
  category: string;
  subject: string;
  complaintText: string;
  sanitizedText: string;
  status: ComplaintStatus;
  assignedOfficerId?: string;
  assignedBureau: string;
  region: string;
  receivedDate: string;
  slaDeadline: string;
  isEscalated: boolean;
  delayRiskScore: number;
  delayRiskReasons: string;
  resolutionNotes?: string;
  daysRemainingSla?: number;
  hasOverlap?: boolean;
  // Novelty capabilities
  confidentialFromInstitution?: boolean;
  shareWithCoordinatingBureaus?: boolean;
  governingPolicyVersion?: string;
  governingPolicyClause?: string;
  pendingEvidenceBlockers?: string[];
  transferTargetBureau?: string;
  transferStatus?: string;
  transferInitiatorBureau?: string;
  transferNotes?: string;
  affectedStudentsCount?: number;
  totalReliefAmountInr?: number;
  isRecurring?: boolean;
  priorCaseReference?: string;
  subTasks?: CaseSubTask[];
}

export interface CaseOverlap {
  id: number;
  caseA: Complaint;
  caseB: Complaint;
  institution: Institution;
  hybridScore: number;
  semanticScore: number;
  categoryMatchScore: number;
  keywordMatchScore: number;
  status: OverlapStatus;
  leadBureau?: string;
  coordinationNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  linkingFactors?: ExplainableFactor[];
  differentiatingFactors?: ExplainableFactor[];
  hasContradictoryDirectives?: boolean;
  contradictionDetails?: string;
}

export interface AuditLog {
  id?: number;
  caseId: string;
  sequenceNum: number;
  officerId: string;
  action: string;
  remarks: string;
  payloadSnapshot: string;
  prevHash: string;
  currentHash: string;
  officerSignature?: string;
  officerPublicKey?: string;
  timestamp: string;
}

export interface BlockVerificationDetail {
  sequenceNum: number;
  action: string;
  officerId: string;
  recordedPrevHash: string;
  expectedPrevHash: string;
  recordedCurrentHash: string;
  recomputedCurrentHash: string;
  officerSignature?: string;
  officerPublicKey?: string;
  signatureValid?: boolean;
  checkpointStatus?: string;
  blockValid: boolean;
  timestamp: string;
}

export interface AuditVerificationResult {
  caseId: string;
  chainValid: boolean;
  isValid?: boolean;
  brokenAtSeq?: number | null;
  brokenAtSequence?: number | null;
  totalBlocks: number;
  genesisHash: string;
  latestHash: string;
  checkpointCount?: number;
  latestCheckpointId?: string | null;
  latestMerkleRoot?: string | null;
  witnessSignatureValid?: boolean;
  verificationDetails: BlockVerificationDetail[];
  tamperAlertMessage?: string | null;
}

export interface StatsSummary {
  totalCases: number;
  activePgrc: number;
  activeRegulationBureau: number;
  activeRegionalOffice: number;
  pendingOverlaps: number;
  breachedSla: number;
  nearBreachSla: number;
  overallResolutionRate: number;
  casesByCategory: Record<string, number>;
  casesByRegion: Record<string, number>;
  casesByStatus: Record<string, number>;
  totalReliefDeliveredInr?: number;
  totalImpactedStudents?: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'INSTITUTION' | 'COMPLAINT' | 'BUREAU' | 'OFFICER';
  status?: string;
  riskScore?: number;
  caseCount?: number;
  region?: string;
  ciiScore?: number;
  ciiGrade?: 'A' | 'B' | 'C' | 'D' | string;
  ciiBreakdown?: CiiBreakdown;
  pid?: string;
  activeGrievances?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number;
  type: 'FILED_AGAINST' | 'PROCESSED_BY' | 'OVERLAP_RELATION';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface InterBureauNote {
  id: number;
  overlapId: number;
  caseId?: string;
  authorOfficerId: string;
  authorBureau: string;
  authorRole: string;
  noteText: string;
  isConfidential?: boolean;
  createdAt: string;
}

export interface RootCauseCluster {
  phrase: string;
  frequency: number;
  percentage: number;
  colleges_affected: number;
  z_score: number;
  is_systemic_anomaly: boolean;
  recommended_action: string;
}

export interface RootCauseResponse {
  region: string;
  total_complaints_analyzed: number;
  systemic_anomaly_detected: boolean;
  anomaly_alert_summary?: string | null;
  top_clusters: RootCauseCluster[];
}

export interface SeasonalForecastMonth {
  month: string;
  actualVolume: number;
  projectedVolume: number;
  confidenceUpper: number;
  confidenceLower: number;
  surgeType: string;
  surgeFactor: string;
}

export interface SeasonalForecastResponse {
  region: string;
  forecastHorizonDays: number;
  forecastPeriod: string;
  monthlyData: SeasonalForecastMonth[];
  operationalRecommendation: string;
}

export interface DuplicateWarning {
  caseId: string;
  title: string;
  bureau: BureauType;
  status: ComplaintStatus;
  institutionName: string;
  similarityPercent: number;
  warning: string;
}

export interface Precedent {
  caseId: string;
  title: string;
  category: string;
  institutionName: string;
  resolutionNotes: string;
  daysTaken: number;
  reliefAmountInr: number;
  appliedClauses: string;
  similarityPercent: number;
  precedentBadge?: string;
}

export interface LlmDraftResponse {
  draftType: string;
  content: string;
  citedClauses: string[];
  engine: string;
  isFallback: boolean;
  watermark: string;
  generatedAt: string;
}

export interface NotificationOutboxMessage {
  id: number;
  recipient: string;
  type: 'SMS' | 'EMAIL' | 'IN_APP';
  channel: string;
  caseId?: string;
  subject: string;
  body: string;
  status: string;
  isRead: boolean;
  createdAt: string;
}

export interface TimelineMilestone {
  step: string;
  title: string;
  date: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  description: string;
}

export interface PublicCaseTimeline {
  caseId: string;
  institutionName: string;
  category: string;
  subject: string;
  status: string;
  receivedDate: string;
  slaDeadline: string;
  slaDaysRemaining: number;
  slaStatus: string;
  publicSummary: string;
  milestones: TimelineMilestone[];
}

export interface OcrExtractionResult {
  filename: string;
  sha256: string;
  extracted_text: string;
  sanitized_text: string;
  char_count: number;
  redaction_count: number;
  redaction_details: Record<string, number>;
  ocr_engine: string;
}

