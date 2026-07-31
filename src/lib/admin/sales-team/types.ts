/**
 * Shareholder sales team — types and labels.
 * Shawn / Miles are 股东 / 负责人 — never 员工.
 */

export const SHAREHOLDER_NAMES = ["Shawn", "Miles"] as const;
export type ShareholderName = (typeof SHAREHOLDER_NAMES)[number];

export const AVAILABILITY_STATUSES = [
  "active",
  "paused",
  "existing_only",
] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  active: "正常接收询盘",
  paused: "暂停接收询盘",
  existing_only: "仅处理现有客户",
};

export const REASSIGN_REASONS = [
  "客户语言需求",
  "工作量调整",
  "客户指定联系人",
  "原负责人暂时无法跟进",
  "其他",
] as const;

export type SalesTeamRangePreset =
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "custom";

export type ShareholderWorkload = {
  openInquiries: number;
  todayFollowUp: number;
  overdue: number;
  highPriority: number;
  interested: number;
  quoting: number;
  negotiating: number;
};

export type ShareholderCard = {
  id: string;
  name: ShareholderName;
  identityLabel: "股东";
  displayName: string;
  role: string | null;
  availabilityStatus: AvailabilityStatus;
  availabilityLabel: string;
  workload: ShareholderWorkload;
  wonPeriod: number;
  lostPeriod: number;
  quotingPeriod: number;
  lastAssignedAt: string | null;
  hasWhatsApp: boolean;
  whatsappLabel: string | null;
  qrPath: string | null;
  /** Never include raw phone on list payloads */
};

export type AssignmentBalance = {
  shawnCount: number;
  milesCount: number;
  total: number;
  shawnPercent: number;
  milesPercent: number;
  latestAt: string | null;
  nextRecipient: string | null;
  summaryLabel: string;
};

export type RecentAssignment = {
  id: string;
  at: string;
  inquiryId: string | null;
  inquiryNumber: string | null;
  customerName: string | null;
  vehicleTitle: string | null;
  assignedContact: string;
  assignmentType: "自动分配" | "手动指定" | "重新转交";
  source: string | null;
};

export type TeamActivity = {
  id: string;
  at: string;
  shareholderName: string | null;
  description: string;
  inquiryNumber: string | null;
  inquiryId: string | null;
};

export type SalesTeamSummary = {
  activeReceivers: number;
  openInquiries: number;
  todayFollowUp: number;
  overdue: number;
  assignedLast30d: number;
  wonLast30d: number;
};

export type SalesTeamPeriodResults = {
  won: number;
  lost: number;
  open: number;
};

export type SalesTeamDashboard = {
  generatedAt: string;
  timezone: string;
  range: {
    preset: SalesTeamRangePreset;
    startIso: string;
    endIso: string;
    startLabel: string;
    endLabel: string;
  };
  summary: SalesTeamSummary;
  shareholders: ShareholderCard[];
  balance: AssignmentBalance;
  periodResults: SalesTeamPeriodResults;
  recentAssignments: RecentAssignment[];
  recentActivity: TeamActivity[];
  noActiveWarning: string | null;
  error: string | null;
};

export function isShareholderName(v: unknown): v is ShareholderName {
  return typeof v === "string" && (SHAREHOLDER_NAMES as readonly string[]).includes(v);
}

export function isAvailabilityStatus(v: unknown): v is AvailabilityStatus {
  return (
    typeof v === "string" &&
    (AVAILABILITY_STATUSES as readonly string[]).includes(v)
  );
}
