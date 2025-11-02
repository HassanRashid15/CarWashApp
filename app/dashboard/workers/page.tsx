'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Edit2, Trash2, X, Check, Users, Phone, Calendar, Image as ImageIcon, Upload, Trash, Eye, MapPin, IdCard, Building2, AlertCircle, Hash } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type WorkerStatus = 'available' | 'busy' | 'off-duty';

interface Worker {
  id: string;
  employee_id?: string | null;
  name: string;
  phone?: string | null;
  emergency_contact?: string | null;
  address?: string | null;
  cnic_no?: string | null;
  city?: string | null;
  age?: number | null;
  status?: WorkerStatus | null;
  joined_date?: string | null;
  last_active?: string | null;
  profile_image?: string | null;
  remarks?: string | null;
  created_at?: string;
  education_level?: string | null;
  previous_experience?: number | null;
  province?: string | null;
  date_of_birth?: string | null;
  blood_group?: string | null;
  salary?: number | null;
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    emergency_contact: '',
    address: '',
    cnic_no: '',
    city: '',
    age: '',
    joined_date: '',
    profile_image: '',
    education_level: '',
    previous_experience: '',
    province: '',
    date_of_birth: '',
    blood_group: '',
    salary: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/workers');
      
      if (!response.ok) {
        throw new Error('Failed to fetch workers');
      }
      
