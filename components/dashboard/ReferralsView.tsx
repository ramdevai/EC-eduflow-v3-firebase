"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2, RefreshCw, Search } from 'lucide-react';
import { Referral } from '@/lib/types';
import { REFERRAL_STATUSES, referralReminderDue } from '@/lib/partnership-workflow';
import { Badge } from '@/components/ui/Badge';
import { referralToday } from '@/lib/partnership-workflow';

export function groupReferralsByStudent(referrals: Referral[]) {
  const students = new Map<string, { leadId: string; name: string; referrals: Referral[] }>();
  for (const referral of referrals) {
    const student = students.get(referral.leadId) || { leadId: referral.leadId, name: referral.leadName, referrals: [] };
    student.referrals.push(referral);
    students.set(referral.leadId, student);
  }
  return [...students.values()].sort((a, b) => a.name.localeCompare(b.name)).map(student => ({
    ...student, referrals: student.referrals.sort((a, b) =>
      (a.nextFollowUpDate || '9999').localeCompare(b.nextFollowUpDate || '9999') || a.institutionName.localeCompare(b.institutionName)),
  }));
}

function displayDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+05:30` : value);
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  }).format(date);
}

function FollowUpDate({ referral }: { referral: Referral }) {
  if (!referral.nextFollowUpDate) return <span className="text-slate-400">Closed</span>;
  const due = referralReminderDue(referral);
  const today = referralToday();
  return <div>
    <p className={due ? 'font-semibold text-amber-700 dark:text-amber-400' : 'font-medium text-slate-700 dark:text-slate-200'}>
      {displayDate(referral.nextFollowUpDate)}
      {due && <span className="ml-2 text-xs">{referral.nextFollowUpDate === today ? 'Today' : 'Overdue'}</span>}
    </p>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{referral.status === 'Due' ? 'Commission follow-up' : 'Admission check'}</p>
  </div>;
}

export function ReferralsListing({ referrals, onOpenLead }: Pick<Props, 'onOpenLead'> & { referrals: Referral[] }) {
  const students = groupReferralsByStudent(referrals);
  const statusBadge = (r: Referral) => <Badge className="whitespace-nowrap tracking-normal normal-case text-xs"
    variant={r.status === 'Due' ? 'warning' : r.status === 'Paid' ? 'success' : 'default'}>
    {r.status === 'Didnt join' ? "Didn't join" : r.status}
  </Badge>;
  const open = (r: Referral) => onOpenLead?.(r.leadId, r.id);
  return <>
    <div className="hidden md:block">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <colgroup><col className="w-[34%]" /><col className="w-[16%]" /><col className="w-[19%]" /><col className="w-[26%]" /><col className="w-[5%]" /></colgroup>
        <thead className="border-y border-slate-200 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <tr><th className="px-4 py-3 font-medium" scope="col">Institute</th><th className="px-4 py-3 font-medium" scope="col">Status</th>
            <th className="px-4 py-3 font-medium" scope="col">Referred on</th><th className="px-4 py-3 font-medium" scope="col">Next follow-up</th>
            <th scope="col"><span className="sr-only">Open referral</span></th></tr>
        </thead>
        {students.map(student => <tbody key={student.leadId}>
          <tr className="border-y border-slate-200 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/70">
            <th colSpan={5} scope="rowgroup" className="px-4 py-3 font-semibold text-slate-950 dark:text-white">
              {student.name}<span className="ml-3 text-xs font-normal text-slate-500 dark:text-slate-400">{student.referrals.length} referral{student.referrals.length === 1 ? '' : 's'}</span>
            </th>
          </tr>
          {student.referrals.map(r => <tr key={r.id} onClick={() => open(r)} className="cursor-pointer border-b border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40">
            <td className="px-4 py-3.5"><button type="button" onClick={event => { event.stopPropagation(); open(r); }}
              aria-label={`Open ${student.name}'s referral to ${r.institutionName}`} className="break-words text-left font-medium text-slate-900 hover:text-primary-600 focus-visible:outline-primary-500 dark:text-slate-100">{r.institutionName}</button></td>
            <td className="px-4 py-3.5">{statusBadge(r)}</td>
            <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{displayDate(r.referredAt)}</td>
            <td className="px-4 py-3.5"><FollowUpDate referral={r} /></td>
            <td className="pr-4"><ArrowRight aria-hidden="true" size={16} className="text-slate-400" /></td>
          </tr>)}
        </tbody>)}
      </table>
    </div>
    <div className="space-y-5 md:hidden">
      {students.map(student => <div key={student.leadId}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-200 bg-slate-100/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70">
          <h3 className="break-words text-sm font-semibold text-slate-950 dark:text-white">{student.name}</h3>
          <span className="text-xs text-slate-500">{student.referrals.length} referral{student.referrals.length === 1 ? '' : 's'}</span>
        </div>
        {student.referrals.map(r => <button type="button" key={r.id} onClick={() => open(r)}
          className="block w-full space-y-3 border-b border-slate-200 px-3 py-4 text-left dark:border-slate-800">
          <div className="flex items-start justify-between gap-3"><span className="min-w-0 break-words text-sm font-medium text-slate-900 dark:text-slate-100">{r.institutionName}</span>{statusBadge(r)}</div>
          <div className="flex items-end justify-between gap-3 text-xs">
            <div><p className="mb-1 text-slate-400">Next follow-up</p><FollowUpDate referral={r} /></div>
            <ArrowRight aria-hidden="true" size={16} className="shrink-0 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500">Referred {displayDate(r.referredAt)}</p>
        </button>)}
      </div>)}
    </div>
  </>;
}

