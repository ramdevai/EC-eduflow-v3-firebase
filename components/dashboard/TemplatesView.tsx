"use client";

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MessageSquare, Save, Loader2, RefreshCw, ExternalLink } from 'lucide-react';

interface Template {
    id: string;
    label: string;
    message: string;
}

interface TemplatesViewProps {
    sheetId: string;
}

export function TemplatesView({ sheetId }: TemplatesViewProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const [savedId, setSavedId] = useState<string | null>(null);

    const fetchTemplates = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching templates for sheet:', sheetId);
            const res = await fetch('/api/templates', {
                headers: { 'x-sheet-id': sheetId }
            });
            const data = await res.json();
            if (res.ok) {
                setTemplates(data);
            } else {
                console.error('Template fetch error:', data);
                setError(data.error || 'Failed to load templates');
            }
        } catch (err: any) {
            console.error('Failed to fetch templates:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sheetId) fetchTemplates();
    }, [sheetId]);

    const handleSave = async (id: string, message: string) => {
        setSaving(id);
        try {
            const res = await fetch('/api/templates', {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-sheet-id': sheetId 
                },
                body: JSON.stringify({ id, message }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save template');
            
            setSavedId(id);
            setTimeout(() => setSavedId(null), 3000);
        } catch (err: any) {
            console.error('Save template error:', err);
            alert(`Error: ${err.message}`);
        } finally {
            setSaving(null);
        }
    };

    const updateLocalTemplate = (id: string, newMessage: string) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, message: newMessage } : t));
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Message Templates</h2>
                        <p className="text-[10px] text-slate-400 font-medium">Sheet ID: {sheetId.substring(0, 5)}...</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <a 
                        href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] text-primary-600 hover:underline flex items-center gap-1 font-bold mr-4"
                    >
                        Open Sheet <ExternalLink size={10} />
                    </a>
                    <Button variant="outline" size="sm" onClick={fetchTemplates} className="gap-2">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-24">
                    <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                </div>
            ) : error ? (
                <div className="p-8 text-center bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-3xl">
                    <p className="text-red-600 font-bold mb-4">Error: {error}</p>
                    <Button onClick={fetchTemplates} variant="outline" className="gap-2">
                        <RefreshCw size={14} /> Retry
                    </Button>
                </div>
            ) : templates.length === 0 ? (
                <div className="p-12 text-center border-dashed border-2 rounded-3xl">
                    <p className="text-slate-400 italic">No templates found. Try initializing your sheet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {templates.map((template) => (
                        <Card key={template.id} className="p-6 space-y-4 shadow-sm border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">{template.label}</h3>
                                <Button 
                                    size="sm" 
                                    className="h-8 rounded-lg gap-2 text-[10px] uppercase font-black tracking-widest"
                                    onClick={() => handleSave(template.id, template.message)}
                                    disabled={saving === template.id}
                                >
                                    {saving === template.id ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : savedId === template.id ? (
                                        <span className="text-emerald-500 font-bold flex items-center gap-1">
                                            <Save size={12} /> ✓ Saved
                                        </span>
                                    ) : (
                                        <>
                                            <Save size={12} /> Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                            <textarea 
                                value={template.message}
                                onChange={(e) => updateLocalTemplate(template.id, e.target.value)}
                                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium outline-none focus:border-primary-500 transition-all min-h-[100px] resize-y"
                                placeholder={`Enter ${template.label}...`}
                            />
                            <div className="flex gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                <span>Placeholders:</span>
                                <code className="text-primary-600 dark:text-primary-400">{'{name}'}</code>
                                {template.id === 'onboarding' || template.id === 'followup' || template.id === 'fees_reminder' ? (
                                    <code className="text-primary-600 dark:text-primary-400">{'{REGISTRATION_LINK}'}</code>
                                ) : null}
                                {template.id === 'test' || template.id === 'test_nudge' ? (
                                    <code className="text-primary-600 dark:text-primary-400">{'{url}'}</code>
                                ) : null}
                                {template.id === 'report_email' ? (
                                    <code className="text-primary-600 dark:text-primary-400">{'{notes}'}</code>
                                ) : null}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
