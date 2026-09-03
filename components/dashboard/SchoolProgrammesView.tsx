"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Loader2,
  MapPin,
  Menu,
  Pencil,
  RotateCcw,
  StickyNote,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgrammeCareer, ProgrammeCareerStatus, ProgrammeSession, SchoolProgrammeSchedule } from '@/lib/types';
import { cn } from '@/lib/utils';

const statuses = ['All', 'Upcoming', 'Completed', 'Cancelled'];

type Filters = {
  school: string;
  academicYear: string;
  grade: string;
  status: string;
};

function todayInProgrammeTimeZone() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Sessions are already sorted by date/time server-side, so the first one
// whose date hasn't passed is today's or the nearest upcoming session.
function findDefaultSession(sessions: ProgrammeSession[]): ProgrammeSession | undefined {
  if (sessions.length === 0) return undefined;
  const today = todayInProgrammeTimeZone();
  return sessions.find(session => session.date >= today) || sessions[sessions.length - 1];
}

const WEEKDAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function parseDateOnly(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToDate(date: string, days: number): string {
  const next = parseDateOnly(date);
  next.setUTCDate(next.getUTCDate() + days);
  return formatDateOnly(next);
}

function formatDayChip(date: string): { weekday: string; dayMonth: string } {
  const parsed = parseDateOnly(date);
  return {
    weekday: WEEKDAY_SHORT[parsed.getUTCDay()],
    dayMonth: `${String(parsed.getUTCDate()).padStart(2, '0')} ${MONTH_SHORT[parsed.getUTCMonth()]}`,
  };
}

function discussedCount(session: ProgrammeSession) {
  return session.careers.filter(career => career.status === 'discussed').length;
}

function isCancelled(session: ProgrammeSession) {
  return session.status === 'cancelled_restorable' || session.status === 'cancelled_passed';
}

function isPassedCancelled(session: ProgrammeSession) {
  return session.status === 'cancelled_passed';
}

function careerDotClass(color: ProgrammeCareer['color']) {
  return {
    indigo: 'bg-indigo-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    sky: 'bg-sky-500',
    slate: 'bg-slate-300',
  }[color];
}

function statusMatches(session: ProgrammeSession, status: string) {
  if (status === 'All') return true;
  if (status === 'Cancelled') return isCancelled(session);
  if (status === 'Completed') return session.status === 'completed';
  return session.status === 'scheduled';
}

function sessionSourceImage(schedule: SchoolProgrammeSchedule | null, session: ProgrammeSession | undefined) {
  if (!schedule || !session) return '';
  return schedule.programme.timetableSlots.find(slot => slot.id === session.timetableSlotId)?.sourceImage || '';
}

function SessionCard({
  session,
  selected,
  onSelect,
}: {
  session: ProgrammeSession;
  selected: boolean;
  onSelect: () => void;
}) {
  const discussed = discussedCount(session);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-2xl border p-4 text-left shadow-sm transition-all',
        selected ? 'border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900/30' : 'border-slate-200 dark:border-slate-800',
        isCancelled(session)
          ? 'bg-red-50/40 opacity-85 dark:bg-red-950/10'
          : 'bg-white hover:border-primary-200 dark:bg-slate-900 dark:hover:border-primary-900'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-white">{session.startTime} - {session.endTime}</p>
          <h3 className="mt-3 text-base font-black tracking-tight text-slate-950 dark:text-white">
            {session.grade} {session.division} · {session.room}
          </h3>
          <p className="mt-0.5 text-xs font-bold text-slate-500">{session.period}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs font-bold text-slate-500">{session.duration}</span>
          {isCancelled(session) && <Badge variant="error">Cancelled</Badge>}
        </div>
      </div>

      {session.reason && <p className="mt-3 text-xs font-semibold text-slate-500">Reason: {session.reason}</p>}
      {session.carryForwardFrom && <p className="mt-3 text-xs font-bold text-primary-600">{session.carryForwardFrom}</p>}
      {isPassedCancelled(session) && (
        <p className="mt-3 text-xs font-bold text-red-600">Careers moved to the next upcoming session.</p>
      )}

      {session.careers.length > 0 && (
        <ul className="mt-3 space-y-2">
          {session.careers.map(career => (
            <li key={career.id} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className={cn('h-2.5 w-2.5 rounded-full', careerDotClass(career.color))} />
              <span>{career.name}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex justify-end">
        <span className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-black text-primary-700 dark:border-primary-900 dark:bg-primary-900/10 dark:text-primary-300">
          {discussed}/{session.careers.length} discussed
        </span>
      </div>
    </button>
  );
}

function SessionDetail({
  session,
  sourceImage,
  busy,
  onCancel,
  onRestore,
  onToggleCareer,
  onEditCareers,
  onEditNote,
}: {
  session: ProgrammeSession;
  sourceImage: string;
  busy: boolean;
  onCancel: () => void;
  onRestore: () => void;
  onToggleCareer: (career: ProgrammeCareer) => void;
  onEditCareers: () => void;
  onEditNote: () => void;
}) {
  const discussed = discussedCount(session);

  return (
    <Card className="overflow-hidden">
      <div className={cn(
        'border-b border-slate-200 p-5 dark:border-slate-800',
        isCancelled(session) ? 'bg-red-50/40 dark:bg-red-950/10' : 'bg-white dark:bg-slate-900'
      )}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
              {session.grade} {session.division} · {session.room}
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500">{session.school}</p>
          </div>
          {isCancelled(session) ? <Badge variant="error">Cancelled</Badge> : <Badge variant="info">{discussed}/{session.careers.length} discussed</Badge>}
        </div>

        <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2"><CalendarDays size={16} className="text-slate-400" /> {session.dateLabel}</div>
          <div className="flex items-center gap-2"><Clock size={16} className="text-slate-400" /> {session.startTime} - {session.endTime} ({session.duration})</div>
          <div className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" /> {session.period} · {session.teacher}</div>
          {sourceImage && <div className="text-xs font-bold text-slate-400">Source: {sourceImage}</div>}
        </div>

        {session.reason && (
          <div className="mt-5 rounded-xl border border-red-200 bg-white/70 p-4 text-sm dark:border-red-900/30 dark:bg-slate-950/30">
            <p className="text-xs font-black uppercase tracking-widest text-red-700 dark:text-red-400">Reason</p>
            <p className="mt-1 font-semibold text-slate-700 dark:text-slate-300">{session.reason}</p>
            {session.status === 'cancelled_restorable' && (
              <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-400">
                Careers will be carried forward after this session date passes.
              </p>
            )}
            {session.status === 'cancelled_passed' && (
              <p className="mt-3 text-xs font-semibold text-red-700 dark:text-red-400">
                This session has passed and can no longer be restored. Its planned careers have been carried forward.
              </p>
            )}
          </div>
        )}

        {session.note && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Note</p>
            <p className="mt-1 whitespace-pre-wrap font-semibold text-slate-700 dark:text-slate-300">{session.note}</p>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Careers for this session</h3>
          {!isPassedCancelled(session) && (
            <Button variant="outline" size="sm" className="rounded-xl text-[10px]" onClick={onEditCareers} disabled={busy}>
              <Pencil size={13} /> Edit careers
            </Button>
          )}
        </div>

        {isPassedCancelled(session) && session.careers.some(career => career.status !== 'discussed') && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs font-semibold text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/10 dark:text-amber-300">
            No upcoming session was found to carry these careers forward to. Review and reassign manually.
          </div>
        )}

        {session.careers.length === 0 ? (
          <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-950/10 dark:text-red-300">
            Careers from this cancelled session have been moved to the next upcoming session.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {session.careers.map(career => (
              <div key={career.id} className="grid grid-cols-[auto,1fr,auto] gap-3 py-4">
                <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', careerDotClass(career.color))} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{career.name}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{career.area}</span>
                  </div>
                  {career.carriedForwardFrom && (
                    <p className="mt-1 text-xs font-bold text-primary-600">From cancelled session on {career.carriedForwardFrom}</p>
                  )}
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{career.description}</p>
                </div>
                <button
                  type="button"
                  disabled={busy || isCancelled(session)}
                  onClick={() => onToggleCareer(career)}
                  className={cn(
                    'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    career.status === 'discussed'
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 text-transparent hover:border-emerald-400 dark:border-slate-700'
                  )}
                  aria-label={career.status === 'discussed' ? `${career.name} discussed` : `Mark ${career.name} discussed`}
                >
                  <Check size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full rounded-xl sm:w-auto" onClick={onEditNote} disabled={busy}>
            <StickyNote size={16} /> {session.note ? 'Edit note' : 'Add note'}
          </Button>
          {session.status === 'cancelled_restorable' ? (
            <Button variant="outline" className="w-full rounded-xl text-primary-700 sm:w-auto" onClick={onRestore} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Restore session
            </Button>
          ) : session.status === 'cancelled_passed' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
              This session has passed and can no longer be restored.
            </div>
          ) : (
            <Button variant="danger" className="w-full rounded-xl sm:w-auto" onClick={onCancel} disabled={busy}>
              Cancel session
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function FilterIconButton({
  count,
  size = 20,
  onClick,
}: {
  count: number;
  size?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      aria-label={count > 0 ? `Open schedule filters, ${count} active` : 'Open schedule filters'}
    >
      <Filter size={size} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[9px] font-black text-white">
          {count}
        </span>
      )}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={event => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-xs font-bold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
        >
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 text-slate-400" />
      </div>
    </div>
  );
}

function FilterPanel({
  schools,
  academicYears,
  grades,
  filters,
  onChange,
  onReset,
  compact = false,
}: {
  schools: string[];
  academicYears: string[];
  grades: string[];
  filters: Filters;
  onChange: (filters: Filters) => void;
  onReset: () => void;
  compact?: boolean;
}) {
  return (
    <div className={cn('space-y-4', compact && 'text-sm')}>
      <FilterSelect
        label="School"
        value={filters.school}
        options={['All', ...schools]}
        onChange={school => onChange({ ...filters, school })}
      />
      <FilterSelect
        label="Academic year"
        value={filters.academicYear}
        options={['All', ...academicYears]}
        onChange={academicYear => onChange({ ...filters, academicYear })}
      />
      <div className="grid gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grade</label>
        <div className="grid grid-cols-3 gap-2">
          {grades.map(grade => (
            <button key={grade} type="button" onClick={() => onChange({ ...filters, grade })} className={cn(
              'h-9 rounded-xl border text-xs font-black',
              filters.grade === grade ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-900 dark:bg-primary-900/10 dark:text-primary-300' : 'border-slate-200 text-slate-500 dark:border-slate-800'
            )}>
              {grade}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
        <div className="grid grid-cols-2 gap-2">
          {statuses.map(status => (
            <button key={status} type="button" onClick={() => onChange({ ...filters, status })} className={cn(
              'h-9 rounded-xl border text-xs font-black',
              filters.status === status ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-900 dark:bg-primary-900/10 dark:text-primary-300' : 'border-slate-200 text-slate-500 dark:border-slate-800'
            )}>
              {status}
            </button>
          ))}
        </div>
      </div>
      <Button type="button" variant="outline" className="w-full rounded-xl" onClick={onReset}>Reset filters</Button>
    </div>
  );
}

function CancelSessionModal({
  session,
  reason,
  busy,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  session: ProgrammeSession;
  reason: string;
  busy: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Cancel this session?</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {session.grade} {session.division} · {session.dateLabel} · {session.startTime}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500" aria-label="Close cancel session dialog">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
          The session will remain visible in the schedule as Cancelled. Careers will be carried forward only after the session date has passed.
        </p>
        <label className="mt-5 grid gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason (optional)</span>
          <textarea
            value={reason}
            maxLength={120}
            onChange={event => onReasonChange(event.target.value)}
            placeholder="e.g. School event, counsellor unavailable..."
            className="min-h-28 resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          />
          <span className="text-right text-[10px] font-bold text-slate-400">{reason.length}/120</span>
        </label>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" className="rounded-xl" onClick={onClose} disabled={busy}>Keep session</Button>
          <Button type="button" variant="danger" className="rounded-xl" onClick={onConfirm} disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />} Cancel session
          </Button>
        </div>
      </div>
    </div>
  );
}

function NoteModal({
  session,
  note,
  busy,
  onNoteChange,
  onClose,
  onSave,
}: {
  session: ProgrammeSession;
  note: string;
  busy: boolean;
  onNoteChange: (note: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Session note</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {session.grade} {session.division} · {session.dateLabel}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500" aria-label="Close note dialog">
            <X size={18} />
          </button>
        </div>
        <label className="grid gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Note</span>
          <textarea
            value={note}
            maxLength={500}
            onChange={event => onNoteChange(event.target.value)}
            placeholder="Anything worth remembering for this session..."
            className="min-h-32 resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          />
          <span className="text-right text-[10px] font-bold text-slate-400">{note.length}/500</span>
        </label>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" className="rounded-xl" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" className="rounded-xl" onClick={onSave} disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />} Save note
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditCareersModal({
  session,
  coverage,
  selectedIds,
  busy,
  onToggle,
  onClose,
  onSave,
}: {
  session: ProgrammeSession;
  coverage: ProgrammeCareer[];
  selectedIds: string[];
  busy: boolean;
  onToggle: (careerId: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-lg rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Edit careers</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">{session.grade} {session.division} · {session.room}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500" aria-label="Close edit careers dialog">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[55vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          {coverage.map(career => {
            const checked = selectedIds.includes(career.id);
            return (
              <button
                key={career.id}
                type="button"
                onClick={() => onToggle(career.id)}
                className="grid w-full grid-cols-[auto,1fr,auto] gap-3 py-3 text-left"
              >
                <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', careerDotClass(career.color))} />
                <span>
                  <span className="block text-sm font-black text-slate-900 dark:text-white">{career.name}</span>
                  <span className="mt-1 block text-xs font-medium leading-relaxed text-slate-500">{career.description}</span>
                </span>
                <span className={cn(
                  'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border',
                  checked ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 text-transparent dark:border-slate-700'
                )}>
                  <Check size={14} />
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" className="rounded-xl" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" className="rounded-xl" onClick={onSave} disabled={busy || selectedIds.length === 0}>
            {busy && <Loader2 size={16} className="animate-spin" />} Save careers
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SchoolProgrammesViewProps {
  onMobileMenuClick?: () => void;
}

export function SchoolProgrammesView({ onMobileMenuClick }: SchoolProgrammesViewProps) {
  const [schedule, setSchedule] = useState<SchoolProgrammeSchedule | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({ school: 'All', academicYear: 'All', grade: 'All', status: 'All' });
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCareerIds, setSelectedCareerIds] = useState<string[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const dateGroupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dayChipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const hasCenteredDayStripRef = useRef(false);

  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > 400);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSchedule() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/school-programmes');
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load school programme schedule');
        }

        if (!cancelled) {
          setSchedule(data);
          const defaultSession = findDefaultSession(data.programme.sessions || []);
          setSelectedSessionId(defaultSession?.id || null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load school programme schedule');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSchedule();

    return () => {
      cancelled = true;
    };
  }, []);

  const sessions = schedule?.programme.sessions || [];
  const displayedSessions = useMemo(() => {
    return sessions.filter(session => {
      const schoolMatch = filters.school === 'All' || session.school === filters.school;
      const yearMatch = !schedule || filters.academicYear === 'All' || schedule.programme.academicYear === filters.academicYear;
      const gradeMatch = filters.grade === 'All' || session.grade === filters.grade;
      return schoolMatch && yearMatch && gradeMatch && statusMatches(session, filters.status);
    });
  }, [filters, schedule, sessions]);

  useEffect(() => {
    if (displayedSessions.length === 0) return;
    if (!selectedSessionId || !displayedSessions.some(session => session.id === selectedSessionId)) {
      setSelectedSessionId(displayedSessions[0].id);
    }
  }, [displayedSessions, selectedSessionId]);

  const selectedSession = useMemo(
    () => displayedSessions.find(session => session.id === selectedSessionId) || displayedSessions[0],
    [displayedSessions, selectedSessionId]
  );

  // Keyed by raw ISO date (not the display label) so day-chip clicks can
  // scroll straight to the matching group via dateGroupRefs.
  const sessionsByDate = useMemo(() => {
    return displayedSessions.reduce<Record<string, { dateLabel: string; sessions: ProgrammeSession[] }>>((groups, session) => {
      if (!groups[session.date]) {
        groups[session.date] = { dateLabel: session.dateLabel, sessions: [] };
      }
      groups[session.date].sessions.push(session);
      return groups;
    }, {});
  }, [displayedSessions]);

  // Drives which day chips are clickable - scoped to the active filters so a
  // chip never looks clickable for a date whose only sessions are filtered
  // out (that used to silently no-op: the click fell back to an unfiltered
  // match that the auto-reselect effect above immediately reverted).
  const availableSessionDates = useMemo(() => new Set(displayedSessions.map(session => session.date)), [displayedSessions]);
  const programmeDateRange = useMemo(() => {
    if (sessions.length === 0) return null;
    const dates = sessions.map(session => session.date).sort();
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [sessions]);
  // Only the weekdays the programme actually runs on (e.g. Mon-Thu) - showing
  // every calendar day would mean permanently-dead Fri/Sat/Sun chips.
  const activeWeekdays = useMemo(
    () => new Set(sessions.map(session => WEEKDAY_FULL[parseDateOnly(session.date).getUTCDay()])),
    [sessions]
  );
  // One continuous strip spanning the whole programme, not a bounded week -
  // scrolling (mouse drag, trackpad, touch swipe) is the only way to move
  // through it, matching how native calendar apps' day-strips behave.
  const dayStripDates = useMemo(() => {
    if (!programmeDateRange) return [];
    const dates: string[] = [];
    for (let cursor = programmeDateRange.min; cursor <= programmeDateRange.max; cursor = addDaysToDate(cursor, 1)) {
      if (activeWeekdays.has(WEEKDAY_FULL[parseDateOnly(cursor).getUTCDay()])) {
        dates.push(cursor);
      }
    }
    return dates;
  }, [programmeDateRange, activeWeekdays]);

  // Keep the strip scrolled to whichever session is selected, e.g. when a
  // card further down the list is clicked rather than a day chip. Instant on
  // first load (centering on the default session), smooth after that.
  useEffect(() => {
    if (!selectedSession) return;
    const chip = dayChipRefs.current[selectedSession.date];
    if (!chip) return;
    chip.scrollIntoView({
      behavior: hasCenteredDayStripRef.current ? 'smooth' : 'auto',
      inline: 'center',
      block: 'nearest',
    });
    hasCenteredDayStripRef.current = true;
  }, [selectedSession]);

  const schools = useMemo(
    () => schedule ? [schedule.institution.name] : [],
    [schedule]
  );

  const academicYears = useMemo(
    () => schedule ? [schedule.programme.academicYear] : [],
    [schedule]
  );

  const grades = useMemo(
    () => ['All', ...Array.from(new Set(sessions.map(session => session.grade)))],
    [sessions]
  );

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(value => value !== 'All').length,
    [filters]
  );

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function patchSelectedSession(body: Record<string, unknown>) {
    if (!schedule || !selectedSession) return;

    setBusy(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/school-programmes/${schedule.programme.id}/sessions/${selectedSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update session');
      }

      setSchedule(data);
      setSelectedSessionId(selectedSession.id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update session');
    } finally {
      setBusy(false);
    }
  }

  function resetFilters() {
    setFilters({ school: 'All', academicYear: 'All', grade: 'All', status: 'All' });
  }

  function openEditModal() {
    if (!selectedSession) return;
    setSelectedCareerIds(selectedSession.careers.map(career => career.id));
    setEditModalOpen(true);
  }

  function openNoteModal() {
    if (!selectedSession) return;
    setNoteDraft(selectedSession.note || '');
    setNoteModalOpen(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
          Loading school programme schedule...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-8rem)]">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} />
            <p className="text-sm font-black">School programme data is not available.</p>
          </div>
          <p className="mt-2 text-xs font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!selectedSession) {
    return (
      <div className="min-h-[calc(100vh-8rem)]">
        <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
          <button
            onClick={onMobileMenuClick}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-base font-black text-slate-950 dark:text-white">Schedule</h2>
          <FilterIconButton count={activeFilterCount} onClick={() => setFiltersOpen(true)} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          No school programme sessions match the current filters.
        </div>
      </div>
    );
  }

  const selectedSourceImage = sessionSourceImage(schedule, selectedSession);

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
        <button
          onClick={onMobileMenuClick}
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-base font-black text-slate-950 dark:text-white">Schedule</h2>
        <FilterIconButton count={activeFilterCount} onClick={() => setFiltersOpen(true)} />
      </div>

      <div className="-mx-1 mb-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 lg:max-w-md">
        {dayStripDates.map(date => {
          const hasSession = availableSessionDates.has(date);
          const chip = formatDayChip(date);
          const isSelectedDay = date === selectedSession.date;
          return (
            <button
              key={date}
              ref={el => { dayChipRefs.current[date] = el; }}
              type="button"
              disabled={!hasSession}
              onClick={() => {
                const match = displayedSessions.find(session => session.date === date);
                if (match) setSelectedSessionId(match.id);
                dateGroupRefs.current[date]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={cn(
                'min-w-16 shrink-0 snap-start rounded-xl px-2 py-2 text-[10px] font-black leading-tight',
                !hasSession && 'cursor-not-allowed opacity-30',
                isSelectedDay
                  ? 'border border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-900 dark:bg-primary-900/10 dark:text-primary-300'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              {chip.weekday}<br />{chip.dayMonth}
            </button>
          );
        })}
      </div>

      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
          {actionError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(340px,430px),minmax(0,1fr)]">
        <section className="min-w-0">
          <div className="hidden items-center justify-between gap-4 pb-4 lg:flex">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary-600">School Programmes</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Schedule</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">{schedule?.programme.name} · {schedule?.programme.academicYear}</p>
            </div>
            <div className="relative">
              <FilterIconButton count={activeFilterCount} size={18} onClick={() => setFiltersOpen(open => !open)} />
              {filtersOpen && (
                <div className="absolute right-0 top-12 z-20 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Filters</h3>
                    <button onClick={() => setFiltersOpen(false)} className="text-slate-400" aria-label="Close filters"><X size={16} /></button>
                  </div>
                  <FilterPanel
                    compact
                    schools={schools}
                    academicYears={academicYears}
                    grades={grades}
                    filters={filters}
                    onChange={setFilters}
                    onReset={resetFilters}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {Object.entries(sessionsByDate).map(([date, group]) => (
              <div key={date} ref={el => { dateGroupRefs.current[date] = el; }}>
                <p className="mb-3 px-1 text-xs font-black uppercase tracking-wide text-primary-600">{group.dateLabel}</p>
                <div className="space-y-3">
                  {group.sessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      selected={selectedSession.id === session.id}
                      onSelect={() => {
                        setSelectedSessionId(session.id);
                        setMobileDetailOpen(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="hidden min-w-0 lg:block">
          <div className="sticky top-10">
            <SessionDetail
              session={selectedSession}
              sourceImage={selectedSourceImage}
              busy={busy}
              onCancel={() => {
                setCancelReason('');
                setCancelModalOpen(true);
              }}
              onRestore={() => patchSelectedSession({ action: 'restore' })}
              onToggleCareer={career => patchSelectedSession({
                action: 'setCareerStatus',
                careerId: career.id,
                status: (career.status === 'discussed' ? 'planned' : 'discussed') as ProgrammeCareerStatus,
              })}
              onEditCareers={openEditModal}
              onEditNote={openNoteModal}
            />
          </div>
        </section>
      </div>

      {mobileDetailOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMobileDetailOpen(false)}
            aria-label="Close session detail"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex justify-end px-5 pt-4">
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="rounded-xl p-2 text-slate-500"
                aria-label="Close session detail"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pb-6 pt-1">
              <SessionDetail
                session={selectedSession}
                sourceImage={selectedSourceImage}
                busy={busy}
                onCancel={() => {
                  setCancelReason('');
                  setCancelModalOpen(true);
                }}
                onRestore={() => patchSelectedSession({ action: 'restore' })}
                onToggleCareer={career => patchSelectedSession({
                  action: 'setCareerStatus',
                  careerId: career.id,
                  status: (career.status === 'discussed' ? 'planned' : 'discussed') as ProgrammeCareerStatus,
                })}
                onEditCareers={openEditModal}
                onEditNote={openNoteModal}
              />
            </div>
          </div>
        </div>
      )}

      {filtersOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button className="absolute inset-0 bg-slate-950/40" onClick={() => setFiltersOpen(false)} aria-label="Close filters" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-950">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-950 dark:text-white">Filters</h3>
              <button onClick={() => setFiltersOpen(false)} className="rounded-xl p-2 text-slate-500" aria-label="Close filters"><X size={18} /></button>
            </div>
            <FilterPanel
              schools={schools}
              academicYears={academicYears}
              grades={grades}
              filters={filters}
              onChange={setFilters}
              onReset={resetFilters}
            />
            <div className="mt-6">
              <Button className="w-full rounded-xl" onClick={() => setFiltersOpen(false)}>Apply</Button>
            </div>
          </div>
        </div>
      )}

      {cancelModalOpen && (
        <CancelSessionModal
          session={selectedSession}
          reason={cancelReason}
          busy={busy}
          onReasonChange={setCancelReason}
          onClose={() => setCancelModalOpen(false)}
          onConfirm={async () => {
            await patchSelectedSession({ action: 'cancel', reason: cancelReason });
            setCancelModalOpen(false);
          }}
        />
      )}

      {editModalOpen && schedule && (
        <EditCareersModal
          session={selectedSession}
          coverage={schedule.programme.careerCoverage}
          selectedIds={selectedCareerIds}
          busy={busy}
          onToggle={careerId => {
            setSelectedCareerIds(ids => ids.includes(careerId) ? ids.filter(id => id !== careerId) : [...ids, careerId]);
          }}
          onClose={() => setEditModalOpen(false)}
          onSave={async () => {
            await patchSelectedSession({ action: 'setCareers', careerIds: selectedCareerIds });
            setEditModalOpen(false);
          }}
        />
      )}

      {noteModalOpen && (
        <NoteModal
          session={selectedSession}
          note={noteDraft}
          busy={busy}
          onNoteChange={setNoteDraft}
          onClose={() => setNoteModalOpen(false)}
          onSave={async () => {
            await patchSelectedSession({ action: 'setNote', note: noteDraft });
            setNoteModalOpen(false);
          }}
        />
      )}

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 lg:bottom-8 lg:right-8"
          aria-label="Back to top"
        >
          <ChevronUp size={20} />
        </button>
      )}
    </div>
  );
}
