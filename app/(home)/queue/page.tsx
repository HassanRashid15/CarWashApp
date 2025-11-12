'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListOrdered, RefreshCw, Loader2, Car, User, Clock, ArrowLeft, MessageSquare, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FeedbackModal } from '@/components/feedback/feedback-modal';

interface QueueEntry {
  id: string;
  queue_number: number;
  status: string;
  service_type: string;
  created_at?: string;
  customer_id?: string;
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
  worker?: {
    id: string;
    name: string;
  } | null;
  feedbacks?: Array<{ id: string }> | null;
}

export default function QueuePage() {
  const router = useRouter();
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const queueEntriesRef = useRef<QueueEntry[]>([]); // Use ref to avoid dependency issues
  const isInitialLoadRef = useRef(true); // Track if this is the first load
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedQueueEntry, setSelectedQueueEntry] = useState<QueueEntry | null>(null);

  // Helper function to check if entry is active (not completed)
  const isActiveEntry = (entry: QueueEntry): boolean => {
    if (!entry || !entry.status) return true; // If no status, assume active
    const status = String(entry.status).toLowerCase().trim();
    return status !== 'completed';
  };

  // Memoize filtered active entries to ensure proper filtering
  const activeQueueEntries = useMemo(() => {
    const filtered = queueEntries.filter(isActiveEntry);
    console.log('🔍 Filtered queue entries:', {
      total: queueEntries.length,
      active: filtered.length,
      completed: queueEntries.length - filtered.length
    });
    return filtered;
  }, [queueEntries]);

  // Only set mounted state on client
  useEffect(() => {
    setIsMounted(true);
    setLastUpdate(new Date());
  }, []);

  const fetchQueue = useCallback(async (showLoading = false) => {
    try {
      // Only show loading state on initial load or manual refresh
      if (showLoading || isInitialLoadRef.current) {
        setIsInitialLoading(true);
      }
      
      // Add timestamp to prevent browser caching and force fresh data
      const timestamp = Date.now();
      const response = await fetch(`/api/queue/public?t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.queue !== undefined) {
        const newQueue = Array.isArray(data.queue) ? data.queue : [];
        // Deep clone to ensure React sees it as new data reference
        const queueClone = JSON.parse(JSON.stringify(newQueue));
        
        // Debug: Log status values to see what we're getting
        console.log('📊 Queue entries received:', queueClone.length);
        console.log('📊 Status breakdown:', {
          waiting: queueClone.filter((e: QueueEntry) => String(e.status || '').toLowerCase().trim() === 'waiting').length,
          washing: queueClone.filter((e: QueueEntry) => String(e.status || '').toLowerCase().trim() === 'washing').length,
          completed: queueClone.filter((e: QueueEntry) => String(e.status || '').toLowerCase().trim() === 'completed').length,
          other: queueClone.filter((e: QueueEntry) => {
            const s = String(e.status || '').toLowerCase().trim();
            return s !== 'waiting' && s !== 'washing' && s !== 'completed';
          }).length
        });
        
        // Check if data actually changed using ref
        const currentQueueStr = JSON.stringify(queueEntriesRef.current);
        const newQueueStr = JSON.stringify(queueClone);
        
        if (currentQueueStr !== newQueueStr) {
          // Data changed - update both state and ref smoothly
          queueEntriesRef.current = queueClone;
          setQueueEntries(queueClone); // This triggers re-render
          setLastUpdate(new Date());
          console.log('✅ Queue UI updated at', new Date().toLocaleTimeString(), '- Entries:', newQueue.length);
        } else {
          console.log('ℹ️ Queue data unchanged, skipping UI update');
        }
        
        // Log error if present in response
        if (data.error) {
          console.error('Queue API error:', data.error);
        }
      } else {
        console.warn('No queue data in response:', data);
        queueEntriesRef.current = [];
        setQueueEntries([]);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
      queueEntriesRef.current = [];
      setQueueEntries([]);
    } finally {
      // Always reset loading state when it was set
      if (showLoading || isInitialLoadRef.current) {
        setIsInitialLoading(false);
      }
      // Mark initial load as complete
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
    }
  }, []); // No dependencies - stable function

  useEffect(() => {
    // Initial fetch with loading state
    fetchQueue(true);
    
    // Auto-refresh every 10 seconds to catch backend updates (backend refreshes every 15s)
    // No loading state on auto-refresh to prevent flickering
    intervalRef.current = setInterval(() => {
      fetchQueue(false); // Silent refresh - no loading state
    }, 10000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - fetchQueue is stable via useCallback
  
  // Update ref when state changes
  useEffect(() => {
    queueEntriesRef.current = queueEntries;
  }, [queueEntries]);

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'wash': 'Basic Wash',
      'detailing': 'Detailing',
      'wax': 'Wax',
      'interior': 'Interior Clean',
      'full_service': 'Full Service'
    };
    return labels[type] || type;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${month} ${day} ${year}, ${time}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                <ListOrdered className="h-4 w-4" />
                <span className="text-sm font-medium">Live Queue System</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold mb-2">
                Current <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Queue</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Real-time queue status for all active services
              </p>
            </div>
            <Button
              onClick={() => fetchQueue(true)}
              disabled={isInitialLoading}
              className="hidden sm:flex"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isInitialLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Last updated: {isMounted && lastUpdate ? lastUpdate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              }) : '—'}
            </p>
            <p className="hidden sm:block">
              Auto-refreshes every 10 seconds
            </p>
          </div>
        </motion.div>

        {/* Queue Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-6xl mx-auto"
        >
          <Card className="border-2 shadow-2xl backdrop-blur-xl bg-card/95 overflow-hidden">
            <CardContent className="p-0">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <ListOrdered className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Active Queue</h2>
                    <p className="text-blue-100 text-sm">
                      {isInitialLoading 
                        ? 'Loading...' 
                        : `${activeQueueEntries.length} ${activeQueueEntries.length === 1 ? 'vehicle' : 'vehicles'} in queue`
                      }
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchQueue(true)}
                  disabled={isInitialLoading}
                  className="text-white hover:bg-white/20 sm:hidden"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isInitialLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {/* Queue List - Only show active entries (waiting/washing), exclude completed */}
              {isInitialLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading queue...</p>
                  </div>
                </div>
              ) : activeQueueEntries.length === 0 ? (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted mb-6">
                    <ListOrdered className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Queue is Empty</h3>
                  <p className="text-muted-foreground mb-6">
                    No vehicles currently in the queue
                  </p>
                  <Link href="/">
                    <Button variant="outline">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Home
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="h-[500px] overflow-y-auto custom-scrollbar">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm border-b border-border">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Queue #
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Service
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Worker
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Time
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                  {activeQueueEntries
                    .map((entry, index) => (
                          <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.03 }}
                            className={`hover:bg-muted/30 transition-colors ${
                        entry.status === 'washing' 
                                ? 'bg-blue-50/30 dark:bg-blue-950/10 border-l-4 border-l-blue-500' 
                          : entry.status === 'completed'
                          ? 'bg-green-50/30 dark:bg-green-950/10 border-l-4 border-l-green-500'
                          : 'border-l-4 border-l-yellow-500'
                      }`}
                    >
                            {/* Queue Number */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-lg font-bold text-lg shadow-md transition-transform hover:scale-105 ${
                            entry.status === 'washing' 
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                              : entry.status === 'completed'
                              ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                              : 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white'
                          }`}>
                            #{entry.queue_number}
                          </div>
                            </td>
                            
                            {/* Customer */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="font-semibold text-base text-foreground">
                              {entry.customer?.name || 'Customer'}
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono border border-border inline-block w-fit">
                                  ID: {entry.id.substring(0, 8).toUpperCase()}
                                </span>
                              </div>
                            </td>
                            
                            {/* Service */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{getServiceTypeLabel(entry.service_type)}</span>
                              </div>
                            </td>
                            
                            {/* Worker */}
                            <td className="px-6 py-4">
                              {entry.worker ? (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <User className="h-4 w-4" />
                                  <span>{entry.worker.name}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </td>
                            
                            {/* Time */}
                            <td className="px-6 py-4">
                              {entry.created_at ? (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>{formatDateTime(entry.created_at)}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </td>
                            
                            {/* Status */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${
                            entry.status === 'washing'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
                                  : entry.status === 'completed'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700'
                          }`}>
                            {entry.status === 'washing' && (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            )}
                            {entry.status === 'completed' && (
                                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                          </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                      </div>
                </div>
              )}

              {/* Footer */}
              {queueEntries.length > 0 && (
                <div className="bg-muted/50 p-4 border-t border-border">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-muted-foreground">
                    <p className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Auto-updates every 10 seconds
                    </p>
                    <p>
                      Last refresh: {isMounted && lastUpdate ? lastUpdate.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                      }) : '—'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Section */}
        {queueEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-6xl mx-auto mt-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border bg-card/50">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {queueEntries.filter(e => e.status === 'waiting').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Waiting</div>
                </CardContent>
              </Card>
              <Card className="border bg-card/50">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {queueEntries.filter(e => e.status === 'washing').length}
                  </div>
                  <div className="text-sm text-muted-foreground">In Progress</div>
                </CardContent>
              </Card>
              <Card className="border bg-card/50">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {activeQueueEntries.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active in Queue</div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Completed Services - Feedback Section (Separate from Queue) */}
        {queueEntries.filter(e => e.status === 'completed' && (!e.feedbacks || e.feedbacks.length === 0)).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="max-w-6xl mx-auto mt-12"
          >
            {/* Separator */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-4 text-sm text-muted-foreground">
                  Completed Services
                </span>
              </div>
            </div>

            <Card className="border-2 shadow-xl backdrop-blur-xl bg-card/95 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Service Completion</h2>
                    <p className="text-green-100 text-sm">
                      {queueEntries.filter(e => e.status === 'completed' && (!e.feedbacks || e.feedbacks.length === 0)).length} {queueEntries.filter(e => e.status === 'completed' && (!e.feedbacks || e.feedbacks.length === 0)).length === 1 ? 'service' : 'services'} ready for feedback
                    </p>
                  </div>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="h-[400px] overflow-y-auto custom-scrollbar">
                  <div className="p-6 space-y-4">
                    <AnimatePresence mode="popLayout">
                      {queueEntries
                        .filter(e => e.status === 'completed' && (!e.feedbacks || e.feedbacks.length === 0))
                        .map((entry, index) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 100, scale: 0.9 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md">
                                  #{entry.queue_number}
                                </div>
                                <div>
                                  <p className="font-semibold text-base">
                                    {entry.customer?.name || 'Customer'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {getServiceTypeLabel(entry.service_type)}
                                  </p>
                                </div>
                              </div>
                              {entry.created_at && (
                                <p className="text-xs text-muted-foreground ml-[52px]">
                                  Completed: {formatDateTime(entry.created_at)}
                                </p>
                              )}
                            </div>
                            <Button
                              onClick={() => {
                                setSelectedQueueEntry(entry);
                                setShowFeedbackModal(true);
                              }}
                              className="ml-4"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Give Feedback
                            </Button>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Feedback Summary Section - Separate from Service Completion */}
        {queueEntries.filter(e => e.status === 'completed').length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="max-w-6xl mx-auto mt-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border bg-card/50">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {queueEntries.filter(e => e.status === 'completed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Completed</div>
                </CardContent>
              </Card>
              <Card className="border bg-card/50">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {queueEntries.filter(e => e.status === 'completed' && e.feedbacks && e.feedbacks.length > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Feedback Given</div>
                </CardContent>
              </Card>
              <Card className="border bg-card/50">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-1">
                    {queueEntries.filter(e => e.status === 'completed' && (!e.feedbacks || e.feedbacks.length === 0)).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending Feedback</div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </div>

      {/* Feedback Modal */}
      {selectedQueueEntry && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedQueueEntry(null);
          }}
          queueEntry={{
            id: selectedQueueEntry.id,
            customer_id: selectedQueueEntry.customer_id || selectedQueueEntry.customer?.id || '',
            customer: selectedQueueEntry.customer || null,
          }}
          usePublicEndpoint={true}
          onFeedbackSubmitted={() => {
            setShowFeedbackModal(false);
            // Immediately mark the entry as having feedback and animate it out
            if (selectedQueueEntry) {
              // Mark as having feedback first
              setQueueEntries(prev => prev.map(entry => 
                entry.id === selectedQueueEntry.id 
                  ? { ...entry, feedbacks: [{ id: 'temp' }] } // Mark as having feedback
                  : entry
              ));
              queueEntriesRef.current = queueEntriesRef.current.map(entry => 
                entry.id === selectedQueueEntry.id 
                  ? { ...entry, feedbacks: [{ id: 'temp' }] }
                  : entry
              );
              
              // Remove from Service Completion section with slide animation after a short delay
              setTimeout(() => {
                setQueueEntries(prev => prev.filter(entry => entry.id !== selectedQueueEntry.id));
                queueEntriesRef.current = queueEntriesRef.current.filter(entry => entry.id !== selectedQueueEntry.id);
              }, 500); // Short delay to allow animation
            }
            setSelectedQueueEntry(null);
            // Refresh queue to update UI (will get real feedback data)
            fetchQueue(false);
          }}
        />
      )}
    </div>
  );
}

