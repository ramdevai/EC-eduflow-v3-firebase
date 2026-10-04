"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown, ChevronUp, Clock, Loader2, Plus, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Lead } from '@/lib/types';
import { FOLLOW_UP_CHANNELS, FOLLOW_UP_OUTCOMES, FOLLOW_UP_MESSAGE_LABELS, FollowUpEntry, FollowUpSummary, WhatsAppFollowUpDraft } from '@/lib/follow-ups';
import { safeFormat } from '@/lib/utils';

function localDateTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

const fieldClass = 'w-full min-w-0 rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export function DrawerFollowUps({ lead, draft, onRecorded, onDraftConsumed, refreshKey = 0 }: {
  lead: Lead;
  draft?: WhatsAppFollowUpDraft | null;
  onRecorded: (summary: FollowUpSummary) => void;
  onDraftConsumed: () => void;
  refreshKey?: number;
}) {
  const [entries, setEntries] = useState<FollowUpEntry[]>([]);
  const [summary, setSummary] = useState<FollowUpSummary>({ followUpCount: lead.followUpCount || 0, lastFollowUp: lead.lastFollowUp || '', lastFollowUpOutcome: lead.lastFollowUpOutcome || '', nextFollowUpDate: lead.nextFollowUpDate || '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [channel, setChannel] = useState<string>('WhatsApp');
  const [outcome, setOutcome] = useState('');
  const [happenedAt, setHappenedAt] = useState(localDateTime);
  const [notes, setNotes] = useState('');
  const [messageType, setMessageType] = useState<WhatsAppFollowUpDraft['messageType'] | undefined>();
  const [nextDate, setNextDate] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const historyId = useId();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/leads/${encodeURIComponent(lead.id)}/follow-ups`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unable to load follow-ups');
        if (!cancelled) { setEntries(data.entries); setSummary(data.summary); setNextCursor(data.nextCursor); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load follow-ups');
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [lead.id, refreshKey]);

  useEffect(() => { setExpanded(false); }, [lead.id]);

  useEffect(() => {
    if (draft?.leadId !== lead.id || !draft) return;
    setRequestId(draft.requestId);
    setMessageType(draft.messageType);
    setChannel('WhatsApp'); setOutcome('Message sent'); setNotes('');
    setHappenedAt(draft.happenedAt); setNextDate(''); setError(''); setFormOpen(true);
  }, [draft, lead.id]);

  useEffect(() => {
    if (formOpen) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [formOpen, draft]);

  function openForm() {
    setMessageType(undefined);
    setRequestId(crypto.randomUUID()); setChannel('Call'); setOutcome('');
    setNotes(''); setNextDate(''); setHappenedAt(localDateTime()); setError(''); setFormOpen(true);
  }

  async function loadMore() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(lead.id)}/follow-ups${nextCursor ? `?before=${encodeURIComponent(nextCursor)}` : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load follow-ups');
      setEntries(current => nextCursor ? [...current, ...data.entries] : data.entries);
      setSummary(data.summary); setNextCursor(data.nextCursor); setExpanded(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load follow-ups'); }
    finally { setLoading(false); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(lead.id)}/follow-ups`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, channel, outcome, happenedAt: new Date(happenedAt).toISOString(), notes, messageType, nextFollowUpDate: nextDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to record follow-up');
      setEntries(current => [data.entry, ...current.filter(item => item.id !== data.entry.id)].sort((a, b) => Date.parse(b.happenedAt) - Date.parse(a.happenedAt)));
      setSummary(data.summary); onRecorded(data.summary); onDraftConsumed(); setFormOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to record follow-up'); }
    finally { setSaving(false); }
  }

  return (
    <section className="mb-6 border-y border-slate-200 py-4 dark:border-slate-800" aria-label="Follow-up history">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Clock size={16} /> Follow-up History</h3>
          <p className="mt-1 text-xs text-slate-500">{summary.followUpCount} follow-up{summary.followUpCount === 1 ? '' : 's'}{summary.lastFollowUp ? ` · Last contact ${safeFormat(summary.lastFollowUp, 'dd MMM yyyy')}` : ''}</p>
          {summary.lastFollowUpOutcome && <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{summary.lastFollowUpOutcome}</p>}
          {summary.nextFollowUpDate && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary-600"><Calendar size={12} /> Next follow-up {safeFormat(summary.nextFollowUpDate, 'dd MMM yyyy')}</p>}
        </div>
        <Button size="sm" variant="outline" onClick={openForm} disabled={saving || formOpen}><Plus size={14} /> Record follow-up</Button>
      </div>

      {error && <div role="alert" className="mt-3 flex items-center justify-between gap-2 text-sm text-red-600"><span>{error}</span>{!formOpen && <button type="button" title="Retry loading history" aria-label="Retry loading history" onClick={loadMore}><RefreshCw size={16} /></button>}</div>}

      {formOpen && (
        <form ref={formRef} onSubmit={save} className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold text-slate-900 dark:text-white">{draft && messageType ? FOLLOW_UP_MESSAGE_LABELS[messageType] : 'Record follow-up'}</h4><button type="button" title="Cancel follow-up" aria-label="Cancel follow-up" disabled={saving} onClick={() => { setFormOpen(false); onDraftConsumed(); }}><X size={16} /></button></div>
          <fieldset disabled={saving || loading} className="space-y-3">
            {draft ? <p className="text-xs text-slate-500">WhatsApp · {safeFormat(happenedAt, 'dd MMM yyyy, h:mm a')}</p> : <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-500">Channel<select className={fieldClass} value={channel} onChange={e => setChannel(e.target.value)}>{FOLLOW_UP_CHANNELS.map(value => <option key={value}>{value}</option>)}</select></label>
              <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-500">Outcome<select required className={fieldClass} value={outcome} onChange={e => setOutcome(e.target.value)}><option value="" disabled>Select outcome</option>{FOLLOW_UP_OUTCOMES.map(value => <option key={value}>{value}</option>)}</select></label>
              <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-500">Contact date<input required type="datetime-local" className={fieldClass} value={happenedAt} max={localDateTime()} onChange={e => setHappenedAt(e.target.value)} /></label>
              <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-500">Next follow-up<input type="date" className={fieldClass} value={nextDate} onChange={e => setNextDate(e.target.value)} /></label>
            </div>
            <label className="grid gap-1 text-xs font-semibold text-slate-500">Notes<textarea rows={2} maxLength={2000} className={fieldClass} value={notes} onChange={e => setNotes(e.target.value)} /></label>
            </>}
            <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => { setFormOpen(false); onDraftConsumed(); }} disabled={saving}>Cancel</Button><Button type="submit" size="sm">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {draft ? 'Mark as sent' : 'Save follow-up'}</Button></div>
          </fieldset>
        </form>
      )}

      {loading && entries.length === 0 ? <Loader2 aria-label="Loading follow-ups" size={18} className="mt-4 animate-spin text-slate-400" /> : entries.length === 0 ? <p className="mt-3 text-xs text-slate-400">No follow-ups recorded.</p> : (
        <ol id={historyId} className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {(expanded ? entries : entries.slice(0, 1)).map(entry => (
            <li key={entry.id} className="py-3 text-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="min-w-0 break-words font-semibold text-slate-800 dark:text-slate-200">{entry.channel} - {entry.messageType ? FOLLOW_UP_MESSAGE_LABELS[entry.messageType] : 'Follow up'}</p>
                <time className="shrink-0 text-slate-500" dateTime={entry.happenedAt}>{safeFormat(entry.happenedAt, 'dd MMM, h:mm a')}</time>
              </div>
              <p className="mt-1 italic text-slate-500">{entry.channel === 'WhatsApp' || entry.channel === 'Email' ? 'Sent by' : 'Recorded by'} {entry.recordedByName}</p>
              {!entry.messageType && <p className="mt-2 text-slate-700 dark:text-slate-300">{entry.outcome}</p>}
              {!entry.messageType && entry.notes && <p className="mt-2 whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300">{entry.notes}</p>}
              {!entry.messageType && entry.nextFollowUpDate && <p className="mt-1 text-slate-500">Next follow-up {safeFormat(entry.nextFollowUpDate, 'dd MMM yyyy')}</p>}
            </li>
          ))}
        </ol>
      )}
      {(entries.length > 1 || (entries.length > 0 && nextCursor)) && <button type="button" aria-expanded={expanded} aria-controls={historyId} className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary-600" onClick={() => setExpanded(value => !value)}>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {expanded ? 'Hide history' : 'Show history'}</button>}
      {expanded && nextCursor && <Button variant="outline" size="sm" className="mt-3" onClick={loadMore} disabled={loading}>{loading && <Loader2 size={14} className="animate-spin" />} Load older follow-ups</Button>}
    </section>
  );
}
