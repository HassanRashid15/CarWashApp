'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Search, Filter, ExternalLink, Calendar, User, Mail, Eye, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  admin_name: string | null;
  admin_email: string | null;
  cancellation_requested?: boolean | null;
  cancellation_requested_at?: string | null;
  cancellation_approved?: boolean | null;
  cancellation_approved_at?: string | null;
  cancellation_approved_by?: string | null;
}

interface SubscriptionStats {
  total: number;
  active: number;
  trial: number;
  pending: number;
  canceled: number;
  expired: number;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats>({
    total: 0,
    active: 0,
    trial: 0,
    pending: 0,
    canceled: 0,
    expired: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessingCancellation, setIsProcessingCancellation] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/subscriptions');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch subscriptions');
      }

      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
      setStats(data.stats || {
        total: 0,
        active: 0,
        trial: 0,
        pending: 0,
        canceled: 0,
        expired: 0,
      });
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trial: 'secondary',
      pending: 'outline',
      canceled: 'secondary',
      expired: 'destructive',
    };

    const colors: Record<string, string> = {
      active: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
      trial: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
      canceled: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
      expired: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    };

    return (
      <Badge className={colors[status] || ''} variant={variants[status] || 'default'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getPlanBadge = (planType: string) => {
    const colors: Record<string, string> = {
      starter: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      professional: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      enterprise: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    };

    return (
      <Badge className={colors[planType] || ''} variant="outline">
        {planType.charAt(0).toUpperCase() + planType.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesFilter = filter === 'all' || sub.status === filter;
    const matchesSearch = 
      !searchQuery ||
      sub.admin_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.admin_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.plan_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all admin subscriptions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CreditCard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.trial}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <CreditCard className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceled</CardTitle>
            <CreditCard className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.canceled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <CreditCard className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by admin name, email, or plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      {filteredSubscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No subscriptions found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredSubscriptions.map((subscription) => (
              <motion.div
                key={subscription.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">
                            {subscription.admin_name || 'Unknown Admin'}
                          </CardTitle>
                          {getStatusBadge(subscription.status)}
                          {getPlanBadge(subscription.plan_type)}
                        </div>
                        <CardDescription className="flex items-center gap-4 mt-2 flex-wrap">
                          {subscription.admin_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {subscription.admin_email}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {subscription.user_id.substring(0, 8)}...
                          </span>
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setIsModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Modal
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-sm font-semibold mb-1">Plan Type</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {subscription.plan_type}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-1">Created</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(subscription.created_at)}
                        </p>
                      </div>
                      {subscription.current_period_end && (
                        <div>
                          <p className="text-sm font-semibold mb-1">
                            {subscription.status === 'trial' ? 'Trial Ends' : 'Period Ends'}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(
                              subscription.trial_ends_at || subscription.current_period_end
                            )}
                          </p>
                        </div>
                      )}
                      {subscription.stripe_subscription_id && (
                        <div>
                          <p className="text-sm font-semibold mb-1">Stripe ID</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {subscription.stripe_subscription_id.substring(0, 20)}...
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Subscription Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this subscription
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-6 mt-4">
              {/* Admin Info */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Admin Information</h3>
                <div className="grid gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Name:</span>
                    <span className="text-sm font-semibold">{selectedSubscription.admin_name || 'Unknown Admin'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Email:</span>
                    <span className="text-sm">{selectedSubscription.admin_email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">User ID:</span>
                    <span className="text-sm font-mono text-xs">{selectedSubscription.user_id}</span>
                  </div>
                </div>
              </div>

              {/* Subscription Details */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Subscription Details</h3>
                <div className="grid gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Status:</span>
                    {getStatusBadge(selectedSubscription.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Plan Type:</span>
                    {getPlanBadge(selectedSubscription.plan_type)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Created:</span>
                    <span className="text-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateTime(selectedSubscription.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Last Updated:</span>
                    <span className="text-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateTime(selectedSubscription.updated_at)}
                    </span>
                  </div>
                  {selectedSubscription.current_period_start && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Period Start:</span>
                      <span className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(selectedSubscription.current_period_start)}
                      </span>
                    </div>
                  )}
                  {selectedSubscription.current_period_end && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {selectedSubscription.status === 'trial' ? 'Trial Ends' : 'Period Ends'}:
                      </span>
                      <span className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(
                          selectedSubscription.trial_ends_at || selectedSubscription.current_period_end
                        )}
                      </span>
                    </div>
                  )}
                  {selectedSubscription.canceled_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Canceled At:</span>
                      <span className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(selectedSubscription.canceled_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stripe Information */}
              {(selectedSubscription.stripe_subscription_id || selectedSubscription.stripe_customer_id) && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Stripe Information</h3>
                  <div className="grid gap-3 p-4 bg-muted/50 rounded-lg">
                    {selectedSubscription.stripe_subscription_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Subscription ID:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-xs">{selectedSubscription.stripe_subscription_id}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => {
                              window.open(
                                `https://dashboard.stripe.com/subscriptions/${selectedSubscription.stripe_subscription_id}`,
                                '_blank'
                              );
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {selectedSubscription.stripe_customer_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Customer ID:</span>
                        <span className="text-sm font-mono text-xs">{selectedSubscription.stripe_customer_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Subscription ID */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">System Information</h3>
                <div className="grid gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Subscription ID:</span>
                    <span className="text-sm font-mono text-xs">{selectedSubscription.id}</span>
                  </div>
                </div>
              </div>

              {/* Cancellation Request Section - Only show if pending (not approved) */}
              {selectedSubscription.cancellation_requested && 
               !selectedSubscription.cancellation_approved && (
                <div className="space-y-2 pt-4 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Cancellation Request
                  </h3>
                  <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                      <strong>Pending Cancellation Request</strong>
                      <p className="mt-1 text-sm">
                        This admin has requested to cancel their subscription. Review and approve or reject the request.
                      </p>
                      {selectedSubscription.cancellation_requested_at && (
                        <p className="mt-1 text-xs">
                          Requested on: {formatDateTime(selectedSubscription.cancellation_requested_at)}
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (!confirm('Are you sure you want to approve this cancellation? The subscription will be reverted to a trial plan.')) {
                          return;
                        }
                        setIsProcessingCancellation(true);
                        try {
                          const response = await fetch('/api/admin/approve-cancellation', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              subscriptionId: selectedSubscription.id,
                              approve: true,
                            }),
                          });
                          const data = await response.json();
                          if (response.ok) {
                            alert('Cancellation approved successfully. Subscription reverted to trial plan.');
                            setIsModalOpen(false);
                            fetchSubscriptions();
                          } else {
                            alert(data.error || 'Failed to approve cancellation');
                          }
                        } catch (error) {
                          alert('Error approving cancellation');
                        } finally {
                          setIsProcessingCancellation(false);
                        }
                      }}
                      disabled={isProcessingCancellation}
                    >
                      {isProcessingCancellation ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approve Cancellation
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!confirm('Are you sure you want to reject this cancellation request? The subscription will remain active.')) {
                          return;
                        }
                        setIsProcessingCancellation(true);
                        try {
                          const response = await fetch('/api/admin/approve-cancellation', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              subscriptionId: selectedSubscription.id,
                              approve: false,
                            }),
                          });
                          const data = await response.json();
                          if (response.ok) {
                            alert('Cancellation request rejected');
                            setIsModalOpen(false);
                            fetchSubscriptions();
                          } else {
                            alert(data.error || 'Failed to reject cancellation');
                          }
                        } catch (error) {
                          alert('Error rejecting cancellation');
                        } finally {
                          setIsProcessingCancellation(false);
                        }
                      }}
                      disabled={isProcessingCancellation}
                    >
                      {isProcessingCancellation ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Show if cancellation was already approved - subscription reverted to trial */}
              {selectedSubscription.cancellation_approved && selectedSubscription.status === 'trial' && (
                <div className="space-y-2 pt-4 border-t">
                  <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      <strong>Cancellation Approved - Reverted to Trial</strong>
                      <p className="mt-1 text-sm">
                        This subscription was canceled and reverted to a trial plan.
                        {selectedSubscription.trial_ends_at && (
                          <> Trial ends on {formatDateTime(selectedSubscription.trial_ends_at)}.</>
                        )}
                      </p>
                      {selectedSubscription.cancellation_approved_at && (
                        <p className="mt-1 text-xs">
                          Cancellation approved on: {formatDateTime(selectedSubscription.cancellation_approved_at)}
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

