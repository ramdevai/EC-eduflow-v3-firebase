"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Archive, Check, Loader2, Menu, Pencil, Plus, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Career } from '@/lib/types';
import { cn } from '@/lib/utils';

const CAREER_COLORS: Career['color'][] = ['indigo', 'green', 'amber', 'sky', 'slate'];

function careerDotClass(color: Career['color']) {
  return {
    indigo: 'bg-indigo-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    sky: 'bg-sky-500',
    slate: 'bg-slate-300',
  }[color];
}

function careerSwatchClass(color: Career['color']) {
  return {
    indigo: 'bg-indigo-500 border-indigo-500',
    green: 'bg-emerald-500 border-emerald-500',
    amber: 'bg-amber-500 border-amber-500',
    sky: 'bg-sky-500 border-sky-500',
    slate: 'bg-slate-300 border-slate-300',
  }[color];
}

type CareerFormValues = {
  name: string;
  area: string;
  color: Career['color'];
  description: string;
};

const EMPTY_FORM: CareerFormValues = { name: '', area: '', color: 'indigo', description: '' };

function CareerCard({
  career,
  busy,
  onEdit,
  onToggleStatus,
}: {
  career: Career;
  busy: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  const archived = career.status === 'archived';

  return (
    <Card className={cn('p-4', archived && 'opacity-70')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', careerDotClass(career.color))} />
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">{career.name}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{career.area}</p>
          </div>
        </div>
        {archived && <Badge variant="default">Archived</Badge>}
      </div>

      {career.description && (
        <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500">{career.description}</p>
      )}

      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" className="rounded-xl text-[10px]" onClick={onEdit} disabled={busy}>
          <Pencil size={13} /> Edit
        </Button>
        <Button variant="outline" size="sm" className="rounded-xl text-[10px]" onClick={onToggleStatus} disabled={busy}>
          {archived ? <RotateCcw size={13} /> : <Archive size={13} />} {archived ? 'Restore' : 'Archive'}
        </Button>
      </div>
    </Card>
  );
}

function CareerFormModal({
  title,
  values,
  busy,
  onChange,
  onClose,
  onSave,
}: {
  title: string;
  values: CareerFormValues;
  busy: boolean;
  onChange: (values: CareerFormValues) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const canSave = values.name.trim().length > 0 && values.area.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500" aria-label="Close career dialog">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</span>
            <input
              value={values.name}
              maxLength={80}
              onChange={event => onChange({ ...values, name: event.target.value })}
              placeholder="e.g. Cybersecurity Analyst"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Area</span>
            <input
              value={values.area}
              maxLength={60}
              onChange={event => onChange({ ...values, area: event.target.value })}
              placeholder="e.g. Technology"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
          </label>

          <div className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Color</span>
            <div className="flex gap-2">
              {CAREER_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange({ ...values, color })}
                  aria-label={`Use ${color} color`}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2',
                    careerSwatchClass(color),
                    values.color === color ? 'ring-2 ring-offset-2 ring-primary-400 dark:ring-offset-slate-950' : ''
                  )}
                >
                  {values.color === color && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description (optional)</span>
            <textarea
              value={values.description}
              maxLength={300}
              onChange={event => onChange({ ...values, description: event.target.value })}
              placeholder="What does this career involve?"
              className="min-h-24 resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
            <span className="text-right text-[10px] font-bold text-slate-400">{values.description.length}/300</span>
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

interface CareersViewProps {
  onMobileMenuClick?: () => void;
}

export function CareersView({ onMobileMenuClick }: CareersViewProps) {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<CareerFormValues>(EMPTY_FORM);
  const [editingCareerId, setEditingCareerId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCareers() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/careers');
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load careers');
        }

        if (!cancelled) {
          setCareers(data.careers || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load careers');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCareers();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeCareers = useMemo(() => careers.filter(career => career.status === 'active'), [careers]);
  const archivedCareers = useMemo(() => careers.filter(career => career.status === 'archived'), [careers]);

  function openAddForm() {
    setEditingCareerId(null);
    setFormValues(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEditForm(career: Career) {
    setEditingCareerId(career.id);
    setFormValues({ name: career.name, area: career.area, color: career.color, description: career.description });
    setFormOpen(true);
  }

  async function saveForm() {
    setBusy(true);
    setActionError(null);

    try {
      if (editingCareerId) {
        const res = await fetch(`/api/careers/${editingCareerId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formValues),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update career');
        setCareers(current => current.map(career => career.id === editingCareerId ? data.career : career));
      } else {
        const res = await fetch('/api/careers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formValues),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create career');
        setCareers(current => [...current, data.career]);
      }
      setFormOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save career');
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(career: Career) {
    setBusy(true);
    setActionError(null);

    try {
      const nextStatus = career.status === 'active' ? 'archived' : 'active';
      const res = await fetch(`/api/careers/${career.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update career');
      setCareers(current => current.map(c => c.id === career.id ? data.career : c));
    } catch (err: any) {
      setActionError(err.message || 'Failed to update career');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
          Loading careers...
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
            <p className="text-sm font-black">Careers are not available.</p>
          </div>
          <p className="mt-2 text-xs font-semibold">{error}</p>
        </div>
      </div>
    );
  }

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
        <h2 className="text-base font-black text-slate-950 dark:text-white">Careers</h2>
        <Button size="sm" className="rounded-xl text-[10px]" onClick={openAddForm}>
          <Plus size={14} /> Add
        </Button>
      </div>

      <div className="mb-6 hidden items-center justify-between gap-4 lg:flex">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary-600">Shared Master</p>
          <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Careers</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">{activeCareers.length} active · {archivedCareers.length} archived</p>
        </div>
        <Button className="rounded-xl" onClick={openAddForm}>
          <Plus size={16} /> Add career
        </Button>
      </div>

      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
          {actionError}
        </div>
      )}

      {activeCareers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          No active careers yet. Add one to get started.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {activeCareers.map(career => (
            <CareerCard
              key={career.id}
              career={career}
              busy={busy}
              onEdit={() => openEditForm(career)}
              onToggleStatus={() => toggleStatus(career)}
            />
          ))}
        </div>
      )}

      {archivedCareers.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowArchived(open => !open)}
            className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archivedCareers.length})
          </button>

          {showArchived && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {archivedCareers.map(career => (
                <CareerCard
                  key={career.id}
                  career={career}
                  busy={busy}
                  onEdit={() => openEditForm(career)}
                  onToggleStatus={() => toggleStatus(career)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {formOpen && (
        <CareerFormModal
          title={editingCareerId ? 'Edit career' : 'Add career'}
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
