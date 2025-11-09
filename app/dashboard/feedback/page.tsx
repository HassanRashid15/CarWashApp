'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Star, Search, MessageSquare } from 'lucide-react';
import { FeatureRestrictionOverlay } from '@/components/subscription/feature-restriction-overlay';
import { hasFeature, getPlanLimits } from '@/lib/utils/plan-limits';
import { createClient } from '@/lib/supabase/client';

interface Feedback {
  id: string;
  customer_name: string;
  customer_id_display: string;
  car_name: string | null;
  car_model: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  service_rating: number | null;
  service_quality: string | null;
  worker_rating: number | null;
  worker_feedback: string | null;
  overall_experience: string | null;
  would_recommend: boolean | null;
  additional_comments: string | null;
  submitted_at: string;
}

interface ProfileData {
  role?: string;
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<{ customers: number; workers: number; products: number } | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    fetchSubscription();
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!checkingSubscription) {
      fetchFeedbacks();
    }
  }, [checkingSubscription]);

  useEffect(() => {
    filterFeedbacks();
  }, [feedbacks, searchTerm]);

  const fetchProfile = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

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

  const fetchFeedbacks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/feedback');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch feedbacks');
      }
      
      const data = await response.json();
      setFeedbacks(data.feedbacks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedbacks');
    } finally {
      setIsLoading(false);
    }
  };

  const filterFeedbacks = () => {
    if (!searchTerm.trim()) {
      setFilteredFeedbacks(feedbacks);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = feedbacks.filter((feedback) => {
      return (
        feedback.customer_name.toLowerCase().includes(search) ||
        feedback.customer_id_display.toLowerCase().includes(search) ||
        feedback.vehicle_number?.toLowerCase().includes(search) ||
        feedback.additional_comments?.toLowerCase().includes(search)
      );
    });

    setFilteredFeedbacks(filtered);
  };

  const isFeedbackLocked = (): boolean => {
    // Super admin always has access
    if (profile?.role === 'super_admin') {
      return false;
    }

    if (checkingSubscription || !usage) return true;

    if (!subscription || !subscription.planType) {
      const maxCustomers = 5;
      return usage.customers >= maxCustomers;
    }

    const hasFeatureAccess = hasFeature(subscription.planType, 'customerFeedback');
    if (!hasFeatureAccess) {
      const limits = getPlanLimits(subscription.planType);
      const maxCustomers = limits.maxCustomers;
      if (maxCustomers === null) return false;
      return usage.customers >= maxCustomers;
    }

    const limits = getPlanLimits(subscription.planType);
    const maxCustomers = limits.maxCustomers;
    if (maxCustomers === null) return false;
    return usage.customers >= maxCustomers;
  };

  const getRatingStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-300 text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getQualityBadge = (quality: string | null) => {
    if (!quality) return null;
    const colors: Record<string, string> = {
      excellent: 'bg-green-500',
      good: 'bg-blue-500',
      average: 'bg-yellow-500',
      poor: 'bg-red-500',
      very_satisfied: 'bg-green-500',
      satisfied: 'bg-blue-500',
      neutral: 'bg-gray-500',
      dissatisfied: 'bg-red-500',
    };
    return (
      <Badge className={colors[quality] || 'bg-gray-500'}>
        {quality.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
      </Badge>
    );
  };

  if (checkingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isFeedbackLocked()) {
    return (
      <FeatureRestrictionOverlay
        featureName="Customer Feedback"
        requiredPlan="Professional"
        description="Customer Feedback allows you to collect and view customer feedback after service completion. You've reached your customer limit. Upgrade your plan to continue using this feature."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Feedback</h1>
          <p className="text-muted-foreground mt-2">
            View and manage customer feedback after service completion
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by customer name, ID, or vehicle number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Feedbacks List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No feedbacks found matching your search' : 'No feedbacks yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredFeedbacks.map((feedback) => (
            <Card key={feedback.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{feedback.customer_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      ID: {feedback.customer_id_display} • {feedback.vehicle_type || 'Vehicle'}
                      {feedback.vehicle_number && ` • ${feedback.vehicle_number}`}
                    </p>
                    {feedback.car_name && (
                      <p className="text-sm text-muted-foreground">
                        {feedback.car_name} {feedback.car_model || ''}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {new Date(feedback.submitted_at).toLocaleDateString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Service Rating */}
                {feedback.service_rating && (
                  <div>
                    <p className="text-sm font-medium mb-1">Service Rating</p>
                    {getRatingStars(feedback.service_rating)}
                  </div>
                )}

                {/* Service Quality */}
                {feedback.service_quality && (
                  <div>
                    <p className="text-sm font-medium mb-1">Service Quality</p>
                    {getQualityBadge(feedback.service_quality)}
                  </div>
                )}

                {/* Worker Rating */}
                {feedback.worker_rating && (
                  <div>
                    <p className="text-sm font-medium mb-1">Worker Rating</p>
                    {getRatingStars(feedback.worker_rating)}
                  </div>
                )}

                {/* Worker Feedback */}
                {feedback.worker_feedback && (
                  <div>
                    <p className="text-sm font-medium mb-1">Worker Feedback</p>
                    {getQualityBadge(feedback.worker_feedback)}
                  </div>
                )}

                {/* Overall Experience */}
                {feedback.overall_experience && (
                  <div>
                    <p className="text-sm font-medium mb-1">Overall Experience</p>
                    {getQualityBadge(feedback.overall_experience)}
                  </div>
                )}

                {/* Would Recommend */}
                {feedback.would_recommend !== null && (
                  <div>
                    <p className="text-sm font-medium mb-1">Would Recommend</p>
                    <Badge variant={feedback.would_recommend ? 'default' : 'secondary'}>
                      {feedback.would_recommend ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                )}

                {/* Additional Comments */}
                {feedback.additional_comments && (
                  <div>
                    <p className="text-sm font-medium mb-1">Additional Comments</p>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {feedback.additional_comments}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

