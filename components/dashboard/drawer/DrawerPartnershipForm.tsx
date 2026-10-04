"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Lead, Referral, ReferralStatus, UserRole } from '@/lib/types';
import { ReferralPartner, partnerWhatsAppLink, REFERRAL_STATUSES, referralClosed, referralFollowUpMessage, referralReminderDue } from '@/lib/partnership-workflow';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Mail, MessageSquare, Send, X } from 'lucide-react';

const STATUS_BADGE: Record<ReferralStatus, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
  Referred: 'default',
  Due: 'warning',
  Paid: 'success',
  'Didnt join': 'default',
};

interface Props {
  lead: Lead;
  focusedReferralId?: string;
  templates?: any[];
  onChanged?: () => void;
}

function IntimateModal({
  partnership,
  lead,
  onClose,
  onSent,
  channel,
  referral,
  isFollowUp,
  templates,
}: {
  partnership: ReferralPartner;
  lead: Lead;
  onClose: () => void;
  onSent: () => Promise<void>;
  channel: 'Email' | 'WhatsApp';
  referral: Referral;
  isFollowUp: boolean;
  templates?: any[];
}) {
  const studentName = lead.studentName || lead.name;
  const followUp = referralFollowUpMessage(referral, partnership.pointOfContact?.name || '', templates);
  const [subject, setSubject] = useState(isFollowUp ? followUp.subject : `Student Referral - ${studentName}`);
  const [body, setBody] = useState(
    isFollowUp ? followUp.body : `Hi ${partnership.pointOfContact?.name || ''},\n\nWe have recommended ${partnership.institutionName} to ${studentName} and would like to intimate you of this referral.\n\nParent/Guardian: ${lead.name}\nContact: ${lead.phone}${lead.email ? ` / ${lead.email}` : ''}\n\nThanks,\nEduCompass`
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsAppOpened, setWhatsAppOpened] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const recipient = channel === 'Email' ? partnership.pointOfContact?.email : partnership.pointOfContact?.phone;
  const whatsAppLink = partnerWhatsAppLink(partnership.pointOfContact?.phone || '', body);

  async function handleSend() {
    if (!recipient) {
      setError('This partnership has no contact email on file.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      if (!emailSent) {
      const formData = new FormData();
      formData.append('to', recipient);
      formData.append('subject', subject);
      formData.append('body', body);
      const res = await fetch('/api/email/send', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.details || data.error || 'Failed to send email');
      setEmailSent(true);
      }
      await onSent();
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  }

  async function confirmWhatsApp() {
    setSending(true);
    setError(null);
    try {
      await onSent();
    } catch (err: any) {
      setError(err.message || 'Failed to record notification');
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
              <h3 className="text-sm font-black text-slate-900 dark:text-white">{isFollowUp ? 'Follow up with' : 'Notify'} {partnership.institutionName} by {channel}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">To: {recipient || 'No contact email on file'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 text-xs font-bold">{error}</div>}
          {channel === 'Email' && <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:border-primary-500"
          />}
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={10}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium outline-none focus:border-primary-500 resize-none"
          />
        </div>
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={sending}>Cancel</Button>
          {channel === 'Email' ? (
            <Button className="rounded-xl" onClick={handleSend} disabled={sending || !recipient}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {emailSent ? 'Record Sent Email' : 'Send Email'}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button variant="outline" disabled={!whatsAppLink || sending} onClick={() => {
                if (!whatsAppLink) return;
                window.open(whatsAppLink, 'eduflow-whatsapp');
                setWhatsAppOpened(true);
              }}><MessageSquare size={16} /> Open WhatsApp</Button>
              <Button disabled={!whatsAppOpened || sending} onClick={confirmWhatsApp}>
                {sending && <Loader2 size={16} className="animate-spin" />} Confirm Sent
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DrawerPartnershipForm({ lead, focusedReferralId, templates, onChanged }: Props) {
  const { data: session } = useSession();
  const [partnerships, setPartnerships] = useState<ReferralPartner[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartnershipId, setSelectedPartnershipId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intimatingReferral, setIntimatingReferral] = useState<Referral | null>(null);
  const [notificationChannel, setNotificationChannel] = useState<'Email' | 'WhatsApp'>('Email');
  const [isFollowUp, setIsFollowUp] = useState(false);
  const isAdmin = session?.user?.role === UserRole.Admin;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [partnershipsRes, referralsRes] = await Promise.all([
          fetch('/api/partnerships?forReferral=true'),
          fetch(`/api/referrals?leadId=${lead.id}`),
        ]);
        const partnershipsData = await partnershipsRes.json().catch(() => ({}));
        const referralsData = await referralsRes.json().catch(() => ({}));
        if (!partnershipsRes.ok || !referralsRes.ok) throw new Error('Failed to load referrals');
        if (!cancelled) {
          setPartnerships(partnershipsData.partnerships || []);
          setReferrals(referralsData.referrals || []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load referrals');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [lead.id]);

  useEffect(() => {
    if (loading || !focusedReferralId) return;
    const frame = requestAnimationFrame(() => document.getElementById(`referral-${focusedReferralId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    return () => cancelAnimationFrame(frame);
  }, [loading, focusedReferralId]);

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
      onChanged?.();
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
      if (updates.status === 'Due') {
        try {
          const refreshed = await fetch(`/api/referrals?leadId=${encodeURIComponent(lead.id)}`);
          if (!refreshed.ok) throw new Error('Refresh failed');
          const latest = await refreshed.json();
          setReferrals(latest.referrals || []);
        } catch {
          setError('Status saved. Reopen this section to see updates to the other referrals.');
        }
      }
      onChanged?.();
    } catch (err: any) {
      setError(err.message || 'Failed to update referral');
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function handleIntimated() {
    if (!intimatingReferral || !session?.user?.id) return;
    await patchReferral(intimatingReferral.id, {
      ...(isFollowUp ? { followUpChannel: notificationChannel } : { notificationChannel }),
    });
    setIntimatingReferral(null);
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-5">
      {error && <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 text-xs font-bold">{error}</div>}

      {!partnerships.some(p => p.status === 'Active') ? (
        <p className="text-xs font-medium text-slate-400">No active partners available.</p>
      ) : (
        <div className="flex gap-2">
                <select
            value={selectedPartnershipId}
            onChange={e => setSelectedPartnershipId(e.target.value)}
            className="flex-1 h-11 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500"
          >
            <option value="">Institute recommended to student...</option>
            {partnerships.filter(p => p.status === 'Active').map(p => (
              <option key={p.id} value={p.id}>{p.institutionName}</option>
            ))}
          </select>
          <Button className="rounded-2xl" onClick={referToPartner} disabled={busy || !selectedPartnershipId}>Record Referral</Button>
        </div>
      )}

      {referrals.length > 0 && (
        <div className="space-y-4">
          {referrals.map(referral => (
            <div key={referral.id} id={`referral-${referral.id}`} className="scroll-mt-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-900 dark:text-white">{referral.institutionName}</p>
                <Badge variant={STATUS_BADGE[referral.status]}>{referral.status}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-[10px]"
                  onClick={() => { setIsFollowUp(false); setNotificationChannel('Email'); setIntimatingReferral(referral); }}
                  disabled={busy || !partnerships.find(p => p.id === referral.partnershipId)?.pointOfContact?.email}
                >
                  <Mail size={12} /> Notify by Email
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl text-[10px]"
                  onClick={() => { setIsFollowUp(false); setNotificationChannel('WhatsApp'); setIntimatingReferral(referral); }}
                  disabled={busy || !partnerWhatsAppLink(partnerships.find(p => p.id === referral.partnershipId)?.pointOfContact?.phone || '', '')}>
                  <MessageSquare size={12} /> Notify by WhatsApp
                </Button>
                {isAdmin && <select
                  value={referral.status}
                  onChange={e => { void patchReferral(referral.id, { status: e.target.value }).catch(() => {}); }}
                  disabled={busy}
                  className="h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none"
                >
                  {REFERRAL_STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>}
              </div>

              {referral.intimatedAt && <p className="text-xs text-slate-500">Institute notified{referral.notificationChannel ? ` by ${referral.notificationChannel}` : ''}</p>}
              {!referralClosed(referral.status) && <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className={`text-xs ${referralReminderDue(referral) ? 'font-bold text-amber-700 dark:text-amber-400' : 'text-slate-500'}`}>
                  {referralReminderDue(referral) ? 'Follow-up due' : 'Next follow-up'}: {referral.nextFollowUpDate || 'Not scheduled'}
                </p>
                {referral.lastFollowUpAt && <p className="text-xs text-slate-500">Last follow-up: {new Date(referral.lastFollowUpAt).toLocaleDateString('en-IN')} by {referral.followUpChannel}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setIsFollowUp(true); setNotificationChannel('Email'); setIntimatingReferral(referral); }}
                    disabled={busy || !partnerships.find(p => p.id === referral.partnershipId)?.pointOfContact?.email}>
                    <Mail size={14} /> Follow up by Email
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setIsFollowUp(true); setNotificationChannel('WhatsApp'); setIntimatingReferral(referral); }}
                    disabled={busy || !partnerWhatsAppLink(partnerships.find(p => p.id === referral.partnershipId)?.pointOfContact?.phone || '', '')}>
                    <MessageSquare size={14} /> Follow up by WhatsApp
                  </Button>
                </div>
              </div>}
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
            pointOfContact: { name: '', role: '' },
            status: 'Inactive',
          }}
          lead={lead}
          onClose={() => setIntimatingReferral(null)}
          onSent={handleIntimated}
          channel={notificationChannel}
          referral={intimatingReferral}
          isFollowUp={isFollowUp}
          templates={templates}
        />
      )}
    </div>
  );
}
