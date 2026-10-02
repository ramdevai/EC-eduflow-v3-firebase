"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Lead, Partnership, Referral, ReferralStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Mail, Send, X } from 'lucide-react';

const REFERRAL_STATUSES: ReferralStatus[] = [
  'Referred', 'Intimated', 'Acknowledged', 'Admitted', 'Commission Due', 'Commission Paid', 'Declined',
];

const STATUS_BADGE: Record<ReferralStatus, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
  Referred: 'default',
  Intimated: 'info',
  Acknowledged: 'info',
  Admitted: 'success',
  'Commission Due': 'warning',
  'Commission Paid': 'success',
  Declined: 'error',
};

interface Props {
  lead: Lead;
}

function IntimateModal({
  partnership,
  lead,
  onClose,
  onSent,
}: {
  partnership: Partnership;
  lead: Lead;
  onClose: () => void;
  onSent: () => void;
}) {
  const studentName = lead.studentName || lead.name;
  const [subject, setSubject] = useState(`Student Referral - ${studentName}`);
  const [body, setBody] = useState(
    `Hi ${partnership.pointOfContact?.name || ''},\n\nI'd like to refer ${studentName} for admission consideration at ${partnership.institutionName}.\n\nParent/Guardian: ${lead.name}\nContact: ${lead.phone}${lead.email ? ` / ${lead.email}` : ''}\n\nPlease let us know once a decision is made so we can follow up.\n\nThanks,\nEduCompass`
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recipient = partnership.pointOfContact?.email;

  async function handleSend() {
    if (!recipient) {
      setError('This partnership has no contact email on file.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('to', recipient);
      formData.append('subject', subject);
      formData.append('body', body);
      const res = await fetch('/api/email/send', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.details || data.error || 'Failed to send email');
      onSent();
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-950 shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><Mail size={18} /></div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Intimate {partnership.institutionName}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">To: {recipient || 'No contact email on file'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 text-xs font-bold">{error}</div>}
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:border-primary-500"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={10}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium outline-none focus:border-primary-500 resize-none"
          />
        </div>
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button className="rounded-xl" onClick={handleSend} disabled={sending || !recipient}>
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DrawerPartnershipForm({ lead }: Props) {
  const { data: session } = useSession();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartnershipId, setSelectedPartnershipId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intimatingReferral, setIntimatingReferral] = useState<Referral | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [partnershipsRes, referralsRes] = await Promise.all([
          fetch('/api/partnerships'),
          fetch(`/api/referrals?leadId=${lead.id}`),
        ]);
        const partnershipsData = await partnershipsRes.json().catch(() => ({}));
        const referralsData = await referralsRes.json().catch(() => ({}));
        if (!cancelled) {
          setPartnerships(partnershipsData.partnerships || []);
          setReferrals(referralsData.referrals || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [lead.id]);

  async function refreshReferrals() {
    const res = await fetch(`/api/referrals?leadId=${lead.id}`);
    const data = await res.json().catch(() => ({}));
    setReferrals(data.referrals || []);
  }

  async function referToPartner() {
    const partnership = partnerships.find(p => p.id === selectedPartnershipId);
    if (!partnership) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          leadName: lead.studentName || lead.name,
          partnershipId: partnership.id,
          institutionId: partnership.institutionId,
          institutionName: partnership.institutionName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create referral');
      setReferrals(current => [data.referral, ...current]);
      setSelectedPartnershipId('');
    } catch (err: any) {
      setError(err.message || 'Failed to create referral');
    } finally {
      setBusy(false);
    }
  }

  async function patchReferral(referralId: string, updates: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/referrals/${referralId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update referral');
      setReferrals(current => current.map(r => r.id === referralId ? data.referral : r));
    } catch (err: any) {
      setError(err.message || 'Failed to update referral');
    } finally {
      setBusy(false);
    }
  }

  async function handleIntimated() {
    if (!intimatingReferral || !session?.user?.id) return;
    await patchReferral(intimatingReferral.id, {
      status: 'Intimated',
      intimatedAt: new Date().toISOString(),
      intimatedBy: session.user.id,
      timelineNote: `Intimated ${intimatingReferral.institutionName} by email`,
    });
    setIntimatingReferral(null);
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-5">
      {error && <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 text-xs font-bold">{error}</div>}

      {partnerships.length === 0 ? (
        <p className="text-xs font-medium text-slate-400">No partnerships set up yet. Add one from the Partnerships tab first.</p>
      ) : (
        <div className="flex gap-2">
          <select
            value={selectedPartnershipId}
            onChange={e => setSelectedPartnershipId(e.target.value)}
            className="flex-1 h-11 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500"
          >
            <option value="">Refer to a partner...</option>
            {partnerships.map(p => (
              <option key={p.id} value={p.id}>{p.institutionName}</option>
            ))}
          </select>
          <Button className="rounded-2xl" onClick={referToPartner} disabled={busy || !selectedPartnershipId}>Refer</Button>
        </div>
      )}

      {referrals.length > 0 && (
        <div className="space-y-4">
          {referrals.map(referral => (
            <div key={referral.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-900 dark:text-white">{referral.institutionName}</p>
                <Badge variant={STATUS_BADGE[referral.status]}>{referral.status}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-[10px]"
                  onClick={() => setIntimatingReferral(referral)}
                  disabled={busy}
                >
                  <Mail size={12} /> Intimate Institute
                </Button>
                <select
                  value={referral.status}
                  onChange={e => patchReferral(referral.id, { status: e.target.value })}
                  disabled={busy}
                  className="h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none"
                >
                  {REFERRAL_STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Follow up on</span>
                  <input
                    type="date"
                    defaultValue={referral.nextFollowUpDate || ''}
                    onBlur={e => { if (e.target.value !== referral.nextFollowUpDate) patchReferral(referral.id, { nextFollowUpDate: e.target.value }); }}
                    className="h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 outline-none"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Commission Amount</span>
                  <input
                    defaultValue={referral.commissionAmount || ''}
                    onBlur={e => { if (e.target.value !== referral.commissionAmount) patchReferral(referral.id, { commissionAmount: e.target.value }); }}
                    placeholder="e.g. ₹15,000"
                    className="h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 outline-none"
                  />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Follow-up Note</span>
                <input
                  defaultValue={referral.lastFollowUpNote || ''}
                  onBlur={e => { if (e.target.value !== referral.lastFollowUpNote) patchReferral(referral.id, { lastFollowUpNote: e.target.value }); }}
                  placeholder="What happened on the last check-in?"
                  className="h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 outline-none"
                />
              </label>
            </div>
          ))}
        </div>
      )}

      {intimatingReferral && (
        <IntimateModal
          partnership={partnerships.find(p => p.id === intimatingReferral.partnershipId) || {
            id: intimatingReferral.partnershipId,
            institutionId: intimatingReferral.institutionId,
            institutionName: intimatingReferral.institutionName,
            status: 'Active',
            pointOfContact: { name: '', role: '' },
            mouSigned: false,
            createdAt: '',
            updatedAt: '',
            createdBy: '',
          }}
          lead={lead}
          onClose={() => setIntimatingReferral(null)}
          onSent={handleIntimated}
        />
      )}
    </div>
  );
}
