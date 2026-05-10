// ShiftSync Shared Types

import type { SkillType, UserRole, ShiftStatus, RequestStatus, NotificationType } from "./constants"

// Dashboard Types
export interface DashboardStats {
  totalStaff: number
  shiftsThisWeek: number
  publishedShifts: number
  draftShifts: number
  pendingApprovals: number
  overtimeAtRisk: number
  onDutyNow: number
}

export interface LocationStatus {
  id: string
  name: string
  city: string
  timezone: string
  staffOnDuty: number
  shiftsToday: number
  coverageGaps: number
  publishStatus: "PUBLISHED" | "DRAFT" | "MIXED"
}

export interface OvertimeRisk {
  userId: string
  firstName: string
  lastName: string
  totalHours: number
  status: "AT_RISK" | "OVER"
}

export interface FairnessAlert {
  userId: string
  firstName: string
  lastName: string
  premiumShifts: number
  fairnessScore: number
}

export interface AuditEntry {
  id: string
  action: string
  actorName: string
  actorRole: string
  entityType: string
  createdAt: string
}

export interface OnDutyStaff {
  userId: string
  firstName: string
  lastName: string
  locationName: string
  shiftEndTime: string
  skill: SkillType
}

// Manager Dashboard Types
export interface PendingApproval {
  id: string
  type: "SWAP" | "DROP"
  requesterName: string
  targetName: string | null
  shiftDate: string
  shiftTime: string
  locationName: string
  requiredSkill: SkillType
  reason: string | null
}

export interface CoverageGap {
  shiftId: string
  locationName: string
  date: string
  startTime: string
  endTime: string
  requiredSkill: SkillType
  assigned: number
  needed: number
}

export interface OvertimeWarning {
  userId: string
  name: string
  totalHours: number
  projectedHours: number
}

// Staff Dashboard Types
export interface MyShift {
  id: string
  locationName: string
  locationTimezone: string
  startTime: string
  endTime: string
  requiredSkill: SkillType
  status: "ASSIGNED" | "CONFIRMED"
  isPremium: boolean
}

export interface SwapRequest {
  id: string
  type: "SWAP" | "DROP"
  status: RequestStatus
  shiftDate: string
  locationName: string
  targetName: string | null
}

export interface OpenShift {
  id: string
  locationName: string
  date: string
  startTime: string
  endTime: string
  requiredSkill: SkillType
  expiresAt: string
  requesterName: string
}

// Schedule Types
export interface Shift {
  id: string
  locationId: string
  locationName: string
  locationTimezone: string
  startTime: string
  endTime: string
  requiredSkill: SkillType
  headcount: number
  status: ShiftStatus
  isPremium: boolean
  assignments: ShiftAssignment[]
  hasPendingSwap: boolean
}

export interface ShiftAssignment {
  userId: string
  firstName: string
  lastName: string
  status: "ASSIGNED" | "CONFIRMED" | "CANCELLED"
}

// Constraint Types
export interface StaffCandidate {
  userId: string
  firstName: string
  lastName: string
  email: string
  skills: SkillType[]
  weeklyHours: number
  desiredWeeklyHours: number | null
}

export interface ConstraintViolation {
  rule: "DOUBLE_BOOKING" | "REST_PERIOD" | "SKILL_MISMATCH" | "CERT_MISSING" | "UNAVAILABLE" | "AVAILABILITY_EXCEPTION" | "DAILY_HOURS_HARD" | "SEVENTH_DAY_BLOCK"
  message: string
}

export interface ConstraintWarning {
  rule: "DAILY_HOURS_SOFT" | "WEEKLY_HOURS_35" | "WEEKLY_HOURS_APPROACHING_OT" | "CONSECUTIVE_6TH_DAY" | "CONSECUTIVE_7TH_REQUIRES_OVERRIDE"
  message: string
  currentValue?: number
  projectedValue?: number
}

export interface StaffSuggestion {
  userId: string
  firstName: string
  lastName: string
  weeklyHours: number
  skills: SkillType[]
  warnings: ConstraintWarning[]
}

export interface ConstraintResult {
  valid: boolean
  violations: ConstraintViolation[]
  warnings: ConstraintWarning[]
  suggestions?: StaffSuggestion[]
}

// Coverage/Swap Request Types (extended)
export interface SwapRequestFull {
  id: string
  type: "SWAP" | "DROP"
  status: RequestStatus
  requesterName: string
  requesterAvatar: string
  targetName: string | null
  shiftId: string
  shiftDate: string
  shiftStartTime: string
  shiftEndTime: string
  locationName: string
  locationTimezone: string
  requiredSkill: SkillType
  reason: string | null
  expiresAt: string | null
  createdAt: string
}

// Analytics Types
export interface OvertimeStaffData {
  userId: string
  firstName: string
  lastName: string
  totalHours: number
  overtimeHours: number
  atRisk: boolean
  overThreshold: boolean
  desiredWeeklyHours: number | null
}

export interface OvertimeSummary {
  weekStart: string
  totalStaff: number
  atRisk: number
  overThreshold: number
  projectedOvertimeCost: number
}

export interface FairnessStaffData {
  userId: string
  firstName: string
  lastName: string
  totalShifts: number
  totalHours: number
  premiumShifts: number
  premiumHours: number
  fairnessScore: number
  desiredWeeklyHours: number | null
}

export interface FairnessSummary {
  totalPremiumShifts: number
  staffCount: number
  averagePremiumPerStaff: string
  overScheduled: number
  underScheduled: number
}

// Notification Types
export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  metadata: { shiftId?: string; requestId?: string; locationId?: string } | null
  createdAt: string
}
