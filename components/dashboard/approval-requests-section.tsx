'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Clock, User, Mail, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PendingSubscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  created_at: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  admin_name: string | null;
  admin_email: string | null;
}

export function ApprovalRequestsSection() {
  const [pendingSubscriptions, setPendingSubscriptions] = useState<PendingSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingSubscriptions();
  }, []);

  async function fetchPendingSubscriptions() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/pending-subscriptions');
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || data.details || 'Failed to fetch pending subscriptions';
        console.error('API Error:', { status: response.status, error: errorMsg, data });
        throw new Error(errorMsg);
      }

      console.log('Fetched pending subscriptions:', data.subscriptions);
      setPendingSubscriptions(data.subscriptions || []);
    } catch (err) {
      console.error('Error fetching pending subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pending subscriptions');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApproval(subscriptionId: string, approve: boolean) {
    setProcessingId(subscriptionId);
    try {
      const response = await fetch(`/api/admin/approve-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
          approve,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process approval');
      }

      // Refresh the list
      await fetchPendingSubscriptions();
      
      // Show success message
      setError(null);
      
      // Optionally trigger a page refresh to update all components
      // This ensures the admin's CurrentPlanCard updates dynamically
      if (approve) {
        // Dispatch a custom event that other components can listen to
        window.dispatchEvent(new CustomEvent('subscription-approved', { 
          detail: { subscriptionId } 
        }));
      }
    } catch (err) {
      console.error('Error processing approval:', err);
      setError(err instanceof Error ? err.message : 'Failed to process approval');
    } finally {
      setProcessingId(null);
    }
  }

  const getPlanDisplayName = (planType: string) => {
    const planNames: Record<string, string> = {
      starter: 'Starter Plan',
      professional: 'Professional Plan',
      enterprise: 'Enterprise Plan',
    };
    return planNames[planType] || planType;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval Requests</CardTitle>
          <CardDescription>Loading pending subscription requests...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Approval Requests</CardTitle>
            <CardDescription>
              Review and approve subscription requests from admins
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPendingSubscriptions}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {error}
              {error.includes('migration') && (
                <div className="mt-2 text-sm">
                  <p className="font-medium">To fix this:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Go to Supabase Dashboard → SQL Editor</li>
                    <li>Run the migration: <code className="bg-muted px-1 rounded">add_pending_status_to_subscriptions.sql</code></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {pendingSubscriptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No pending requests</p>
            <p className="text-sm">All subscription requests have been processed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingSubscriptions.map((subscription) => (
              <Card key={subscription.id} className="border-l-4 border-l-yellow-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Approval
                        </Badge>
                        <Badge variant="secondary">
                          {getPlanDisplayName(subscription.plan_type)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{subscription.admin_name || 'Unknown Admin'}</p>
                            <p className="text-xs text-muted-foreground">Admin Name</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{subscription.admin_email || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">Email</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{formatDate(subscription.created_at)}</p>
                            <p className="text-xs text-muted-foreground">Requested At</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium font-mono text-xs">
                            {subscription.stripe_subscription_id || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">Stripe Subscription ID</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApproval(subscription.id, true)}
                        disabled={processingId === subscription.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingId === subscription.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleApproval(subscription.id, false)}
                        disabled={processingId === subscription.id}
                      >
                        {processingId === subscription.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

