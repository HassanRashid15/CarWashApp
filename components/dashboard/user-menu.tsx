'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut } from 'lucide-react';

interface UserMenuProps {
  user: {
    email?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    role?: string;
  };
  onSignOut: () => void;
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const getInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative user-menu">
      <Button
        variant="ghost"
        className="flex items-center h-auto p-1 hover:bg-accent rounded-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Avatar className="h-8 w-8 cursor-pointer">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.email || 'User'} />}
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-50">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            {user.role && (
              <p className="text-xs text-muted-foreground truncate capitalize mt-1">{user.role}</p>
            )}
          </div>
          <div className="p-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={() => {
                onSignOut();
                setIsOpen(false);
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
