'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Search, DollarSign, Hash, Edit2, Calendar, CreditCard, X, Save } from 'lucide-react';

type PaymentMethod = 'cash' | 'easypaisa' | 'jazzcash' | 'bank_transfer' | null;
type PaymentStatus = 'pending' | 'paid' | 'unpaid';

// List of Pakistani banks
const PAKISTANI_BANKS = [
  'Allied Bank Limited (ABL)',
  'Askari Bank Limited',
  'Bank Al Habib Limited',
  'Bank Alfalah Limited',
  'Bank of Punjab (BOP)',
  'Faysal Bank Limited',
  'First Women Bank Limited',
  'Habib Bank Limited (HBL)',
  'JS Bank Limited',
  'MCB Bank Limited',
  'Meezan Bank Limited',
  'National Bank of Pakistan (NBP)',
  'Soneri Bank Limited',
  'Standard Chartered Bank Pakistan',
  'Summit Bank Limited',
  'The Bank of Khyber',
  'United Bank Limited (UBL)',
  'Al Baraka Bank Pakistan Limited',
  'Dubai Islamic Bank Pakistan Limited',
  'Bank Islami Pakistan Limited',
  'Sindh Bank Limited',
];

interface QueueEntry {
  id: string;
  customer_id: string;
  queue_number: number;
  status: 'completed';
  assigned_worker?: string | null;
  service_type: string;
  price: number;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  bank_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  created_at?: string;
  remarks?: string | null;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    vehicle_number?: string | null;
    vehicle_type?: string | null;
  } | null;
  worker?: {
    id: string;
    name: string;
    employee_id?: string | null;
  } | null;
}

