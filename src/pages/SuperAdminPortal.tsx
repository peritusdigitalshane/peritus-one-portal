import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PriceBookManager from "@/components/admin/PriceBookManager";
import ProductAssignmentManager from "@/components/admin/ProductAssignmentManager";
import { PendingOrdersManager } from "@/components/admin/PendingOrdersManager";
import { TicketManagement } from "@/components/admin/TicketManagement";
import { 
  Shield, 
  Users, 
  Settings, 
  LogOut, 
  Loader2,
  UserCog,
  Activity,
  Database,
  Bell,
  Key,
  Eye,
  EyeOff,
  Save,
  Check,
  Plus,
  Minus,
  Headphones
} from "lucide-react";

type AppRole = 'super_admin' | 'admin' | 'user' | 'support_user';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: string[];
}

interface ApiKey {
  name: string;
  key: string;
  envVar: string;
}

const SuperAdminPortal = () => {
  const { user, loading, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    { name: "Stripe Secret Key", key: "", envVar: "STRIPE_SECRET_KEY" },
  ]);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});

  // Role management state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');
  const [savingRole, setSavingRole] = useState(false);

  // Refs for scrolling
  const usersTableRef = { current: null as HTMLDivElement | null };
  const apiKeysRef = { current: null as HTMLDivElement | null };

  const scrollToUsers = () => {
    document.getElementById('users-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSettings = () => {
    document.getElementById('api-keys-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleApiKeyChange = (envVar: string, value: string) => {
    setApiKeys(prev => 
      prev.map(k => k.envVar === envVar ? { ...k, key: value } : k)
    );
    setSavedKeys(prev => ({ ...prev, [envVar]: false }));
  };

  const handleSaveApiKey = async (envVar: string) => {
    const apiKey = apiKeys.find(k => k.envVar === envVar);
    if (!apiKey?.key) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setSavingKey(envVar);
    
    try {
      // Store in admin_settings table
      const { error } = await supabase
        .from('admin_settings')
        .upsert(
          { key: envVar, value: apiKey.key, encrypted: true },
          { onConflict: 'key' }
        );

      if (error) throw error;

      setSavedKeys(prev => ({ ...prev, [envVar]: true }));
      toast({
        title: "API Key Saved",
        description: `${apiKey.name} has been saved securely.`,
      });
    } catch (error) {
      console.error('Error saving API key:', error);
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setSavingKey(null);
    }
  };

  const toggleShowKey = (envVar: string) => {
    setShowKeys(prev => ({ ...prev, [envVar]: !prev[envVar] }));
  };

  // Load saved keys on mount
  useEffect(() => {
    const loadSavedKeys = async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', apiKeys.map(k => k.envVar));

      if (error) {
        console.error('Error loading API keys:', error);
        return;
      }

      if (data && data.length > 0) {
        const updated = apiKeys.map(k => {
          const setting = data.find(d => d.key === k.envVar);
          if (setting?.value) {
            setSavedKeys(prev => ({ ...prev, [k.envVar]: true }));
            return { ...k, key: setting.value };
          }
          return k;
        });
        setApiKeys(updated);
      }
    };
    
    if (isSuperAdmin) {
      loadSavedKeys();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (!loading && user && !isSuperAdmin) {
      navigate("/dashboard");
    }
  }, [user, loading, isSuperAdmin, navigate]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!isSuperAdmin) return;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setLoadingUsers(false);
        return;
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      const usersWithRoles = profiles?.map((profile) => ({
        id: profile.id,
        email: profile.email || '',
        full_name: profile.full_name || '',
        created_at: profile.created_at,
        roles: roles?.filter((r) => r.user_id === profile.id).map((r) => r.role) || [],
      })) || [];

      setUsers(usersWithRoles);
      setLoadingUsers(false);
    };

    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleOpenRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleAddRole = async () => {
    if (!selectedUser || !selectedRole) return;
    
    // Check if user already has this role
    if (selectedUser.roles.includes(selectedRole)) {
      toast({
        title: "Role Already Assigned",
        description: `${selectedUser.full_name || selectedUser.email} already has the ${selectedRole} role.`,
        variant: "destructive",
      });
      return;
    }

    setSavingRole(true);
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: selectedUser.id, role: selectedRole });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add role",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Role Added",
        description: `Added ${selectedRole} role to ${selectedUser.full_name || selectedUser.email}`,
      });
      // Refresh users
      const { data: roles } = await supabase.from('user_roles').select('*');
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id 
          ? { ...u, roles: roles?.filter(r => r.user_id === u.id).map(r => r.role) || [] }
          : u
      ));
      setSelectedUser(prev => prev ? { ...prev, roles: [...prev.roles, selectedRole] } : null);
    }
    setSavingRole(false);
  };

  const handleRemoveRole = async (role: string) => {
    if (!selectedUser) return;
    
    // Prevent removing the last super_admin
    if (role === 'super_admin') {
      const superAdminCount = users.filter(u => u.roles.includes('super_admin')).length;
      if (superAdminCount <= 1) {
        toast({
          title: "Cannot Remove Role",
          description: "Cannot remove the last super admin.",
          variant: "destructive",
        });
        return;
      }
    }

    setSavingRole(true);
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', selectedUser.id)
      .eq('role', role as AppRole);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Role Removed",
        description: `Removed ${role} role from ${selectedUser.full_name || selectedUser.email}`,
      });
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id 
          ? { ...u, roles: u.roles.filter(r => r !== role) }
          : u
      ));
      setSelectedUser(prev => prev ? { ...prev, roles: prev.roles.filter(r => r !== role) } : null);
    }
    setSavingRole(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  const stats = [
    { label: "Total Users", value: users.length, icon: Users, color: "text-blue-500" },
    { label: "Super Admins", value: users.filter(u => u.roles.includes('super_admin')).length, icon: Shield, color: "text-red-500" },
    { label: "Admins", value: users.filter(u => u.roles.includes('admin')).length, icon: UserCog, color: "text-amber-500" },
    { label: "Regular Users", value: users.filter(u => u.roles.includes('user') && !u.roles.includes('admin') && !u.roles.includes('super_admin')).length, icon: Activity, color: "text-green-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-foreground">Super Admin Portal</h1>
              <p className="text-xs text-muted-foreground">Peritus ONE Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Welcome, Super Admin
          </h2>
          <p className="text-muted-foreground">
            Manage users, roles, and system settings from this portal.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-10 h-10 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={scrollToUsers}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                User Management
              </CardTitle>
              <CardDescription>Add, edit, or remove user accounts</CardDescription>
            </CardHeader>
          </Card>
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={scrollToUsers}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Role Management
              </CardTitle>
              <CardDescription>Assign and manage user roles</CardDescription>
            </CardHeader>
          </Card>
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/super-admin/tickets')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-primary" />
                Ticket Management
              </CardTitle>
              <CardDescription>Manage support tickets and SLAs</CardDescription>
            </CardHeader>
          </Card>
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/super-admin/purchases')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Purchase Management
              </CardTitle>
              <CardDescription>View and fulfill customer orders</CardDescription>
            </CardHeader>
          </Card>
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={scrollToSettings}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                System Settings
              </CardTitle>
              <CardDescription>Configure system-wide settings</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* API Keys Section */}
        <Card id="api-keys-section" className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              API Keys
            </CardTitle>
            <CardDescription>
              Manage API keys for external service integrations. These keys are securely stored and only visible to super admins.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.envVar} className="space-y-2">
                <Label htmlFor={apiKey.envVar} className="flex items-center gap-2">
                  {apiKey.name}
                  {savedKeys[apiKey.envVar] && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <Check className="w-3 h-3 mr-1" />
                      Saved
                    </Badge>
                  )}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id={apiKey.envVar}
                      type={showKeys[apiKey.envVar] ? "text" : "password"}
                      value={apiKey.key}
                      onChange={(e) => handleApiKeyChange(apiKey.envVar, e.target.value)}
                      placeholder={`Enter your ${apiKey.name.toLowerCase()}...`}
                      className="pr-10 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => toggleShowKey(apiKey.envVar)}
                    >
                      {showKeys[apiKey.envVar] ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleSaveApiKey(apiKey.envVar)}
                    disabled={savingKey === apiKey.envVar || !apiKey.key}
                  >
                    {savingKey === apiKey.envVar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Environment variable: <code className="bg-muted px-1 py-0.5 rounded">{apiKey.envVar}</code>
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Price Book Manager */}
        <div className="mb-8">
          <PriceBookManager />
        </div>

        {/* Product Assignments */}
        <div className="mb-8">
          <ProductAssignmentManager />
        </div>

        {/* Pending Orders */}
        <div className="mb-8">
          <PendingOrdersManager />
        </div>


        {/* Users Table */}
        <Card id="users-section">
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>View and manage all registered users</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found. Create your first user account to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'No name'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.roles.map((role) => (
                            <Badge 
                              key={role} 
                              variant={
                                role === 'super_admin' ? 'destructive' : 
                                role === 'admin' ? 'default' : 
                                'secondary'
                              }
                            >
                              {role.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenRoleDialog(user)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Role Management Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
            <DialogDescription>
              Manage roles for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Current Roles */}
            <div className="space-y-2">
              <Label>Current Roles</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUser?.roles.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No roles assigned</span>
                ) : (
                  selectedUser?.roles.map((role) => (
                    <Badge 
                      key={role} 
                      variant={
                        role === 'super_admin' ? 'destructive' : 
                        role === 'admin' ? 'default' : 
                        'secondary'
                      }
                      className="flex items-center gap-1"
                    >
                      {role.replace('_', ' ')}
                      <button
                        onClick={() => handleRemoveRole(role)}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                        disabled={savingRole}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Add Role */}
            <div className="space-y-2">
              <Label>Add Role</Label>
              <div className="flex gap-2">
                <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as AppRole)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="support_user">Support User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddRole} disabled={savingRole}>
                  {savingRole ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminPortal;
