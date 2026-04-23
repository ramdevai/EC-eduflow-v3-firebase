import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSession } from "next-auth/react";
import { Lead, LeadStage } from '@/lib/types';
import { differenceInDays } from 'date-fns';
import { normalizeStage, safeParseISO, safeFormat } from '@/lib/utils';

export function useLeads() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<{ 
    pipeline: number; 
    customers: number; 
    stages: Record<string, number> 
  }>({ 
    pipeline: 0, 
    customers: 0, 
    stages: {} 
  });
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const [hasMoreCustomers, setHasMoreCustomers] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const lastCustomerIdRef = useRef<string | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!session?.user?.id || !session?.user?.role || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch ALL pipeline leads (no limit) + initial metadata
      const res = await fetch('/api/leads?category=pipeline&summary=true');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch pipeline');
      }
      const data = await res.json();
      
      if (data.leads && Array.isArray(data.leads)) {
        setLeads(data.leads);
        setCounts(data.counts || { pipeline: 0, customers: 0, stages: {} });
      }
    } catch (err: any) {
      console.error('Fetch Leads Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [session?.user?.id, session?.user?.role]);

  const fetchCustomers = useCallback(async (reset = false) => {
    if (!session?.user?.id || loadingCustomers || (!hasMoreCustomers && !reset)) return;

    setLoadingCustomers(true);
    try {
      // Performance strategy: Fetch all summary customers at once (~200KB for 1000 items)
      // This avoids complex Firestore composite indexes and is faster than multiple small requests.
      let url = `/api/leads?category=customers&summary=true`;
      
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch customers');
      }
      
      const data = await res.json();
      const allCustomers = data.leads || [];
      
      // Replace existing customers in local state to avoid duplication
      setLeads(prev => [...prev.filter(l => normalizeStage(l.stage) !== 'Report sent'), ...allCustomers]);

      // Since we fetch all at once, there's no "more" to load
      setHasMoreCustomers(false);
    } catch (err: any) {
      console.error('Fetch Customers Error:', err);
      setError(err.message);
    } finally {
      setLoadingCustomers(false);
    }
  }, [session?.user?.id, loadingCustomers, hasMoreCustomers]);

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
    if (session?.user?.id) {
      // Fire both requests in parallel without awaiting sequentially
      Promise.all([fetchLeads(), fetchTemplates()]).catch(err => {
        console.error('Parallel initial fetch error:', err);
      });
    }
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
      return;
    }

    // Optimistic Update
    const previousLeads = [...leads];
    const previousCounts = { ...counts };
    
    // Calculate count changes if stage changed
    if (updates.stage) {
      setCounts(prev => {
        const next = { ...prev, stages: { ...prev.stages } };
        const oldStage = normalizeStage(existingLead.stage);
        const newStage = normalizeStage(updates.stage!);
        
        if (oldStage !== newStage) {
          // Decrement old category
          if (oldStage === 'Report sent') next.customers--;
          else if (oldStage !== 'Lost') next.pipeline--;
          
          if (next.stages[oldStage] !== undefined) next.stages[oldStage]--;

          // Increment new category
          if (newStage === 'Report sent') next.customers++;
          else if (newStage !== 'Lost') next.pipeline++;

          if (next.stages[newStage] !== undefined) next.stages[newStage]++;
          else next.stages[newStage] = 1;
        }
        return next;
      });
    }

    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...finalUpdates, updatedAt: new Date().toISOString() } : l));

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
      // No need to full refetch, state is already updated
    } catch (err) {
      console.error('Failed to update lead, rolling back:', err);
      setLeads(previousLeads);
      setCounts(previousCounts);
      throw err;
    }
  }, [session?.user?.id, session?.user?.role, leads, counts]);

  const deleteLead = useCallback(async (id: string) => {
    if (!session?.user?.id || !session?.user?.role) return;

    const leadToDelete = leads.find(l => l.id === id);
    if (!leadToDelete) return;

    // Optimistic Update
    const previousLeads = [...leads];
    const previousCounts = { ...counts };

    setLeads(prev => prev.filter(l => l.id !== id));
    setCounts(prev => {
      const next = { ...prev, stages: { ...prev.stages } };
      const stage = normalizeStage(leadToDelete.stage);
      if (stage === 'Report sent') next.customers--;
      else if (stage !== 'Lost') next.pipeline--;
      
      if (next.stages[stage] !== undefined) next.stages[stage]--;
      return next;
    });

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete lead');
    } catch (err) {
      console.error('Failed to delete lead, rolling back:', err);
      setLeads(previousLeads);
      setCounts(previousCounts);
    }
  }, [session?.user?.id, session?.user?.role, leads, counts]);

  const addLead = useCallback(async (newLead: Partial<Lead>) => {
    if (!session?.user?.id || !session?.user?.role) return;

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      });
      if (!res.ok) throw new Error('Failed to add lead');
      
      const data = await res.json();
      const createdLead = { 
        ...newLead, 
        id: data.id, 
        ownerUid: session.user.id,
        updatedAt: new Date().toISOString(),
        stage: newLead.stage || 'New',
        status: newLead.status || 'Open'
      } as Lead;
      
      setLeads(prev => [createdLead, ...prev]);
      setCounts(prev => {
        const next = { ...prev, stages: { ...prev.stages } };
        const stage = normalizeStage(createdLead.stage);
        if (stage === 'Report sent') next.customers++;
        else if (stage !== 'Lost') next.pipeline++;

        if (next.stages[stage] !== undefined) next.stages[stage]++;
        else next.stages[stage] = 1;
        return next;
      });
    } catch (err) {
      console.error('Failed to add lead:', err);
      throw err;
    }
  }, [session?.user?.id, session?.user?.role]);

  return {
    leads,
    counts,
    templates,
    loading,
    error,
    reminders,
    hasMoreCustomers,
    loadingCustomers,
    fetchLeads,
    fetchCustomers,
    fetchTemplates,
    updateLead,
    deleteLead,
    addLead,
  };
}
