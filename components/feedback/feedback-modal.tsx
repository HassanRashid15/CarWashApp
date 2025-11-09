'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Star, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  queueEntry: {
    id: string;
    customer_id: string;
    customer?: {
      id: string;
      name: string;
      phone?: string | null;
      unique_id?: string;
      vehicle_type?: string | null;
      car_name?: string;
      car_year?: string;
      bike_name?: string;
      bike_year?: string;
      vehicle_number?: string | null;
    } | null;
  };
  onFeedbackSubmitted?: () => void;
}

export function FeedbackModal({
  isOpen,
  onClose,
  queueEntry,
  onFeedbackSubmitted,
}: FeedbackModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    service_rating: 0,
    service_quality: '',
    worker_rating: 0,
    worker_feedback: '',
    overall_experience: '',
    would_recommend: null as boolean | null,
    additional_comments: '',
  });

  const customer = queueEntry.customer;
  const customerId = customer?.unique_id || customer?.id || 'N/A';
  const vehicleName = customer?.vehicle_type === 'car' 
    ? `${customer?.car_name || 'Car'} ${customer?.car_year || ''}`.trim()
    : customer?.vehicle_type === 'bike'
    ? `${customer?.bike_name || 'Bike'} ${customer?.bike_year || ''}`.trim()
    : customer?.vehicle_type || 'Vehicle';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.service_rating === 0 || !formData.service_quality || !formData.overall_experience) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queue_entry_id: queueEntry.id,
          customer_id: queueEntry.customer_id,
          customer_name: customer?.name || 'Unknown',
          customer_id_display: customerId,
          car_name: customer?.car_name || null,
          car_model: customer?.car_year || null,
          vehicle_type: customer?.vehicle_type || null,
          vehicle_number: customer?.vehicle_number || null,
          ...formData,
          would_recommend: formData.would_recommend === null ? undefined : formData.would_recommend,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      toast.success('Thank you for your feedback!');
      onFeedbackSubmitted?.();
      onClose();
      
      // Reset form
      setFormData({
        service_rating: 0,
        service_quality: '',
        worker_rating: 0,
        worker_feedback: '',
        overall_experience: '',
        would_recommend: null,
        additional_comments: '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (value: number) => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-gray-300 text-gray-300'
              }`}
            />
          </button>
        ))}
        {value > 0 && <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Service Feedback</DialogTitle>
            </DialogHeader>

            {/* Customer Information */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Customer ID:</span>
                  <p className="text-muted-foreground">{customerId}</p>
                </div>
                <div>
                  <span className="font-medium">Customer Name:</span>
                  <p className="text-muted-foreground">{customer?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium">Vehicle:</span>
                  <p className="text-muted-foreground">{vehicleName}</p>
                </div>
                <div>
                  <span className="font-medium">Vehicle Number:</span>
                  <p className="text-muted-foreground">{customer?.vehicle_number || 'N/A'}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Service Rating */}
              <StarRating
                value={formData.service_rating}
                onChange={(value) => setFormData({ ...formData, service_rating: value })}
                label="Service Quality Rating *"
              />

              {/* Service Quality MCQ */}
              <div className="space-y-2">
                <Label>How would you rate the service quality? *</Label>
                <RadioGroup
                  value={formData.service_quality}
                  onValueChange={(value) => setFormData({ ...formData, service_quality: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="excellent" id="quality-excellent" />
                    <Label htmlFor="quality-excellent" className="font-normal cursor-pointer">
                      Excellent
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="good" id="quality-good" />
                    <Label htmlFor="quality-good" className="font-normal cursor-pointer">
                      Good
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="average" id="quality-average" />
                    <Label htmlFor="quality-average" className="font-normal cursor-pointer">
                      Average
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="poor" id="quality-poor" />
                    <Label htmlFor="quality-poor" className="font-normal cursor-pointer">
                      Poor
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Worker Rating */}
              <StarRating
                value={formData.worker_rating}
                onChange={(value) => setFormData({ ...formData, worker_rating: value })}
                label="Worker Performance Rating"
              />

              {/* Worker Feedback MCQ */}
              <div className="space-y-2">
                <Label>How satisfied were you with the worker? *</Label>
                <RadioGroup
                  value={formData.worker_feedback}
                  onValueChange={(value) => setFormData({ ...formData, worker_feedback: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="very_satisfied" id="worker-very-satisfied" />
                    <Label htmlFor="worker-very-satisfied" className="font-normal cursor-pointer">
                      Very Satisfied
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="satisfied" id="worker-satisfied" />
                    <Label htmlFor="worker-satisfied" className="font-normal cursor-pointer">
                      Satisfied
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="neutral" id="worker-neutral" />
                    <Label htmlFor="worker-neutral" className="font-normal cursor-pointer">
                      Neutral
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dissatisfied" id="worker-dissatisfied" />
                    <Label htmlFor="worker-dissatisfied" className="font-normal cursor-pointer">
                      Dissatisfied
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Overall Experience MCQ */}
              <div className="space-y-2">
                <Label>Overall Experience *</Label>
                <RadioGroup
                  value={formData.overall_experience}
                  onValueChange={(value) => setFormData({ ...formData, overall_experience: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="excellent" id="overall-excellent" />
                    <Label htmlFor="overall-excellent" className="font-normal cursor-pointer">
                      Excellent
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="good" id="overall-good" />
                    <Label htmlFor="overall-good" className="font-normal cursor-pointer">
                      Good
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="average" id="overall-average" />
                    <Label htmlFor="overall-average" className="font-normal cursor-pointer">
                      Average
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="poor" id="overall-poor" />
                    <Label htmlFor="overall-poor" className="font-normal cursor-pointer">
                      Poor
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Would Recommend */}
              <div className="space-y-2">
                <Label>Would you recommend us to others?</Label>
                <RadioGroup
                  value={formData.would_recommend === null ? '' : formData.would_recommend ? 'yes' : 'no'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      would_recommend: value === 'yes' ? true : value === 'no' ? false : null,
                    })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="recommend-yes" />
                    <Label htmlFor="recommend-yes" className="font-normal cursor-pointer">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="recommend-no" />
                    <Label htmlFor="recommend-no" className="font-normal cursor-pointer">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Additional Comments */}
              <div className="space-y-2">
                <Label htmlFor="comments">Additional Comments (Optional)</Label>
                <Textarea
                  id="comments"
                  placeholder="Share any additional feedback or suggestions..."
                  value={formData.additional_comments}
                  onChange={(e) =>
                    setFormData({ ...formData, additional_comments: e.target.value })
                  }
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

