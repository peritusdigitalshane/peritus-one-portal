import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Users, Building2, Loader2, Target } from "lucide-react";
import { useOrganizations, useOrganizationMembers, type Organization } from "@/hooks/useOrganizations";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
}

export const OrganizationsManager = () => {
  const navigate = useNavigate();
  const {
    organizations,
    loading,
    createOrganization,
    updateOrganization,
    toggleBenefitsEnabled,
    deleteOrganization,
  } = useOrganizations();

  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const { members, addMember, updateMemberRole, removeMember, loading: membersLoading } = useOrganizationMembers(selectedOrg?.id || null);

  // Dialog states
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Form states
  const [orgForm, setOrgForm] = useState({ name: '', slug: '' });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member'>('member');

  // Users for member dialog
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load users when member dialog opens
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');

      if (!error && data) {
        setAllUsers(data);
      }
      setLoadingUsers(false);
    };

    if (memberDialogOpen) {
      loadUsers();
    }
  }, [memberDialogOpen]);

  const resetOrgForm = () => {
    setOrgForm({ name: '', slug: '' });
    setEditingOrg(null);
  };

  const handleEditOrg = (org: Organization) => {
    setEditingOrg(org);
    setOrgForm({ name: org.name, slug: org.slug });
    setOrgDialogOpen(true);
  };

  const handleSaveOrg = async () => {
    setSaving(true);
    if (editingOrg) {
      await updateOrganization(editingOrg.id, orgForm);
    } else {
      await createOrganization(orgForm.name, orgForm.slug);
    }
    setSaving(false);
    setOrgDialogOpen(false);
    resetOrgForm();
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    await addMember(selectedUserId, selectedRole);
    setSelectedUserId('');
    setSelectedRole('member');
    setSaving(false);
  };

  const usersNotInOrg = allUsers.filter(
    u => !members.some(m => m.user_id === u.id)
  );

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organizations List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organizations
            </CardTitle>
            <CardDescription>Manage customer organizations and their Benefits access</CardDescription>
          </div>
          <Button onClick={() => { resetOrgForm(); setOrgDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Organization
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Benefits Enabled</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell className="text-muted-foreground">{org.slug}</TableCell>
                  <TableCell>
                    <Switch
                      checked={org.benefits_enabled}
                      onCheckedChange={(checked) => toggleBenefitsEnabled(org.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedOrg(org); setMemberDialogOpen(true); }}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Manage
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/admin/benefits/${org.id}`)}
                        title="Manage Benefits Data"
                      >
                        <Target className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditOrg(org)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteOrganization(org.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {organizations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No organizations yet. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Organization Dialog */}
      <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrg ? 'Edit Organization' : 'Create Organization'}</DialogTitle>
            <DialogDescription>
              {editingOrg ? 'Update organization details' : 'Add a new customer organization'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                value={orgForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setOrgForm({
                    name,
                    slug: editingOrg ? orgForm.slug : generateSlug(name),
                  });
                }}
                placeholder="Acme Corporation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                value={orgForm.slug}
                onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value })}
                placeholder="acme-corporation"
              />
              <p className="text-xs text-muted-foreground">URL-friendly identifier (auto-generated from name)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveOrg} disabled={saving || !orgForm.name || !orgForm.slug}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingOrg ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Members - {selectedOrg?.name}</DialogTitle>
            <DialogDescription>
              Add or remove users from this organization
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add Member Form */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label>Add User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingUsers ? (
                      <SelectItem value="" disabled>Loading...</SelectItem>
                    ) : usersNotInOrg.length === 0 ? (
                      <SelectItem value="" disabled>No available users</SelectItem>
                    ) : (
                      usersNotInOrg.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email} {user.full_name && `(${user.full_name})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32 space-y-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'admin' | 'member')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddMember} disabled={!selectedUserId || saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add
              </Button>
            </div>

            {/* Members List */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No members yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{member.email}</p>
                            {member.full_name && (
                              <p className="text-sm text-muted-foreground">{member.full_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={member.role}
                            onValueChange={(v) => updateMemberRole(member.id, v as 'admin' | 'member')}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeMember(member.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
