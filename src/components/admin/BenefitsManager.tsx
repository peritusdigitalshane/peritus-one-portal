import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Loader2, Target, TrendingUp, CheckCircle, Calendar, Users } from "lucide-react";
import { useBenefits, useBenefitsAccess, type Benefit, type KeyInitiative, type RoadmapItem, type BenefitType, type InitiativeStatus, type ConfidenceLevel } from "@/hooks/useBenefits";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
}

export const BenefitsManager = () => {
  const {
    benefits,
    initiatives,
    roadmapItems,
    objective,
    createBenefit,
    updateBenefit,
    deleteBenefit,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    createRoadmapItem,
    updateRoadmapItem,
    deleteRoadmapItem,
    updateObjective,
    refetch,
  } = useBenefits();

  const { usersWithAccess, grantAccess, revokeAccess, refetch: refetchAccess } = useBenefitsAccess();

  // State for dialogs
  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false);
  const [initiativeDialogOpen, setInitiativeDialogOpen] = useState(false);
  const [roadmapDialogOpen, setRoadmapDialogOpen] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [objectiveDialogOpen, setObjectiveDialogOpen] = useState(false);

  // Edit state
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  const [editingInitiative, setEditingInitiative] = useState<KeyInitiative | null>(null);
  const [editingRoadmap, setEditingRoadmap] = useState<RoadmapItem | null>(null);

  // Form state
  const [benefitForm, setBenefitForm] = useState({
    name: '',
    description: '',
    benefit_type: 'tangible' as BenefitType,
    target_percentage: 0,
    status: 'not_started' as InitiativeStatus,
    confidence: 'medium' as ConfidenceLevel,
    sort_order: 0,
  });

  const [initiativeForm, setInitiativeForm] = useState({
    name: '',
    description: '',
    is_completed: false,
    progress_percentage: 0,
    sort_order: 0,
  });

  const [roadmapForm, setRoadmapForm] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    color: '#3B82F6',
    sort_order: 0,
  });

  const [objectiveForm, setObjectiveForm] = useState({
    title: '',
    subtitle: '',
  });

  // Users for access management
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load all users for access dialog
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

    if (accessDialogOpen) {
      loadUsers();
    }
  }, [accessDialogOpen]);

  // Populate objective form
  useEffect(() => {
    if (objective) {
      setObjectiveForm({
        title: objective.title,
        subtitle: objective.subtitle || '',
      });
    }
  }, [objective]);

  const resetBenefitForm = () => {
    setBenefitForm({
      name: '',
      description: '',
      benefit_type: 'tangible',
      target_percentage: 0,
      status: 'not_started',
      confidence: 'medium',
      sort_order: 0,
    });
    setEditingBenefit(null);
  };

  const resetInitiativeForm = () => {
    setInitiativeForm({
      name: '',
      description: '',
      is_completed: false,
      progress_percentage: 0,
      sort_order: 0,
    });
    setEditingInitiative(null);
  };

  const resetRoadmapForm = () => {
    setRoadmapForm({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      color: '#3B82F6',
      sort_order: 0,
    });
    setEditingRoadmap(null);
  };

  const handleEditBenefit = (benefit: Benefit) => {
    setEditingBenefit(benefit);
    setBenefitForm({
      name: benefit.name,
      description: benefit.description || '',
      benefit_type: benefit.benefit_type,
      target_percentage: benefit.target_percentage || 0,
      status: benefit.status,
      confidence: benefit.confidence,
      sort_order: benefit.sort_order,
    });
    setBenefitDialogOpen(true);
  };

  const handleEditInitiative = (initiative: KeyInitiative) => {
    setEditingInitiative(initiative);
    setInitiativeForm({
      name: initiative.name,
      description: initiative.description || '',
      is_completed: initiative.is_completed,
      progress_percentage: initiative.progress_percentage || 0,
      sort_order: initiative.sort_order,
    });
    setInitiativeDialogOpen(true);
  };

  const handleEditRoadmap = (item: RoadmapItem) => {
    setEditingRoadmap(item);
    setRoadmapForm({
      name: item.name,
      description: item.description || '',
      start_date: item.start_date,
      end_date: item.end_date,
      color: item.color,
      sort_order: item.sort_order,
    });
    setRoadmapDialogOpen(true);
  };

  const handleSaveBenefit = async () => {
    setSaving(true);
    if (editingBenefit) {
      await updateBenefit(editingBenefit.id, benefitForm);
    } else {
      await createBenefit(benefitForm);
    }
    setSaving(false);
    setBenefitDialogOpen(false);
    resetBenefitForm();
  };

  const handleSaveInitiative = async () => {
    setSaving(true);
    const data = {
      ...initiativeForm,
      completed_at: initiativeForm.is_completed ? new Date().toISOString() : null,
    };
    if (editingInitiative) {
      await updateInitiative(editingInitiative.id, data);
    } else {
      await createInitiative(data);
    }
    setSaving(false);
    setInitiativeDialogOpen(false);
    resetInitiativeForm();
  };

  const handleSaveRoadmap = async () => {
    setSaving(true);
    if (editingRoadmap) {
      await updateRoadmapItem(editingRoadmap.id, roadmapForm);
    } else {
      await createRoadmapItem(roadmapForm);
    }
    setSaving(false);
    setRoadmapDialogOpen(false);
    resetRoadmapForm();
  };

  const handleSaveObjective = async () => {
    setSaving(true);
    await updateObjective(objectiveForm);
    setSaving(false);
    setObjectiveDialogOpen(false);
  };

  const handleGrantAccess = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    await grantAccess(selectedUserId);
    setSelectedUserId('');
    setSaving(false);
  };

  const usersWithoutAccess = allUsers.filter(
    u => !usersWithAccess.some(a => a.user_id === u.id)
  );

  return (
    <div className="space-y-6">
      {/* Business Objective Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Business Objective</CardTitle>
            <CardDescription>The main objective displayed on the benefits dashboard</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setObjectiveDialogOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-muted/50">
            <h3 className="font-semibold text-lg">{objective?.title || 'No objective set'}</h3>
            <p className="text-muted-foreground">{objective?.subtitle || 'No subtitle'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="benefits" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="benefits" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Benefits
          </TabsTrigger>
          <TabsTrigger value="initiatives" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Initiatives
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Roadmap
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Access
          </TabsTrigger>
        </TabsList>

        {/* Benefits Tab */}
        <TabsContent value="benefits">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Benefits</CardTitle>
                <CardDescription>Manage tangible and intangible benefits</CardDescription>
              </div>
              <Button onClick={() => { resetBenefitForm(); setBenefitDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Benefit
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benefits.map((benefit) => (
                    <TableRow key={benefit.id}>
                      <TableCell className="font-medium">{benefit.name}</TableCell>
                      <TableCell>
                        <Badge variant={benefit.benefit_type === 'tangible' ? 'default' : 'secondary'}>
                          {benefit.benefit_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {benefit.benefit_type === 'tangible' 
                          ? `${benefit.target_percentage}%`
                          : benefit.confidence
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{benefit.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditBenefit(benefit)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteBenefit(benefit.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {benefits.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No benefits added yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Initiatives Tab */}
        <TabsContent value="initiatives">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Key Initiatives</CardTitle>
                <CardDescription>Manage the key initiatives checklist</CardDescription>
              </div>
              <Button onClick={() => { resetInitiativeForm(); setInitiativeDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Initiative
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed At</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initiatives.map((initiative) => (
                    <TableRow key={initiative.id}>
                      <TableCell className="font-medium">{initiative.name}</TableCell>
                      <TableCell>
                        <Badge variant={initiative.is_completed ? 'default' : 'outline'}>
                          {initiative.is_completed ? 'Completed' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {initiative.completed_at 
                          ? new Date(initiative.completed_at).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditInitiative(initiative)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteInitiative(initiative.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {initiatives.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No initiatives added yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roadmap Tab */}
        <TabsContent value="roadmap">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Roadmap</CardTitle>
                <CardDescription>Manage the timeline roadmap items</CardDescription>
              </div>
              <Button onClick={() => { resetRoadmapForm(); setRoadmapDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Roadmap Item
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roadmapItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{new Date(item.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(item.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-muted-foreground">{item.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditRoadmap(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteRoadmapItem(item.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {roadmapItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No roadmap items added yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Tab */}
        <TabsContent value="access">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Access</CardTitle>
                <CardDescription>Manage which users can view the Benefits module</CardDescription>
              </div>
              <Button onClick={() => setAccessDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Grant Access
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Granted At</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersWithAccess.map((access) => (
                    <TableRow key={access.id}>
                      <TableCell className="font-medium">{access.full_name || 'Unknown'}</TableCell>
                      <TableCell>{access.email}</TableCell>
                      <TableCell>{new Date(access.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => revokeAccess(access.user_id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {usersWithAccess.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No users have access yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Benefit Dialog */}
      <Dialog open={benefitDialogOpen} onOpenChange={setBenefitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBenefit ? 'Edit Benefit' : 'Add Benefit'}</DialogTitle>
            <DialogDescription>
              {editingBenefit ? 'Update the benefit details' : 'Create a new benefit'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={benefitForm.name}
                onChange={(e) => setBenefitForm({ ...benefitForm, name: e.target.value })}
                placeholder="e.g., Reduced Downtime"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={benefitForm.description}
                onChange={(e) => setBenefitForm({ ...benefitForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={benefitForm.benefit_type}
                onValueChange={(v) => setBenefitForm({ ...benefitForm, benefit_type: v as BenefitType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tangible">Tangible</SelectItem>
                  <SelectItem value="intangible">Intangible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {benefitForm.benefit_type === 'tangible' && (
              <div>
                <Label>Target Percentage (0-100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={benefitForm.target_percentage}
                  onChange={(e) => setBenefitForm({ ...benefitForm, target_percentage: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}
            {benefitForm.benefit_type === 'intangible' && (
              <>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={benefitForm.status}
                    onValueChange={(v) => setBenefitForm({ ...benefitForm, status: v as InitiativeStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Confidence Level</Label>
                  <Select
                    value={benefitForm.confidence}
                    onValueChange={(v) => setBenefitForm({ ...benefitForm, confidence: v as ConfidenceLevel })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={benefitForm.sort_order}
                onChange={(e) => setBenefitForm({ ...benefitForm, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenefitDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBenefit} disabled={saving || !benefitForm.name}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Initiative Dialog */}
      <Dialog open={initiativeDialogOpen} onOpenChange={setInitiativeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingInitiative ? 'Edit Initiative' : 'Add Initiative'}</DialogTitle>
            <DialogDescription>
              {editingInitiative ? 'Update the initiative details' : 'Create a new initiative'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={initiativeForm.name}
                onChange={(e) => setInitiativeForm({ ...initiativeForm, name: e.target.value })}
                placeholder="e.g., Cache/W3 Cache Fix"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={initiativeForm.description}
                onChange={(e) => setInitiativeForm({ ...initiativeForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label>Progress (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={initiativeForm.progress_percentage}
                onChange={(e) => setInitiativeForm({ ...initiativeForm, progress_percentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                placeholder="0-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_completed"
                checked={initiativeForm.is_completed}
                onCheckedChange={(checked) => setInitiativeForm({ ...initiativeForm, is_completed: !!checked, progress_percentage: checked ? 100 : initiativeForm.progress_percentage })}
              />
              <Label htmlFor="is_completed">Completed</Label>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={initiativeForm.sort_order}
                onChange={(e) => setInitiativeForm({ ...initiativeForm, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInitiativeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveInitiative} disabled={saving || !initiativeForm.name}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roadmap Dialog */}
      <Dialog open={roadmapDialogOpen} onOpenChange={setRoadmapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoadmap ? 'Edit Roadmap Item' : 'Add Roadmap Item'}</DialogTitle>
            <DialogDescription>
              {editingRoadmap ? 'Update the roadmap item details' : 'Create a new roadmap item'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={roadmapForm.name}
                onChange={(e) => setRoadmapForm({ ...roadmapForm, name: e.target.value })}
                placeholder="e.g., Cache Update"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={roadmapForm.description}
                onChange={(e) => setRoadmapForm({ ...roadmapForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={roadmapForm.start_date}
                  onChange={(e) => setRoadmapForm({ ...roadmapForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={roadmapForm.end_date}
                  onChange={(e) => setRoadmapForm({ ...roadmapForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={roadmapForm.color}
                  onChange={(e) => setRoadmapForm({ ...roadmapForm, color: e.target.value })}
                  className="w-14 h-10 p-1"
                />
                <Input
                  value={roadmapForm.color}
                  onChange={(e) => setRoadmapForm({ ...roadmapForm, color: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoadmapDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveRoadmap} 
              disabled={saving || !roadmapForm.name || !roadmapForm.start_date || !roadmapForm.end_date}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Dialog */}
      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Access</DialogTitle>
            <DialogDescription>
              Select a user to grant access to the Benefits module
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {usersWithoutAccess.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email} ({user.email})
                    </SelectItem>
                  ))}
                  {usersWithoutAccess.length === 0 && (
                    <SelectItem value="none" disabled>
                      All users already have access
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGrantAccess} disabled={saving || !selectedUserId}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Objective Dialog */}
      <Dialog open={objectiveDialogOpen} onOpenChange={setObjectiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Business Objective</DialogTitle>
            <DialogDescription>
              Update the main business objective displayed on the dashboard
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={objectiveForm.title}
                onChange={(e) => setObjectiveForm({ ...objectiveForm, title: e.target.value })}
                placeholder="e.g., High-Performing, Secure, and User-Friendly Website"
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input
                value={objectiveForm.subtitle}
                onChange={(e) => setObjectiveForm({ ...objectiveForm, subtitle: e.target.value })}
                placeholder="e.g., Tracking Tangible & Intangible Benefits for ORS"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObjectiveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveObjective} disabled={saving || !objectiveForm.title}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
