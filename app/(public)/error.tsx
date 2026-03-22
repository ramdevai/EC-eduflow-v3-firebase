'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Public Application Error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 text-slate-950">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-red-50 text-red-600 mb-2">
            <AlertTriangle size={40} />
        </div>
        
        <h2 className="text-3xl font-black tracking-tight">Something went wrong</h2>
        
        <Card className="p-6 text-left border-slate-200">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Error Diagnostic</p>
            <p className="text-sm font-medium leading-relaxed">
                {error.message || 'An unexpected error occurred. Please try refreshing the page.'}
            </p>
        </Card>

        <Button onClick={() => reset()} className="w-full h-14 rounded-2xl gap-2 text-base">
            <RefreshCw size={20} /> Try again
        </Button>
      </div>
    </div>
  )
}
