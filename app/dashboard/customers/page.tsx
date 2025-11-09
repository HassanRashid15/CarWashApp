'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Edit2, Trash2, X, Check, Users, Phone, Calendar, Clock, Car, Bike, AlertCircle, Eye, Hash } from 'lucide-react';
import { UpgradeModal } from '@/components/subscription/upgrade-modal';

type VehicleType = 'car' | 'bike' | 'other';
type CustomerStatus = 'waiting' | 'washing' | 'completed' | 'cancelled';

interface Customer {
  id: string;
  unique_id?: string | null;
  name: string;
  phone?: string | null;
  vehicle_type?: VehicleType | null;
  vehicle_number?: string | null;
  car_type?: string | null;
  car_name?: string | null;
  car_year?: number | null;
  car_color?: string | null;
  bike_type?: string | null;
  bike_name?: string | null;
  bike_year?: number | null;
  bike_color?: string | null;
  other_details?: string | null;
  entry_time?: string | null;
  exit_time?: string | null;
  status?: CustomerStatus | null;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Timer component to show elapsed time
function Timer({ entryTime, exitTime, status }: { entryTime: string | null | undefined; exitTime: string | null | undefined; status: CustomerStatus | null | undefined }) {
  const [elapsed, setElapsed] = useState<string>('');

  useEffect(() => {
    if (!entryTime) {
      setElapsed('—');
      return;
    }

    const calculateElapsed = () => {
      const start = new Date(entryTime);
      const end = exitTime && (status === 'completed' || status === 'cancelled') 
        ? new Date(exitTime) 
        : new Date();
      
      const diff = Math.max(0, end.getTime() - start.getTime());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setElapsed(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setElapsed(`${minutes}m ${seconds}s`);
      } else {
        setElapsed(`${seconds}s`);
      }
    };

    calculateElapsed();

    // Only update timer if customer is still waiting or washing
    if (status === 'waiting' || status === 'washing') {
      const interval = setInterval(calculateElapsed, 1000);
      return () => clearInterval(interval);
    }
  }, [entryTime, exitTime, status]);

  return (
    <span className="text-sm font-medium text-muted-foreground">
      {elapsed}
    </span>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicle_type: 'car' as VehicleType,
    vehicle_number: '',
    car_type: '',
    car_name: '',
    car_year: '',
    car_color: '',
    bike_type: '',
    bike_name: '',
    bike_year: '',
    bike_color: '',
    other_details: '',
    status: 'waiting' as CustomerStatus,
    remarks: '',
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<'trial' | 'starter' | 'professional' | 'enterprise'>('trial');
  const [limitInfo, setLimitInfo] = useState<{ currentCount: number; maxLimit: number | null } | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchSubscriptionInfo();
  }, []);

