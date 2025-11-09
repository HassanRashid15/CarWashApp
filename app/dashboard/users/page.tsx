'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, Trash2, Edit2, AlertTriangle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserData {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  name: string;
  contact_no: string | null;
  type: string;
  role: string | null;
  admin_code: string | null;
  email_verified: boolean;
  created_at: string;
  avatar_url: string | null;
  admin_id: string | null;
}

interface UserCounts {
  total: number;
  superAdmin: number;
  admin: number;
  user: number;
  customer: number;
  worker: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [counts, setCounts] = useState<UserCounts>({
    total: 0,
    superAdmin: 0,
    admin: 0,
    user: 0,
    customer: 0,
    worker: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [userToEdit, setUserToEdit] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.users || []);
      setCounts(data.counts || {
        total: 0,
        superAdmin: 0,
        admin: 0,
        user: 0,
        customer: 0,
        worker: 0,
      });
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }

  const handlePreview = (user: UserData) => {
    setSelectedUser(user);
    setShowPreviewModal(true);
  };

  const handleDeleteClick = (user: UserData) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleEditClick = (user: UserData) => {
    setUserToEdit(user);
    setShowEditModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      // TODO: Implement delete API endpoint
      // For now, just show success message
      console.log('Deleting user:', userToDelete.id);
      
      // Remove from local state
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setShowDeleteModal(false);
      setUserToDelete(null);
      
      // Update counts
      const type = userToDelete.type.toLowerCase().replace(' ', '_');
      if (type in counts) {
        setCounts({
          ...counts,
          [type]: Math.max(0, counts[type as keyof UserCounts] - 1),
          total: Math.max(0, counts.total - 1),
        });
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string, email: string | null) => {
    if (name && name !== 'N/A') {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const filteredUsers = filter === 'all' 
    ? users 
    : users.filter(user => {
        switch (filter) {
          case 'super_admin':
            return user.type === 'Super Admin';
          case 'admin':
            return user.type === 'Admin';
          case 'user':
            return user.type === 'User';
          case 'customer':
            return user.type === 'Customer';
          case 'worker':
            return user.type === 'Worker';
          default:
            return true;
        }
      });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !users.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchUsers} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users Management</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all users, admins, customers, and workers
          </p>
        </div>
        <Button onClick={fetchUsers} variant="outline" size="sm">
          <Edit2 className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-2xl">{counts.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Super Admins</CardDescription>
            <CardTitle className="text-2xl">{counts.superAdmin}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-2xl">{counts.admin}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Users</CardDescription>
            <CardTitle className="text-2xl">{counts.user}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Customers</CardDescription>
            <CardTitle className="text-2xl">{counts.customer}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Workers</CardDescription>
            <CardTitle className="text-2xl">{counts.worker}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          All ({counts.total})
        </button>
        <button
          onClick={() => setFilter('super_admin')}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            filter === 'super_admin'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Super Admin ({counts.superAdmin})
        </button>
        <button
          onClick={() => setFilter('admin')}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            filter === 'admin'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Admin ({counts.admin})
        </button>
        <button
          onClick={() => setFilter('user')}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            filter === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Users ({counts.user})
        </button>
        <button
          onClick={() => setFilter('customer')}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            filter === 'customer'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Customers ({counts.customer})
        </button>
        <button
          onClick={() => setFilter('worker')}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            filter === 'worker'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Workers ({counts.worker})
        </button>
      </div>

      {/* Users Table */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Showing {filter === 'all' ? 'all' : filter} users
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <div className="min-w-full inline-block align-middle">
              <div className="rounded-md border overflow-hidden">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[80px]">Avatar</TableHead>
                      <TableHead className="min-w-[120px]">First Name</TableHead>
                      <TableHead className="min-w-[150px]">Name</TableHead>
                      <TableHead className="min-w-[200px]">Email</TableHead>
                      <TableHead className="min-w-[120px]">ID</TableHead>
                      <TableHead className="min-w-[120px]">Role</TableHead>
                      <TableHead className="min-w-[130px]">Contact</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[180px]">Created At</TableHead>
                      <TableHead className="min-w-[140px] sticky right-0 bg-background">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="min-w-[80px]">
                            <Avatar className="h-10 w-10">
                              {user.avatar_url ? (
                                <AvatarImage src={user.avatar_url} alt={user.name} />
                              ) : null}
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {getInitials(user.name, user.email)}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="min-w-[120px] whitespace-nowrap">{user.first_name || 'N/A'}</TableCell>
                          <TableCell className="font-medium min-w-[150px] whitespace-nowrap">{user.name}</TableCell>
                          <TableCell className="min-w-[200px]">
                            <div className="max-w-[200px] truncate" title={user.email || 'N/A'}>
                              {user.email || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono whitespace-nowrap">
                              {user.id.substring(0, 8)}...
                            </code>
                          </TableCell>
                          <TableCell className="min-w-[120px] whitespace-nowrap">
                            {user.role ? (
                              <Badge 
                                variant={
                                  user.role === 'super_admin' ? 'destructive' :
                                  user.role === 'admin' ? 'default' :
                                  user.role === 'user' ? 'secondary' :
                                  'outline'
                                }
                              >
                                {user.role === 'super_admin' ? 'Super Admin' :
                                 user.role === 'admin' ? 'Admin' :
                                 user.role === 'user' ? 'User' :
                                 user.role === 'customer' ? 'Customer' :
                                 user.role === 'worker' ? 'Worker' :
                                 user.role}
                              </Badge>
                            ) : (
                              <Badge variant="outline">{user.type}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[130px] whitespace-nowrap">
                            {user.contact_no ? (
                              <span className="font-mono">{user.contact_no}</span>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell className="min-w-[100px] whitespace-nowrap">
                            {user.email_verified ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                Unverified
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground min-w-[180px] whitespace-nowrap">
                            {formatDate(user.created_at)}
                          </TableCell>
                          <TableCell className="min-w-[140px] sticky right-0 bg-background z-10">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handlePreview(user)}
                                title="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary"
                                onClick={() => handleEditClick(user)}
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteClick(user)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>User Details</DialogTitle>
                <DialogDescription>
                  View complete information for {selectedUser.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    {selectedUser.avatar_url ? (
                      <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {getInitials(selectedUser.name, selectedUser.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                    <p className="text-muted-foreground">{selectedUser.type}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">First Name</p>
                    <p className="text-sm font-medium">{selectedUser.first_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                    <p className="text-sm font-medium">{selectedUser.last_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{selectedUser.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact Number</p>
                    <p className="text-sm font-medium font-mono">{selectedUser.contact_no || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">User ID</p>
                    <p className="text-sm font-medium font-mono">{selectedUser.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                    <p className="text-sm font-medium">{selectedUser.role || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Admin Code</p>
                    <p className="text-sm font-medium font-mono">{selectedUser.admin_code || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email Status</p>
                    <Badge variant={selectedUser.email_verified ? "outline" : "secondary"}>
                      {selectedUser.email_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created At</p>
                    <p className="text-sm font-medium">{formatDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <Badge variant="outline">{selectedUser.type}</Badge>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {userToEdit && (
            <>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update information for {userToEdit.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Alert>
                  <AlertDescription>
                    Edit functionality is coming soon. This will allow you to update user details, roles, and other information.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-sm font-medium">{userToEdit.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{userToEdit.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                    <p className="text-sm font-medium">{userToEdit.role || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact</p>
                    <p className="text-sm font-medium">{userToEdit.contact_no || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  // TODO: Implement edit functionality
                  setShowEditModal(false);
                }} disabled={isEditing}>
                  {isEditing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This will permanently delete <strong>{userToDelete.name}</strong> ({userToDelete.type}).
                  All associated data will be removed.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Name:</strong> {userToDelete.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Email:</strong> {userToDelete.email || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Type:</strong> {userToDelete.type}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setUserToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
