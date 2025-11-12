'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Star, Search, MessageSquare, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FeatureRestrictionOverlay } from '@/components/subscription/feature-restriction-overlay';
import { hasFeature, getPlanLimits } from '@/lib/utils/plan-limits';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);

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

  const handleDeleteFeedback = async (feedbackId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Prevent opening modal when clicking delete
    }

    if (!confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingFeedbackId(feedbackId);
      const response = await fetch(`/api/feedback?id=${feedbackId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete feedback');
      }

      toast.success('Feedback deleted successfully');
      
      // Remove from local state
      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
      
      // If deleted feedback was in modal, close modal
      if (selectedFeedback?.id === feedbackId) {
        setShowModal(false);
        setSelectedFeedback(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete feedback');
    } finally {
      setDeletingFeedbackId(null);
    }
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
            <Card 
              key={feedback.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setSelectedFeedback(feedback);
                setShowModal(true);
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <CardTitle className="text-lg">{feedback.customer_name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                        onClick={(e) => handleDeleteFeedback(feedback.id, e)}
                        disabled={deletingFeedbackId === feedback.id}
                      >
                        {deletingFeedbackId === feedback.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
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
                  <Badge variant="outline" className="flex-shrink-0">
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

      {/* Feedback Detail Modal */}
      <AnimatePresence>
        {showModal && selectedFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={() => {
              setShowModal(false);
              setSelectedFeedback(null);
            }}
          >
            <div className="absolute inset-0 bg-background/60 backdrop-blur-lg" />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-3xl z-10 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="border-2 shadow-2xl backdrop-blur-xl bg-card/95">
                <CardHeader className="border-b pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">
                        {selectedFeedback.customer_name}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span>ID: {selectedFeedback.customer_id_display}</span>
                        {selectedFeedback.vehicle_type && (
                          <span>• {selectedFeedback.vehicle_type}</span>
                        )}
                        {selectedFeedback.vehicle_number && (
                          <span>• {selectedFeedback.vehicle_number}</span>
                        )}
                      </div>
                      {selectedFeedback.car_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedFeedback.car_name} {selectedFeedback.car_model || ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedFeedback) {
                            handleDeleteFeedback(selectedFeedback.id);
                          }
                        }}
                        disabled={deletingFeedbackId === selectedFeedback.id}
                      >
                        {deletingFeedbackId === selectedFeedback.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </>
                        )}
                      </Button>
                      <button
                        onClick={() => {
                          setShowModal(false);
                          setSelectedFeedback(null);
                        }}
                        className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <Badge variant="outline" className="mt-2">
                    Submitted: {new Date(selectedFeedback.submitted_at).toLocaleString()}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Service Rating */}
                  {selectedFeedback.service_rating && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Service Quality Rating</p>
                      <div className="flex items-center gap-2">
                        {getRatingStars(selectedFeedback.service_rating)}
                        <span className="text-sm text-muted-foreground">
                          ({selectedFeedback.service_rating}/5)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Service Quality */}
                  {selectedFeedback.service_quality && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Service Quality</p>
                      {getQualityBadge(selectedFeedback.service_quality)}
                    </div>
                  )}

                  {/* Worker Rating */}
                  {selectedFeedback.worker_rating && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Worker Performance Rating</p>
                      <div className="flex items-center gap-2">
                        {getRatingStars(selectedFeedback.worker_rating)}
                        <span className="text-sm text-muted-foreground">
                          ({selectedFeedback.worker_rating}/5)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Worker Feedback */}
                  {selectedFeedback.worker_feedback && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Worker Satisfaction</p>
                      {getQualityBadge(selectedFeedback.worker_feedback)}
                    </div>
                  )}

                  {/* Overall Experience */}
                  {selectedFeedback.overall_experience && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Overall Experience</p>
                      {getQualityBadge(selectedFeedback.overall_experience)}
                    </div>
                  )}

                  {/* Would Recommend */}
                  {selectedFeedback.would_recommend !== null && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Would Recommend</p>
                      <Badge 
                        variant={selectedFeedback.would_recommend ? 'default' : 'secondary'}
                        className="text-base px-3 py-1"
                      >
                        {selectedFeedback.would_recommend ? '✓ Yes' : '✗ No'}
                      </Badge>
                    </div>
                  )}

                  {/* Additional Comments */}
                  {selectedFeedback.additional_comments && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Additional Comments</p>
                      <div className="bg-muted p-4 rounded-lg border">
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {selectedFeedback.additional_comments}
                        </p>
                      </div>
                    </div>
                  )}

                  {!selectedFeedback.service_rating && 
                   !selectedFeedback.service_quality && 
                   !selectedFeedback.worker_rating && 
                   !selectedFeedback.worker_feedback && 
                   !selectedFeedback.overall_experience && 
                   selectedFeedback.would_recommend === null && 
                   !selectedFeedback.additional_comments && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No detailed feedback provided</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

