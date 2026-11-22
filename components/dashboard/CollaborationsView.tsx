'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Menu } from 'lucide-react';
import type { Collaboration } from '@/lib/collaboration-schema';
import type { Lead } from '@/lib/types';

type Row = Collaboration & { leadCount: number };
type LeadRow = Pick<Lead, 'id' | 'name' | 'studentName' | 'stage' | 'inquiryDate'>;

const api = '/api/collaborations';
const inputClass = 'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';
const action = 'inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800';
const primary = 'inline-flex min-h-9 items-center rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-950';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to complete the request.');
  return data;
}

function publicLink(id: string) {
  const origin = process.env.NEXT_PUBLIC_APP_ENV === 'local'
    ? 'http://127.0.0.1:4173'
    : 'https://www.educompass.in';
  return `${origin}/interest/?collaboration=${id}`;
}

export function CollaborationsView({ onMenu, onLead }: { onMenu: () => void; onLead: (lead: Lead) => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editor, setEditor] = useState<Row | 'new' | null>(null);
  const [results, setResults] = useState<{ campaign: Row; leads: LeadRow[]; next?: string } | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    const { collaborations } = await request<{ collaborations: Row[] }>(api);
    setRows(collaborations);
  }

  useEffect(() => {
    refresh().catch(() => setError('Collaborations could not be loaded.'));
  }, []);

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Unable to complete the request.');
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || busy) return;
    const form = new FormData(event.currentTarget);
    const details = {
      title: form.get('title'),
      collaborator: form.get('collaborator'),
      intro: form.get('intro'),
      offer: form.get('offer'),
    };
    void run(async () => {
      await request(editor === 'new' ? api : `${api}/${editor.id}`, {
        method: editor === 'new' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editor === 'new'
          ? { ...details, code: form.get('code') }
          : { action: 'save', revision: editor.revision, details }),
      });
      setEditor(null);
      await refresh();
      setNotice(editor === 'new' ? 'Draft saved.' : 'Changes saved.');
    });
  }

  function changeStatus(campaign: Row, intent: 'launch' | 'close') {
    void run(async () => {
      await request(`${api}/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: intent, revision: campaign.revision }),
      });
      setClosingId(null);
      setEditor(null);
      await refresh();
      setNotice(intent === 'launch' ? 'Collaboration is live. Share the form link and code with parents.' : 'Collaboration closed.');
    });
  }

  function showLeads(campaign: Row, after?: string) {
    void run(async () => {
      const url = after ? `${api}/${campaign.id}?after=${encodeURIComponent(after)}` : `${api}/${campaign.id}`;
      const page = await request<{ leads: LeadRow[]; next?: string }>(url);
      setResults(previous => ({
        campaign,
        leads: after && previous?.campaign.id === campaign.id ? [...previous.leads, ...page.leads] : page.leads,
        next: page.next,
      }));
    });
  }

  function openLead(campaign: Row, id: string) {
    void run(async () => {
      const { lead } = await request<{ lead: Lead }>(`${api}/${campaign.id}?lead=${encodeURIComponent(id)}`);
      onLead(lead);
    });
  }

  const draft = editor && editor !== 'new' ? editor : null;

  return (
    <section data-ui className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onMenu} className="rounded-md p-2 md:hidden" aria-label="Open menu"><Menu size={20} /></button>
          <h1 className="text-2xl font-semibold tracking-tight">Collaborations</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={action} disabled={busy} onClick={() => void run(refresh)}>Refresh</button>
          <button type="button" className={primary} disabled={busy} onClick={() => { setResults(null); setEditor('new'); }}>New collaboration</button>
        </div>
      </header>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Launch an interest form and track enquiries by collaboration code.</p>
      {error && <p role="alert" className="mt-4 rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 dark:text-red-300">
        {error}{' '}<button type="button" className="underline" disabled={busy} onClick={() => void run(refresh)}>Refresh list</button>
      </p>}
      <p role="status" className={notice ? 'mt-4 text-sm text-slate-600 dark:text-slate-400' : 'sr-only'}>{notice}</p>

      {editor && (
        <form key={draft?.id || 'new'} onSubmit={save} className="my-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2 md:p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold md:col-span-2">{draft ? 'Edit collaboration' : 'New collaboration'}</h2>
          <label className="space-y-1 text-sm font-medium">
            Form title<input name="title" className={inputClass} required minLength={2} maxLength={100} defaultValue={draft?.title} autoFocus />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Collaborator<input name="collaborator" className={inputClass} required minLength={2} maxLength={100} defaultValue={draft?.collaborator} />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Code<input name="code" className={inputClass} required maxLength={24} pattern="[A-Za-z0-9][A-Za-z0-9\x2D]{0,23}" defaultValue={draft?.code} readOnly={Boolean(draft)} autoCapitalize="characters" spellCheck={false} />
            <span className="block text-xs font-normal text-slate-600 dark:text-slate-400">Share this code with parents. It stays fixed after the draft is created.</span>
          </label>
          <label className="space-y-1 text-sm font-medium md:col-span-2">
            Form introduction <span className="font-normal text-slate-600 dark:text-slate-400">(optional)</span>
            <textarea name="intro" className={inputClass} rows={2} maxLength={360} defaultValue={draft?.intro} />
          </label>
          <label className="space-y-1 text-sm font-medium md:col-span-2">
            Offer terms <span className="font-normal text-slate-600 dark:text-slate-400">(optional)</span>
            <textarea name="offer" className={inputClass} rows={2} maxLength={360} defaultValue={draft?.offer} />
            <span className="block text-xs font-normal text-slate-600 dark:text-slate-400">Visible in the CRM on new enquiries using this code.</span>
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button type="submit" className={primary} disabled={busy}>{draft ? 'Save changes' : 'Save draft'}</button>
            <button type="button" className={action} disabled={busy} onClick={() => setEditor(null)}>Cancel</button>
          </div>
        </form>
      )}

      <ul aria-label="Collaborations" className="mt-6 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {rows === null && !error && <li className="py-5 text-sm">Loading collaborations…</li>}
        {rows?.length === 0 && <li className="py-5 text-sm text-slate-600 dark:text-slate-400">Create a collaboration to get a form link and start accepting enquiries.</li>}
        {rows?.map(campaign => (
          <li key={campaign.id} className="grid gap-3 py-4 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h2 className="break-words text-base font-semibold">{campaign.title}</h2>
                <span className={campaign.status === 'Active'
                  ? 'rounded bg-emerald-100 px-2 text-xs font-semibold leading-5 text-emerald-900'
                  : 'rounded bg-slate-200 px-2 text-xs font-semibold leading-5 text-slate-800'}>{campaign.status}</span>
              </div>
              <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-400">{campaign.collaborator} · {campaign.code}{campaign.offer ? ' · Offer configured' : ''}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="min-h-9 px-2 text-sm font-semibold tabular-nums underline underline-offset-2" disabled={busy} onClick={() => showLeads(campaign)}>
                {campaign.leadCount} {campaign.leadCount === 1 ? 'enquiry' : 'enquiries'}
              </button>
              {campaign.status !== 'Closed' && <button type="button" className={action} disabled={busy} onClick={() => { setResults(null); setEditor(campaign); }}>Edit</button>}
              {campaign.status === 'Draft' && <button type="button" className={primary} disabled={busy || draft?.id === campaign.id} onClick={() => changeStatus(campaign, 'launch')}>Launch</button>}
              {campaign.status === 'Active' && (
                <>
                  <button type="button" className={action} disabled={busy} onClick={() => void run(async () => {
                    await navigator.clipboard.writeText(publicLink(campaign.id));
                    setNotice(`Form link copied. Share ${campaign.code} alongside it.`);
                  })}>Copy form link</button>
                  <a className={action} href={publicLink(campaign.id)} target="_blank" rel="noreferrer">Open form</a>
                  <button type="button" className={action} disabled={busy} onClick={() => setClosingId(campaign.id)}>Close</button>
                </>
              )}
            </div>
            {closingId === campaign.id && (
              <div className="grid gap-2 rounded-md border border-slate-300 p-3 text-sm lg:col-span-2 dark:border-slate-700">
                <p>Close {campaign.code} for new enquiries? Earlier enquiries will keep this code.</p>
                <div className="flex gap-2">
                  <button type="button" className={primary} disabled={busy} onClick={() => changeStatus(campaign, 'close')}>Confirm close</button>
                  <button type="button" className={action} disabled={busy} onClick={() => setClosingId(null)}>Cancel</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {results && (
        <section className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-800" aria-label="Collaboration enquiries">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Enquiries for {results.campaign.code}</h2>
            <button type="button" className={action} disabled={busy} onClick={() => setResults(null)}>Dismiss</button>
          </div>
          {results.leads.length === 0 && <p className="mt-3 text-sm">No enquiries have used this code yet.</p>}
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {results.leads.map(lead => (
              <li key={lead.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <button type="button" className="text-left font-semibold underline" disabled={busy} onClick={() => openLead(results.campaign, lead.id)}>{lead.studentName || lead.name}</button>
                <span>{lead.stage}</span>
              </li>
            ))}
          </ul>
          {results.next && <button type="button" className={action} disabled={busy} onClick={() => showLeads(results.campaign, results.next)}>Load more</button>}
        </section>
      )}
    </section>
  );
}
