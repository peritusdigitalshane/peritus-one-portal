import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useUserOrganization } from './useOrganizations';

export type BenefitType = 'tangible' | 'intangible';
export type InitiativeStatus = 'not_started' | 'in_progress' | 'completed';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface OrgBenefit {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  benefit_type: BenefitType;
  target_percentage: number | null;
  status: InitiativeStatus;
  confidence: ConfidenceLevel;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OrgKeyInitiative {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  progress_percentage: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OrgRoadmapItem {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OrgBusinessObjective {
  id: string;
  organization_id: string;
  title: string;
  subtitle: string | null;
  created_at: string;
  updated_at: string;
}

// Hook for viewing benefits (for org members)
export const useOrgBenefits = (orgId?: string) => {
  const { user, isSuperAdmin } = useAuth();
  const { organization, isOrgAdmin, hasBenefitsAccess, loading: orgLoading } = useUserOrganization();
  const { toast } = useToast();

  const effectiveOrgId = orgId || organization?.id;
  const canEdit = isSuperAdmin || isOrgAdmin;

  const [benefits, setBenefits] = useState<OrgBenefit[]>([]);
  const [initiatives, setInitiatives] = useState<OrgKeyInitiative[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<OrgRoadmapItem[]>([]);
  const [objective, setObjective] = useState<OrgBusinessObjective | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBenefitsData = useCallback(async () => {
    if (!effectiveOrgId) {
      setLoading(false);
      return;
    }

    try {
      const [benefitsRes, initiativesRes, roadmapRes, objectiveRes] = await Promise.all([
        supabase.from('org_benefits').select('*').eq('organization_id', effectiveOrgId).order('sort_order'),
        supabase.from('org_key_initiatives').select('*').eq('organization_id', effectiveOrgId).order('sort_order'),
        supabase.from('org_roadmap_items').select('*').eq('organization_id', effectiveOrgId).order('start_date'),
        supabase.from('org_business_objectives').select('*').eq('organization_id', effectiveOrgId).maybeSingle(),
      ]);

      if (benefitsRes.data) setBenefits(benefitsRes.data as OrgBenefit[]);
      if (initiativesRes.data) setInitiatives(initiativesRes.data as OrgKeyInitiative[]);
      if (roadmapRes.data) setRoadmapItems(roadmapRes.data as OrgRoadmapItem[]);
      if (objectiveRes.data) setObjective(objectiveRes.data as OrgBusinessObjective);
    } catch (error) {
      console.error('Error fetching org benefits data:', error);
    }
    setLoading(false);
  }, [effectiveOrgId]);

  useEffect(() => {
    if (!orgLoading && effectiveOrgId) {
      fetchBenefitsData();
    } else if (!orgLoading) {
      setLoading(false);
    }
  }, [effectiveOrgId, orgLoading, fetchBenefitsData]);

  // CRUD for benefits
  const createBenefit = async (benefit: Omit<OrgBenefit, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
    if (!effectiveOrgId) return null;

    const { data, error } = await supabase
      .from('org_benefits')
      .insert({ ...benefit, organization_id: effectiveOrgId })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create benefit', variant: 'destructive' });
      return null;
    }

    setBenefits(prev => [...prev, data as OrgBenefit]);
    toast({ title: 'Success', description: 'Benefit created' });
    return data;
  };

  const updateBenefit = async (id: string, updates: Partial<OrgBenefit>) => {
    const { error } = await supabase.from('org_benefits').update(updates).eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update benefit', variant: 'destructive' });
      return false;
    }

    setBenefits(prev => prev.map(b => b.id === id ? { ...b, ...updates } as OrgBenefit : b));
    toast({ title: 'Success', description: 'Benefit updated' });
    return true;
  };

  const deleteBenefit = async (id: string) => {
    const { error } = await supabase.from('org_benefits').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete benefit', variant: 'destructive' });
      return false;
    }

    setBenefits(prev => prev.filter(b => b.id !== id));
    toast({ title: 'Success', description: 'Benefit deleted' });
    return true;
  };

  // CRUD for initiatives
  const createInitiative = async (initiative: Omit<OrgKeyInitiative, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
    if (!effectiveOrgId) return null;

    const { data, error } = await supabase
      .from('org_key_initiatives')
      .insert({ ...initiative, organization_id: effectiveOrgId })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create initiative', variant: 'destructive' });
      return null;
    }

    setInitiatives(prev => [...prev, data as OrgKeyInitiative]);
    toast({ title: 'Success', description: 'Initiative created' });
    return data;
  };

  const updateInitiative = async (id: string, updates: Partial<OrgKeyInitiative>) => {
    const { error } = await supabase.from('org_key_initiatives').update(updates).eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update initiative', variant: 'destructive' });
      return false;
    }

    setInitiatives(prev => prev.map(i => i.id === id ? { ...i, ...updates } as OrgKeyInitiative : i));
    return true;
  };

  const deleteInitiative = async (id: string) => {
    const { error } = await supabase.from('org_key_initiatives').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete initiative', variant: 'destructive' });
      return false;
    }

    setInitiatives(prev => prev.filter(i => i.id !== id));
    toast({ title: 'Success', description: 'Initiative deleted' });
    return true;
  };

  // CRUD for roadmap items
  const createRoadmapItem = async (item: Omit<OrgRoadmapItem, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
    if (!effectiveOrgId) return null;

    const { data, error } = await supabase
      .from('org_roadmap_items')
      .insert({ ...item, organization_id: effectiveOrgId })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create roadmap item', variant: 'destructive' });
      return null;
    }

    setRoadmapItems(prev => [...prev, data as OrgRoadmapItem].sort((a, b) =>
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    ));
    toast({ title: 'Success', description: 'Roadmap item created' });
    return data;
  };

  const updateRoadmapItem = async (id: string, updates: Partial<OrgRoadmapItem>) => {
    const { error } = await supabase.from('org_roadmap_items').update(updates).eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update roadmap item', variant: 'destructive' });
      return false;
    }

    setRoadmapItems(prev => prev.map(r => r.id === id ? { ...r, ...updates } as OrgRoadmapItem : r));
    toast({ title: 'Success', description: 'Roadmap item updated' });
    return true;
  };

  const deleteRoadmapItem = async (id: string) => {
    const { error } = await supabase.from('org_roadmap_items').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete roadmap item', variant: 'destructive' });
      return false;
    }

    setRoadmapItems(prev => prev.filter(r => r.id !== id));
    toast({ title: 'Success', description: 'Roadmap item deleted' });
    return true;
  };

  // Update objective
  const updateObjective = async (updates: Partial<OrgBusinessObjective>) => {
    if (!objective) {
      // Create if doesn't exist
      if (!effectiveOrgId) return false;
      const { data, error } = await supabase
        .from('org_business_objectives')
        .insert({ organization_id: effectiveOrgId, ...updates })
        .select()
        .single();

      if (error) {
        toast({ title: 'Error', description: 'Failed to create objective', variant: 'destructive' });
        return false;
      }
      setObjective(data as OrgBusinessObjective);
      toast({ title: 'Success', description: 'Objective created' });
      return true;
    }

    const { error } = await supabase
      .from('org_business_objectives')
      .update(updates)
      .eq('id', objective.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update objective', variant: 'destructive' });
      return false;
    }

    setObjective(prev => prev ? { ...prev, ...updates } : null);
    toast({ title: 'Success', description: 'Objective updated' });
    return true;
  };

  return {
    benefits,
    initiatives,
    roadmapItems,
    objective,
    organization,
    loading: loading || orgLoading,
    canEdit,
    hasBenefitsAccess: isSuperAdmin || hasBenefitsAccess,
    tangibleBenefits: benefits.filter(b => b.benefit_type === 'tangible'),
    intangibleBenefits: benefits.filter(b => b.benefit_type === 'intangible'),
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
    refetch: fetchBenefitsData,
  };
};
