"use client";

import React, { memo } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { 
  LeadStage, 
  LeadStatus, 
  FeesPaidStatus, 
  CommunityJoinedStatus,
  Lead
} from '@/lib/types';
import { User } from 'next-auth';

interface AddLeadModalProps {
  onClose: () => void;
  onAdd: (lead: Partial<Lead>) => Promise<void>;
  user: User;
}

export const AddLeadModal = memo(function AddLeadModal({ onClose, onAdd, user }: AddLeadModalProps) {
  return (
    <motion.div 
      key="add-modal-backdrop" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 transition-all"
    >
      <motion.div 
        key="add-modal-content" 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }} 
        transition={{ duration: 0.2, ease: "easeOut" }} 
        onClick={(e) => e.stopPropagation()} 
        className="relative bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg p-8 shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400/80 to-primary-600/80" />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black dark:text-white tracking-tight">New Inquiry</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Add a student to your pipeline.</p>
          </div>
          <Button variant="ghost" className="rounded-full w-10 h-10 p-0 bg-slate-50 dark:bg-slate-800/50" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
        
        <form className="space-y-4" onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          if (!user?.id) {
            alert('Authentication error: User not logged in.');
            return;
          }
          const fd = new FormData(e.currentTarget);
          const initialLeadData: Partial<Lead> = {
            name: fd.get('name') as string,
            phone: fd.get('phone') as string,
            email: fd.get('email') as string,
            grade: fd.get('grade') as string,
            board: fd.get('board') as string,
            stage: 'New' as LeadStage,
            status: 'Open' as LeadStatus,
            inquiryDate: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: '',
            lastFollowUp: '',
            testLink: '',
            appointmentTime: '',
            feesPaid: 'Due' as FeesPaidStatus,
            reportSentDate: '',
            convertedDate: '',
            communityJoined: 'No' as CommunityJoinedStatus,
            ownerUid: user.id
          };
          
          try {
            await onAdd(initialLeadData);
            onClose();
          } catch (err) { 
            alert('Failed to add lead. Check your permissions.'); 
          }
        }}>
          <div className="space-y-4">
            <div className="group">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Full Name</label>
              <input name="name" required placeholder="Student Name" className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" />
            </div>
            <div className="group">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Contact Number</label>
              <input name="phone" required placeholder="+91 00000 00000" className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" />
            </div>
            <div className="group">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Email Address</label>
              <input name="email" placeholder="example@mail.com" type="email" className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Grade</label>
                <input name="grade" required placeholder="e.g. 10th" className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" />
              </div>
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Board</label>
                <input name="board" placeholder="e.g. CBSE" className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" />
              </div>
            </div>
          </div>
          <Button type="submit" className="w-full py-5 text-lg font-black rounded-2xl mt-6">Create Lead Profile</Button>
        </form>
      </motion.div>
    </motion.div>
  );
});