interface Props {
  onOpenLead?: (leadId: string, referralId?: string) => void;
  remindersOnly?: boolean;
  reloadKey?: number;
}

export function ReferralsView({ onOpenLead, remindersOnly = false, reloadKey = 0 }: Props) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dueOnly, setDueOnly] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/referrals');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load referrals');
      setReferrals(data.referrals || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Could not load referrals');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => { void load(); };
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => { window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, [load, reloadKey]);
  const visible = useMemo(() => referrals.filter(r =>
    (!(remindersOnly || dueOnly) || referralReminderDue(r)) && (!status || r.status === status) &&
    `${r.leadName} ${r.institutionName}`.toLowerCase().includes(search.toLowerCase())
  ), [referrals, search, status, dueOnly, remindersOnly]);
  const studentCount = new Set(visible.map(r => r.leadId)).size;
  return <section className="min-w-0">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold text-slate-950 dark:text-white">{remindersOnly ? 'Referral Follow-ups Due' : 'Referrals'}</h2>
        {!loading && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{studentCount} student{studentCount === 1 ? '' : 's'} · {visible.length} referral{visible.length === 1 ? '' : 's'}</p>}
      </div>
      <button type="button" onClick={() => void load()} aria-label="Refresh referrals" title="Refresh referrals"
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><RefreshCw size={18} /></button>
    </div>
    {!remindersOnly && <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(220px,360px)_180px_minmax(220px,280px)]">
      <label className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-slate-300 px-3 dark:border-slate-700">
        <Search size={16} className="shrink-0 text-slate-400" />
        <input aria-label="Search referrals" placeholder="Search student or institute" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full min-w-0 bg-transparent text-sm outline-none" />
      </label>
      <select aria-label="Referral status" value={status} onChange={e => setStatus(e.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
        <option value="">All statuses</option>{REFERRAL_STATUSES.map(s => <option key={s} value={s}>{s === 'Didnt join' ? "Didn't join" : s}</option>)}
      </select>
      <select aria-label="Follow-up date filter" value={dueOnly ? 'due' : 'all'} onChange={e => setDueOnly(e.target.value === 'due')}
        className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
        <option value="all">All follow-ups</option><option value="due">Follow-ups: today or overdue</option>
      </select>
    </div>}
    {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
    {loading ? <Loader2 className="my-8 animate-spin text-slate-400" /> : visible.length === 0 ?
      <p className="border-y border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800">{remindersOnly || dueOnly ? 'No follow-ups due today or overdue.' : 'No referrals found.'}</p> :
      <ReferralsListing referrals={visible} onOpenLead={onOpenLead} />}
  </section>;
}
