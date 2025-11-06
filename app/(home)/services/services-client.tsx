'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, CheckCircle2, Loader2, Send, X } from 'lucide-react';

interface Service {
  name: string;
  price: string;
  features: string[];
}

export function ServicesClient() {
  const services: Service[] = [
    {
      name: 'Basic Wash',
      price: '$15',
      features: [
        'Exterior wash and dry',
        'Tire cleaning',
        'Window cleaning',
        'Quick wipe down',
      ],
    },
    {
      name: 'Premium Wash',
      price: '$35',
      features: [
        'Full exterior wash',
        'Interior vacuum',
        'Dashboard cleaning',
        'Tire shine',
        'Door jamb cleaning',
      ],
    },
    {
      name: 'Full Detail',
      price: '$75',
      features: [
        'Complete interior detailing',
        'Exterior waxing',
        'Polish and buff',
        'Engine bay cleaning',
        'Leather conditioning',
        'Carpet shampoo',
      ],
    },
    {
      name: 'Interior Detail',
      price: '$50',
      features: [
        'Deep interior vacuum',
        'Seat cleaning',
        'Dashboard polish',
        'Window cleaning',
        'Carpet shampoo',
      ],
    },
    {
      name: 'Exterior Detail',
      price: '$60',
      features: [
        'Clay bar treatment',
        'Polish and wax',
        'Headlight restoration',
        'Tire shine',
        'Chrome polishing',
      ],
    },
    {
      name: 'Monthly Package',
      price: '$100/month',
      features: [
        '4 premium washes',
        '1 full detail',
        'Priority booking',
        'Discount on add-ons',
      ],
    },
  ];

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<string>('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    name: '',
    contactNo: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Reset booking form state when modal closes
  useEffect(() => {
    if (!isServiceModalOpen) {
      setBookingConfirmation('');
      setShowBookingForm(false);
      setSubmitError(null);
      setSubmitSuccess(false);
      setBookingForm({ name: '', contactNo: '', description: '' });
    }
  }, [isServiceModalOpen]);

  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
    setIsServiceModalOpen(true);
    setBookingConfirmation('');
    setShowBookingForm(false);
    setSubmitError(null);
    setSubmitSuccess(false);
    setBookingForm({ name: '', contactNo: '', description: '' });
  };

  const handleSubmit = async () => {
    if (!bookingForm.name.trim() || !bookingForm.contactNo.trim()) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    if (!selectedService) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const response = await fetch('/api/service-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceName: selectedService.name,
          servicePrice: selectedService.price,
          serviceFeatures: selectedService.features,
          customerName: bookingForm.name.trim(),
          contactNo: bookingForm.contactNo.trim(),
          description: bookingForm.description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send booking request');
      }

      setSubmitSuccess(true);
      setBookingForm({ name: '', contactNo: '', description: '' });

      setTimeout(() => {
        setIsServiceModalOpen(false);
        setSubmitSuccess(false);
        setBookingConfirmation('');
        setShowBookingForm(false);
      }, 2000);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to send booking request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="p-8 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow flex flex-col h-full"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">{service.name}</h3>
                  <span className="text-2xl font-bold text-primary">
                    {service.price}
                  </span>
                </div>
                <ul className="space-y-2 mt-6 flex-grow">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-muted-foreground">
                      <span className="mr-2 text-primary">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleServiceClick(service)}
                  className="w-full mt-auto mt-6"
                  variant="outline"
                >
                  Select Service
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Booking Modal */}
      <Dialog 
        open={isServiceModalOpen} 
        onOpenChange={(open) => {
          setIsServiceModalOpen(open);
          if (!open) {
            // Reset form state when modal closes
            setBookingForm({ name: '', contactNo: '', description: '' });
            setBookingConfirmation('');
            setShowBookingForm(false);
            setSubmitError(null);
            setSubmitSuccess(false);
          }
        }}
      >
        <AnimatePresence>
          {isServiceModalOpen && selectedService && (
            <DialogContent className="sm:max-w-[500px]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <DialogHeader>
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-3 mb-2"
                  >
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                      <Car className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold">
                        {selectedService.name}
                      </DialogTitle>
                      <DialogDescription className="text-lg mt-1">
                        <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                          {selectedService.price}
                        </span>
                      </DialogDescription>
                    </div>
                  </motion.div>
                </DialogHeader>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4 py-4"
                >
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-sm">Service Includes:</h4>
                    <ul className="space-y-1.5">
                      {selectedService.features.map((feature, idx) => (
                        <motion.li
                          key={idx}
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.3 + idx * 0.05 }}
                          className="flex items-start text-sm text-muted-foreground"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          {feature}
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  {!showBookingForm && (
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-4"
                    >
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center">
                        <h3 className="text-lg font-semibold mb-4">Do you want to book this service?</h3>
                        <div className="space-y-3">
                          <Label htmlFor="bookingConfirmation" className="text-base font-medium">
                            Select your choice:
                          </Label>
                          <select
                            id="bookingConfirmation"
                            value={bookingConfirmation || ''}
                            onChange={(e) => {
                              const selectedValue = e.target.value;
                              setBookingConfirmation(selectedValue);
                              
                              if (selectedValue === 'yes') {
                                setTimeout(() => setShowBookingForm(true), 300);
                              } else if (selectedValue === 'no') {
                                // Auto-close modal when "No" is selected with smooth animation
                                // Dialog animation duration is 200ms, so we wait a bit for visual feedback
                                setTimeout(() => {
                                  setIsServiceModalOpen(false);
                                }, 200);
                              }
                            }}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">-- Select --</option>
                            <option value="yes">Yes, I want to book</option>
                            <option value="no">No, cancel</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {showBookingForm && (
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="name">
                          Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="name"
                          placeholder="Enter your full name"
                          value={bookingForm.name}
                          onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                          disabled={isSubmitting}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="contactNo">
                          Contact Number <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="contactNo"
                          type="tel"
                          placeholder="Enter your contact number"
                          value={bookingForm.contactNo}
                          onChange={(e) => setBookingForm({ ...bookingForm, contactNo: e.target.value })}
                          disabled={isSubmitting}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">
                          Description <span className="text-muted-foreground text-xs">(Optional)</span>
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Any special requests or additional details..."
                          value={bookingForm.description}
                          onChange={(e) => setBookingForm({ ...bookingForm, description: e.target.value })}
                          disabled={isSubmitting}
                          className="mt-1 min-h-[100px]"
                          rows={4}
                        />
                      </div>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {submitError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <Alert variant="destructive">
                          <AlertDescription>{submitError}</AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                    {submitSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                          <AlertDescription className="text-green-800 dark:text-green-200">
                            Booking request sent successfully! We'll contact you soon.
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <DialogFooter>
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex gap-2 w-full sm:w-auto"
                  >
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsServiceModalOpen(false);
                        setBookingForm({ name: '', contactNo: '', description: '' });
                        setBookingConfirmation('');
                        setShowBookingForm(false);
                        setSubmitError(null);
                        setSubmitSuccess(false);
                      }}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-initial"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    {showBookingForm && (
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !bookingForm.name.trim() || !bookingForm.contactNo.trim()}
                        className="flex-1 sm:flex-initial"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Request
                          </>
                        )}
                      </Button>
                    )}
                  </motion.div>
                </DialogFooter>
              </motion.div>
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>
    </>
  );
}

