'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Phone, Calendar, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContactQuery {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  admin_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export default function ContactQueriesPage() {
  const [queries, setQueries] = useState<ContactQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<ContactQuery | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchQueries();
  }, []);

  const fetchQueries = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/contact-queries');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch contact queries');
      }

      const data = await response.json();
      setQueries(data.queries || []);
    } catch (err) {
      console.error('Error fetching queries:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch contact queries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedQuery || !statusUpdate) return;

    try {
      setIsUpdating(true);

      const response = await fetch(`/api/contact-queries/${selectedQuery.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: statusUpdate,
          admin_notes: adminNotes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update query');
      }

      // Refresh queries
      await fetchQueries();
      setIsDialogOpen(false);
      setSelectedQuery(null);
      setStatusUpdate('');
      setAdminNotes('');
    } catch (err) {
      console.error('Error updating query:', err);
      alert(err instanceof Error ? err.message : 'Failed to update query');
    } finally {
      setIsUpdating(false);
    }
  };

  const openStatusDialog = (query: ContactQuery) => {
    setSelectedQuery(query);
    setStatusUpdate(query.status);
    setAdminNotes(query.admin_notes || '');
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'default',
      in_progress: 'secondary',
      resolved: 'outline',
      closed: 'secondary',
    };

    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
      in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      resolved: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
      closed: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
    };

    return (
      <Badge className={colors[status] || ''} variant={variants[status] || 'default'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingCount = queries.filter(q => q.status === 'pending').length;

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
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contact Queries</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer inquiries and messages
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      {queries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No contact queries yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {queries.map((query) => (
              <motion.div
                key={query.id}
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
                          <CardTitle className="text-lg">{query.name}</CardTitle>
                          {getStatusBadge(query.status)}
                        </div>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {query.email}
                          </span>
                          {query.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {query.phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(query.created_at)}
                          </span>
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openStatusDialog(query)}
                      >
                        Update Status
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Message</Label>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {query.message}
                        </p>
                      </div>
                      {query.admin_notes && (
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">Admin Notes</Label>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                            {query.admin_notes}
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

      {/* Status Update Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Query Status</DialogTitle>
            <DialogDescription>
              Update the status and add notes for this contact query.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add internal notes about this query..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
              />
            </div>
            {selectedQuery && (
              <div className="bg-muted/50 p-4 rounded-md space-y-2">
                <p className="text-sm font-semibold">Query Details:</p>
                <p className="text-sm text-muted-foreground">
                  <strong>From:</strong> {selectedQuery.name} ({selectedQuery.email})
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Message:</strong> {selectedQuery.message.substring(0, 100)}
                  {selectedQuery.message.length > 100 ? '...' : ''}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange} disabled={isUpdating || !statusUpdate}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

