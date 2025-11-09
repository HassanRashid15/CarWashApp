'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  targetPlan: {
    name: string;
    price: string;
    features: string[];
  };
}

export function ChangePlanModal({
  isOpen,
  onClose,
  currentPlan,
  targetPlan,
}: ChangePlanModalProps) {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!description.trim()) {
      setSubmitError('Please provide a reason or description for changing your plan.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get current user info
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error('You must be logged in to request a plan change.');
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name, full_name')
        .eq('id', session.user.id)
        .single();

      const userName = profile?.full_name || 
                      (profile?.first_name && profile?.last_name 
                        ? `${profile.first_name} ${profile.last_name}` 
                        : profile?.first_name || session.user.email || 'User');

      // Send email to administration
      const response = await fetch('/api/subscriptions/change-plan-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          userEmail: session.user.email || profile?.email,
          userName,
          currentPlan,
          targetPlan: targetPlan.name,
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send plan change request');
      }

      setSubmitSuccess(true);
      setDescription('');

      // Close modal after 2 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setDescription('');
      setSubmitError(null);
      setSubmitSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary" />
                Request Plan Change
              </DialogTitle>
              <DialogDescription className="mt-2">
                Request to change from <strong>{currentPlan}</strong> to <strong>{targetPlan.name}</strong>
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Comparison */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm">Plan Details:</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
                <p className="font-semibold">{currentPlan}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Requested Plan</p>
                <p className="font-semibold text-primary">{targetPlan.name}</p>
                <p className="text-sm text-muted-foreground">{targetPlan.price}/month</p>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Features included:</p>
              <ul className="space-y-1.5">
                {targetPlan.features.slice(0, 5).map((feature, idx) => (
                  <li key={idx} className="flex items-start text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
                {targetPlan.features.length > 5 && (
                  <li className="text-xs text-muted-foreground ml-6">
                    + {targetPlan.features.length - 5} more features
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Why do you want to change your plan? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Please describe your reason for changing plans. This helps us better assist you..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSubmitError(null);
              }}
              disabled={isSubmitting}
              className="min-h-[120px]"
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Your request will be sent to our administration team. We'll review it and contact you shortly.
            </p>
          </div>

          {/* Success/Error Messages */}
          {submitSuccess && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Your plan change request has been sent successfully! Our team will contact you soon.
              </AlertDescription>
            </Alert>
          )}

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !description.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


