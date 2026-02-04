import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Loader2, Target, CheckCircle, Calendar, ArrowLeft } from "lucide-react";
import { useOrgBenefits, type OrgBenefit, type OrgKeyInitiative, type OrgRoadmapItem, type BenefitType, type InitiativeStatus, type ConfidenceLevel } from "@/hooks/useOrgBenefits";
import { supabase } from "@/integrations/supabase/client";

interface OrgBenefitsManagerProps {
  organizationId: string;
  organizationName?: string;
}

export const OrgBenefitsManager = ({ organizationId, organizationName }: OrgBenefitsManagerProps) => {
  const navigate = useNavigate();
  const {
    benefits,
    initiatives,
    roadmapItems,
    objective,
    loading,
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
  } = useOrgBenefits(organizationId);

  // Dialog states
  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false);
  const [initiativeDialogOpen, setInitiativeDialogOpen] = useState(false);
  const [roadmapDialogOpen, setRoadmapDialogOpen] = useState(false);
  const [objectiveDialogOpen, setObjectiveDialogOpen] = useState(false);

  // Edit states
  const [editingBenefit, setEditingBenefit] = useState<OrgBenefit | null>(null);
  const [editingInitiative, setEditingInitiative] = useState<OrgKeyInitiative | null>(null);
  const [editingRoadmap, setEditingRoadmap] = useState<OrgRoadmapItem | null>(null);

  // Form states
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

  const [saving, setSaving] = useState(false);

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

  const handleEditBenefit = (benefit: OrgBenefit) => {
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

  const handleEditInitiative = (initiative: OrgKeyInitiative) => {
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

  const handleEditRoadmap = (item: OrgRoadmapItem) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/benefits')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Benefits Management</h2>
          {organizationName && (
            <p className="text-muted-foreground">{organizationName}</p>
          )}
        </div>
      </div>

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

      {/* Tabs */}
      <Tabs defaultValue="benefits" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
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
                          : benefit.confidence}
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
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initiatives.map((initiative) => (
                    <TableRow key={initiative.id}>
                      <TableCell className="font-medium">{initiative.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={initiative.progress_percentage || 0} className="w-20 h-2" />
                          <span className="text-sm text-muted-foreground">
                            {initiative.progress_percentage || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={initiative.is_completed ? 'default' : 'outline'}>
                          {initiative.is_completed ? 'Completed' : 'In Progress'}
                        </Badge>
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
      </Tabs>

      {/* Benefit Dialog */}
      <Dialog open={benefitDialogOpen} onOpenChange={setBenefitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBenefit ? 'Edit Benefit' : 'Add Benefit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={benefitForm.name}
                onChange={(e) => setBenefitForm({ ...benefitForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={benefitForm.description}
                onChange={(e) => setBenefitForm({ ...benefitForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
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
              <div className="space-y-2">
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
            </div>
            {benefitForm.benefit_type === 'tangible' ? (
              <div className="space-y-2">
                <Label>Target Percentage</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={benefitForm.target_percentage}
                  onChange={(e) => setBenefitForm({ ...benefitForm, target_percentage: parseInt(e.target.value) || 0 })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Confidence</Label>
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
            )}
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
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={initiativeForm.name}
                onChange={(e) => setInitiativeForm({ ...initiativeForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={initiativeForm.description}
                onChange={(e) => setInitiativeForm({ ...initiativeForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Progress Percentage</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={initiativeForm.progress_percentage}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setInitiativeForm({
                    ...initiativeForm,
                    progress_percentage: val,
                    is_completed: val >= 100,
                  });
                }}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_completed"
                checked={initiativeForm.is_completed}
                onCheckedChange={(checked) => setInitiativeForm({
                  ...initiativeForm,
                  is_completed: !!checked,
                  progress_percentage: checked ? 100 : initiativeForm.progress_percentage,
                })}
              />
              <Label htmlFor="is_completed">Mark as Completed</Label>
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
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={roadmapForm.name}
                onChange={(e) => setRoadmapForm({ ...roadmapForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={roadmapForm.description}
                onChange={(e) => setRoadmapForm({ ...roadmapForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={roadmapForm.start_date}
                  onChange={(e) => setRoadmapForm({ ...roadmapForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={roadmapForm.end_date}
                  onChange={(e) => setRoadmapForm({ ...roadmapForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={roadmapForm.color}
                  onChange={(e) => setRoadmapForm({ ...roadmapForm, color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={roadmapForm.color}
                  onChange={(e) => setRoadmapForm({ ...roadmapForm, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoadmapDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRoadmap} disabled={saving || !roadmapForm.name || !roadmapForm.start_date || !roadmapForm.end_date}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Objective Dialog */}
      <Dialog open={objectiveDialogOpen} onOpenChange={setObjectiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Business Objective</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={objectiveForm.title}
                onChange={(e) => setObjectiveForm({ ...objectiveForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={objectiveForm.subtitle}
                onChange={(e) => setObjectiveForm({ ...objectiveForm, subtitle: e.target.value })}
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
