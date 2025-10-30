'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { PlaceholderChart } from '@/components/dashboard/placeholder-chart';
import { X, Pencil, Loader2, Check, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProfileData {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  email?: string;
  role?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
  }, []);

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
    setIsEditingImage(true); // Ensure we're in image editing mode
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
      // Cancel edit - reset to original values
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
    // Wait a bit for the save message to be set
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

      // Upload new image if selected
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

      // Remove image if user clicked remove
      if (isRemovingImage) {
        profileImageUrl = null;
      }

      // Update profile
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

      const updateData = await updateResponse.json();

      // Refresh profile data
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
      
      // Update original values for cancel functionality
      const savedFirstName = firstName.trim();
      const savedLastName = lastName.trim();
      setOriginalFirstName(savedFirstName);
      setOriginalLastName(savedLastName);
      setOriginalImageUrl(profileImageUrl);

      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });

      // Close edit mode and update original values if called from handleSaveAndClose
      if (isEditMode) {
        setIsEditMode(false);
      }

      // Trigger profile refresh event for navbar and sidebar
      window.dispatchEvent(new CustomEvent('profileUpdated'));

      // Refresh the page after a short delay to ensure all changes are reflected
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
    return null; // Loading state is handled by the layout
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Separator />

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

                {/* First Name and Last Name */}
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

                {/* Role */}
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

                {/* Save Message */}
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
                    <Button variant="outline">Enable</Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive email notifications about account activity
                      </p>
                    </div>
                    <Button variant="outline">Configure</Button>
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
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }
