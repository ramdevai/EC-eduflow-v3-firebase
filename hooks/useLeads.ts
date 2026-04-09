import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSession } from "next-auth/react";
import { Lead, LeadStage } from '@/lib/types';
import { differenceInDays } from 'date-fns';
import { normalizeStage, safeParseISO, safeFormat } from '@/lib/utils';

export function useLeads() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchLeads = useCallback(async () => {
    if (!session?.user?.id || !session?.user?.role || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/leads');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch leads');
      }
      const data = await res.json();
      setLeads(data);
    } catch (err: any) {
      console.error('Fetch Leads Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [session?.user?.id, session?.user?.role]);

  const fetchTemplates = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    let mounted = true;
    if (session?.user?.id) {
        fetchLeads();
        fetchTemplates();
    }
    return () => { mounted = false; };
  }, [session?.user?.id, session?.user?.role]); // Simplified deps to avoid identity loops

  const reminders = useMemo(() => {
    return leads.filter(lead => {
      const stage = normalizeStage(lead.stage);
      const isFeesReminder = ['Test completed', '1:1 scheduled', 'Session complete', 'Report sent'].includes(stage) && lead.feesPaid === 'Due';
      const isStageReminder = 
        (stage === 'New' && lead.inquiryDate && differenceInDays(new Date(), safeParseISO(lead.inquiryDate)) > 4) ||
        (stage === 'Registration requested' && lead.inquiryDate && differenceInDays(new Date(), safeParseISO(lead.inquiryDate)) > 1) ||
        (stage === 'Test sent' && differenceInDays(new Date(), safeParseISO(lead.updatedAt)) > 2) ||
        (stage === 'Report sent' && differenceInDays(new Date(), safeParseISO(lead.updatedAt)) > 2);
      return isFeesReminder || isStageReminder;
    });
  }, [leads]);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>): Promise<void> => {
    if (!session?.user?.id || !session?.user?.role) return;

    const existingLead = leads.find(l => l.id === id);
    if (!existingLead) return;

    const finalUpdates: Partial<Lead> = {};
    Object.entries(updates).forEach(([key, value]) => {
      const typedKey = key as keyof Lead;
      if (value !== existingLead[typedKey]) {
        (finalUpdates as any)[typedKey] = value;
      }
    });

    if (Object.keys(finalUpdates).length === 0) {
      console.log(`Update skipped for Lead #${id}: No changes detected.`);
      return;
    }

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalUpdates),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update lead');
      }
      await fetchLeads();
    } catch (err) {
      console.error('Failed to update lead:', err);
      throw err;
    }
  }, [session?.user?.id, session?.user?.role, fetchLeads, leads]);

  const deleteLead = useCallback(async (id: string) => {
    if (!session?.user?.id || !session?.user?.role) return;

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete lead');
      await fetchLeads();
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  }, [session?.user?.id, session?.user?.role, fetchLeads]);

  const addLead = useCallback(async (newLead: Partial<Lead>) => {
    if (!session?.user?.id || !session?.user?.role) return;

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      });
      if (!res.ok) throw new Error('Failed to add lead');
      await fetchLeads();
    } catch (err) {
      console.error('Failed to add lead:', err);
      throw err;
    }
  }, [session?.user?.id, session?.user?.role, fetchLeads]);

  return {
    leads,
    templates,
    loading,
    error,
    reminders,
    fetchLeads,
    fetchTemplates,
    updateLead,
    deleteLead,
    addLead,
  };
}
