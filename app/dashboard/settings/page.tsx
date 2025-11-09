'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { PlaceholderChart } from '@/components/dashboard/placeholder-chart';
import { X, Pencil, Loader2, Check, XCircle, Shield, Trash2, AlertTriangle, Monitor, Sun, Moon } from 'lucide-react';
import { BillingTab } from '@/components/subscription/billing-tab';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from 'next-themes';

interface ProfileData {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  email?: string;
  role?: string;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  
  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRemovingImage, setIsRemovingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [originalFirstName, setOriginalFirstName] = useState('');
  const [originalLastName, setOriginalLastName] = useState('');
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email notification preferences state
  const [preferences, setPreferences] = useState({
    email_notifications_enabled: true,
    security_alerts_enabled: true,
    marketing_emails_enabled: false,
    queue_notifications: true,
    payment_notifications: true,
    worker_assignments: true,
    theme_preference: 'system',
    animations_enabled: true,
  });
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FAConfirmModal, setShow2FAConfirmModal] = useState(false);
  const [pending2FAState, setPending2FAState] = useState<boolean | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [twoFactorSecret, setTwoFactorSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [is2FALoading, setIs2FALoading] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Activity log state
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Theme and appearance state
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);

  // Update active tab when URL query parameter changes
  useEffect(() => {
    const tab = searchParams.get('tab') || 'profile';
    setActiveTab(tab);
  }, [searchParams]);

  // Handle theme mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load appearance preferences
  useEffect(() => {
    if (mounted && preferences) {
      // Load theme preference
      if (preferences.theme_preference && ['light', 'dark', 'system'].includes(preferences.theme_preference)) {
        setTheme(preferences.theme_preference as 'light' | 'dark' | 'system');
      }
      
      // Load animations preference
      if (preferences.animations_enabled !== undefined) {
        setAnimationsEnabled(preferences.animations_enabled);
        localStorage.setItem('animationsEnabled', preferences.animations_enabled.toString());
      } else {
        // Fallback to localStorage
        const savedAnimations = localStorage.getItem('animationsEnabled');
        if (savedAnimations !== null) {
          setAnimationsEnabled(savedAnimations === 'true');
        }
      }
    }
  }, [mounted, preferences, setTheme]);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);

        // Fetch profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url, email, role')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          const first = profileData.first_name || '';
          const last = profileData.last_name || '';
          setFirstName(first);
          setLastName(last);
          setOriginalFirstName(first);
          setOriginalLastName(last);
          if (profileData.avatar_url) {
            setImagePreview(profileData.avatar_url);
            setOriginalImageUrl(profileData.avatar_url);
          }
        }
      }

      setIsLoading(false);
    }

    getUser();
    loadPreferences();
    check2FAStatus();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/settings/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const check2FAStatus = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('two_factor_enabled')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          setTwoFactorEnabled(profile.two_factor_enabled || false);
        }
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    }
  };

  const handlePreferenceToggle = async (key: string, value: boolean) => {
    const updatedPreferences = { ...preferences, [key]: value };
    setPreferences(updatedPreferences);
    
    setPreferencesSaving(true);
    try {
      const response = await fetch('/api/settings/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPreferences),
      });

      if (!response.ok) {
        // Revert on error
        setPreferences(preferences);
        throw new Error('Failed to save preference');
      }
    } catch (error) {
      console.error('Error saving preference:', error);
      // Revert on error
      setPreferences(preferences);
    } finally {
      setPreferencesSaving(false);
    }
  };

  const handle2FAToggle = (checked: boolean) => {
    // Only allow enabling from switch (when disabled)
    if (checked && !twoFactorEnabled) {
      setPending2FAState(true);
      setShow2FAConfirmModal(true);
    }
  };

  const handleEnabledBadgeClick = () => {
    // When enabled badge is clicked, open disable confirmation
    if (twoFactorEnabled) {
      setPending2FAState(false);
      setShow2FAConfirmModal(true);
    }
  };

  const handle2FAConfirm = async () => {
    if (pending2FAState === null) return;

    if (pending2FAState) {
      // Enable 2FA - start setup
      await handle2FASetup();
    } else {
      // Disable 2FA
      await handle2FADisable();
    }
    
    setShow2FAConfirmModal(false);
    setPending2FAState(null);
  };

  const handle2FASetup = async () => {
    setIs2FALoading(true);
    try {
      const response = await fetch('/api/2fa/setup');
      if (response.ok) {
        const data = await response.json();
        setQrCodeUrl(data.qrCodeUrl);
        setTwoFactorSecret(data.secret);
        setShow2FASetup(true);
        setShow2FAConfirmModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to setup 2FA');
        setPending2FAState(null);
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      alert('Failed to setup 2FA');
      setPending2FAState(null);
    } finally {
      setIs2FALoading(false);
    }
  };

  const handle2FAVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      alert('Please enter a valid 6-digit code');
      return;
    }

    setIs2FALoading(true);
    try {
      const response = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: verificationCode,
          secret: twoFactorSecret,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        setTwoFactorEnabled(true);
        setShow2FASetup(false);
        setVerificationCode('');
      } else {
        const error = await response.json();
        alert(error.error || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      alert('Failed to verify 2FA');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handle2FADisable = async () => {
    setIs2FALoading(true);
    try {
      const response = await fetch('/api/2fa/disable', {
        method: 'POST',
      });

      if (response.ok) {
        setTwoFactorEnabled(false);
        setShow2FAModal(false);
        setShow2FAConfirmModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to disable 2FA');
        setPending2FAState(null);
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      alert('Failed to disable 2FA');
      setPending2FAState(null);
    } finally {
      setIs2FALoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch('/api/account/activity');
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.logs || []);
      } else {
        console.error('Failed to fetch activity logs');
        setActivityLogs([]);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setActivityLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/account/export-pdf');
      if (response.ok) {
        // Get PDF blob
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `account-data-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to export data');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      login: 'Login',
      password_change: 'Password Changed',
      profile_updated: 'Profile Updated',
      preferences_updated: 'Preferences Updated',
      queue_entry_created: 'Queue Entry Created',
      customer_created: 'Customer Added',
      product_created: 'Product Added',
      service_booking: 'Service Booking',
      account_activity: 'Account Activity',
    };
    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    
    // Save to database if user is logged in
    if (user) {
      try {
        setIsSavingAppearance(true);
        await fetch('/api/settings/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            theme_preference: newTheme,
          }),
        });
      } catch (error) {
        console.error('Error saving theme preference:', error);
      } finally {
        setIsSavingAppearance(false);
      }
    }
  };

  const handleAnimationsToggle = async (enabled: boolean) => {
    setAnimationsEnabled(enabled);
    localStorage.setItem('animationsEnabled', enabled.toString());
    
    // Save to database if user is logged in
    if (user) {
      try {
        setIsSavingAppearance(true);
        await fetch('/api/settings/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            animations_enabled: enabled,
          }),
        });
      } catch (error) {
        console.error('Error saving animations preference:', error);
      } finally {
        setIsSavingAppearance(false);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }

    if (!deletePassword) {
      setDeleteError('Please enter your password');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deletePassword,
          confirmText: deleteConfirmText,
        }),
      });

      if (response.ok) {
        // Sign out and redirect
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = '/auth/login';
      } else {
        const error = await response.json();
        setDeleteError(error.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteError('Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = () => {
    const first = firstName || profile?.first_name;
    const last = lastName || profile?.last_name;
    
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    if (first) {
      return first.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsRemovingImage(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    setIsRemovingImage(true);
    setIsEditingImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageEdit = () => {
    setIsEditingImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      setFirstName(originalFirstName);
      setLastName(originalLastName);
      setImagePreview(originalImageUrl);
      setSelectedFile(null);
      setIsRemovingImage(false);
      setIsEditingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    setIsEditMode(!isEditMode);
  };

  const handleSaveAndClose = async () => {
    await handleSaveChanges();
    setTimeout(() => {
      if (saveMessage?.type === 'success') {
        setIsEditMode(false);
        setOriginalFirstName(firstName);
        setOriginalLastName(lastName);
        setOriginalImageUrl(imagePreview || profile?.avatar_url || null);
      }
    }, 100);
  };

  const handleSaveChanges = async () => {
    if (!user) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      let profileImageUrl = profile?.avatar_url || null;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('email', user.email || '');

        const uploadResponse = await fetch('/api/upload-profile', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload image');
        }

        const uploadData = await uploadResponse.json();
        profileImageUrl = uploadData.url;
      }

      if (isRemovingImage) {
        profileImageUrl = null;
      }

      const updateResponse = await fetch('/api/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          profileImageUrl,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const supabase = createClient();
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, email, role')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setImagePreview(profileData.avatar_url || null);
      }

      setSelectedFile(null);
      setIsRemovingImage(false);
      
      const savedFirstName = firstName.trim();
      const savedLastName = lastName.trim();
      setOriginalFirstName(savedFirstName);
      setOriginalLastName(savedLastName);
      setOriginalImageUrl(profileImageUrl);

      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });

      if (isEditMode) {
        setIsEditMode(false);
      }

      window.dispatchEvent(new CustomEvent('profileUpdated'));

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save changes',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your application settings and preferences.
          </p>
        </div>

        <Separator />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="md:col-span-2"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Personal Information</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleEditToggle}
                        className="h-8 w-8"
                      >
                        {isEditMode ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Profile Image */}
                    <div className="space-y-2">
                      <Label>Profile Image</Label>
                      <div className="flex flex-col items-start space-y-3 pb-0">
                        <div className="relative p-4 pb-0">
                          <Avatar key={isRemovingImage ? 'removed' : 'active'} className="h-24 w-24 border-2 border-border">
                            {!isRemovingImage && (imagePreview || profile?.avatar_url) ? (
                              <AvatarImage 
                                src={imagePreview || profile?.avatar_url || ''} 
                                alt={profile?.email || user?.email || 'User'} 
                              />
                            ) : null}
                            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-medium">
                              {getInitials() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          {isEditMode && (imagePreview || (!isRemovingImage && profile?.avatar_url)) && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveImage();
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {isEditMode && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleImageEdit}
                              className="flex items-center gap-2"
                            >
                              <Pencil className="h-4 w-4" />
                              {isEditingImage ? 'Change Image' : 'Edit'}
                            </Button>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        value={profile?.email || user?.email || ''} 
                        disabled 
                        className="backdrop-blur-sm bg-white/10 dark:bg-black/10 border-white/20 dark:border-white/10 shadow-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName" 
                          placeholder="Enter your first name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          disabled={!isEditMode}
                          className="backdrop-blur-sm bg-white/10 dark:bg-black/10 border-white/20 dark:border-white/10 shadow-lg focus:bg-white/20 dark:focus:bg-black/20 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName" 
                          placeholder="Enter your last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          disabled={!isEditMode}
                          className="backdrop-blur-sm bg-white/10 dark:bg-black/10 border-white/20 dark:border-white/10 shadow-lg focus:bg-white/20 dark:focus:bg-black/20 transition-all"
                        />
                      </div>
                    </div>

                    {profile?.role && (
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Input 
                          id="role" 
                          value={profile.role} 
                          disabled 
                          className="backdrop-blur-sm bg-white/10 dark:bg-black/10 border-white/20 dark:border-white/10 shadow-lg"
                        />
                      </div>
                    )}

                    {saveMessage && (
                      <Alert variant={saveMessage.type === 'success' ? 'default' : 'destructive'}>
                        <AlertDescription>{saveMessage.text}</AlertDescription>
                      </Alert>
                    )}

                    {isEditMode && (
                      <Button 
                        className="w-full" 
                        onClick={handleSaveAndClose}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Activity Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="md:col-span-2"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Login Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PlaceholderChart
                      variant="line"
                      height={200}
                      showToggle={true}
                    />
                    <p className="text-sm text-muted-foreground mt-4">
                      This chart shows your login activity over the past 30 days.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Account Settings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="md:col-span-2"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-muted-foreground">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {twoFactorEnabled ? (
                            <div 
                              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 cursor-pointer hover:bg-green-500/20 transition-colors"
                              onClick={handleEnabledBadgeClick}
                            >
                              <div className="h-2 w-2 rounded-full bg-green-500"></div>
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">Enabled</span>
                            </div>
                          ) : (
                            <Switch
                              id="two-factor-account"
                              checked={false}
                              onCheckedChange={handle2FAToggle}
                              disabled={is2FALoading}
                            />
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Email Notifications</p>
                          <p className="text-sm text-muted-foreground">
                            Receive email notifications about account activity
                          </p>
                        </div>
                        <Button 
                          variant="outline"
                          onClick={() => setActiveTab('settings')}
                        >
                          Configure
                        </Button>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-destructive">
                            Delete Account
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete your account and all data
                          </p>
                        </div>
                        <Button 
                          variant="destructive"
                          onClick={() => setShowDeleteModal(true)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 gap-6">
          {/* Notification Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications about account activity
                    </p>
                  </div>
                  <Switch 
                    id="email-notifications" 
                    checked={preferences.email_notifications_enabled}
                    onCheckedChange={(checked) => handlePreferenceToggle('email_notifications_enabled', checked)}
                    disabled={preferencesSaving || preferencesLoading}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="security-alerts">Security Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about important security events
                    </p>
                  </div>
                  <Switch 
                    id="security-alerts" 
                    checked={preferences.security_alerts_enabled}
                    onCheckedChange={(checked) => handlePreferenceToggle('security_alerts_enabled', checked)}
                    disabled={preferencesSaving || preferencesLoading}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketing-emails">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and promotions
                    </p>
                  </div>
                  <Switch 
                    id="marketing-emails" 
                    checked={preferences.marketing_emails_enabled}
                    onCheckedChange={(checked) => handlePreferenceToggle('marketing_emails_enabled', checked)}
                    disabled={preferencesSaving || preferencesLoading}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Appearance Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                    onClick={() => handleThemeChange('system')}
                  >
                    <div className={`relative border-2 rounded-md p-2 transition-all ${
                      (mounted && theme === 'system') || (!mounted && !theme)
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-muted group-hover:border-primary/50'
                    }`}>
                      <div className="w-full h-24 bg-gradient-to-br from-white via-gray-100 to-gray-900 dark:from-gray-900 dark:via-gray-800 dark:to-white rounded-md border border-border flex items-center justify-center">
                        <Monitor className="h-8 w-8 text-muted-foreground" />
                      </div>
                      {(mounted && theme === 'system') || (!mounted && !theme) ? (
                        <div className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      ) : null}
                    </div>
                    <span className={`text-sm font-medium ${
                      (mounted && theme === 'system') || (!mounted && !theme)
                        ? 'text-primary' 
                        : 'text-foreground'
                    }`}>
                      System
                    </span>
                  </div>

                  <div 
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                    onClick={() => handleThemeChange('light')}
                  >
                    <div className={`relative border-2 rounded-md p-2 transition-all ${
                      mounted && theme === 'light'
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-muted group-hover:border-primary/50'
                    }`}>
                      <div className="w-full h-24 bg-white rounded-md border border-gray-200 flex items-center justify-center">
                        <Sun className="h-8 w-8 text-yellow-500" />
                      </div>
                      {mounted && theme === 'light' ? (
                        <div className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      ) : null}
                    </div>
                    <span className={`text-sm font-medium ${
                      mounted && theme === 'light'
                        ? 'text-primary' 
                        : 'text-foreground'
                    }`}>
                      Light
                    </span>
                  </div>

                  <div 
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                    onClick={() => handleThemeChange('dark')}
                  >
                    <div className={`relative border-2 rounded-md p-2 transition-all ${
                      mounted && theme === 'dark'
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-muted group-hover:border-primary/50'
                    }`}>
                      <div className="w-full h-24 bg-gray-950 rounded-md border border-gray-800 flex items-center justify-center">
                        <Moon className="h-8 w-8 text-blue-400" />
                      </div>
                      {mounted && theme === 'dark' ? (
                        <div className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      ) : null}
                    </div>
                    <span className={`text-sm font-medium ${
                      mounted && theme === 'dark'
                        ? 'text-primary' 
                        : 'text-foreground'
                    }`}>
                      Dark
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="animations">Interface Animations</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable animations throughout the interface
                    </p>
                  </div>
                  <Switch 
                    id="animations" 
                    checked={animationsEnabled}
                    onCheckedChange={handleAnimationsToggle}
                    disabled={isSavingAppearance}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Privacy Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="two-factor">
                      Two-Factor Authentication
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {twoFactorEnabled ? (
                      <div 
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 cursor-pointer hover:bg-green-500/20 transition-colors"
                        onClick={handleEnabledBadgeClick}
                      >
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">Enabled</span>
                      </div>
                    ) : (
                      <Switch
                        id="two-factor"
                        checked={false}
                        onCheckedChange={handle2FAToggle}
                        disabled={is2FALoading}
                      />
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="activity-log">Activity Log</Label>
                    <p className="text-sm text-muted-foreground">
                      View a history of your account activity
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowActivityLogModal(true);
                      fetchActivityLogs();
                    }}
                  >
                    View Log
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="data-export">Export Your Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Download a copy of your personal data
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleExportData}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      'Export'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

            </div>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6 mt-6">
            <BillingTab />
          </TabsContent>
        </Tabs>

        {/* 2FA Setup Modal */}
        <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Link your account to an authenticator app for enhanced security
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Instructions */}
              <div className="space-y-3">
                <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Step 1: Add to Authenticator App</p>
                  <p className="text-sm text-muted-foreground">
                    {twoFactorSecret && (
                      <>
                        If you already have an authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.), 
                        scan the QR code below to <strong>add this account</strong> to your existing app.
                      </>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Don't have an app? Download one first:
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Google Authenticator
                    </a>
                    <span className="text-muted-foreground">•</span>
                    <a href="https://authy.com/download/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Authy
                    </a>
                    <span className="text-muted-foreground">•</span>
                    <a href="https://www.microsoft.com/en-us/security/mobile-authenticator" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Microsoft Authenticator
                    </a>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              {qrCodeUrl && (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex justify-center bg-white p-4 rounded-lg border-2 border-border">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                  {twoFactorSecret && (
                    <div className="text-xs text-muted-foreground text-center max-w-xs">
                      <p className="font-medium mb-1">Can't scan? Enter this code manually:</p>
                      <code className="bg-muted px-2 py-1 rounded text-xs font-mono break-all">
                        {twoFactorSecret}
                      </code>
                    </div>
                  )}
                </div>
              )}

              {/* Code Input */}
              <div className="space-y-2">
                <Label>Step 2: Enter 6-digit code from your app</Label>
                <p className="text-xs text-muted-foreground">
                  After scanning, your app will generate a 6-digit code. Enter it below to verify.
                </p>
                <Input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShow2FASetup(false);
                setVerificationCode('');
              }}>
                Cancel
              </Button>
              <Button onClick={handle2FAVerify} disabled={verificationCode.length !== 6 || is2FALoading}>
                {is2FALoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Backup Codes Modal */}
        <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Save Your Backup Codes</DialogTitle>
              <DialogDescription>
                These codes can be used to access your account if you lose access to your authenticator app. Save them in a safe place.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="p-2 bg-background rounded text-center">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  These codes will not be shown again. Make sure to save them securely.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowBackupCodes(false)}>
                I've Saved These Codes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2FA Toggle Confirmation Modal */}
        <Dialog open={show2FAConfirmModal} onOpenChange={(open) => {
          if (!open) {
            setShow2FAConfirmModal(false);
            setPending2FAState(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {pending2FAState ? 'Enable Two-Factor Authentication' : 'Disable Two-Factor Authentication'}
              </DialogTitle>
              <DialogDescription>
                {pending2FAState 
                  ? 'Are you sure you want to enable two-factor authentication? You will need to scan a QR code with an authenticator app.'
                  : 'Are you sure you want to disable two-factor authentication? This will make your account less secure.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShow2FAConfirmModal(false);
                  setPending2FAState(null);
                }}
                disabled={is2FALoading}
              >
                Cancel
              </Button>
              <Button 
                variant={pending2FAState ? "default" : "destructive"} 
                onClick={handle2FAConfirm} 
                disabled={is2FALoading}
              >
                {is2FALoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {pending2FAState ? 'Setting up...' : 'Disabling...'}
                  </>
                ) : (
                  pending2FAState ? 'Enable 2FA' : 'Disable 2FA'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Activity Log Modal */}
        <Dialog open={showActivityLogModal} onOpenChange={setShowActivityLogModal}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Account Activity Log</DialogTitle>
              <DialogDescription>
                View a history of your account activity and security events
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {isLoadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading activity logs...</span>
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No activity logs found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {log.type === 'login' && (
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        )}
                        {log.type === 'password_change' && (
                          <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                        )}
                        {log.type === 'profile_updated' && (
                          <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Pencil className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                        )}
                        {!['login', 'password_change', 'profile_updated'].includes(log.type) && (
                          <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <Check className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{getActivityTypeLabel(log.type)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {log.description || 'Account activity'}
                            </p>
                            {log.ipAddress && (
                              <p className="text-xs text-muted-foreground mt-1">
                                IP: {log.ipAddress}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowActivityLogModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Account Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Account</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your account and all associated data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  All your data including customers, workers, queue entries, and payments will be permanently deleted.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="delete-password">Enter your password</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
                <Input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              {deleteError && (
                <Alert variant="destructive">
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowDeleteModal(false);
                setDeletePassword('');
                setDeleteConfirmText('');
                setDeleteError(null);
              }}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== 'DELETE' || !deletePassword}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
