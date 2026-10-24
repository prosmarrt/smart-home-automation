import { useEffect, useState } from 'react';
import { profileApi, authApi } from '@/db/api';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Profile } from '@/types/types';
import { Loader2, Shield, User, UserPlus, CheckCircle, XCircle, Clock, Ban, Trash2 } from 'lucide-react';
import AppBackupCard from '@/components/admin/AppBackupCard';

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [userToPermanentlyDelete, setUserToPermanentlyDelete] = useState<Profile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await profileApi.getAllProfiles();
      setProfiles(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      await profileApi.updateRole(userId, newRole);
      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
      loadProfiles();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const handleApprovalChange = async (userId: string, approve: boolean) => {
    try {
      await profileApi.approveUser(userId, approve);
      toast({
        title: 'Success',
        description: approve ? 'User approved successfully' : 'User approval revoked',
      });
      loadProfiles();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user approval status',
        variant: 'destructive',
      });
    }
  };

  const handleDeclineUser = async (userId: string) => {
    try {
      await profileApi.declineUser(userId);
      toast({
        title: 'Success',
        description: 'User request declined',
      });
      loadProfiles();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to decline user',
        variant: 'destructive',
      });
    }
  };

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    try {
      await profileApi.suspendUser(userId, suspend);
      toast({
        title: 'Success',
        description: suspend ? 'User suspended successfully. All their data has been preserved.' : 'User unsuspended successfully',
      });
      setShowDeleteDialog(false);
      setUserToDelete(null);
      loadProfiles();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to suspend user',
        variant: 'destructive',
      });
    }
  };

  const handlePermanentDeleteUser = async (userId: string) => {
    try {
      await profileApi.deleteUser(userId);
      toast({
        title: 'Success',
        description: 'User permanently deleted. All their data has been removed.',
      });
      setShowPermanentDeleteDialog(false);
      setUserToPermanentlyDelete(null);
      loadProfiles();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleCreateUser = async () => {
    // Trim whitespace from username
    const trimmedUsername = newUsername.trim();
    
    if (!trimmedUsername || !newPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      // Find invalid characters for better error message
      const invalidChars = trimmedUsername.match(/[^a-zA-Z0-9_]/g);
      const invalidCharsStr = invalidChars ? [...new Set(invalidChars)].join(', ') : 'unknown';
      
      toast({
        title: 'Invalid Username',
        description: `Username can only contain letters, digits, and underscores. Invalid characters found: ${invalidCharsStr}`,
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      // Use Edge Function for reliable user creation
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          username: trimmedUsername,
          password: newPassword,
          role: newRole,
        },
      });

      if (error) {
        const errorMsg = await error?.context?.text?.();
        console.error('Edge function error:', errorMsg || error?.message);
        throw new Error(errorMsg || error?.message || 'Failed to create user');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create user');
      }
      
      toast({
        title: 'Success',
        description: `User ${newUsername} created and approved successfully as ${newRole}`,
      });
      
      setShowCreateDialog(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      loadProfiles();
    } catch (error) {
      console.error('Create user error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingUsers = profiles.filter(p => !p.approved);

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-4">
      {/* Complete App Backup & Migration Section */}
      <AppBackupCard />

      {pendingUsers.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Clock className="h-5 w-5" />
              Pending User Approvals
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              {pendingUsers.length} {pendingUsers.length === 1 ? 'user' : 'users'} waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-md border"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprovalChange(user.id, true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineUser(user.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user roles, permissions, and approvals
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user or admin to the system (will be auto-approved)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="Enter username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password (min 6 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newRole}
                      onValueChange={(value: 'user' | 'admin') => setNewRole(value)}
                      disabled={isCreating}
                    >
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create User'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profiles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            ) : (
              profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {profile.role === 'admin' ? (
                      <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{profile.username || 'Unknown'}</p>
                        {profile.suspended ? (
                          <Badge variant="destructive" className="flex-shrink-0">
                            <Ban className="h-3 w-3 mr-1" />
                            Suspended
                          </Badge>
                        ) : profile.declined ? (
                          <Badge variant="secondary" className="bg-red-600 text-white flex-shrink-0">
                            <XCircle className="h-3 w-3 mr-1" />
                            Declined
                          </Badge>
                        ) : profile.approved ? (
                          <Badge variant="default" className="bg-green-600 flex-shrink-0">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-600 text-white flex-shrink-0">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <Select
                      value={profile.role}
                      onValueChange={(value: 'user' | 'admin') =>
                        handleRoleChange(profile.id, value)
                      }
                      disabled={profile.suspended || profile.declined}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {profile.suspended ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuspendUser(profile.id, false)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Unsuspend
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUserToPermanentlyDelete(profile);
                            setShowPermanentDeleteDialog(true);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete Permanently
                        </Button>
                      </>
                    ) : profile.declined ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUserToPermanentlyDelete(profile);
                          setShowPermanentDeleteDialog(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Permanently
                      </Button>
                    ) : profile.approved ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprovalChange(profile.id, false)}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUserToDelete(profile);
                            setShowDeleteDialog(true);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprovalChange(profile.id, true)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeclineUser(profile.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend <strong>{userToDelete?.username}</strong>?
              <br /><br />
              <span className="text-green-600 font-medium">
                ✓ All user data will be preserved
              </span>
              <br />
              This includes all rooms, devices, and quotations created by this user.
              <br /><br />
              The user will not be able to log in, but their data remains intact for historical records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setUserToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleSuspendUser(userToDelete.id, true)}
              className="bg-red-600 hover:bg-red-700"
            >
              Suspend User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPermanentDeleteDialog} onOpenChange={setShowPermanentDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{userToPermanentlyDelete?.username}</strong>?
              <br /><br />
              <span className="text-red-600 font-medium">
                ⚠️ This action cannot be undone!
              </span>
              <br />
              All user data will be permanently removed, including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>User profile and account</li>
                <li>All rooms and devices</li>
                <li>All quotations and invoices</li>
                <li>All commissioning and installation records</li>
              </ul>
              <br />
              This is a permanent deletion and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowPermanentDeleteDialog(false);
              setUserToPermanentlyDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToPermanentlyDelete && handlePermanentDeleteUser(userToPermanentlyDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
