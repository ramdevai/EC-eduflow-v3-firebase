"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "./ui/Button";
import { GraduationCap, LogIn, UserCircle } from "lucide-react";
import { Card } from "./ui/Card";
import { useEffect } from "react";

export function LoginScreen() {
  const { status } = useSession();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const error = searchParams?.get('error');
  
  useEffect(() => {
    if (status === "authenticated") {
        window.location.replace("/");
    }
  }, [status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <Card className="w-full max-w-md p-10 text-center space-y-8 shadow-2xl border-white/20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-primary-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-primary-200 dark:shadow-none">
            <GraduationCap size={40} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight dark:text-white">EduCompass CRM</h1>
            <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px]">Professional Portal</p>
          </div>
        </div>

        <div className="space-y-4">
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 text-xs font-bold">
                    {error === 'AccessDenied' ? 'Google Access Denied. Please ensure you grant permissions.' : `Sign in error: ${error}`}
                </div>
            )}
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Welcome back! Please sign in with your Google account to access your counseling dashboard and sync leads.
            </p>
            <Button 
                onClick={() => {
                    sessionStorage.setItem('just_logged_in', 'true');
                    signIn("google", { callbackUrl: "/", redirect: true });
                }} 
                className="w-full h-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold gap-3"
            >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                Sign in with Google
            </Button>
        </div>

        <p className="text-[10px] text-slate-400 font-medium">
            Protected by EduCompass Security & Privacy
        </p>
      </Card>
    </div>
  );
}

export function UserProfileBadge({ user }: { user: any }) {
    return (
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {user?.image ? (
                <img src={user.image} className="w-8 h-8 rounded-full" alt={user.name} />
            ) : (
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                    <UserCircle size={20} />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                <button onClick={() => signOut()} className="text-[10px] font-bold text-primary-600 hover:underline">Sign Out</button>
            </div>
        </div>
    );
}