  const fetchSubscriptionInfo = async () => {
    try {
      const response = await fetch('/api/subscriptions');
      if (response.ok) {
        const data = await response.json();
        if (data.subscription?.planType) {
          setCurrentPlan(data.subscription.planType);
        }
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/customers');
      
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setModalError('Customer name is required');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    setError(null);
    setSuccess(null);

    try {
      const url = editingCustomer 
        ? `/api/customers/${editingCustomer.id}`
        : '/api/customers';
      
      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        
        // Check if limit reached and show upgrade modal
        if (data.showUpgradeModal || data.limitReached) {
          setLimitInfo({
            currentCount: data.currentCount || 0,
            maxLimit: data.maxLimit || null,
          });
          setCurrentPlan(data.planType || 'trial');
          setShowUpgradeModal(true);
          setModalError(null); // Don't show error, modal will handle it
          return;
        }
        
        throw new Error(data.error || 'Failed to save customer');
      }

      const result = await response.json();
      setSuccess(editingCustomer ? 'Customer updated successfully' : 'Customer added successfully');
      setFormData({
        name: '',
        phone: '',
        vehicle_type: 'car',
        vehicle_number: '',
        car_type: '',
        car_name: '',
        car_year: '',
        car_color: '',
        bike_type: '',
        bike_name: '',
        bike_year: '',
        bike_color: '',
        other_details: '',
        status: 'waiting',
        remarks: '',
      });
      setShowModal(false);
      setEditingCustomer(null);
      await fetchCustomers();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      vehicle_type: customer.vehicle_type || 'car',
      vehicle_number: customer.vehicle_number || '',
      car_type: customer.car_type || '',
      car_name: customer.car_name || '',
      car_year: customer.car_year?.toString() || '',
      car_color: customer.car_color || '',
      bike_type: customer.bike_type || '',
      bike_name: customer.bike_name || '',
      bike_year: customer.bike_year?.toString() || '',
      bike_color: customer.bike_color || '',
      other_details: customer.other_details || '',
      status: customer.status || 'waiting',
      remarks: customer.remarks || '',
    });
    setShowModal(true);
    setModalError(null);
    setError(null);
  };

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      vehicle_type: 'car',
      vehicle_number: '',
      car_type: '',
      car_name: '',
      car_year: '',
      car_color: '',
      bike_type: '',
      bike_name: '',
      bike_year: '',
      bike_color: '',
      other_details: '',
      status: 'waiting',
      remarks: '',
    });
    setShowModal(true);
    setModalError(null);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete customer');
      }

      setSuccess('Customer deleted successfully');
      await fetchCustomers();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      vehicle_type: 'car',
      vehicle_number: '',
      car_type: '',
      car_name: '',
      car_year: '',
      car_color: '',
      bike_type: '',
      bike_name: '',
      bike_year: '',
      bike_color: '',
      other_details: '',
      status: 'waiting',
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

  const getStatusLabel = (status?: string | null) => {
    switch (status) {
      case 'waiting':
        return 'Waiting';
      case 'washing':
        return 'Washing';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Waiting';
    }
  };

  const getVehicleIcon = (type?: string | null) => {
    switch (type) {
      case 'car':
        return <Car className="h-4 w-4" />;
      case 'bike':
        return <Bike className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">
            Manage customer records and vehicle information
          </p>
        </div>
        <Button onClick={handleAddCustomer}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
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

      {/* Customer Modal Dialog */}
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
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>
                        {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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
                        <Label htmlFor="name">Customer Name *</Label>
                        <Input
                          id="name"
                          placeholder="Enter customer name"
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
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Vehicle Type */}
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_type">Vehicle Type</Label>
                        <select
                          id="vehicle_type"
                          value={formData.vehicle_type}
                          onChange={(e) => {
                            const newVehicleType = e.target.value as VehicleType;
                            // Clear vehicle-specific fields when type changes
                            setFormData({ 
                              ...formData, 
                              vehicle_type: newVehicleType,
                              car_type: '',
                              car_name: '',
                              car_year: '',
                              car_color: '',
                              bike_type: '',
                              bike_name: '',
                              bike_year: '',
                              bike_color: '',
                              other_details: '',
                            });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="car">Car</option>
                          <option value="bike">Bike</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      {/* Vehicle Number */}
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_number">Vehicle Number / Plate</Label>
                        <Input
                          id="vehicle_number"
                          type="text"
                          placeholder="ABC-1234"
                          value={formData.vehicle_number}
                          onChange={(e) => {
                            setFormData({ ...formData, vehicle_number: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Car-specific fields */}
                      {formData.vehicle_type === 'car' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="car_type">Car Type</Label>
                            <select
                              id="car_type"
                              value={formData.car_type}
                              onChange={(e) => {
                                setFormData({ ...formData, car_type: e.target.value });
                                setModalError(null);
                              }}
                              disabled={isSubmitting}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">Select Car Type</option>
                              <option value="Sedan">Sedan</option>
                              <option value="SUV">SUV</option>
                              <option value="Hatchback">Hatchback</option>
                              <option value="Coupe">Coupe</option>
                              <option value="Convertible">Convertible</option>
                              <option value="Wagon">Wagon</option>
                              <option value="Van">Van</option>
                              <option value="Pickup">Pickup</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="car_name">Car Name / Model</Label>
                            <Input
                              id="car_name"
                              type="text"
                              placeholder="e.g., Toyota Corolla"
                              value={formData.car_name}
                              onChange={(e) => {
                                setFormData({ ...formData, car_name: e.target.value });
                                setModalError(null);
                              }}
                              disabled={isSubmitting}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="car_year">Car Year</Label>
                            <Input
                              id="car_year"
                              type="number"
                              placeholder="2020"
                              value={formData.car_year}
                              onChange={(e) => {
                                setFormData({ ...formData, car_year: e.target.value });
                                setModalError(null);
                              }}
                              disabled={isSubmitting}
                              min="1900"
                              max={new Date().getFullYear() + 1}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="car_color">Car Color</Label>
                            <Input
                              id="car_color"
                              type="text"
                              placeholder="e.g., White, Black, Red"
                              value={formData.car_color}
                              onChange={(e) => {
                                setFormData({ ...formData, car_color: e.target.value });
                                setModalError(null);
                              }}
                              disabled={isSubmitting}
                            />
                          </div>
                        </>
                      )}

                      {/* Bike-specific fields */}
                      {formData.vehicle_type === 'bike' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="bike_type">Bike Type</Label>
                            <select
                              id="bike_type"
                              value={formData.bike_type}
                              onChange={(e) => {
                                setFormData({ ...formData, bike_type: e.target.value });
                                setModalError(null);
                              }}
                              disabled={isSubmitting}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">Select Bike Type</option>
                              <option value="Motorcycle">Motorcycle</option>
                              <option value="Scooter">Scooter</option>
                              <option value="Sports Bike">Sports Bike</option>
                              <option value="Cruiser">Cruiser</option>
                              <option value="Touring">Touring</option>
                              <option value="Off-Road">Off-Road</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bike_name">Bike Name / Model</Label>
                            <Input
                              id="bike_name"
                              type="text"
                              placeholder="e.g., Honda CD-70"
                              value={formData.bike_name}
                              onChange={(e) => {
                                setFormData({ ...formData, bike_name: e.target.value });
                                setModalError(null);
                              }}
                              disabled={isSubmitting}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bike_year">Bike Year</Label>
                            <Input
                              id="bike_year"
                              type="number"
                              placeholder="2020"
                              value={formData.bike_year}
                              onChange={(e) => {
                                setFormData({ ...formData, bike_year: e.target.value });
                                setModalError(null);
                              }}
                              disabled={isSubmitting}
                              min="1900"
                              max={new Date().getFullYear() + 1}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bike_color">Bike Color</Label>
                            <Input
                              id="bike_color"
                              type="text"
                              placeholder="e.g., Red, Black, Blue"
                              value={formData.bike_color}
                              onChange={(e) => {
                                setFormData({ ...formData, bike_color: e.target.value });
                                setModalError(null);
                              }}
                              disabled={isSubmitting}
                            />
                          </div>
                        </>
                      )}

                      {/* Other vehicle details */}
                      {formData.vehicle_type === 'other' && (
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="other_details">Vehicle Details</Label>
                          <textarea
                            id="other_details"
                            placeholder="Enter vehicle details (e.g., 'Rickshaw', 'Truck', 'Bus', etc.)"
                            value={formData.other_details}
                            onChange={(e) => {
                              setFormData({ ...formData, other_details: e.target.value });
                              setModalError(null);
                            }}
                            disabled={isSubmitting}
                            rows={3}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                      )}

                      {/* Status */}
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <select
                          id="status"
                          value={formData.status}
                          onChange={(e) => {
                            setFormData({ ...formData, status: e.target.value as CustomerStatus });
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

                      {/* Remarks */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="remarks">
                          <AlertCircle className="inline h-3 w-3 mr-1" />
                          Remarks (Optional)
                        </Label>
                        <textarea
                          id="remarks"
                          placeholder="Notes (e.g., 'Wax service', 'Customer waiting')"
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
                        disabled={isSubmitting || !formData.name.trim()}
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
                            {editingCustomer ? 'Update' : 'Add'}
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

      {/* Customer Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedCustomer && (
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
                      <CardTitle>Customer Details</CardTitle>
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
                    {/* Name and Status */}
                    <div className="text-center">
                      <h3 className="text-2xl font-bold">{selectedCustomer.name}</h3>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedCustomer.status)}`}>
                          {getStatusLabel(selectedCustomer.status)}
                        </span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      {/* Unique ID */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Hash className="h-4 w-4" />
                          <Label className="text-sm font-medium">Customer ID</Label>
                        </div>
                        <p className="text-base font-semibold font-mono">
                          {selectedCustomer.unique_id || '—'}
                        </p>
                      </div>

                      {/* Phone */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <Label className="text-sm font-medium">Phone Number</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedCustomer.phone || '—'}
                        </p>
                      </div>

                      {/* Vehicle Type */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {getVehicleIcon(selectedCustomer.vehicle_type)}
                          <Label className="text-sm font-medium">Vehicle Type</Label>
                        </div>
                        <p className="text-base font-semibold capitalize">
                          {selectedCustomer.vehicle_type || '—'}
                        </p>
                      </div>

                      {/* Vehicle Number */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Label className="text-sm font-medium">Vehicle Number</Label>
                        </div>
                        <p className="text-base font-semibold font-mono">
                          {selectedCustomer.vehicle_number || '—'}
                        </p>
                      </div>

                      {/* Car-specific details */}
                      {selectedCustomer.vehicle_type === 'car' && (
                        <>
                          {selectedCustomer.car_type && (
                            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                              <Label className="text-sm font-medium text-muted-foreground">Car Type</Label>
                              <p className="text-base font-semibold">{selectedCustomer.car_type}</p>
                            </div>
                          )}
                          {selectedCustomer.car_name && (
                            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                              <Label className="text-sm font-medium text-muted-foreground">Car Name / Model</Label>
                              <p className="text-base font-semibold">{selectedCustomer.car_name}</p>
                            </div>
                          )}
                          {selectedCustomer.car_year && (
                            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                              <Label className="text-sm font-medium text-muted-foreground">Car Year</Label>
                              <p className="text-base font-semibold">{selectedCustomer.car_year}</p>
                            </div>
                          )}
                          {selectedCustomer.car_color && (
                            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                              <Label className="text-sm font-medium text-muted-foreground">Car Color</Label>
                              <p className="text-base font-semibold">{selectedCustomer.car_color}</p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Bike-specific details */}
                      {selectedCustomer.vehicle_type === 'bike' && (
                        <>
                          {selectedCustomer.bike_type && (
                            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                              <Label className="text-sm font-medium text-muted-foreground">Bike Type</Label>
                              <p className="text-base font-semibold">{selectedCustomer.bike_type}</p>
                            </div>
                          )}
                          {selectedCustomer.bike_name && (
                            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                              <Label className="text-sm font-medium text-muted-foreground">Bike Name / Model</Label>
                              <p className="text-base font-semibold">{selectedCustomer.bike_name}</p>
                            </div>
                          )}
                          {selectedCustomer.bike_year && (
                            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                              <Label className="text-sm font-medium text-muted-foreground">Bike Year</Label>
                              <p className="text-base font-semibold">{selectedCustomer.bike_year}</p>
                            </div>
                          )}
                          {selectedCustomer.bike_color && (
                            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                              <Label className="text-sm font-medium text-muted-foreground">Bike Color</Label>
                              <p className="text-base font-semibold">{selectedCustomer.bike_color}</p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Other vehicle details */}
                      {selectedCustomer.vehicle_type === 'other' && selectedCustomer.other_details && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30 md:col-span-2">
                          <Label className="text-sm font-medium text-muted-foreground">Vehicle Details</Label>
                          <p className="text-base font-semibold">{selectedCustomer.other_details}</p>
                        </div>
                      )}

                      {/* Entry Time */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <Label className="text-sm font-medium">Entry Time</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedCustomer.entry_time 
                            ? new Date(selectedCustomer.entry_time).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '—'}
                        </p>
                      </div>

                      {/* Exit Time */}
                      {selectedCustomer.exit_time && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <Label className="text-sm font-medium">Exit Time</Label>
                          </div>
                          <p className="text-base font-semibold">
                            {new Date(selectedCustomer.exit_time).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}

                      {/* Time Elapsed / Duration */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30 md:col-span-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <Label className="text-sm font-medium">
                            {selectedCustomer.exit_time ? 'Total Duration' : 'Time Elapsed'}
                          </Label>
                        </div>
                        <p className="text-base font-semibold">
                          <Timer 
                            entryTime={selectedCustomer.entry_time} 
                            exitTime={selectedCustomer.exit_time}
                            status={selectedCustomer.status}
                          />
                        </p>
                      </div>

                      {/* Remarks */}
                      {selectedCustomer.remarks && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30 md:col-span-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertCircle className="h-4 w-4" />
                            <Label className="text-sm font-medium">Remarks</Label>
                          </div>
                          <p className="text-base font-semibold">
                            {selectedCustomer.remarks}
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

      {/* Customers List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No customers found. Add your first customer to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Customer ID</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap min-w-[150px]">Name</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Phone</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Vehicle Type</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap min-w-[120px]">Vehicle Number</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Entry Time</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Time Elapsed</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Status</th>
                <th className="text-right p-4 font-semibold text-sm sticky right-0 bg-muted/50 z-10 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {customers.map((customer, index) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="border-b border-border hover:bg-accent/50 transition-colors"
                  >
                    {/* Customer ID */}
                    <td className="p-4 whitespace-nowrap">
                      {customer.unique_id ? (
                        <div className="flex items-center gap-2">
                          <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-mono font-medium">{customer.unique_id}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Name */}
                    <td className="p-4 whitespace-nowrap">
                      <p className="font-semibold text-sm">{customer.name}</p>
                    </td>

                    {/* Phone */}
                    <td className="p-4 whitespace-nowrap">
                      {customer.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">{customer.phone}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Vehicle Type */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getVehicleIcon(customer.vehicle_type)}
                        <span className="text-sm capitalize">{customer.vehicle_type || '—'}</span>
                      </div>
                    </td>

                    {/* Vehicle Number */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-sm font-mono">{customer.vehicle_number || '—'}</span>
                    </td>

                    {/* Entry Time */}
                    <td className="p-4 whitespace-nowrap">
                      {customer.entry_time ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">
                            {new Date(customer.entry_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Time Elapsed */}
                    <td className="p-4 whitespace-nowrap">
                      <Timer 
                        entryTime={customer.entry_time} 
                        exitTime={customer.exit_time}
                        status={customer.status}
                      />
                    </td>

                    {/* Status */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(customer.status)}`}>
                        {getStatusLabel(customer.status)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 sticky right-0 bg-background z-10 border-l border-border whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(customer)}
                          title="View details"
                          className="flex-shrink-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(customer)}
                          title="Edit customer"
                          className="flex-shrink-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(customer.id)}
                          className="text-destructive hover:text-destructive flex-shrink-0"
                          title="Delete customer"
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

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={currentPlan}
        limitReached={limitInfo ? { ...limitInfo, limitType: 'customers' } : undefined}
        message={limitInfo ? `You've reached your limit of ${limitInfo.maxLimit} customers. Upgrade to continue adding more customers.` : undefined}
      />
    </div>
  );
}

