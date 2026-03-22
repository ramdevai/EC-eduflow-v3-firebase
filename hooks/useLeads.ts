import { useState, useEffect, useMemo, useCallback } from 'react';
import { Lead, LeadStage } from '@/lib/types';
import { differenceInDays } from 'date-fns';
import { normalizeStage, safeParseISO, safeFormat } from '@/lib/utils';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    const storedSheetId = localStorage.getItem('educompass_sheet_id');
    if (storedSheetId) setSheetId(storedSheetId);
    
    if (!storedSheetId) setLoading(false); 
  }, []);

  const saveSheetId = (id: string) => {
    localStorage.setItem('educompass_sheet_id', id);
    setSheetId(id);
  };

  const fetchLeads = useCallback(async () => {
    if (!sheetId) return;
    
    try {
      setLoading(true);
      const res = await fetch('/api/leads', {
        headers: { 'x-sheet-id': sheetId }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch leads');
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeads(data);
        setError(null);
      } else {
        throw new Error('Expected array of leads');
      }
    } catch (err: any) {
      console.error('Failed to fetch leads:', err);
      setError(err.message);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  const fetchTemplates = useCallback(async () => {
    if (!sheetId) return;
    try {
      const res = await fetch('/api/templates', {
        headers: { 'x-sheet-id': sheetId }
      });
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }, [sheetId]);

  useEffect(() => {
    if (sheetId) {
      fetchLeads();
      fetchTemplates();
    }
  }, [sheetId, fetchLeads, fetchTemplates]);

  const updateLead = useCallback(async (id: number, updates: Partial<Lead>): Promise<void> => {
    if (!sheetId) return;

    // 1. Identify existing lead
    const existingLead = leads.find(l => l.id === id);
    if (!existingLead) return;

    // 2. Filter out unchanged fields to prevent unnecessary writes
    const changedFields: any = {};
    Object.keys(updates).forEach(key => {
        const k = key as keyof Lead;
        // Simple comparison for strings/numbers/booleans
        if (updates[k] !== existingLead[k]) {
            changedFields[k] = updates[k];
        }
    });

    // 3. Exit if no actual changes
    if (Object.keys(changedFields).length === 0) {
        console.log(`Update skipped for Lead #${id}: No changes detected.`);
        return;
    }

    // Prepare updates for API
    const finalUpdates = { ...changedFields };

    if (finalUpdates.stage) {
      finalUpdates.lastStageUpdate = safeFormat(new Date());
    }

    if (finalUpdates.stage === 'Registration requested') {
      finalUpdates.convertedDate = safeFormat(new Date());
    } else if (finalUpdates.stage === 'Report sent') {
      finalUpdates.reportSentDate = safeFormat(new Date());
    }

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 
            'Content-Type': 'application/json',
            'x-sheet-id': sheetId
        },
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
  }, [sheetId, fetchLeads, leads]);

  const deleteLead = useCallback(async (id: number) => {
    if (!sheetId) return;
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
        headers: { 'x-sheet-id': sheetId }
      });
      if (!res.ok) throw new Error('Failed to delete lead');
      await fetchLeads();
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  }, [sheetId, fetchLeads]);

  const addLead = useCallback(async (newLead: Partial<Lead>) => {
    if (!sheetId) return;
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-sheet-id': sheetId
        },
        body: JSON.stringify(newLead),
      });
      if (!res.ok) throw new Error('Failed to add lead');
      await fetchLeads();
    } catch (err) {
      console.error('Failed to add lead:', err);
      throw err;
    }
  }, [sheetId, fetchLeads]);

  const reminders = useMemo(() => {
    const now = new Date();

    return leads.filter(lead => {
      const stage = normalizeStage(lead.stage);
      if (lead.status === 'Lost') return false;
      
      const inquiryDate = safeParseISO(lead.inquiryDate);
      const daysSinceInquiry = differenceInDays(now, inquiryDate);
      
      // Rule E: Fees Pending for active students (beyond Test Completed) - Priority 1
      const lateStages = ['Test completed', '1:1 scheduled', 'Session complete', 'Report sent'];
      if (lateStages.includes(stage) && lead.feesPaid === 'Due') {
        return true;
      }
      
      // Rule A: New Lead not converted in 4 days
      if (stage === 'New' && daysSinceInquiry >= 4) return true;

      // Rule G: Registration requested but not completed in 3 days
      if (stage === 'Registration requested' && lead.updatedAt) {
          const daysSinceReq = differenceInDays(now, safeParseISO(lead.updatedAt));
          if (daysSinceReq >= 3) return true;
      }
      
      // Rule B: Test Sent but no completion nudge after 2 days
      if (stage === 'Test sent' && lead.updatedAt) {
        const daysSinceSent = differenceInDays(now, safeParseISO(lead.updatedAt));
        if (daysSinceSent >= 2) return true;
      }

      // Rule F: Registration done but test not sent after 1 day
      if (stage === 'Registration done' && lead.updatedAt) {
        const daysSinceDone = differenceInDays(now, safeParseISO(lead.updatedAt));
        if (daysSinceDone >= 1) return true;
      }

      // Rule C: Session complete but report not sent after 1 day
      if (stage === 'Session complete' && lead.updatedAt) {
        const daysSinceSession = differenceInDays(now, safeParseISO(lead.updatedAt));
        if (daysSinceSession >= 1) return true;
      }
      
      // Rule D: Report Sent but no review/follow-up after 2 days
      if (stage === 'Report sent' && lead.reportSentDate) {
        const reportDate = safeParseISO(lead.reportSentDate);
        const daysSinceReport = differenceInDays(now, reportDate);
        if (daysSinceReport >= 2) return true;
      }

      return false;
    }).sort((a, b) => {
      const dateA = safeParseISO(a.updatedAt || a.inquiryDate);
      const dateB = safeParseISO(b.updatedAt || b.inquiryDate);
      return dateB.getTime() - dateA.getTime();
    });
  }, [leads]);

  return {
    leads,
    templates,
    loading,
    error,
    sheetId,
    reminders,
    fetchLeads,
    fetchTemplates,
    updateLead,
    deleteLead,
    addLead,
    saveSheetId
  };
}
