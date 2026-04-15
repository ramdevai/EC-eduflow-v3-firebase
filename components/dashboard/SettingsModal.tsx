"use client";

import React, { useState, useEffect } from 'react';
import { 
    X, 
    ShieldCheck, 
    RefreshCw, 
    User, 
    Plus, 
    Trash2, 
    AlertCircle, 
    CheckCircle2,
    Lock,
    Globe,
    Settings,
    Clock,
    Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { UserRole, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '@/lib/types';
import { useSession } from 'next-auth/react';

interface Props {
    onClose: () => void;
}

type Tab = 'general' | 'integrations' | 'staff';

export const SettingsModal = ({ onClose }: Props) => {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === UserRole.Admin;
    const [activeTab, setActiveTab] = useState<Tab>('general');
    
    // Status State
    const [statusLoading, setStatusLoading] = useState(false);
    const [adminStatus, setAdminStatus] = useState<any>(null);
    
    // Staff State
    const [staff, setStaff] = useState<any[]>([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [newStaffEmail, setNewStaffEmail] = useState('');
    const [isAddingStaff, setIsAddingStaff] = useState(false);

    // Scheduling Settings
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
    const [settingsLoading, setSettingsLoading] = useState(false);

    const loadSettings = async () => {
      if (!isAdmin) return;
      setSettingsLoading(true);
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to load settings', error);
        setSettings(DEFAULT_SYSTEM_SETTINGS);
      } finally {
        setSettingsLoading(false);
      }
    };

    const saveSettings = async (newSettings: Partial<SystemSettings>) => {
      if (!isAdmin) return;
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSettings),
        });
        if (res.ok) {
          setSettings(prev => ({ ...prev, ...newSettings }));
        }
      } catch (error) {
        console.error('Failed to save settings', error);
      }
    };

    useEffect(() => {
        if (isAdmin && activeTab === 'staff') {
            fetchStaff();
        }
        if (isAdmin && activeTab === 'integrations' && !adminStatus) {
            checkStatus();
        }
        if (isAdmin && activeTab === 'general') {
            loadSettings();
        }
    }, [activeTab, isAdmin]);

    const checkStatus = async () => {
        setStatusLoading(true);
        try {
            const res = await fetch('/api/admin/status');
            const data = await res.json();
            setAdminStatus(data);
        } catch (err) {
            console.error('Status check failed');
        } finally {
            setStatusLoading(false);
        }
    };

    const fetchStaff = async () => {
        setStaffLoading(true);
        try {
            const res = await fetch('/api/admin/staff');
            const data = await res.json();
            setStaff(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch staff');
        } finally {
            setStaffLoading(false);
        }
    };

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStaffEmail.trim()) return;
        setIsAddingStaff(true);
        try {
            const res = await fetch('/api/admin/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newStaffEmail })
            });
            if (!res.ok) throw new Error('Failed to add staff');
            setNewStaffEmail('');
            fetchStaff();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsAddingStaff(false);
        }
    };

    const handleRemoveStaff = async (id: string) => {
        if (!confirm('Are you sure you want to remove this staff member? They will lose access immediately.')) return;
        try {
            const res = await fetch(`/api/admin/staff?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to remove staff');
            fetchStaff();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (!isAdmin) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="p-10 space-y-6 text-center max-w-md shadow-2xl">
                        <Lock className="text-red-500 mx-auto" size={48} />
                        <h2 className="text-2xl font-black">Access Denied</h2>
                        <p className="text-slate-500 text-sm">You do not have permission to access system settings. Please contact your administrator.</p>
                        <Button className="w-full h-12 rounded-xl" onClick={onClose}>Back to Dashboard</Button>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
            >
                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-200 dark:shadow-none">
                            <Settings size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">System Settings</h2>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">EduCompass Admin Console</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"><X size={20} /></button>
                </div>

                {/* Tabs Nav */}
                <div className="flex px-8 border-b border-slate-100 dark:border-slate-800">
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`py-4 px-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'general' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        General
                    </button>
                    <button 
                        onClick={() => setActiveTab('integrations')}
                        className={`py-4 px-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'integrations' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Integrations
                    </button>
                    <button 
                        onClick={() => setActiveTab('staff')}
                        className={`py-4 px-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'staff' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Staff Management
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                    <AnimatePresence mode="wait">
                        {activeTab === 'general' && (
                            <motion.div key="general" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl space-y-1">
                                            <p className="text-[10px] uppercase font-black text-slate-400">Authorized As</p>
                                            <p className="font-bold truncate">{session?.user?.email}</p>
                                        </div>
                                        <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl space-y-1">
                                            <p className="text-[10px] uppercase font-black text-slate-400">System Role</p>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="info" className="uppercase">{session?.user?.role}</Badge>
                                                <ShieldCheck size={14} className="text-emerald-500" />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                 <section className="space-y-4">
                                     <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scheduling Configuration</h3>
                                     <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl space-y-6">
                                         <div>
                                             <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                                                 <Clock size={14} /> DEFAULT SESSION DURATION
                                             </p>
                                             <select 
                                                 value={settings.defaultSessionDuration}
                                                 onChange={(e) => saveSettings({ defaultSessionDuration: parseInt(e.target.value) as 30|60|90|120 })}
                                                 className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:border-primary-500 outline-none"
                                             >
                                                 <option value="30">30 minutes</option>
                                                 <option value="60">60 minutes</option>
                                                 <option value="90">90 minutes</option>
                                                 <option value="120">120 minutes</option>
                                             </select>
                                         </div>
                                         <div>
                                             <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                                                 <CalendarIcon size={14} /> CALENDAR LOOKAHEAD (DAYS)
                                             </p>
                                             <input 
                                                 type="number" 
                                                 min="1" 
                                                 max="14" 
                                                 value={settings.calendarLookaheadDays}
                                                 onChange={(e) => saveSettings({ calendarLookaheadDays: parseInt(e.target.value) })}
                                                 className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:border-primary-500 outline-none"
                                             />
                                             <p className="text-[10px] text-slate-400 mt-1">Maximum days shown when booking 1:1 sessions (1-14)</p>
                                         </div>
                                     </div>
                                 </section>
                             </motion.div>
                         )}


                        {activeTab === 'integrations' && (
                            <motion.div key="integrations" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
                                <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/20 flex gap-4 items-start">
                                    <ShieldCheck className="text-emerald-600 shrink-0" size={20} />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-emerald-900 dark:text-emerald-400">Administrative Sync Active</p>
                                        <p className="text-xs text-emerald-700 dark:text-emerald-500/80 leading-relaxed">
                                            The system is using a centralized Google Auth token to sync Contacts and Calendar items on behalf of the business.
                                        </p>
                                    </div>
                                </div>

                                <section className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Google Services Health</h3>
                                        <button onClick={checkStatus} disabled={statusLoading} className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 flex items-center gap-1.5 transition-all">
                                            <RefreshCw size={12} className={statusLoading ? 'animate-spin' : ''} />
                                            Refresh Check
                                        </button>
                                    </div>

                                    {statusLoading ? (
                                        <div className="space-y-4">
                                            <div className="h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl animate-pulse" />
                                            <div className="h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl animate-pulse" />
                                        </div>
                                    ) : adminStatus ? (
                                        <div className="space-y-3">
                                            {Object.entries(adminStatus.services || {}).map(([service, status]: any) => (
                                                <div key={service} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-primary-600 border border-slate-100 dark:border-slate-700">
                                                            <Globe size={14} />
                                                        </div>
                                                        <span className="font-bold capitalize">{service}</span>
                                                    </div>
                                                    <Badge variant="success" className="text-[10px] font-black uppercase">{status}</Badge>
                                                </div>
                                            ))}
                                            <div className="pt-4 px-2">
                                                <p className="text-[10px] text-slate-400 font-medium">Authorized Account: <span className="font-bold text-slate-600 dark:text-slate-300">{adminStatus.authorizedEmail}</span></p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] space-y-4">
                                            <AlertCircle size={32} className="text-slate-300 mx-auto" />
                                            <Button variant="outline" size="sm" onClick={checkStatus}>Test Connectivity</Button>
                                        </div>
                                    )}
                                </section>
                            </motion.div>
                        )}

                        {activeTab === 'staff' && (
                            <motion.div key="staff" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authorize New Staff</h3>
                                    <form onSubmit={handleAddStaff} className="flex gap-2">
                                        <input 
                                            type="email" 
                                            placeholder="staff-email@gmail.com"
                                            value={newStaffEmail}
                                            onChange={(e) => setNewStaffEmail(e.target.value)}
                                            required
                                            className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all"
                                        />
                                        <Button type="submit" disabled={isAddingStaff} className="rounded-2xl px-6 h-14">
                                            {isAddingStaff ? <RefreshCw className="animate-spin" size={20} /> : <Plus size={20} />}
                                        </Button>
                                    </form>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Staff Members</h3>
                                        <span className="text-[10px] font-black text-slate-400">{staff.length} Authorized</span>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {staffLoading ? (
                                            [1, 2].map(i => <div key={i} className="h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl animate-pulse" />)
                                        ) : staff.length === 0 ? (
                                            <div className="p-10 text-center bg-slate-50 dark:bg-slate-800/50 rounded-[2rem]">
                                                <p className="text-sm font-bold text-slate-400">No staff members added yet.</p>
                                            </div>
                                        ) : (
                                            staff.map((member) => (
                                                <div key={member.id} className="group flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl hover:border-red-100 dark:hover:border-red-900/30 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-slate-800 text-primary-600 flex items-center justify-center">
                                                            <User size={20} />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-sm font-bold">{member.email}</p>
                                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Staff</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRemoveStaff(member.id)}
                                                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </section>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Alert */}
                <div className="px-8 pb-8 pt-4">
                    <p className="text-center text-[9px] text-slate-400 font-medium tracking-tight">
                        Warning: Accessing system settings requires Administrative privileges. Changes here affect global synchronization and data integrity.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
