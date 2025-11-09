'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Edit2, Trash2, X, Check, ListOrdered, DollarSign, Clock, User, Users, AlertCircle, Eye, Hash } from 'lucide-react';
import { FeatureRestrictionOverlay } from '@/components/subscription/feature-restriction-overlay';
import { hasFeature, getPlanLimits } from '@/lib/utils/plan-limits';
import { FeedbackModal } from '@/components/feedback/feedback-modal';

type QueueStatus = 'waiting' | 'washing' | 'completed' | 'cancelled';
type ServiceType = 'wash' | 'detailing' | 'wax' | 'interior' | 'full_service';
type PaymentStatus = 'pending' | 'paid' | 'unpaid';

type PaymentMethod = 'cash' | 'easypaisa' | 'jazzcash' | 'bank_transfer' | null;

// List of Pakistani banks
const PAKISTANI_BANKS = [
  'Allied Bank Limited (ABL)',
  'Askari Bank Limited',
  'Bank Al Habib Limited',
  'Bank Alfalah Limited',
  'Bank of Punjab (BOP)',
  'Faysal Bank Limited',
  'First Women Bank Limited',
  'Habib Bank Limited (HBL)',
  'JS Bank Limited',
  'MCB Bank Limited',
  'Meezan Bank Limited',
  'National Bank of Pakistan (NBP)',
  'Soneri Bank Limited',
  'Standard Chartered Bank Pakistan',
  'Summit Bank Limited',
  'The Bank of Khyber',
  'United Bank Limited (UBL)',
  'Al Baraka Bank Pakistan Limited',
  'Dubai Islamic Bank Pakistan Limited',
  'Bank Islami Pakistan Limited',
  'Sindh Bank Limited',
];

interface QueueEntry {
  id: string;
  customer_id: string;
  queue_number: number;
  status: QueueStatus;
  assigned_worker?: string | null;
  service_type: ServiceType;
  price: number;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  bank_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  created_at?: string;
  remarks?: string | null;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    vehicle_number?: string | null;
    vehicle_type?: string | null;
    unique_id?: string;
    car_name?: string;
    car_year?: string;
    bike_name?: string;
    bike_year?: string;
  } | null;
  worker?: {
    id: string;
    name: string;
    employee_id?: string | null;
  } | null;
}

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  vehicle_number?: string | null;
}

interface Worker {
  id: string;
  name: string;
  employee_id?: string | null;
}

