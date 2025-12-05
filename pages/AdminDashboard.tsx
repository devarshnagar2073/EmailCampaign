
import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/apiService';
import { User, UserRole, EmailLog } from '../types';
import { Trash2, UserPlus, Shield, Activity, RefreshCw, Settings, Save, X, Database, Server, UserCheck, UserX, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label, Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/ui-components';
import { useToast, useConfirm } from '../components/ui/GlobalFeedback';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  
  const toast = useToast();
  const confirm = useConfirm();

  // Create User State
  const [newUserUser, setNewUserUser] = useState('');
  const [newUserPass, setNewUserPass] = useState('');

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editMode, setEditMode] = useState<'QUOTA' | 'SMTP' | null>(null);
  
  const [editQuota, setEditQuota] = useState<number>(100);
  const [editSmtp, setEditSmtp] = useState({ host: '', port: '587', user: '', pass: '', fromEmail: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedLogs] = await Promise.all([
        ApiService.getUsers(),
        ApiService.getAllLogs()
      ]);
      setUsers(fetchedUsers);
      setLogs(fetchedLogs);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiService.createUser({
        username: newUserUser,
        password: newUserPass,
        role: UserRole.USER
      });
      setNewUserUser('');
      setNewUserPass('');
      setShowAddModal(false);
      toast.success("User created successfully");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    }
  };

  const handleDeleteUser = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Deactivate User",
      description: "Are you sure you want to delete this user? This action will deactivate their account.",
      confirmText: "Deactivate",
      variant: 'destructive'
    });

    if (isConfirmed) {
      try {
        await ApiService.deleteUser(id);
        toast.success("User deactivated successfully");
        loadData();
      } catch (error) {
        toast.error("Failed to delete user");
      }
    }
  };

  const handleApproveUser = async (user: any) => {
      try {
          await ApiService.updateUser(user.id, { status: 'ACTIVE' });
          toast.success(`User ${user.username} approved!`);
          loadData();
      } catch (e) {
          toast.error("Failed to approve user");
      }
  };

  const handleRejectUser = async (user: any) => {
      const isConfirmed = await confirm({
          title: "Reject Registration",
          description: `Rejecting ${user.username} will delete this registration request.`,
          variant: 'destructive',
          confirmText: "Reject"
      });

      if (isConfirmed) {
           await ApiService.deleteUser(user.id); // Soft delete works for rejection too, or implement hard delete
           toast.info("Registration rejected");
           loadData();
      }
  };

  const openEditModal = (user: User, mode: 'QUOTA' | 'SMTP') => {
      setEditingUser(user);
      setEditMode(mode);
      
      // Init values
      if (mode === 'QUOTA') {
          setEditQuota(user.dailyQuota || 100);
      } else {
          setEditSmtp({
              host: user.smtpConfig?.host || '',
              port: user.smtpConfig?.port?.toString() || '587',
              user: user.smtpConfig?.user || '',
              pass: user.smtpConfig?.pass || '',
              fromEmail: user.smtpConfig?.fromEmail || ''
          });
      }
  };

  const closeEditModal = () => {
      setEditingUser(null);
      setEditMode(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;

      const updates: any = {};
      if (editMode === 'QUOTA') {
          updates.dailyQuota = editQuota;
      } else if (editMode === 'SMTP') {
          updates.smtpConfig = {
              host: editSmtp.host,
              port: parseInt(editSmtp.port),
              user: editSmtp.user,
              pass: editSmtp.pass,
              fromEmail: editSmtp.fromEmail
          };
      }

      try {
          await ApiService.updateUser(editingUser.id, updates);
          closeEditModal();
          toast.success("User updated successfully");
          loadData();
      } catch (e) {
          toast.error("Failed to update user settings");
      }
  };

  const activeUsers = users.filter(u => u.status !== 'PENDING');
  const pendingUsers = users.filter(u => u.status === 'PENDING');

  const chartData = activeUsers.map(u => {
    const userLogs = logs.filter(l => l.userId === u.id);
    return {
      name: u.username,
      sent: userLogs.filter(l => l.status === 'SENT').length,
      failed: userLogs.filter(l => l.status === 'FAILED').length,
    };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground">Manage users and oversee system performance.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="icon" onClick={loadData}>
             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
           </Button>
           <Button onClick={() => setShowAddModal(true)}>
             <UserPlus size={16} className="mr-2" /> Add User
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity size={20} className="text-primary" /> User Activity Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: 'transparent' }}
                />
                <Legend />
                <Bar dataKey="sent" fill="hsl(var(--primary))" name="Sent" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" fill="hsl(var(--destructive))" name="Failed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center gap-4 mb-4">
               <TabsList>
                   <TabsTrigger value="active">Active Users ({activeUsers.length})</TabsTrigger>
                   <TabsTrigger value="pending">
                       Pending Approvals 
                       {pendingUsers.length > 0 && <Badge className="ml-2 bg-orange-500 hover:bg-orange-600">{pendingUsers.length}</Badge>}
                   </TabsTrigger>
               </TabsList>
          </div>

          <TabsContent value="active">
            <Card>
                <CardHeader>
                    <CardTitle>Registered Users</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Username</th>
                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Role</th>
                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Quota</th>
                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Created At</th>
                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeUsers.map((u) => (
                        <tr key={u.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <td className="p-4 align-middle font-medium">{u.username}</td>
                            <td className="p-4 align-middle">
                                <Badge variant={u.role === UserRole.ADMIN ? "default" : "secondary"}>
                                    {u.role === UserRole.ADMIN && <Shield size={12} className="mr-1" />}
                                    {u.role}
                                </Badge>
                            </td>
                            <td className="p-4 align-middle text-muted-foreground">
                                {u.dailyQuota || 100} / day
                            </td>
                            <td className="p-4 align-middle text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 align-middle">
                            {u.role !== UserRole.ADMIN && (
                                <div className="flex gap-2">
                                    {/* Quota Button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditModal(u, 'QUOTA')}
                                        className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                        title="Adjust Limits"
                                    >
                                        <Database size={14} className="mr-1.5"/> Quota
                                    </Button>
                                    {/* SMTP Button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditModal(u, 'SMTP')}
                                        className="h-8 text-xs border-slate-200"
                                        title="Configure SMTP"
                                    >
                                        <Server size={14} className="mr-1.5"/> SMTP
                                    </Button>
                                    <div className="w-px h-8 bg-slate-200 mx-1"></div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteUser(u.id)}
                                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                                        title="Delete User"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            )}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
               <Card>
                <CardHeader>
                    <CardTitle className="text-orange-600 flex items-center gap-2"><Clock size={20}/> Pending Registration Requests</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="h-12 px-4 font-medium text-muted-foreground">Username</th>
                                    <th className="h-12 px-4 font-medium text-muted-foreground">Requested At</th>
                                    <th className="h-12 px-4 font-medium text-muted-foreground text-right">Decision</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingUsers.length === 0 && (
                                    <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No pending requests.</td></tr>
                                )}
                                {pendingUsers.map(u => (
                                    <tr key={u.id} className="border-b">
                                        <td className="p-4 font-medium">{u.username}</td>
                                        <td className="p-4 text-muted-foreground">{new Date(u.createdAt).toLocaleString()}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" onClick={() => handleApproveUser(u)} className="bg-emerald-600 hover:bg-emerald-700">
                                                    <UserCheck size={14} className="mr-2"/> Approve
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleRejectUser(u)}>
                                                    <UserX size={14} className="mr-2"/> Reject
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </CardContent>
               </Card>
          </TabsContent>
      </Tabs>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1000]">
          <Card className="w-full max-w-md shadow-lg border">
            <CardHeader>
              <CardTitle>Add New User</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Username</Label>
                        <Input value={newUserUser} onChange={e => setNewUserUser(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Password</Label>
                        <Input type="password" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} required />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                        <Button type="submit">Create User</Button>
                    </div>
                </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && editMode && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
           <Card className="w-full max-w-lg shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
               <CardHeader className="border-b bg-muted/40 pb-4">
                   <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                             {editMode === 'QUOTA' ? <Database size={18} className="text-primary"/> : <Server size={18} className="text-primary"/>}
                             {editMode === 'QUOTA' ? 'Adjust Quota' : 'SMTP Settings'}: <span className="text-foreground font-normal">{editingUser.username}</span>
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={closeEditModal}><X size={18}/></Button>
                   </div>
               </CardHeader>
               <CardContent className="overflow-y-auto p-6 space-y-6">
                    <form id="editUserForm" onSubmit={handleUpdateUser} className="space-y-6">
                        {editMode === 'QUOTA' && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold uppercase text-muted-foreground border-b pb-1">Limits & Access</h4>
                                <div className="space-y-2">
                                    <Label>Daily Email Quota</Label>
                                    <Input 
                                        type="number" 
                                        min="1" 
                                        value={editQuota} 
                                        onChange={e => setEditQuota(parseInt(e.target.value))} 
                                    />
                                    <p className="text-[10px] text-muted-foreground">Emails allowed per 24 hours.</p>
                                </div>
                            </div>
                        )}

                        {editMode === 'SMTP' && (
                            <div className="space-y-3">
                                 <h4 className="text-sm font-semibold uppercase text-muted-foreground border-b pb-1">SMTP Configuration</h4>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Host</Label>
                                        <Input placeholder="smtp.provider.com" value={editSmtp.host} onChange={e => setEditSmtp({...editSmtp, host: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Port</Label>
                                        <Input placeholder="587" type="number" value={editSmtp.port} onChange={e => setEditSmtp({...editSmtp, port: e.target.value})} />
                                    </div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Username</Label>
                                        <Input value={editSmtp.user} onChange={e => setEditSmtp({...editSmtp, user: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Password</Label>
                                        <Input type="password" value={editSmtp.pass} onChange={e => setEditSmtp({...editSmtp, pass: e.target.value})} />
                                    </div>
                                 </div>
                                 <div className="space-y-2">
                                     <Label>From Email</Label>
                                     <Input type="email" value={editSmtp.fromEmail} onChange={e => setEditSmtp({...editSmtp, fromEmail: e.target.value})} />
                                 </div>
                            </div>
                        )}
                    </form>
               </CardContent>
               <div className="p-4 border-t bg-muted/40 flex justify-end gap-2">
                   <Button variant="outline" onClick={closeEditModal}>Cancel</Button>
                   <Button type="submit" form="editUserForm">
                       <Save size={16} className="mr-2"/> Save Changes
                   </Button>
               </div>
           </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