      const data = await response.json();
      setWorkers(data.workers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setModalError('Worker name is required');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    setError(null);
    setSuccess(null);

    try {
      const url = editingWorker 
        ? `/api/workers/${editingWorker.id}`
        : '/api/workers';
      
      const method = editingWorker ? 'PUT' : 'POST';

      // Upload image first if a new file is selected
      let profileImageUrl = formData.profile_image || null;
      
      if (selectedFile) {
        setIsUploadingImage(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        uploadFormData.append('workerName', formData.name.trim() || 'worker');

        const uploadResponse = await fetch('/api/upload-worker-image', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload image');
        }

        const uploadData = await uploadResponse.json();
        profileImageUrl = uploadData.url;
        setIsUploadingImage(false);
      }

      // Prepare data for submission
      const submitData: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        emergency_contact: formData.emergency_contact.trim() || null,
        address: formData.address.trim() || null,
        cnic_no: formData.cnic_no.trim() || null,
        city: formData.city.trim() || null,
        age: formData.age ? parseInt(formData.age) : null,
        status: 'available', // Always available
        joined_date: formData.joined_date || null,
        profile_image: profileImageUrl,
        education_level: formData.education_level.trim() || null,
        previous_experience: formData.previous_experience ? parseInt(formData.previous_experience) : null,
        province: formData.province.trim() || null,
        date_of_birth: formData.date_of_birth || null,
        blood_group: formData.blood_group.trim() || null,
        salary: formData.salary ? parseFloat(formData.salary) : null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}`
          : data.error || 'Failed to save worker';
        throw new Error(errorMsg);
      }

      setSuccess(editingWorker ? 'Worker updated successfully' : 'Worker added successfully');
      setFormData({
        name: '',
        phone: '',
        emergency_contact: '',
        address: '',
        cnic_no: '',
        city: '',
        age: '',
        joined_date: '',
        profile_image: '',
        education_level: '',
        previous_experience: '',
        province: '',
        date_of_birth: '',
        blood_group: '',
        salary: '',
      });
      setSelectedFile(null);
      setImagePreview(null);
      setShowModal(false);
      setEditingWorker(null);
      setModalError(null);
      
      // Fetch updated list
      await fetchWorkers();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save worker');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowDetailsModal(true);
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name || '',
      phone: worker.phone || '',
      emergency_contact: worker.emergency_contact || '',
      address: worker.address || '',
      cnic_no: worker.cnic_no || '',
      city: worker.city || '',
      age: worker.age?.toString() || '',
      joined_date: worker.joined_date ? worker.joined_date.split('T')[0] : '',
      profile_image: worker.profile_image || '',
      education_level: worker.education_level || '',
      previous_experience: worker.previous_experience?.toString() || '',
      province: worker.province || '',
      date_of_birth: worker.date_of_birth ? worker.date_of_birth.split('T')[0] : '',
      blood_group: worker.blood_group || '',
      salary: worker.salary?.toString() || '',
    });
    setImagePreview(worker.profile_image || null);
    setSelectedFile(null);
    setShowModal(true);
    setModalError(null);
    setError(null);
  };

  const handleAddWorker = () => {
    setEditingWorker(null);
    setFormData({
      name: '',
      phone: '',
      emergency_contact: '',
      address: '',
      cnic_no: '',
      city: '',
      age: '',
      joined_date: '',
      profile_image: '',
      education_level: '',
      previous_experience: '',
      province: '',
      date_of_birth: '',
      blood_group: '',
      salary: '',
    });
    setSelectedFile(null);
    setImagePreview(null);
    setShowModal(true);
    setModalError(null);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this worker?')) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/workers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete worker');
      }

      setSuccess('Worker deleted successfully');
      await fetchWorkers();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete worker');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setModalError('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setModalError('Image size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setModalError(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setFormData({ ...formData, profile_image: '' });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingWorker(null);
    setFormData({
      name: '',
      phone: '',
      emergency_contact: '',
      address: '',
      cnic_no: '',
      city: '',
      age: '',
      joined_date: '',
      profile_image: '',
      education_level: '',
      previous_experience: '',
      province: '',
      date_of_birth: '',
      blood_group: '',
      salary: '',
    });
    setSelectedFile(null);
    setImagePreview(null);
    setModalError(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workers</h2>
          <p className="text-muted-foreground">
            Manage your workers list
          </p>
        </div>
        <Button onClick={handleAddWorker}>
          <Plus className="mr-2 h-4 w-4" />
          Add Worker
        </Button>
      </div>

      {(error || success) && (
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {success.toLowerCase().includes('deleted') ? (
                <Alert variant="destructive">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    {success}
                  </AlertDescription>
                </Alert>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Worker Modal Dialog */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={handleCloseModal}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-lg" />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl z-10 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="border-2 shadow-2xl backdrop-blur-xl bg-card/95">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>
                        {editingWorker ? 'Edit Worker' : 'Add New Worker'}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCloseModal}
                      className="h-8 w-8"
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {modalError && (
                      <Alert variant="destructive">
                        <AlertDescription>{modalError}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="name">Worker Name *</Label>
                        <Input
                          id="name"
                          placeholder="Enter full name"
                          value={formData.name}
                          onChange={(e) => {
                            setFormData({ ...formData, name: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          required
                          autoFocus
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-2">
                        <Label htmlFor="phone">
                          <Phone className="inline h-3 w-3 mr-1" />
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+923001234567"
                          value={formData.phone}
                          onChange={(e) => {
                            setFormData({ ...formData, phone: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting || isUploadingImage}
                        />
                      </div>

                      {/* Emergency Contact */}
                      <div className="space-y-2">
                        <Label htmlFor="emergency_contact">
                          <AlertCircle className="inline h-3 w-3 mr-1" />
                          Emergency Contact
                        </Label>
                        <Input
                          id="emergency_contact"
                          type="tel"
                          placeholder="+923001234567"
                          value={formData.emergency_contact}
                          onChange={(e) => {
                            setFormData({ ...formData, emergency_contact: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting || isUploadingImage}
                        />
                      </div>

                      {/* CNIC No */}
                      <div className="space-y-2">
                        <Label htmlFor="cnic_no">
                          <IdCard className="inline h-3 w-3 mr-1" />
                          CNIC No
                        </Label>
                        <Input
                          id="cnic_no"
                          type="text"
                          placeholder="12345-1234567-1"
                          value={formData.cnic_no}
                          onChange={(e) => {
                            setFormData({ ...formData, cnic_no: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting || isUploadingImage}
                          maxLength={15}
                        />
                      </div>

                      {/* Age */}
                      <div className="space-y-2">
                        <Label htmlFor="age">
                          Age
                        </Label>
                        <Input
                          id="age"
                          type="number"
                          placeholder="25"
                          value={formData.age}
                          onChange={(e) => {
                            setFormData({ ...formData, age: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting || isUploadingImage}
                          min="18"
                          max="100"
                        />
                      </div>

                      {/* City */}
                      <div className="space-y-2">
                        <Label htmlFor="city">
                          <Building2 className="inline h-3 w-3 mr-1" />
                          City
                        </Label>
                        <Input
                          id="city"
                          type="text"
                          placeholder="Lahore, Karachi, Islamabad"
                          value={formData.city}
                          onChange={(e) => {
                            setFormData({ ...formData, city: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting || isUploadingImage}
                        />
                      </div>

                      {/* Joined Date */}
                      <div className="space-y-2">
                        <Label htmlFor="joined_date">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          Joined Date
                        </Label>
                        <Input
                          id="joined_date"
                          type="date"
                          value={formData.joined_date}
                          onChange={(e) => {
                            setFormData({ ...formData, joined_date: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting || isUploadingImage}
                        />
                      </div>

                      {/* Address */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">
                          <MapPin className="inline h-3 w-3 mr-1" />
                          Address
                        </Label>
                        <textarea
                          id="address"
                          placeholder="Enter complete address"
                          value={formData.address}
                          onChange={(e) => {
                            setFormData({ ...formData, address: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting || isUploadingImage}
                          rows={2}
                          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>

                      {/* Province */}
                      <div className="space-y-2">
                        <Label htmlFor="province">
                          <Building2 className="inline h-3 w-3 mr-1" />
                          Province
                        </Label>
                        <select
                          id="province"
                          value={formData.province}
                          onChange={(e) => {
                            setFormData({ ...formData, province: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting || isUploadingImage}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select Province</option>
                          <option value="Punjab">Punjab</option>
                          <option value="Sindh">Sindh</option>
                          <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                          <option value="Balochistan">Balochistan</option>
                          <option value="Azad Jammu and Kashmir">Azad Jammu and Kashmir</option>
                          <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                          <option value="Islamabad Capital Territory">Islamabad Capital Territory</option>
                        </select>
                      </div>

                      {/* Date of Birth */}
                      <div className="space-y-2">
                        <Label htmlFor="date_of_birth">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          Date of Birth
                        </Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => {
                            setFormData({ ...formData, date_of_birth: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting || isUploadingImage}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      {/* Education Level */}
                      <div className="space-y-2">
                        <Label htmlFor="education_level">
                          Education Level
                        </Label>
                        <select
                          id="education_level"
                          value={formData.education_level}
                          onChange={(e) => {
                            setFormData({ ...formData, education_level: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting || isUploadingImage}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select Education</option>
                          <option value="No Formal Education">No Formal Education</option>
                          <option value="Primary">Primary</option>
                          <option value="Middle">Middle</option>
                          <option value="Matric">Matric (10th)</option>
                          <option value="Intermediate">Intermediate (12th)</option>
                          <option value="Bachelor">Bachelor</option>
                          <option value="Master">Master</option>
                        </select>
                      </div>

                      {/* Previous Experience */}
                      <div className="space-y-2">
                        <Label htmlFor="previous_experience">
                          Previous Experience (Years)
                        </Label>
                        <Input
                          id="previous_experience"
                          type="number"
                          placeholder="0"
                          value={formData.previous_experience}
                          onChange={(e) => {
                            setFormData({ ...formData, previous_experience: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting || isUploadingImage}
                          min="0"
                          max="50"
                        />
                        <p className="text-xs text-muted-foreground">Years of experience in car wash industry</p>
                      </div>

                      {/* Blood Group */}
                      <div className="space-y-2">
                        <Label htmlFor="blood_group">
                          Blood Group
                        </Label>
                        <select
                          id="blood_group"
                          value={formData.blood_group}
                          onChange={(e) => {
                            setFormData({ ...formData, blood_group: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting || isUploadingImage}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>

                      {/* Salary/Wage */}
                      <div className="space-y-2">
                        <Label htmlFor="salary">
                          Salary/Wage (PKR)
                        </Label>
                        <Input
                          id="salary"
                          type="number"
                          placeholder="25000"
                          value={formData.salary}
                          onChange={(e) => {
                            setFormData({ ...formData, salary: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting || isUploadingImage}
                          min="0"
                          step="100"
                        />
                      </div>

                      {/* Profile Image Upload */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="profile_image_upload">
                          <ImageIcon className="inline h-3 w-3 mr-1" />
                          Profile Image
                        </Label>
                        <div className="space-y-3">
                          {/* Image Preview */}
                          {(imagePreview || formData.profile_image) && (
                            <div className="relative inline-block">
                              <Avatar className="h-24 w-24 border-2 border-border">
                                <AvatarImage 
                                  src={imagePreview || formData.profile_image || ''} 
                                  alt="Preview" 
                                />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {formData.name.charAt(0).toUpperCase() || 'W'}
                                </AvatarFallback>
                              </Avatar>
                              {(selectedFile || formData.profile_image) && (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                  onClick={handleRemoveImage}
                                  disabled={isSubmitting || isUploadingImage}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                          
                          {/* File Input */}
                          <div className="flex items-center gap-2">
                            <Input
                              id="profile_image_upload"
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              disabled={isSubmitting || isUploadingImage}
                              className="cursor-pointer"
                            />
                            {isUploadingImage && (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Upload a profile image (Max 5MB). Supported formats: JPG, PNG, GIF, WebP
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="submit"
                        disabled={isSubmitting || isUploadingImage || !formData.name.trim()}
                        className="flex-1"
                      >
                        {(isSubmitting || isUploadingImage) ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isUploadingImage ? 'Uploading...' : 'Saving...'}
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            {editingWorker ? 'Update' : 'Add'}
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseModal}
                        disabled={isSubmitting || isUploadingImage}
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Worker Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedWorker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={() => setShowDetailsModal(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-lg" />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl z-10 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="border-2 shadow-2xl backdrop-blur-xl bg-card/95">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Eye className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>Worker Details</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDetailsModal(false)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Profile Image */}
                    <div className="flex justify-center">
                      <Avatar className="h-32 w-32 border-4 border-primary/20">
                        {selectedWorker.profile_image ? (
                          <AvatarImage src={selectedWorker.profile_image} alt={selectedWorker.name} />
                        ) : null}
                        <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                          {selectedWorker.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Name */}
                    <div className="text-center">
                      <h3 className="text-2xl font-bold">{selectedWorker.name}</h3>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="px-3 py-1 rounded-full text-sm font-medium border bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700">
                          Worker
                        </span>
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${
                          selectedWorker.status === 'available' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700'
                            : selectedWorker.status === 'busy'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700'
                        }`}>
                          {selectedWorker.status === 'available' ? 'Available' : 
                           selectedWorker.status === 'busy' ? 'Busy' : 
                           selectedWorker.status === 'off-duty' ? 'Off-Duty' : 'Available'}
                        </span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      {/* Employee ID */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Hash className="h-4 w-4" />
                          <Label className="text-sm font-medium">Employee ID</Label>
                        </div>
                        <p className="text-base font-semibold font-mono">
                          {selectedWorker.employee_id || '—'}
                        </p>
                      </div>

                      {/* Phone */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <Label className="text-sm font-medium">Phone Number</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedWorker.phone || '—'}
                        </p>
                      </div>

                      {/* Emergency Contact */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          <Label className="text-sm font-medium">Emergency Contact</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedWorker.emergency_contact || '—'}
                        </p>
                      </div>

                      {/* CNIC No */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <IdCard className="h-4 w-4" />
                          <Label className="text-sm font-medium">CNIC No</Label>
                        </div>
                        <p className="text-base font-semibold font-mono">
                          {selectedWorker.cnic_no || '—'}
                        </p>
                      </div>

                      {/* City */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <Label className="text-sm font-medium">City</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedWorker.city || '—'}
                        </p>
                      </div>

                      {/* Age */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Label className="text-sm font-medium">Age</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedWorker.age ? `${selectedWorker.age} years` : '—'}
                        </p>
                      </div>

                      {/* Province */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <Label className="text-sm font-medium">Province</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedWorker.province || '—'}
                        </p>
                      </div>

                      {/* Date of Birth */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <Label className="text-sm font-medium">Date of Birth</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedWorker.date_of_birth 
                            ? new Date(selectedWorker.date_of_birth).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : '—'}
                        </p>
                      </div>

                      {/* Blood Group */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Label className="text-sm font-medium">Blood Group</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedWorker.blood_group || '—'}
                        </p>
                      </div>

                      {/* Education Level */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Label className="text-sm font-medium">Education Level</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedWorker.education_level || '—'}
                        </p>
                      </div>

                      {/* Previous Experience */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Label className="text-sm font-medium">Previous Experience</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedWorker.previous_experience !== null && selectedWorker.previous_experience !== undefined 
                            ? `${selectedWorker.previous_experience} years` 
                            : '—'}
                        </p>
                      </div>

                      {/* Salary/Wage */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Label className="text-sm font-medium">Salary/Wage</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedWorker.salary !== null && selectedWorker.salary !== undefined 
                            ? `PKR ${selectedWorker.salary.toLocaleString('en-PK')}` 
                            : '—'}
                        </p>
                      </div>

                      {/* Address */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30 md:col-span-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <Label className="text-sm font-medium">Address</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedWorker.address || '—'}
                        </p>
                      </div>

                      {/* Joined Date */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <Label className="text-sm font-medium">Joined Date</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedWorker.joined_date 
                            ? new Date(selectedWorker.joined_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : '—'}
                        </p>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader>
          <CardTitle>Workers List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No workers found. Add your first worker to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Profile</th>
                    <th className="text-left p-4 font-semibold text-sm whitespace-nowrap min-w-[140px]">Employee ID</th>
                    <th className="text-left p-4 font-semibold text-sm whitespace-nowrap min-w-[150px]">Name</th>
                    <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Role</th>
                    <th className="text-left p-4 font-semibold text-sm whitespace-nowrap min-w-[140px]">Phone</th>
                    <th className="text-left p-4 font-semibold text-sm whitespace-nowrap min-w-[100px]">City</th>
                    <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Age</th>
                    <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Status</th>
                    <th className="text-right p-4 font-semibold text-sm sticky right-0 bg-muted/50 z-10 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {workers.map((worker, index) => {
                      const getStatusColor = (status?: string | null) => {
                        switch (status) {
                          case 'available':
                            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700';
                          case 'busy':
                            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
                          case 'off-duty':
                            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700';
                          default:
                            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700';
                        }
                      };

                      const getStatusLabel = (status?: string | null) => {
                        switch (status) {
                          case 'available':
                            return 'Available';
                          case 'busy':
                            return 'Busy';
                          case 'off-duty':
                            return 'Off-Duty';
                          default:
                            return 'Available';
                        }
                      };

                      return (
                        <motion.tr
                          key={worker.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className="border-b border-border hover:bg-accent/50 transition-colors"
                        >
                          {/* Profile Image */}
                          <td className="p-4 whitespace-nowrap">
                            <Avatar className="h-12 w-12">
                              {worker.profile_image ? (
                                <AvatarImage src={worker.profile_image} alt={worker.name} />
                              ) : null}
                              <AvatarFallback className="bg-primary text-primary-foreground text-base font-semibold">
                                {worker.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </td>

                          {/* Employee ID */}
                          <td className="p-4 whitespace-nowrap">
                            {worker.employee_id ? (
                              <div className="flex items-center gap-2">
                                <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm font-mono font-medium">{worker.employee_id}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Name */}
                          <td className="p-4 whitespace-nowrap">
                            <p className="font-semibold text-sm">{worker.name}</p>
                          </td>

                          {/* Role */}
                          <td className="p-4 whitespace-nowrap">
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700">
                              Worker
                            </span>
                          </td>

                          {/* Phone */}
                          <td className="p-4 whitespace-nowrap">
                            {worker.phone ? (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm">{worker.phone}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* City */}
                          <td className="p-4 whitespace-nowrap">
                            {worker.city ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm">{worker.city}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Age */}
                          <td className="p-4 whitespace-nowrap">
                            {worker.age ? (
                              <span className="text-sm font-medium">{worker.age} years</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-4 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(worker.status)}`}>
                              {getStatusLabel(worker.status)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-4 sticky right-0 bg-background z-10 border-l border-border whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(worker)}
                                title="View details"
                                className="flex-shrink-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(worker)}
                                title="Edit worker"
                                className="flex-shrink-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(worker.id)}
                                className="text-destructive hover:text-destructive flex-shrink-0"
                                title="Delete worker"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