export default function QueuePage() {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackQueueEntry, setFeedbackQueueEntry] = useState<QueueEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<QueueEntry | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<{ customers: number; workers: number; products: number } | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [formData, setFormData] = useState({
    customer_id: '',
    service_type: 'wash' as ServiceType,
    price: '',
    assigned_worker: '',
    status: 'waiting' as QueueStatus,
    payment_status: 'pending' as PaymentStatus,
    payment_method: '' as PaymentMethod | '',
    bank_name: '' as string,
    remarks: '',
  });
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  useEffect(() => {
    if (!checkingSubscription) {
      fetchData();
    }
  }, [checkingSubscription]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        setUsage(data.usage);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const fetchData = async () => {
    await Promise.all([fetchQueue(), fetchCustomers(), fetchWorkers()]);
  };

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/queue');
      
      if (!response.ok) {
        throw new Error('Failed to fetch queue');
      }
      
      const data = await response.json();
      setQueueEntries(data.queue || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await fetch('/api/workers');
      if (response.ok) {
        const data = await response.json();
        setWorkers(data.workers || []);
      }
    } catch (err) {
      console.error('Failed to fetch workers:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id) {
      setModalError('Please select a customer');
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      setModalError('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    setError(null);
    setSuccess(null);

    try {
      const url = editingEntry 
        ? `/api/queue/${editingEntry.id}`
        : '/api/queue';
      
      const method = editingEntry ? 'PUT' : 'POST';

      // Prepare data for submission
      const submitData = {
        ...formData,
        payment_method: formData.payment_method || null,
        bank_name: formData.payment_method === 'bank_transfer' ? formData.bank_name || null : null,
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
        throw new Error(data.error || 'Failed to save queue entry');
      }

      const result = await response.json();
      const updatedEntry = result.queueEntry;
      const wasCompleted = formData.status === 'completed';
      const wasPreviouslyCompleted = editingEntry?.status === 'completed';

      setSuccess(editingEntry ? 'Queue entry updated successfully' : 'Queue entry added successfully');
      setFormData({
        customer_id: '',
        service_type: 'wash',
        price: '',
        assigned_worker: '',
        status: 'waiting',
        payment_status: 'pending',
        payment_method: '',
        bank_name: '',
        remarks: '',
      });
      setShowModal(false);
      setEditingEntry(null);
      await fetchQueue();
      
      // Show feedback modal if status changed to completed
      if (wasCompleted && !wasPreviouslyCompleted && updatedEntry) {
        setFeedbackQueueEntry(updatedEntry);
        setShowFeedbackModal(true);
      }
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save queue entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = (entry: QueueEntry) => {
    setSelectedEntry(entry);
    setShowDetailsModal(true);
  };

  const handleEdit = (entry: QueueEntry) => {
    setEditingEntry(entry);
    setFormData({
      customer_id: entry.customer_id,
      service_type: entry.service_type,
      price: entry.price.toString(),
      assigned_worker: entry.assigned_worker || '',
      status: entry.status,
      payment_status: entry.payment_status,
      payment_method: entry.payment_method || '',
      bank_name: entry.bank_name || '',
      remarks: entry.remarks || '',
    });
    setShowModal(true);
    setModalError(null);
    setError(null);
  };

  const handleAddEntry = () => {
    setEditingEntry(null);
    setFormData({
      customer_id: '',
      service_type: 'wash',
      price: '',
      assigned_worker: '',
      status: 'waiting',
      payment_status: 'pending',
      payment_method: '',
      bank_name: '',
      remarks: '',
    });
    setShowModal(true);
    setModalError(null);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this queue entry?')) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/queue/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete queue entry');
      }

      setSuccess('Queue entry deleted successfully');
      await fetchQueue();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete queue entry');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEntry(null);
    setFormData({
      customer_id: '',
      service_type: 'wash',
      price: '',
      assigned_worker: '',
      status: 'waiting',
      payment_status: 'pending',
      payment_method: '',
      bank_name: '',
      remarks: '',
    });
    setModalError(null);
    setError(null);
  };

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
      case 'washing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700';
    }
  };

  const getPaymentStatusColor = (status?: string | null) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
      case 'unpaid':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700';
    }
  };

  const getServiceTypeLabel = (type?: string | null) => {
    switch (type) {
      case 'wash':
        return 'Basic Wash';
      case 'detailing':
        return 'Detailing';
      case 'wax':
        return 'Wax';
      case 'interior':
        return 'Interior Clean';
      case 'full_service':
        return 'Full Service';
      default:
        return type || '—';
    }
  };

  // Check if advanced queue system feature is available based on customer count and subscription
  const isQueueLocked = (): boolean => {
    if (checkingSubscription || !usage) return true; // Lock while loading
    
    // If no subscription, check customer count
    if (!subscription || !subscription.planType) {
      const maxCustomers = 5; // No plan limit
      return usage.customers >= maxCustomers;
    }

    // If has subscription, check feature availability
    const hasFeatureAccess = hasFeature(subscription.planType, 'advancedQueueSystem');
    if (!hasFeatureAccess) {
      // If feature not available in plan, check customer count
      const limits = getPlanLimits(subscription.planType);
      const maxCustomers = limits.maxCustomers;
      if (maxCustomers === null) return false; // Unlimited
      return usage.customers >= maxCustomers;
    }

    // Feature is available in plan, but check customer limit
    const limits = getPlanLimits(subscription.planType);
    const maxCustomers = limits.maxCustomers;
    if (maxCustomers === null) return false; // Unlimited
    return usage.customers >= maxCustomers;
  };

  if (checkingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isQueueLocked()) {
    return (
      <FeatureRestrictionOverlay
        featureName="Advanced Queue System"
        requiredPlan="Professional"
        description="Advanced Queue System provides enhanced queue management features including real-time updates, advanced filtering, and detailed analytics. You've reached your customer limit. Upgrade your plan to continue using this feature."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Queue System</h2>
          <p className="text-muted-foreground">
            Manage car wash queue and payment status
          </p>
        </div>
        <Button onClick={handleAddEntry}>
          <Plus className="mr-2 h-4 w-4" />
          Add to Queue
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

      {/* Queue Entry Modal */}
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
                        <ListOrdered className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>
                        {editingEntry ? 'Edit Queue Entry' : 'Add to Queue'}
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
                      {/* Customer */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="customer_id">Customer *</Label>
                        <select
                          id="customer_id"
                          value={formData.customer_id}
                          onChange={(e) => {
                            setFormData({ ...formData, customer_id: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          required
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select Customer</option>
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name} {customer.vehicle_number ? `(${customer.vehicle_number})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Service Type */}
                      <div className="space-y-2">
                        <Label htmlFor="service_type">Service Type *</Label>
                        <select
                          id="service_type"
                          value={formData.service_type}
                          onChange={(e) => {
                            setFormData({ ...formData, service_type: e.target.value as ServiceType });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          required
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="wash">Basic Wash</option>
                          <option value="detailing">Detailing</option>
                          <option value="wax">Wax</option>
                          <option value="interior">Interior Clean</option>
                          <option value="full_service">Full Service</option>
                        </select>
                      </div>

                      {/* Price */}
                      <div className="space-y-2">
                        <Label htmlFor="price">
                          <DollarSign className="inline h-3 w-3 mr-1" />
                          Price (PKR) *
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          placeholder="0.00"
                          value={formData.price}
                          onChange={(e) => {
                            setFormData({ ...formData, price: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>

                      {/* Assigned Worker */}
                      <div className="space-y-2">
                        <Label htmlFor="assigned_worker">
                          <User className="inline h-3 w-3 mr-1" />
                          Assign Worker
                        </Label>
                        <select
                          id="assigned_worker"
                          value={formData.assigned_worker}
                          onChange={(e) => {
                            setFormData({ ...formData, assigned_worker: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">No Worker Assigned</option>
                          {workers.map((worker) => (
                            <option key={worker.id} value={worker.id}>
                              {worker.name} {worker.employee_id ? `(${worker.employee_id})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status */}
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <select
                          id="status"
                          value={formData.status}
                          onChange={(e) => {
                            setFormData({ ...formData, status: e.target.value as QueueStatus });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="waiting">Waiting</option>
                          <option value="washing">Washing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      {/* Payment Status */}
                      <div className="space-y-2">
                        <Label htmlFor="payment_status">
                          <DollarSign className="inline h-3 w-3 mr-1" />
                          Payment Status
                        </Label>
                        <select
                          id="payment_status"
                          value={formData.payment_status}
                          onChange={(e) => {
                            setFormData({ ...formData, payment_status: e.target.value as PaymentStatus });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="unpaid">Unpaid</option>
                        </select>
                      </div>

                      {/* Payment Method */}
                      <div className="space-y-2">
                        <Label htmlFor="payment_method">
                          <DollarSign className="inline h-3 w-3 mr-1" />
                          Payment Method
                        </Label>
                        <select
                          id="payment_method"
                          value={formData.payment_method || ''}
                          onChange={(e) => {
                            const newMethod = e.target.value as PaymentMethod || '';
                            setFormData({ 
                              ...formData, 
                              payment_method: newMethod,
                              bank_name: newMethod !== 'bank_transfer' ? '' : formData.bank_name
                            });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Not Selected</option>
                          <option value="cash">Cash</option>
                          <option value="easypaisa">Easypaisa</option>
                          <option value="jazzcash">Jazzcash</option>
                          <option value="bank_transfer">Bank Transfer</option>
                        </select>
                      </div>

                      {/* Bank Name - shown only when bank_transfer is selected */}
                      {formData.payment_method === 'bank_transfer' && (
                        <div className="space-y-2">
                          <Label htmlFor="bank_name">
                            <DollarSign className="inline h-3 w-3 mr-1" />
                            Bank Name
                          </Label>
                          <select
                            id="bank_name"
                            value={formData.bank_name}
                            onChange={(e) => {
                              setFormData({ ...formData, bank_name: e.target.value });
                              setModalError(null);
                            }}
                            disabled={isSubmitting}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select Bank</option>
                            {PAKISTANI_BANKS.map((bank) => (
                              <option key={bank} value={bank}>
                                {bank}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Remarks */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="remarks">
                          <AlertCircle className="inline h-3 w-3 mr-1" />
                          Remarks (Optional)
                        </Label>
                        <textarea
                          id="remarks"
                          placeholder="Additional notes..."
                          value={formData.remarks}
                          onChange={(e) => {
                            setFormData({ ...formData, remarks: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          rows={3}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="submit"
                        disabled={isSubmitting || !formData.customer_id || !formData.price}
                        className="flex-1"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            {editingEntry ? 'Update' : 'Add'}
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseModal}
                        disabled={isSubmitting}
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

      {/* Queue Entry Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedEntry && (
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
                      <CardTitle>Queue Entry Details</CardTitle>
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
                    {/* Queue Number */}
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                        <Hash className="h-5 w-5 text-primary" />
                        <span className="text-2xl font-bold">Queue #{selectedEntry.queue_number}</span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      {/* Customer */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <Label className="text-sm font-medium">Customer</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedEntry.customer?.name || '—'}
                        </p>
                        {selectedEntry.customer?.phone && (
                          <p className="text-sm text-muted-foreground">
                            {selectedEntry.customer.phone}
                          </p>
                        )}
                      </div>

                      {/* Service Type */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <Label className="text-sm font-medium text-muted-foreground">Service Type</Label>
                        <p className="text-base font-semibold">
                          {getServiceTypeLabel(selectedEntry.service_type)}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <Label className="text-sm font-medium">Price</Label>
                        </div>
                        <p className="text-base font-semibold">
                          PKR {selectedEntry.price.toLocaleString('en-PK')}
                        </p>
                      </div>

                      {/* Payment Status */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <Label className="text-sm font-medium text-muted-foreground">Payment Status</Label>
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getPaymentStatusColor(selectedEntry.payment_status)}`}>
                          {selectedEntry.payment_status.charAt(0).toUpperCase() + selectedEntry.payment_status.slice(1)}
                        </span>
                      </div>

                      {/* Payment Method */}
                      {selectedEntry.payment_method && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                          <Label className="text-sm font-medium text-muted-foreground">Payment Method</Label>
                          <p className="text-base font-semibold capitalize">
                            {selectedEntry.payment_method.replace('_', ' ')}
                          </p>
                          {selectedEntry.payment_method === 'bank_transfer' && selectedEntry.bank_name && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Bank: {selectedEntry.bank_name}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Status */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedEntry.status)}`}>
                          {selectedEntry.status.charAt(0).toUpperCase() + selectedEntry.status.slice(1)}
                        </span>
                      </div>

                      {/* Assigned Worker */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <Label className="text-sm font-medium">Assigned Worker</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedEntry.worker?.name || '—'}
                        </p>
                      </div>

                      {/* Start Time */}
                      {selectedEntry.start_time && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <Label className="text-sm font-medium">Start Time</Label>
                          </div>
                          <p className="text-base font-semibold">
                            {new Date(selectedEntry.start_time).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}

                      {/* End Time */}
                      {selectedEntry.end_time && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <Label className="text-sm font-medium">End Time</Label>
                          </div>
                          <p className="text-base font-semibold">
                            {new Date(selectedEntry.end_time).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}

                      {/* Remarks */}
                      {selectedEntry.remarks && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30 md:col-span-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertCircle className="h-4 w-4" />
                            <Label className="text-sm font-medium">Remarks</Label>
                          </div>
                          <p className="text-base font-semibold">
                            {selectedEntry.remarks}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : queueEntries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No queue entries found. Add your first entry to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Queue #</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap min-w-[150px]">Customer</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Service Type</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Price</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Worker</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Status</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Payment</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Created</th>
                <th className="text-right p-4 font-semibold text-sm sticky right-0 bg-muted/50 z-10 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {queueEntries.map((entry, index) => (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="border-b border-border hover:bg-accent/50 transition-colors"
                  >
                    {/* Queue Number */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-mono font-medium">{entry.queue_number}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="p-4 whitespace-nowrap">
                      <p className="font-semibold text-sm">{entry.customer?.name || '—'}</p>
                      {entry.customer?.phone && (
                        <p className="text-xs text-muted-foreground">{entry.customer.phone}</p>
                      )}
                    </td>

                    {/* Service Type */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-sm">{getServiceTypeLabel(entry.service_type)}</span>
                    </td>

                    {/* Price */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-sm font-medium">PKR {entry.price.toLocaleString('en-PK')}</span>
                    </td>

                    {/* Worker */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-sm">{entry.worker?.name || '—'}</span>
                    </td>

                    {/* Status */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(entry.status)}`}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(entry.payment_status)}`}>
                        {entry.payment_status.charAt(0).toUpperCase() + entry.payment_status.slice(1)}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="p-4 whitespace-nowrap">
                      {entry.created_at ? (
                        <span className="text-sm text-muted-foreground">
                          {(() => {
                            const date = new Date(entry.created_at);
                            const month = date.toLocaleDateString('en-US', { month: 'short' });
                            const day = date.getDate();
                            const year = date.getFullYear();
                            const time = date.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            });
                            return `${month} ${day} ${year}, ${time}`;
                          })()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 sticky right-0 bg-background z-10 border-l border-border whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(entry)}
                          title="View details"
                          className="flex-shrink-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(entry)}
                          title="Edit entry"
                          className="flex-shrink-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry.id)}
                          className="text-destructive hover:text-destructive flex-shrink-0"
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackQueueEntry && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => {
            setShowFeedbackModal(false);
            setFeedbackQueueEntry(null);
          }}
          queueEntry={feedbackQueueEntry}
          onFeedbackSubmitted={() => {
            setShowFeedbackModal(false);
            setFeedbackQueueEntry(null);
          }}
        />
      )}
    </div>
  );
}

