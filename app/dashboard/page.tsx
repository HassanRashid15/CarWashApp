'use client';

import { WelcomeSection } from '@/components/dashboard/welcome-section';
import { StatsCard } from '@/components/dashboard/stats-card';
import { ActivityList } from '@/components/dashboard/activity-list';
import { PlaceholderChart } from '@/components/dashboard/placeholder-chart';
import { CurrentPlanCard } from '@/components/dashboard/current-plan-card';
import { ApprovalRequestsSection } from '@/components/dashboard/approval-requests-section';
import { CreditsSection } from '@/components/dashboard/credits-section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageSquare, Phone, Edit2, CheckCircle2, X, Loader2, Clock, CheckCircle, XCircle, User as UserIcon, PartyPopper } from 'lucide-react';

interface ServiceBooking {
  id: string;
  service_name: string;
  service_price: string;
  service_features?: string[];
  customer_name: string;
  contact_no: string;
  description?: string;
  status: 'pending' | 'contacted' | 'confirmed' | 'completed' | 'cancelled';
  admin_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ first_name?: string; last_name?: string; email?: string; role?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceBookings, setServiceBookings] = useState<ServiceBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<ServiceBooking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [showPurchaseCancelled, setShowPurchaseCancelled] = useState(false);

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
          .select('first_name, last_name, email, role')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
      }

      setIsLoading(false);
    }

    getUser();
    fetchServiceBookings();
  }, []);

  // Handle purchase success and cancellation modals
  useEffect(() => {
    const purchaseParam = searchParams.get('purchase');
    const sessionId = searchParams.get('session_id');
    
    // Use a ref to prevent multiple executions
    const hasProcessed = sessionStorage.getItem('purchase_processed');
    
    if (purchaseParam === 'success' && !hasProcessed) {
      // Mark as processed to prevent re-execution
      sessionStorage.setItem('purchase_processed', 'true');
      
      setShowPurchaseSuccess(true);
      
      // Verify checkout and create subscription (fallback if webhook didn't fire)
      // This will try with sessionId if available, or fallback to checking customer subscriptions
      fetch('/api/subscriptions/verify-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: sessionId || null }),
      })
      .then(res => {
        console.log('📡 Verify checkout response status:', res.status);
        return res.json();
      })
        .then(data => {
          console.log('📡 Verify checkout response data:', data);
          if (data.success) {
            console.log('✅ Subscription verified and created:', data);
            // Dispatch event to refresh subscription card
            window.dispatchEvent(new CustomEvent('purchase-success'));
            // Clear query params and refresh after 2 seconds
            setTimeout(() => {
              // Clear the processed flag
              sessionStorage.removeItem('purchase_processed');
              // Navigate without query params
              router.replace('/dashboard');
              // Small delay then reload to show updated subscription
              setTimeout(() => {
                window.location.reload();
              }, 100);
            }, 2000);
          } else {
          console.error('❌ Could not verify checkout:', {
            error: data.error,
            details: data.details,
            userId: data.userId,
            planType: data.planType,
          });
          // Show error to user
          alert(`Failed to create subscription: ${data.error || 'Unknown error'}. Please check server logs or contact support.`);
          // Still clear params even if verification failed
          setTimeout(() => {
            sessionStorage.removeItem('purchase_processed');
            router.replace('/dashboard');
          }, 2000);
        }
      })
      .catch(error => {
        console.error('❌ Error verifying checkout:', error);
        // Clear params on error too
        setTimeout(() => {
          sessionStorage.removeItem('purchase_processed');
          router.replace('/dashboard');
        }, 2000);
      });
      
      // Auto-close after 5 seconds and redirect to dashboard (clearing query param)
      const timer = setTimeout(() => {
        setShowPurchaseSuccess(false);
        sessionStorage.removeItem('purchase_processed');
        router.replace('/dashboard');
      }, 5000);

      return () => {
        clearTimeout(timer);
      };
    } else if (purchaseParam === 'cancelled' && !hasProcessed) {
      sessionStorage.setItem('purchase_processed', 'true');
      setShowPurchaseCancelled(true);
      
      // Auto-close after 5 seconds and redirect to dashboard (clearing query param)
      const timer = setTimeout(() => {
        setShowPurchaseCancelled(false);
        sessionStorage.removeItem('purchase_processed');
        router.replace('/dashboard');
      }, 5000);

      return () => {
        clearTimeout(timer);
      };
    } else if (hasProcessed && (purchaseParam === 'success' || purchaseParam === 'cancelled')) {
      // If already processed, just clear the query params immediately
      router.replace('/dashboard');
      sessionStorage.removeItem('purchase_processed');
    }
  }, [searchParams, router]);

  const fetchServiceBookings = async () => {
    try {
      setIsLoadingBookings(true);
      const response = await fetch('/api/service-bookings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch service bookings');
      }
      
      const data = await response.json();
      setServiceBookings(data.bookings || []);
    } catch (error) {
      console.error('Error fetching service bookings:', error);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const handleBookingClick = (booking: ServiceBooking) => {
    setSelectedBooking(booking);
    setEditStatus(booking.status);
    setEditNotes(booking.admin_notes || '');
    setIsModalOpen(true);
    setIsEditing(false);
    setUpdateMessage(null);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveUpdate = async () => {
    if (!selectedBooking) return;

    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      const response = await fetch(`/api/service-bookings/${selectedBooking.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: editStatus,
          admin_notes: editNotes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update booking');
      }

      setUpdateMessage({ type: 'success', text: 'Booking updated successfully!' });
      setIsEditing(false);
      
      // Refresh bookings list
      await fetchServiceBookings();
      
      // Update selected booking
      setSelectedBooking(data.booking);

      // Close modal after 1.5 seconds
      setTimeout(() => {
        setIsModalOpen(false);
        setUpdateMessage(null);
      }, 1500);
    } catch (error) {
      setUpdateMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update booking',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
      case 'contacted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700';
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'contacted':
        return <Phone className="h-3 w-3" />;
      case 'confirmed':
        return <CheckCircle className="h-3 w-3" />;
      case 'completed':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'cancelled':
        return <XCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Mock data for the dashboard
  const mockActivities = [
    {
      id: '1',
      title: 'Account Created',
      description: 'Your account was successfully created',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      title: 'Email Verified',
      description: 'Your email address has been verified',
      timestamp: '1 hour ago',
    },
    {
      id: '3',
      title: 'Password Updated',
      description: 'Your password was updated successfully',
      timestamp: '30 minutes ago',
    },
  ];

  if (isLoading) {
    return null; // Loading state is handled by the layout
  }

  // Check if user is super admin (by role or email)
  const superAdminEmail = 'hassanrashid001@icloud.com';
  const isSuperAdmin = profile?.role === 'super_admin' || 
                       profile?.email === superAdminEmail ||
                       user?.email === superAdminEmail;

  return (
    <>
      {/* Purchase Success Modal */}
      <Dialog 
        open={showPurchaseSuccess} 
        onOpenChange={(open) => {
          if (!open) {
            setShowPurchaseSuccess(false);
            router.push('/dashboard');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <PartyPopper className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Congratulations!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Your plan purchase was successful! Your subscription is now pending approval from the super admin.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <CheckCircle className="h-16 w-16 text-green-500" />
            </motion.div>
          </div>
          <DialogFooter className="sm:justify-center">
            <p className="text-sm text-muted-foreground text-center">
              Redirecting to dashboard in a few seconds...
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Cancelled Modal */}
      <Dialog 
        open={showPurchaseCancelled} 
        onOpenChange={(open) => {
          if (!open) {
            setShowPurchaseCancelled(false);
            router.push('/dashboard');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-orange-100 p-3">
                <XCircle className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Purchase Cancelled</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Your plan purchase was cancelled. No charges were made. You can try again anytime from the billing settings.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <XCircle className="h-16 w-16 text-orange-500" />
            </motion.div>
          </div>
          <DialogFooter className="sm:justify-center">
            <p className="text-sm text-muted-foreground text-center">
              Redirecting to dashboard in a few seconds...
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credits Section - Show only for users without plan */}
      {!isSuperAdmin && (
        <div className="mb-6">
          <CreditsSection />
        </div>
      )}

      {/* Welcome Section */}
      <WelcomeSection
        firstName={profile?.first_name}
        lastName={profile?.last_name}
        userEmail={profile?.email || user?.email || 'user@example.com'}
      />

      {/* Current Plan Card - Hide for super admin */}
      {!isSuperAdmin && (
        <div className="mt-6">
          <CurrentPlanCard />
        </div>
      )}

      {/* Approval Requests Section - Show only for super admin */}
      {isSuperAdmin && (
        <div className="mt-6">
          <ApprovalRequestsSection />
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatsCard
          title="Login Count"
          value="5"
          description="Total logins this month"
          icon={<UserIcon className="h-5 w-5" />}
          delay={0.1}
        />
        <StatsCard
          title="Last Login"
          value="Today"
          description="Last accessed the platform"
          icon={<ClockIcon className="h-5 w-5" />}
          delay={0.2}
        />
        <StatsCard
          title="Security Score"
          value="85%"
          description="Your account security rating"
          icon={<ShieldIcon className="h-5 w-5" />}
          change={{ value: '10%', positive: true }}
          delay={0.3}
        />
        <StatsCard
          title="Account Status"
          value="Active"
          description="Your account is in good standing"
          icon={<CheckCircleIcon className="h-5 w-5" />}
          delay={0.4}
        />
      </div>

      {/* Charts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Account Activity</CardTitle>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <PlaceholderChart variant="area" height={250} showToggle={true} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <ActivityList activities={mockActivities} />
        </div>
      </div>

      {/* Service Bookings Section */}
      <div className="mt-6">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Service Bookings</CardTitle>
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
            {isLoadingBookings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : serviceBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground px-4">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No service bookings yet</p>
              </div>
            ) : (
              <div className="h-[400px] overflow-y-auto px-4 pb-4 space-y-2">
                <AnimatePresence>
                  {serviceBookings.map((booking, index) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleBookingClick(booking)}
                      className="p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                              {booking.customer_name}
                            </p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                              {getStatusIcon(booking.status)}
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1">
                            {booking.service_name} • {booking.service_price}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span className="truncate">{booking.contact_no}</span>
                          </div>
                          {booking.created_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(booking.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                        <Edit2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AnimatePresence>
          {isModalOpen && selectedBooking && (
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <DialogHeader>
              <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-2xl">Service Booking Details</DialogTitle>
                      <DialogDescription className="mt-1">
                        Manage and update booking status
                      </DialogDescription>
                    </div>
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleEdit}
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Service Details */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold mb-3 text-sm">Service Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span className="font-medium">{selectedBooking.service_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-medium text-primary">{selectedBooking.service_price}</span>
                      </div>
                      {selectedBooking.service_features && selectedBooking.service_features.length > 0 && (
                  <div>
                          <span className="text-muted-foreground">Features:</span>
                          <ul className="mt-1 space-y-1">
                            {selectedBooking.service_features.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold mb-3 text-sm">Customer Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{selectedBooking.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contact:</span>
                        <a href={`tel:${selectedBooking.contact_no}`} className="font-medium text-primary hover:underline">
                          {selectedBooking.contact_no}
                        </a>
                      </div>
                      {selectedBooking.description && (
                        <div>
                          <span className="text-muted-foreground">Description:</span>
                          <p className="mt-1 text-sm">{selectedBooking.description}</p>
                </div>
                      )}
              </div>
                  </div>

                  {/* Status and Notes */}
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <select
                          id="status"
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          disabled={isUpdating}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                        >
                          <option value="pending">Pending</option>
                          <option value="contacted">Contacted</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="notes">Admin Notes</Label>
                        <textarea
                          id="notes"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          disabled={isUpdating}
                          placeholder="Add notes about customer contact or follow-up..."
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                        />
                      </div>
                      {updateMessage && (
                        <Alert variant={updateMessage.type === 'success' ? 'default' : 'destructive'}>
                          <AlertDescription>{updateMessage.text}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label>Current Status</Label>
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(selectedBooking.status)}`}>
                            {getStatusIcon(selectedBooking.status)}
                            {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      {selectedBooking.admin_notes && (
                        <div>
                          <Label>Admin Notes</Label>
                          <p className="mt-1 text-sm bg-muted/50 rounded p-3">{selectedBooking.admin_notes}</p>
                        </div>
                      )}
                      {selectedBooking.created_at && (
                  <div>
                          <Label>Created</Label>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {new Date(selectedBooking.created_at).toLocaleString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                    </p>
                  </div>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  {isEditing ? (
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditStatus(selectedBooking.status);
                          setEditNotes(selectedBooking.admin_notes || '');
                          setUpdateMessage(null);
                        }}
                        disabled={isUpdating}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveUpdate}
                        disabled={isUpdating}
                        className="flex-1"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                </Button>
              </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                      className="w-full"
                    >
                      Close
                    </Button>
                  )}
                </DialogFooter>
              </motion.div>
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>
    </>
  );
}

// Icons
function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function KeyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}
