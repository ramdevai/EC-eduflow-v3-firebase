"use client";

import React from 'react';
import { AlertCircle, RefreshCcw, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';

interface MaintenanceBannerProps {
    message: string;
}

export function MaintenanceBanner({ message }: MaintenanceBannerProps) {
    return (
        <div className="bg-red-600 text-white py-3 px-4 shadow-lg sticky top-0 z-[100] border-b border-red-700/50">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-black text-sm leading-none mb-1 uppercase tracking-wider">System Maintenance Required</p>
                        <p className="text-[11px] font-bold text-white/90 leading-tight">
                            {message} <span className="hidden md:inline">• Please update the refresh token on Vercel.</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1 md:flex-none bg-white text-red-600 hover:bg-white/90 border-none h-10 px-4 text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl shadow-xl shadow-black/10"
                        onClick={() => window.open('/api/auth/token', '_blank')}
                    >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        Get New Token
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 md:flex-none text-white hover:bg-white/10 border border-white/20 h-10 px-4 text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl"
                        onClick={() => window.open('https://vercel.com', '_blank')}
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Update Vercel
                    </Button>
                </div>
            </div>
        </div>
    );
}
