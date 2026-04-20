
"use client";

import React, { useState } from 'react';
import { UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  user: {
    name?: string | null;
    image?: string | null;
  } | null;
  className?: string;
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  if (user?.image && !imgError) {
    return (
      <img
        src={user.image}
        alt={user.name || 'User'}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div className={cn(
      "rounded-full bg-primary-600 flex items-center justify-center text-white font-black text-[10px] shadow-sm",
      className
    )}>
      {user?.name ? initials : <UserCircle size={20} />}
    </div>
  );
}
