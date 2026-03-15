import { useState, useEffect, useMemo, useCallback } from 'react';
import { Lead, LeadStage } from '@/lib/types';
import { differenceInDays } from 'date-fns';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);

  // Initialize sheetId from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('educompass_sheet_id');
    if (stored) setSheetId(stored);
    else setLoading(false); // If no sheetId, stop loading so we can show settings
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

  useEffect(() => {
    if (sheetId) fetchLeads();
  }, [sheetId, fetchLeads]);

  const updateLead = async (id: number, updates: Partial<Lead>) => {
    if (!sheetId) return;

    if (updates.stage === 'Converted') {
      updates.convertedDate = new Date().toISOString();
    } else if (updates.stage === 'Report Sent') {
      updates.reportSentDate = new Date().toISOString();
    }

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 
            'Content-Type': 'application/json',
            'x-sheet-id': sheetId
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update lead');
      await fetchLeads();
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  };

  const deleteLead = async (id: number) => {
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
  };

  const addLead = async (newLead: Partial<Lead>) => {
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
  };

  const reminders = useMemo(() => {
    const now = new Date();
    return leads.filter(lead => {
      if (lead.stage === 'Lost' || lead.stage === 'Converted') return false;
      
      const inquiryDate = lead.inquiryDate ? new Date(lead.inquiryDate) : now;
      const daysSinceInquiry = differenceInDays(now, inquiryDate);
      
      // Rule A: New Lead not converted in 4 days
      if (lead.stage === 'New' && daysSinceInquiry >= 4) return true;
      
      // Rule B: Test Sent but no completion nudge after 2 days
      if (lead.stage === 'Test Sent' && lead.updatedAt) {
        const daysSinceSent = differenceInDays(now, new Date(lead.updatedAt));
        if (daysSinceSent >= 2) return true;
      }

      // Rule C: 1:1 Complete but report not sent after 1 day
      if (lead.stage === '1:1 Complete' && lead.updatedAt) {
        const daysSinceSession = differenceInDays(now, new Date(lead.updatedAt));
        if (daysSinceSession >= 1) return true;
      }
      
      // Rule D: Report Sent but no review/follow-up after 2 days
      if (lead.stage === 'Report Sent' && lead.reportSentDate) {
        const reportDate = new Date(lead.reportSentDate);
        const daysSinceReport = differenceInDays(now, reportDate);
        if (daysSinceReport >= 2) return true;
      }

      // Rule E: Fees Pending for active students (beyond Test Completed)
      const lateStages: LeadStage[] = ['Test Completed', 'Appt Scheduled', '1:1 Complete', 'Report Sent'];
      if (lateStages.includes(lead.stage) && !lead.feesPaid) {
        return true;
      }

      return false;
    });
  }, [leads]);

  return {
    leads,
    loading,
    error,
    sheetId,
    reminders,
    fetchLeads,
    updateLead,
    deleteLead,
    addLead,
    saveSheetId
  };
}
