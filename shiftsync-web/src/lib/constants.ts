// ShiftSync Shared Constants and Types

// Skill color configuration - updated to indigo palette
export const SKILL_COLORS = {
  BARTENDER: {
    bg: "bg-indigo-100",
    border: "border-indigo-300",
    text: "text-indigo-800",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  SERVER: {
    bg: "bg-violet-100",
    border: "border-violet-300",
    text: "text-violet-800",
    badge: "bg-violet-100 text-violet-800 border-violet-300",
  },
  COOK: {
    bg: "bg-orange-100",
    border: "border-orange-300",
    text: "text-orange-800",
    badge: "bg-orange-100 text-orange-800 border-orange-300",
  },
  HOST: {
    bg: "bg-cyan-100",
    border: "border-cyan-300",
    text: "text-cyan-800",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-300",
  },
  LINE_COOK: {
    bg: "bg-red-100",
    border: "border-red-300",
    text: "text-red-800",
    badge: "bg-red-100 text-red-800 border-red-300",
  },
  BARBACK: {
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
    badge: "bg-slate-100 text-slate-700 border-slate-300",
  },
} as const

export type SkillType = keyof typeof SKILL_COLORS

// Role configuration
export const ROLE_COLORS = {
  ADMIN: "bg-indigo-100 text-indigo-800 border-indigo-300",
  MANAGER: "bg-emerald-100 text-emerald-800 border-emerald-300",
  STAFF: "bg-slate-100 text-slate-700 border-slate-300",
} as const

export type UserRole = keyof typeof ROLE_COLORS

// Status configurations
export const STATUS_COLORS = {
  PENDING: { label: "Pending", color: "bg-sky-100 text-sky-800 border-sky-200" },
  ACCEPTED: { label: "Accepted", color: "bg-teal-100 text-teal-800 border-teal-200" },
  MANAGER_REVIEW: { label: "Manager Review", color: "bg-amber-100 text-amber-800 border-amber-200" },
  APPROVED: { label: "Approved", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200" },
  CANCELLED: { label: "Cancelled", color: "bg-slate-100 text-slate-700 border-slate-200" },
  EXPIRED: { label: "Expired", color: "bg-slate-100 text-slate-500 border-slate-200" },
} as const

export type RequestStatus = keyof typeof STATUS_COLORS

export const SHIFT_STATUS_COLORS = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-600 border-slate-300", border: "border-l-slate-400" },
  PUBLISHED: { label: "Published", color: "bg-emerald-100 text-emerald-700 border-emerald-300", border: "border-l-emerald-500" },
} as const

export type ShiftStatus = keyof typeof SHIFT_STATUS_COLORS

// Constraint rules
export const CONSTRAINT_RULES = {
  // Hard violations
  DOUBLE_BOOKING: "Double Booking",
  REST_PERIOD: "Rest Period",
  SKILL_MISMATCH: "Skill Mismatch",
  CERT_MISSING: "Certification Missing",
  UNAVAILABLE: "Unavailable",
  AVAILABILITY_EXCEPTION: "Availability Exception",
  DAILY_HOURS_HARD: "Daily Hours Limit",
  SEVENTH_DAY_BLOCK: "7th Day Block",
  // Soft warnings
  DAILY_HOURS_SOFT: "Daily Hours Warning",
  WEEKLY_HOURS_35: "Weekly Hours 35+",
  WEEKLY_HOURS_APPROACHING_OT: "Approaching Overtime",
  CONSECUTIVE_6TH_DAY: "6th Consecutive Day",
  CONSECUTIVE_7TH_REQUIRES_OVERRIDE: "7th Day Override Required",
} as const

// Action colors for audit
export const AUDIT_ACTION_COLORS = {
  ASSIGNED: "bg-indigo-100 text-indigo-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  UNASSIGNED: "bg-red-100 text-red-800",
  SWAP: "bg-violet-100 text-violet-800",
  CREATED: "bg-sky-100 text-sky-800",
  UPDATED: "bg-amber-100 text-amber-800",
  DELETED: "bg-red-100 text-red-800",
} as const

// Notification types and icons
export const NOTIFICATION_TYPES = {
  SHIFT_ASSIGNED: { label: "Shift Assigned", color: "bg-emerald-500" },
  SHIFT_CHANGED: { label: "Shift Changed", color: "bg-amber-500" },
  SHIFT_UNASSIGNED: { label: "Shift Unassigned", color: "bg-red-500" },
  SCHEDULE_PUBLISHED: { label: "Schedule Published", color: "bg-indigo-500" },
  SWAP_REQUEST: { label: "Swap Request", color: "bg-violet-500" },
  SWAP_ACCEPTED: { label: "Swap Accepted", color: "bg-teal-500" },
  SWAP_RESOLVED: { label: "Swap Resolved", color: "bg-emerald-500" },
  COVERAGE_REQUEST: { label: "Coverage Request", color: "bg-amber-500" },
  OVERTIME_WARNING: { label: "Overtime Warning", color: "bg-red-500" },
  AVAILABILITY_CHANGED: { label: "Availability Changed", color: "bg-sky-500" },
  GENERAL: { label: "General", color: "bg-slate-500" },
} as const

export type NotificationType = keyof typeof NOTIFICATION_TYPES

// Primary color for ShiftSync
export const PRIMARY_COLOR = "#4F46E5" // indigo-600
