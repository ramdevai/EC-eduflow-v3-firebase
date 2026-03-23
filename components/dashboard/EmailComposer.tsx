"use client";

import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Paperclip, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Lead } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EmailComposerProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
  initialSubject: string;
  initialBody: string;
  recipients: string[];
}

export function EmailComposer({ lead, onClose, onSuccess, initialSubject, initialBody, recipients }: EmailComposerProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 3.5 * 1024 * 1024) {
        alert("File size exceeds 3.5MB. Vercel payload limit is 4.5MB. Please use a smaller file.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setError(null);

    const formData = new FormData();
    formData.append('to', recipients.join(', '));
    formData.append('subject', subject);
    formData.append('body', body);
    if (file) {
      formData.append('report', file);
    }

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || 'Failed to send email');

      onSuccess();
    } catch (err: any) {
      console.error('Send error:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <Card className="w-full max-w-2xl bg-white dark:bg-slate-950 shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Send size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {subject.includes('Report') ? 'Send Career Report' : 'Compose Email'}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">To: {recipients.join(', ')}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-10 h-10 p-0">
            <X size={24} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Subject</label>
              <input 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none focus:border-primary-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Message Body</label>
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:border-primary-500 transition-all resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Attachment (PDF Report)</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className={cn(
                  "w-full p-6 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 transition-all",
                  file ? "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10" : "border-slate-200 dark:border-slate-800 group-hover:border-primary-400"
                )}>
                  {file ? (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <FileText size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{file.name}</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready to send</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        <Paperclip size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Click or drag to attach PDF</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Max size: 3.5 MB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Button 
            className="w-full h-16 rounded-2xl text-lg font-black gap-3 shadow-xl shadow-primary-100 dark:shadow-none"
            disabled={sending || !subject || !body}
            onClick={handleSend}
          >
            {sending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Sending...
              </>
            ) : (
              <>
                <Send size={20} />
                Send Now
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
