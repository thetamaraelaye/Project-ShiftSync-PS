import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface ConstraintViolation {
  rule: 'DOUBLE_BOOKING' | 'REST_PERIOD' | 'SKILL_MISMATCH' | 'CERT_MISSING' | 'UNAVAILABLE' | 'AVAILABILITY_EXCEPTION' | 'DAILY_HOURS_HARD' | 'SEVENTH_DAY_BLOCK';
  message: string;
}

export interface ConstraintWarning {
  rule: 'DAILY_HOURS_SOFT' | 'WEEKLY_HOURS_35' | 'WEEKLY_HOURS_APPROACHING_OT' | 'CONSECUTIVE_6TH_DAY' | 'CONSECUTIVE_7TH_REQUIRES_OVERRIDE';
  message: string;
  currentValue?: number;
  projectedValue?: number;
}

export interface StaffSuggestion {
  userId: string;
  firstName: string;
  lastName: string;
  weeklyHours: number;
  warnings: ConstraintWarning[];
}

export interface ConstraintResult {
  valid: boolean;
  violations: ConstraintViolation[];
  warnings: ConstraintWarning[];
  suggestions?: StaffSuggestion[];
}

interface ViolationBannerProps {
  result: ConstraintResult;
  onSelectSuggestion?: (userId: string) => void;
  overrideReason?: string;
  onOverrideChange?: (val: string) => void;
}

export function ViolationBanner({ result, onSelectSuggestion, overrideReason, onOverrideChange }: ViolationBannerProps) {
  if (result.valid && result.warnings.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        <span className="text-sm font-medium text-emerald-800">No constraint violations. Ready to assign.</span>
      </div>
    );
  }

  const hasOverrideRequired = result.violations.some(v => v.rule === 'SEVENTH_DAY_BLOCK');
  const isHardViolation = !result.valid && !hasOverrideRequired; // Normal violation (e.g. double booking)
  const isStateC = hasOverrideRequired; 
  const isStateB = result.valid && result.warnings.length > 0;

  if (isHardViolation) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-red-100">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <h4 className="font-semibold text-red-700 text-sm">Cannot Assign — {result.violations.length} violation(s)</h4>
          </div>
          <ul className="space-y-2">
            {result.violations.map((v, i) => (
              <li key={i} className="flex gap-2 text-sm text-red-800 bg-red-100/50 p-2 rounded items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-bold text-[10px] uppercase tracking-wider bg-white/60 text-red-700 px-1 py-0.5 rounded mr-2 break-keep border border-red-200">{v.rule.replace(/_/g, ' ')}</span>
                  <span>{v.message}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {result.warnings.length > 0 && (
          <div className="p-4 border-t border-amber-100 bg-amber-50">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">{result.warnings.length} Warning{result.warnings.length > 1 ? 's' : ''}</span>
            </div>
            <ul className="space-y-1.5">
              {result.warnings.map((w, i) => (
                <li key={i} className="flex gap-2 text-sm text-amber-900 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>{w.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={`p-4 border-t ${result.suggestions && result.suggestions.length > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
          {result.suggestions && result.suggestions.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-emerald-800 mb-3">
                {result.suggestions.length} qualified alternative{result.suggestions.length > 1 ? 's' : ''} — click to select
              </p>
              <div className="space-y-2">
                {result.suggestions.slice(0, 5).map(s => (
                  <button
                    key={s.userId}
                    onClick={() => onSelectSuggestion && onSelectSuggestion(s.userId)}
                    className="w-full text-left bg-white border border-slate-200 hover:border-violet-400 hover:shadow-sm rounded p-2 flex items-center justify-between transition-all"
                  >
                    <div>
                      <span className="text-sm font-medium text-slate-900">{s.firstName} {s.lastName}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{s.weeklyHours}h this week</p>
                    </div>
                    {s.warnings.length > 0 ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">WARNING</span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">IDEAL</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <span>ℹ</span>
              No other qualified staff available for this shift — check skills, certifications, and availability.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (isStateC) {
    const otherViolations = result.violations.filter(v => v.rule !== 'SEVENTH_DAY_BLOCK')

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
         <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <h4 className="font-semibold text-red-700 text-sm">Manager Override Required</h4>
          </div>
          <ul className="space-y-2">
            {result.violations.filter(v => v.rule === 'SEVENTH_DAY_BLOCK').map((v, i) => (
              <li key={i} className="flex gap-2 text-sm text-red-800 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <span>{v.message}</span>
              </li>
            ))}
          </ul>

          {otherViolations.length > 0 && (
            <div className="bg-red-100/60 rounded p-2 space-y-1">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Additional violations (cannot override)</p>
              {otherViolations.map((v, i) => (
                <div key={i} className="flex gap-2 text-sm text-red-800 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-[10px] uppercase tracking-wider bg-white/60 text-red-700 px-1 py-0.5 rounded mr-2 border border-red-200">{v.rule.replace(/_/g, ' ')}</span>
                    <span>{v.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {result.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">{result.warnings.length} Warning{result.warnings.length > 1 ? 's' : ''}</span>
              </div>
              <ul className="space-y-1.5">
                {result.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2 text-sm text-amber-900 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{w.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white p-3 rounded border border-red-200 shadow-sm">
            <label className="text-xs font-semibold text-red-700 mb-2 block uppercase tracking-wider">Override Reason</label>
            <textarea 
              className="w-full text-sm border-slate-200 rounded focus:border-red-500 focus:ring-red-500 p-2 min-h-15"
              placeholder="Explain why this assignment is necessary despite the rule..."
              value={overrideReason || ''}
              onChange={(e) => onOverrideChange && onOverrideChange(e.target.value)}
            />
          </div>
      </div>
    );
  }

  if (isStateB) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
         <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <h4 className="font-semibold text-amber-800 text-sm">{result.warnings.length} Warning(s) — Review Before Assigning</h4>
          </div>
          <ul className="space-y-3">
            {result.warnings.map((w, i) => (
              <li key={i} className="flex gap-2 items-start bg-white/60 p-2 rounded border border-amber-100">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-900 font-medium">{w.message}</p>
                  {w.currentValue !== undefined && w.projectedValue !== undefined && (
                    <div className="mt-2">
                       <div className="flex justify-between text-xs text-amber-700 mb-1">
                         <span>{w.currentValue}h</span>
                         <span className="font-bold flex items-center gap-1">
                           <span>→</span> {w.projectedValue}h
                         </span>
                       </div>
                       <div className="h-1.5 w-full bg-amber-200 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-amber-500" 
                           style={{ width: `${Math.min((w.projectedValue / 40) * 100, 100)}%` }}
                         />
                       </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
      </div>
    );
  }

  return null;
}
