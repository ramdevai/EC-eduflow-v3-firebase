"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, ChevronLeft, Loader2, Mail, Phone, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { Institution, Partnership, PartnershipStatus, Referral } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<PartnershipStatus, 'default' | 'success' | 'warning'> = {
  Active: 'success',
  Inactive: 'default',
};

type PartnershipFormValues = {
  institutionId: string;
  newInstitutionName: string;
  status: PartnershipStatus;
  mouSigned: boolean;
  commissionTerms: string;
  notes: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  contactPhone: string;
};

const EMPTY_FORM: PartnershipFormValues = {
  institutionId: '',
  newInstitutionName: '',
  status: 'Active',
  mouSigned: false,
  commissionTerms: '',
  notes: '',
  contactName: '',
  contactRole: '',
  contactEmail: '',
  contactPhone: '',
};

function PartnershipCard({ partnership, onOpen }: { partnership: Partnership; onOpen: () => void }) {
  return (
    <Card className="p-4 cursor-pointer hover:border-primary-300 transition-colors" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 size={16} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">{partnership.institutionName}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{partnership.pointOfContact?.name}</p>
          </div>
        </div>
        <Badge variant={STATUS_BADGE[partnership.status]}>{partnership.status}</Badge>
      </div>
      {partnership.commissionTerms && (
        <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500 line-clamp-2">{partnership.commissionTerms}</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <Badge variant={partnership.mouSigned ? 'success' : 'default'}>{partnership.mouSigned ? 'MOU Signed' : 'No MOU'}</Badge>
      </div>
    </Card>
  );
}

function PartnershipFormModal({
  institutions,
  values,
  busy,
  onChange,
  onClose,
  onSave,
}: {
  institutions: Institution[];
  values: PartnershipFormValues;
  busy: boolean;
  onChange: (values: PartnershipFormValues) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const isNewInstitution = values.institutionId === '__new__';
  const canSave = isNewInstitution ? values.newInstitutionName.trim().length > 0 : values.institutionId.length > 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-black text-slate-950 dark:text-white">Add Partnership</h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500" aria-label="Close partnership dialog">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institution</span>
            <select
              value={values.institutionId}
              onChange={event => onChange({ ...values, institutionId: event.target.value })}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="" disabled>Select an institution...</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
              <option value="__new__">+ Add a new institution</option>
            </select>
          </label>

          {isNewInstitution && (
            <label className="grid gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Institution Name</span>
              <input
                value={values.newInstitutionName}
                onChange={event => onChange({ ...values, newInstitutionName: event.target.value })}
                placeholder="e.g. Gundecha College"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
              <span className="flex h-10 items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <ToggleSwitch label="Partnership active"
                  checked={values.status === 'Active'}
                  onChange={checked => onChange({ ...values, status: checked ? 'Active' : 'Inactive' })} />
                {values.status}
              </span>
            </label>
            <label className="grid gap-2 self-end pb-2.5">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <ToggleSwitch label="MOU signed"
                  checked={values.mouSigned}
                  onChange={checked => onChange({ ...values, mouSigned: checked })}
                />
                MOU Signed
              </span>
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Commission Terms</span>
            <input
              value={values.commissionTerms}
              onChange={event => onChange({ ...values, commissionTerms: event.target.value })}
              placeholder="e.g. 10% of first-year tuition"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
          </label>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Referral Point of Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={values.contactName}
                onChange={event => onChange({ ...values, contactName: event.target.value })}
                placeholder="Name"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
              <input
                value={values.contactRole}
                onChange={event => onChange({ ...values, contactRole: event.target.value })}
                placeholder="Role"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
              <input
                value={values.contactEmail}
                onChange={event => onChange({ ...values, contactEmail: event.target.value })}
                placeholder="Email"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
              <input
                value={values.contactPhone}
                onChange={event => onChange({ ...values, contactPhone: event.target.value })}
                placeholder="Phone"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes (optional)</span>
            <textarea
              value={values.notes}
              onChange={event => onChange({ ...values, notes: event.target.value })}
              placeholder="Anything else worth remembering about this partnership"
              className="min-h-20 resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
          </label>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" className="rounded-xl" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" className="rounded-xl" onClick={onSave} disabled={busy || !canSave}>
            {busy && <Loader2 size={16} className="animate-spin" />} Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function PartnershipDetail({
  partnership,
  onBack,
  onOpenLead,
  onUpdate,
  saving,
}: {
  partnership: Partnership;
  onBack: () => void;
  onOpenLead?: (leadId: string, referralId?: string) => void;
  saving: boolean;
  onUpdate: (id: string, updates: Partial<Pick<Partnership, 'status' | 'pointOfContact' | 'mouSigned' | 'commissionTerms' | 'notes'>>) => void;
}) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  function updateContactField(field: keyof Partnership['pointOfContact'], value: string) {
    const current = partnership.pointOfContact || { name: '', role: '' };
    if (current[field] === value) return;
    onUpdate(partnership.id, { pointOfContact: { ...current, [field]: value } });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/referrals?partnershipId=${partnership.id}`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setReferrals(data.referrals || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [partnership.id]);

  const pending = referrals.filter(r => r.status === 'Due').length;
  const paid = referrals.filter(r => r.status === 'Paid').length;
  const isInactive = partnership.status === 'Inactive';

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ChevronLeft size={16} /> Back to Partnerships
      </button>

      <h2 className="mb-5 break-words text-2xl font-black text-slate-950 dark:text-white">{partnership.institutionName}</h2>

      <div className="mb-6 grid gap-4 border-y border-slate-200 py-4 dark:border-slate-800 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Partnership Status</p>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <ToggleSwitch label="Partnership active"
              disabled={saving}
              checked={partnership.status === 'Active'}
              onChange={checked => onUpdate(partnership.id, { status: checked ? 'Active' : 'Inactive' })} />
            <Badge variant={STATUS_BADGE[partnership.status]}>{partnership.status}</Badge>
          </label>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">MOU</p>
          <label className={cn("inline-flex items-center gap-2", isInactive ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
          <ToggleSwitch label="MOU signed"
            disabled={isInactive || saving}
            checked={partnership.mouSigned}
            onChange={checked => onUpdate(partnership.id, { mouSigned: checked })}
          />
          <Badge variant={partnership.mouSigned ? 'success' : 'default'}>{partnership.mouSigned ? 'MOU Signed' : 'No MOU'}</Badge>
          </label>
        </div>
      </div>

      <fieldset disabled={isInactive || saving} aria-label="Partnership details"
        className={cn("min-w-0 border-0 p-0", isInactive && "opacity-60 [&_input]:cursor-not-allowed [&_textarea]:cursor-not-allowed")}>
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Card className="p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Point of Contact</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              defaultValue={partnership.pointOfContact?.name || ''}
              onBlur={e => updateContactField('name', e.target.value)}
              placeholder="Name"
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary-400"
            />
            <input
              defaultValue={partnership.pointOfContact?.role || ''}
              onBlur={e => updateContactField('role', e.target.value)}
              placeholder="Role"
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary-400"
            />
            <input
              defaultValue={partnership.pointOfContact?.email || ''}
              onBlur={e => updateContactField('email', e.target.value)}
              placeholder="Email"
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary-400"
            />
            <input
              defaultValue={partnership.pointOfContact?.phone || ''}
              onBlur={e => updateContactField('phone', e.target.value)}
              placeholder="Phone"
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary-400"
            />
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Commission</p>
          <input
            defaultValue={partnership.commissionTerms || ''}
            onBlur={e => { if (e.target.value !== partnership.commissionTerms) onUpdate(partnership.id, { commissionTerms: e.target.value }); }}
            placeholder="e.g. 10% of first-year tuition"
            className="w-full h-9 mb-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary-400"
          />
          <div className="flex gap-4">
            <div><p className="text-lg font-black text-amber-600">{pending}</p><p className="text-[10px] font-bold uppercase text-slate-400">Referrals - Commission Due</p></div>
            <div><p className="text-lg font-black text-emerald-600">{paid}</p><p className="text-[10px] font-bold uppercase text-slate-400">Referrals - Commission Paid</p></div>
          </div>
        </Card>
      </div>

      <Card className="p-4 mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Notes</p>
        <textarea
          defaultValue={partnership.notes || ''}
          onBlur={e => { if (e.target.value !== partnership.notes) onUpdate(partnership.id, { notes: e.target.value }); }}
          placeholder="Anything else worth remembering about this partnership"
          className="w-full min-h-16 resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-primary-400"
        />
      </Card>

      </fieldset>

      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Referral History</p>
      {loading ? (
        <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
      ) : referrals.length === 0 ? (
        <Card className="p-6 text-center text-xs font-bold text-slate-500">No referrals to this partner yet. Refer a lead from their profile drawer.</Card>
      ) : (
        <div className="space-y-2">
          {referrals.map(referral => (
            <Card
              key={referral.id}
              className={cn("p-4 flex items-center justify-between gap-3", onOpenLead && "cursor-pointer hover:border-primary-300")}
              onClick={() => onOpenLead?.(referral.leadId, referral.id)}
            >
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{referral.leadName}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Referred {referral.referredAt}</p>
              </div>
              <div className="text-right">
                <Badge variant="info">{referral.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface PartnershipsViewProps {
  onMobileMenuClick?: () => void;
  onOpenLead?: (leadId: string, referralId?: string) => void;
}

export function PartnershipsView({ onMobileMenuClick, onOpenLead }: PartnershipsViewProps) {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<PartnershipFormValues>(EMPTY_FORM);
  const [selectedPartnershipId, setSelectedPartnershipId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [partnershipsRes, institutionsRes] = await Promise.all([
          fetch('/api/partnerships'),
          fetch('/api/institutions'),
        ]);
        const partnershipsData = await partnershipsRes.json().catch(() => ({}));
        const institutionsData = await institutionsRes.json().catch(() => ({}));
        if (!partnershipsRes.ok) throw new Error(partnershipsData.error || 'Failed to load partnerships');
        if (!institutionsRes.ok) throw new Error(institutionsData.error || 'Failed to load institutions');
        if (!cancelled) {
          setPartnerships(partnershipsData.partnerships || []);
          setInstitutions(institutionsData.institutions || []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load partnerships');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const selectedPartnership = useMemo(
    () => partnerships.find(p => p.id === selectedPartnershipId) || null,
    [partnerships, selectedPartnershipId]
  );

  function openAddForm() {
    setFormValues(EMPTY_FORM);
    setFormOpen(true);
  }

  async function saveForm() {
    setBusy(true);
    setActionError(null);
    try {
      let institutionId = formValues.institutionId;
      let institutionName = institutions.find(i => i.id === institutionId)?.name || '';

      if (institutionId === '__new__') {
        const res = await fetch('/api/institutions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formValues.newInstitutionName }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create institution');
        institutionId = data.institution.id;
        institutionName = data.institution.name;
        setInstitutions(current => [...current, data.institution]);
      }

      const res = await fetch('/api/partnerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId,
          institutionName,
          status: formValues.status,
          mouSigned: formValues.mouSigned,
          commissionTerms: formValues.commissionTerms,
          notes: formValues.notes,
          pointOfContact: {
            name: formValues.contactName,
            role: formValues.contactRole,
            email: formValues.contactEmail,
            phone: formValues.contactPhone,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create partnership');
      setPartnerships(current => [...current, data.partnership]);
      setFormOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save partnership');
    } finally {
      setBusy(false);
    }
  }

  async function updatePartnership(id: string, updates: Partial<Pick<Partnership, 'status' | 'pointOfContact' | 'mouSigned' | 'commissionTerms' | 'notes'>>) {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/partnerships/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update partnership');
      setPartnerships(current => current.map(p => p.id === id ? data.partnership : p));
    } catch (err: any) {
      setActionError(err.message || 'Failed to update partnership');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
          Loading partnerships...
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
            <p className="text-sm font-black">Partnerships are not available.</p>
          </div>
          <p className="mt-2 text-xs font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
        <h2 className="text-base font-black text-slate-950 dark:text-white">Partnerships</h2>
        {!selectedPartnership && (
          <Button size="sm" className="rounded-xl text-[10px]" onClick={openAddForm}>
            <Plus size={14} /> Add
          </Button>
        )}
      </div>

      {!selectedPartnership && (
        <div className="mb-6 hidden items-center justify-between gap-4 lg:flex">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-600">Institutional Referrals</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Partnerships</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">{partnerships.length} partnership{partnerships.length === 1 ? '' : 's'}</p>
          </div>
          <Button className="rounded-xl" onClick={openAddForm}>
            <Plus size={16} /> Add partnership
          </Button>
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
          {actionError}
        </div>
      )}

      {selectedPartnership ? (
        <PartnershipDetail partnership={selectedPartnership} saving={busy} onBack={() => setSelectedPartnershipId(null)} onOpenLead={onOpenLead} onUpdate={updatePartnership} />
      ) : partnerships.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          No partnerships yet. Add one to start referring students for admission.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {partnerships.map(partnership => (
            <PartnershipCard key={partnership.id} partnership={partnership} onOpen={() => setSelectedPartnershipId(partnership.id)} />
          ))}
        </div>
      )}

      {formOpen && (
        <PartnershipFormModal
          institutions={institutions}
          values={formValues}
          busy={busy}
          onChange={setFormValues}
          onClose={() => setFormOpen(false)}
          onSave={saveForm}
        />
      )}
    </div>
  );
}