export default function PaymentsPage() {
  const [completedEntries, setCompletedEntries] = useState<QueueEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<QueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    payment_status: 'pending' as PaymentStatus,
    payment_method: '' as PaymentMethod | '',
    bank_name: '' as string,
  });

  useEffect(() => {
    fetchCompletedEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [completedEntries, searchTerm, paymentFilter]);

  const fetchCompletedEntries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/queue');
      
      if (!response.ok) {
        throw new Error('Failed to fetch completed entries');
      }
      
      const data = await response.json();
      // Filter only completed entries
      const completed = (data.queue || []).filter((entry: QueueEntry) => entry.status === 'completed');
      // Sort by end_time descending (most recent first)
      completed.sort((a: QueueEntry, b: QueueEntry) => {
        const timeA = a.end_time ? new Date(a.end_time).getTime() : 0;
        const timeB = b.end_time ? new Date(b.end_time).getTime() : 0;
        return timeB - timeA;
      });
      setCompletedEntries(completed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load completed entries');
    } finally {
      setIsLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = [...completedEntries];

    // Filter by payment method/status
    if (paymentFilter !== 'all') {
      if (paymentFilter === 'cash') {
        filtered = filtered.filter(entry => entry.payment_method === 'cash');
      } else if (paymentFilter === 'online') {
        filtered = filtered.filter(entry => 
          entry.payment_method && 
          ['easypaisa', 'jazzcash', 'bank_transfer'].includes(entry.payment_method)
        );
      } else {
        filtered = filtered.filter(entry => entry.payment_status === paymentFilter);
      }
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.customer?.name?.toLowerCase().includes(search) ||
        entry.customer?.phone?.includes(search) ||
        entry.customer?.vehicle_number?.toLowerCase().includes(search) ||
        entry.queue_number.toString().includes(search) ||
        entry.worker?.name?.toLowerCase().includes(search)
      );
    }

    setFilteredEntries(filtered);
  };

  const handleEdit = (entry: QueueEntry) => {
    setSelectedEntry(entry);
    setEditFormData({
      payment_status: entry.payment_status,
      payment_method: entry.payment_method || '',
      bank_name: entry.bank_name || '',
    });
    setShowEditModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleUpdatePayment = async () => {
    if (!selectedEntry) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/queue/${selectedEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_status: editFormData.payment_status,
          payment_method: editFormData.payment_method || null,
          bank_name: editFormData.payment_method === 'bank_transfer' 
            ? (editFormData.bank_name && editFormData.bank_name.trim() ? editFormData.bank_name.trim() : null)
            : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Failed to update payment';
        throw new Error(errorMsg);
      }

      setSuccess('Payment record updated successfully');
      setShowEditModal(false);
      await fetchCompletedEntries();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPaymentMethodLabel = (method?: PaymentMethod | null) => {
    if (!method) return 'Not recorded';
    return method.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getPaymentMethodColor = (method?: PaymentMethod | null) => {
    switch (method) {
      case 'cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700';
      case 'easypaisa':
      case 'jazzcash':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700';
      case 'bank_transfer':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300 dark:border-purple-700';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700';
    }
  };

  const getPaymentStatusColor = (status?: PaymentStatus | null) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
      case 'unpaid':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700';
    }
  };

  const getServiceTypeLabel = (type?: string | null) => {
    switch (type) {
      case 'wash':
        return 'Basic Wash';
      case 'detailing':
        return 'Detailing';
      case 'wax':
        return 'Wax';
      case 'interior':
        return 'Interior Clean';
      case 'full_service':
        return 'Full Service';
      default:
        return type || '—';
    }
  };

  // Calculate totals
  const totalRevenue = filteredEntries.reduce((sum, entry) => {
    return sum + (entry.payment_status === 'paid' ? entry.price : 0);
  }, 0);

  const cashTotal = filteredEntries
    .filter(entry => entry.payment_method === 'cash' && entry.payment_status === 'paid')
    .reduce((sum, entry) => sum + entry.price, 0);

  const onlineTotal = filteredEntries
    .filter(entry => 
      entry.payment_method && 
      ['easypaisa', 'jazzcash', 'bank_transfer'].includes(entry.payment_method) &&
      entry.payment_status === 'paid'
    )
    .reduce((sum, entry) => sum + entry.price, 0);

  const pendingCount = filteredEntries.filter(entry => entry.payment_status === 'pending' || !entry.payment_method).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payment Records</h2>
          <p className="text-muted-foreground">
            Record and update payment information for completed services
          </p>
        </div>
      </div>

      {(error || success) && (
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {success}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEntries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {totalRevenue.toLocaleString('en-PK')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cash Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {cashTotal.toLocaleString('en-PK')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Online Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {onlineTotal.toLocaleString('en-PK')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer name, phone, vehicle number, queue number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Payments</option>
                <option value="cash">Cash Only</option>
                <option value="online">Online Only</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Payment Modal */}
      <AnimatePresence>
        {showEditModal && selectedEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={() => !isSubmitting && setShowEditModal(false)}
          >
            <div className="absolute inset-0 bg-background/60 backdrop-blur-lg" />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="border-2 shadow-2xl backdrop-blur-xl bg-card/95">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>Record Payment</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => !isSubmitting && setShowEditModal(false)}
                      className="h-8 w-8"
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Customer Info */}
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-semibold">{selectedEntry.customer?.name || '—'}</p>
                      <p className="text-sm text-muted-foreground">
                        Queue #{selectedEntry.queue_number} • PKR {selectedEntry.price.toLocaleString('en-PK')}
                      </p>
                    </div>

                    {/* Payment Status */}
                    <div className="space-y-2">
                      <Label htmlFor="payment_status">
                        Payment Status *
                      </Label>
                      <select
                        id="payment_status"
                        value={editFormData.payment_status}
                        onChange={(e) => {
                          setEditFormData({ ...editFormData, payment_status: e.target.value as PaymentStatus });
                        }}
                        disabled={isSubmitting}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <Label htmlFor="payment_method">
                        Payment Method *
                      </Label>
                      <select
                        id="payment_method"
                        value={editFormData.payment_method || ''}
                        onChange={(e) => {
                          const newMethod = e.target.value as PaymentMethod || '';
                          setEditFormData({ 
                            ...editFormData, 
                            payment_method: newMethod,
                            bank_name: newMethod !== 'bank_transfer' ? '' : editFormData.bank_name
                          });
                        }}
                        disabled={isSubmitting}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Payment Method</option>
                        <option value="cash">Cash</option>
                        <option value="easypaisa">Easypaisa</option>
                        <option value="jazzcash">Jazzcash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>

                    {/* Bank Name - shown only when bank_transfer is selected */}
                    {editFormData.payment_method === 'bank_transfer' && (
                      <div className="space-y-2">
                        <Label htmlFor="bank_name">
                          Bank Name *
                        </Label>
                        <select
                          id="bank_name"
                          value={editFormData.bank_name}
                          onChange={(e) => {
                            setEditFormData({ ...editFormData, bank_name: e.target.value });
                          }}
                          disabled={isSubmitting}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select Bank</option>
                          {PAKISTANI_BANKS.map((bank) => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleUpdatePayment}
                        disabled={isSubmitting || !editFormData.payment_method || (editFormData.payment_method === 'bank_transfer' && !editFormData.bank_name)}
                        className="flex-1"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Payment Record
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowEditModal(false)}
                        disabled={isSubmitting}
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completed Entries List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm || paymentFilter !== 'all' 
            ? 'No completed entries match your filters.'
            : 'No completed entries found. Completed services will appear here.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Queue #</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap min-w-[150px]">Customer</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Service</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Price</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Payment Method</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Payment Status</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Completed Date</th>
                <th className="text-right p-4 font-semibold text-sm sticky right-0 bg-muted/50 z-10 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredEntries.map((entry, index) => (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="border-b border-border hover:bg-accent/50 transition-colors"
                  >
                    {/* Queue Number */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-mono font-medium">{entry.queue_number}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="p-4 whitespace-nowrap">
                      <p className="font-semibold text-sm">{entry.customer?.name || '—'}</p>
                      {entry.customer?.phone && (
                        <p className="text-xs text-muted-foreground">{entry.customer.phone}</p>
                      )}
                      {entry.customer?.vehicle_number && (
                        <p className="text-xs text-muted-foreground">{entry.customer.vehicle_number}</p>
                      )}
                    </td>

                    {/* Service Type */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-sm">{getServiceTypeLabel(entry.service_type)}</span>
                    </td>

                    {/* Price */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-sm font-medium">PKR {entry.price.toLocaleString('en-PK')}</span>
                    </td>

                    {/* Payment Method */}
                    <td className="p-4 whitespace-nowrap">
                      {entry.payment_method ? (
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getPaymentMethodColor(entry.payment_method)}`}>
                            {getPaymentMethodLabel(entry.payment_method)}
                          </span>
                          {entry.payment_method === 'bank_transfer' && entry.bank_name && (
                            <span className="text-xs text-muted-foreground">{entry.bank_name}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Not recorded</span>
                      )}
                    </td>

                    {/* Payment Status */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(entry.payment_status)}`}>
                        {entry.payment_status.charAt(0).toUpperCase() + entry.payment_status.slice(1)}
                      </span>
                    </td>

                    {/* Completed Date */}
                    <td className="p-4 whitespace-nowrap">
                      {entry.end_time ? (
                        <span className="text-sm text-muted-foreground">
                          {(() => {
                            const date = new Date(entry.end_time);
                            const month = date.toLocaleDateString('en-US', { month: 'short' });
                            const day = date.getDate();
                            const year = date.getFullYear();
                            const time = date.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            });
                            return `${month} ${day} ${year}, ${time}`;
                          })()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 sticky right-0 bg-background z-10 border-l border-border whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(entry)}
                          title="Record/Update Payment"
                          className="flex-shrink-0"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Record Payment
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

