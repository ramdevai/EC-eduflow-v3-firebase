'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { signOut } from 'next-auth/react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('Application Error:', error)
  }, [error])

  const isAuthError = error.message?.toLowerCase().includes('auth') || 
                      error.message?.toLowerCase().includes('token') ||
                      error.message?.toLowerCase().includes('unauthorized');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-red-50 dark:bg-red-900/20 text-red-600 mb-2">
            <AlertTriangle size={40} />
        </div>
        
        <h2 className="text-3xl font-black tracking-tight">Something went wrong</h2>
        
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm text-left">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Error Diagnostic</p>
            <p className="text-sm font-medium leading-relaxed">
                {error.message || 'An unexpected error occurred in the counseling engine.'}
            </p>
            {error.digest && (
                <p className="mt-4 text-[10px] font-mono text-slate-400">ID: {error.digest}</p>
            )}
        </div>

        <div className="flex flex-col gap-3">
            <Button onClick={() => reset()} className="h-14 rounded-2xl gap-2 text-base">
                <RefreshCw size={20} /> Try to Recover
            </Button>
            
            {isAuthError ? (
                <Button variant="outline" onClick={() => signOut({ callbackUrl: '/' })} className="h-14 rounded-2xl gap-2 text-base">
                    Re-authenticate (Logout)
                </Button>
            ) : (
                <Button variant="ghost" onClick={() => router.replace('/')} className="h-14 rounded-2xl gap-2 text-slate-500">
                    <Home size={20} /> Back to Dashboard
                </Button>
            )}
        </div>

        <p className="text-[10px] text-slate-400 font-medium pt-4">
            If the issue persists, please check your Internet connection and Google account permissions.
        </p>
      </div>
    </div>
  )
}
