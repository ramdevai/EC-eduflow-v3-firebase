"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  GraduationCap, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Users, 
  Heart, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function RegistrationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = params.token as string;
  const sid = searchParams.get('sid');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    async function fetchLead() {
      try {
        const url = `/api/register/${token}${sid ? `?sid=${sid}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load registration form');
        }
        const data = await res.json();
        setFormData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLead();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());

    try {
      const url = `/api/register/${token}${sid ? `?sid=${sid}` : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...data, 
          sid,
          privacy_consent: true,
          privacy_consent_date: new Date().toISOString()
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || errData.error || 'Submission failed');
      }
      setSubmitted(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto" />
          <p className="text-slate-500 font-medium tracking-tight">Preparing your registration form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full p-10 text-center space-y-6 shadow-2xl border-white/20">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Link Invalid</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            {error}. Please contact EduCompass for a new registration link.
          </p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="max-w-md w-full p-10 text-center space-y-6 shadow-2xl border-white/20">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 size={40} />
            </div>
            <h1 className="text-3xl font-black text-slate-900">Thank You!</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Registration form submitted successfully for <b>{formData.name}</b>. We will contact you soon for the next steps.
            </p>
            <Button className="w-full h-14 rounded-2xl" onClick={() => window.close()}>
                Close Window
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-[2.5rem] text-white shadow-xl shadow-primary-100">
            <GraduationCap size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Registration Form</h1>
          <p className="text-slate-500 font-medium">Please provide accurate details for a personalized counseling experience.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <Card className="p-8 space-y-8 border-white/20">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                    <User size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Student Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Full Name</label>
                    <input 
                        name="name" 
                        defaultValue={formData.name} 
                        required 
                        autoComplete="name"
                        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" 
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Gender</label>
                    <select 
                        name="gender" 
                        defaultValue={formData.gender} 
                        required 
                        autoComplete="sex"
                        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all"
                    >
                        <option value="">Select Gender...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Date of Birth</label>
                    <input 
                        type="date" 
                        name="dob" 
                        defaultValue={formData.dob} 
                        required 
                        autoComplete="bday"
                        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" 
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Contact Number</label>
                    <input 
                        name="phone" 
                        defaultValue={formData.phone} 
                        required 
                        autoComplete="tel"
                        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" 
                    />
                </div>

                <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
                    <input 
                        type="email" 
                        name="email" 
                        defaultValue={formData.email} 
                        required
                        autoComplete="email"
                        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" 
                    />
                </div>

                <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Residential Address</label>
                    <textarea 
                        name="address" 
                        defaultValue={formData.address} 
                        required 
                        autoComplete="street-address"
                        rows={3}
                        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all resize-none" 
                    />
                </div>
            </div>
          </Card>

          {/* Academic Information */}
          <Card className="p-8 space-y-8 border-white/20">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <GraduationCap size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Academic Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Current Class / Grade</label>
                    <input 
                        name="grade" 
                        defaultValue={formData.grade} 
                        placeholder="e.g. 10th, 12th, Graduate"
                        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Education Board</label>
                    <input 
                        name="board" 
                        defaultValue={formData.board} 
                        placeholder="e.g. CBSE, ICSE, IB, Cambridge"
                        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" 
                    />
                </div>
                <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">School / Institute Name</label>
                    <input 
                        name="school" 
                        defaultValue={formData.school} 
                        autoComplete="organization"
                        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" 
                    />
                </div>
                <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Hobbies & Interests</label>
                    <textarea 
                        name="hobbies" 
                        defaultValue={formData.hobbies} 
                        placeholder="Tell us what you enjoy doing in your free time..."
                        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all resize-none" 
                    />
                </div>
            </div>
          </Card>

          {/* Family Information */}
          <Card className="p-8 space-y-10 border-white/20">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                    <Users size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Family Details</h3>
            </div>

            <div className="space-y-8">
                <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary-600 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />
                        Father's Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="fatherName" defaultValue={formData.fatherName} required placeholder="Name" className="p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none" />
                        <input name="fatherPhone" defaultValue={formData.fatherPhone} required placeholder="Phone Number" className="p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none" />
                        <input name="fatherEmail" defaultValue={formData.fatherEmail} placeholder="Email Address (Optional)" type="email" className="p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none" />
                        <input name="fatherOccupation" defaultValue={formData.fatherOccupation} placeholder="Occupation" className="p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none" />
                    </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-50">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-pink-600 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-pink-600" />
                        Mother's Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="motherName" defaultValue={formData.motherName} required placeholder="Name" className="p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none" />
                        <input name="motherPhone" defaultValue={formData.motherPhone} required placeholder="Phone Number" className="p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none" />
                        <input name="motherEmail" defaultValue={formData.motherEmail} placeholder="Email Address (Optional)" type="email" className="p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none" />
                        <input name="motherOccupation" defaultValue={formData.motherOccupation} placeholder="Occupation" className="p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none" />
                    </div>
                </div>
            </div>
          </Card>

          <Card className="p-8 space-y-6 border-white/20">
             <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Heart size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Additional Information</h3>
            </div>
            
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">How did you know about me?</label>
                    <select name="source" defaultValue={formData.source} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all">
                        <option value="">Select source...</option>
                        <option value="Social Media">Social Media (Instagram/LinkedIn)</option>
                        <option value="Website">Website</option>
                        <option value="Friend/Family">Referral (Friend/Family)</option>
                        <option value="Workshop">Workshop / School Session</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Any other comments / questions?</label>
                    <textarea name="comments" defaultValue={formData.comments} rows={4} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all resize-none" />
                </div>
            </div>
          </Card>
          {/* Data Privacy & Consent */}
          <Card className="p-8 space-y-6 border-white/20 bg-slate-50/50">
             <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Privacy Notice & Consent</h3>
            </div>
            
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <div className="space-y-2">
                    <p className="font-bold text-slate-900">Privacy & Data Collection</p>
                    <p>
                        EduCompass collects student and family details solely to provide career counseling and assessments. 
                        Your data is handled securely under the DPDP Act 2023. You have the right to access, correct, or request deletion of your data 
                        at any time by contacting our Grievance Officer at <span className="text-primary-600 font-bold">support@educompass.in</span>.
                    </p>
                </div>

                <div className="pt-4 space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="pt-0.5">
                            <input 
                                type="checkbox" 
                                required 
                                className="w-5 h-5 rounded border-2 border-slate-200 text-primary-600 focus:ring-primary-500 cursor-pointer" 
                            />
                        </div>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                            I provide my free, specific, and informed consent to EduCompass to process my personal data for career counseling purposes as described above. <span className="text-red-500">*</span>
                        </span>
                    </label>
                </div>
            </div>
          </Card>

          <Button 
            type="submit" 
            disabled={submitting}
            className="w-full h-20 text-xl font-black rounded-3xl shadow-2xl shadow-primary-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {submitting ? (
                <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Submitting...
                </>
            ) : (
                <>
                    Complete Registration
                    <ArrowRight size={24} />
                </>
            )}
          </Button>

        </form>
      </div>
    </div>
  );
}
