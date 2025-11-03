'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListOrdered, RefreshCw, Loader2, Car, User, Clock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface QueueEntry {
  id: string;
  queue_number: number;
  status: string;
  service_type: string;
  created_at?: string;
  customer?: {
    id: string;
    name: string;
  } | null;
  worker?: {
    id: string;
    name: string;
  } | null;
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
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        setIsInitialLoading(false);
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
                        : `${queueEntries.length} ${queueEntries.length === 1 ? 'vehicle' : 'vehicles'} in queue`
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

              {/* Queue List */}
              {isInitialLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading queue...</p>
                  </div>
                </div>
              ) : queueEntries.length === 0 ? (
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
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
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
                  {queueEntries.map((entry, index) => (
                          <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.03 }}
                            className={`hover:bg-muted/30 transition-colors ${
                        entry.status === 'washing' 
                                ? 'bg-blue-50/30 dark:bg-blue-950/10 border-l-4 border-l-blue-500' 
                          : 'border-l-4 border-l-yellow-500'
                      }`}
                    >
                            {/* Queue Number */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-lg font-bold text-lg shadow-md transition-transform hover:scale-105 ${
                            entry.status === 'washing' 
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
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
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700'
                          }`}>
                            {entry.status === 'washing' && (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
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
                    {queueEntries.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total in Queue</div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

