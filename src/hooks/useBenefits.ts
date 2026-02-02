import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type BenefitType = 'tangible' | 'intangible';
export type InitiativeStatus = 'not_started' | 'in_progress' | 'completed';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface Benefit {
  id: string;
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

export interface KeyInitiative {
  id: string;
  name: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RoadmapItem {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessObjective {
  id: string;
  title: string;
  subtitle: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserBenefitsAccess {
  id: string;
  user_id: string;
  granted_by: string;
  created_at: string;
}

export const useBenefits = () => {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [initiatives, setInitiatives] = useState<KeyInitiative[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [objective, setObjective] = useState<BusinessObjective | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has access to benefits module
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Super admins always have access
      if (isSuperAdmin) {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_benefits_access')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking benefits access:', error);
      }

      setHasAccess(!!data);
      setLoading(false);
    };

    checkAccess();
  }, [user, isSuperAdmin]);

  // Fetch all benefits data
  const fetchBenefitsData = async () => {
    if (!hasAccess && !isSuperAdmin) return;

    try {
      const [benefitsRes, initiativesRes, roadmapRes, objectiveRes] = await Promise.all([
        supabase.from('benefits').select('*').order('sort_order'),
        supabase.from('key_initiatives').select('*').order('sort_order'),
        supabase.from('roadmap_items').select('*').order('start_date'),
        supabase.from('business_objective').select('*').limit(1).single(),
      ]);

      if (benefitsRes.data) setBenefits(benefitsRes.data as Benefit[]);
      if (initiativesRes.data) setInitiatives(initiativesRes.data as KeyInitiative[]);
      if (roadmapRes.data) setRoadmapItems(roadmapRes.data as RoadmapItem[]);
      if (objectiveRes.data) setObjective(objectiveRes.data as BusinessObjective);
    } catch (error) {
      console.error('Error fetching benefits data:', error);
    }
  };

  useEffect(() => {
    if (hasAccess || isSuperAdmin) {
      fetchBenefitsData();
    }
  }, [hasAccess, isSuperAdmin]);

  // CRUD operations for benefits
  const createBenefit = async (benefit: Omit<Benefit, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('benefits')
      .insert(benefit)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create benefit', variant: 'destructive' });
      return null;
    }

    setBenefits(prev => [...prev, data as Benefit]);
    toast({ title: 'Success', description: 'Benefit created successfully' });
    return data;
  };

  const updateBenefit = async (id: string, updates: Partial<Benefit>) => {
    const { error } = await supabase
      .from('benefits')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update benefit', variant: 'destructive' });
      return false;
    }

    setBenefits(prev => prev.map(b => b.id === id ? { ...b, ...updates } as Benefit : b));
    toast({ title: 'Success', description: 'Benefit updated successfully' });
    return true;
  };

  const deleteBenefit = async (id: string) => {
    const { error } = await supabase.from('benefits').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete benefit', variant: 'destructive' });
      return false;
    }

    setBenefits(prev => prev.filter(b => b.id !== id));
    toast({ title: 'Success', description: 'Benefit deleted successfully' });
    return true;
  };

  // CRUD operations for initiatives
  const createInitiative = async (initiative: Omit<KeyInitiative, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('key_initiatives')
      .insert(initiative)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create initiative', variant: 'destructive' });
      return null;
    }

    setInitiatives(prev => [...prev, data as KeyInitiative]);
    toast({ title: 'Success', description: 'Initiative created successfully' });
    return data;
  };

  const updateInitiative = async (id: string, updates: Partial<KeyInitiative>) => {
    const { error } = await supabase
      .from('key_initiatives')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update initiative', variant: 'destructive' });
      return false;
    }

    setInitiatives(prev => prev.map(i => i.id === id ? { ...i, ...updates } as KeyInitiative : i));
    return true;
  };

  const deleteInitiative = async (id: string) => {
    const { error } = await supabase.from('key_initiatives').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete initiative', variant: 'destructive' });
      return false;
    }

    setInitiatives(prev => prev.filter(i => i.id !== id));
    toast({ title: 'Success', description: 'Initiative deleted successfully' });
    return true;
  };

  // CRUD operations for roadmap items
  const createRoadmapItem = async (item: Omit<RoadmapItem, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('roadmap_items')
      .insert(item)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create roadmap item', variant: 'destructive' });
      return null;
    }

    setRoadmapItems(prev => [...prev, data as RoadmapItem].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    ));
    toast({ title: 'Success', description: 'Roadmap item created successfully' });
    return data;
  };

  const updateRoadmapItem = async (id: string, updates: Partial<RoadmapItem>) => {
    const { error } = await supabase
      .from('roadmap_items')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update roadmap item', variant: 'destructive' });
      return false;
    }

    setRoadmapItems(prev => prev.map(r => r.id === id ? { ...r, ...updates } as RoadmapItem : r));
    toast({ title: 'Success', description: 'Roadmap item updated successfully' });
    return true;
  };

  const deleteRoadmapItem = async (id: string) => {
    const { error } = await supabase.from('roadmap_items').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete roadmap item', variant: 'destructive' });
      return false;
    }

    setRoadmapItems(prev => prev.filter(r => r.id !== id));
    toast({ title: 'Success', description: 'Roadmap item deleted successfully' });
    return true;
  };

  // Update business objective
  const updateObjective = async (updates: Partial<BusinessObjective>) => {
    if (!objective) return false;

    const { error } = await supabase
      .from('business_objective')
      .update(updates)
      .eq('id', objective.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update objective', variant: 'destructive' });
      return false;
    }

    setObjective(prev => prev ? { ...prev, ...updates } : null);
    toast({ title: 'Success', description: 'Objective updated successfully' });
    return true;
  };

  return {
    benefits,
    initiatives,
    roadmapItems,
    objective,
    hasAccess,
    loading,
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

// Hook for managing user access
export const useBenefitsAccess = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [usersWithAccess, setUsersWithAccess] = useState<(UserBenefitsAccess & { email?: string; full_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsersWithAccess = async () => {
    const { data, error } = await supabase
      .from('user_benefits_access')
      .select('*');

    if (error) {
      console.error('Error fetching users with access:', error);
      setLoading(false);
      return;
    }

    // Get profile info for each user
    if (data && data.length > 0) {
      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const enrichedData = data.map(access => {
        const profile = profiles?.find(p => p.id === access.user_id);
        return {
          ...access,
          email: profile?.email || '',
          full_name: profile?.full_name || '',
        };
      });

      setUsersWithAccess(enrichedData);
    } else {
      setUsersWithAccess([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUsersWithAccess();
  }, []);

  const grantAccess = async (userId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('user_benefits_access')
      .insert({ user_id: userId, granted_by: user.id });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Info', description: 'User already has access' });
      } else {
        toast({ title: 'Error', description: 'Failed to grant access', variant: 'destructive' });
      }
      return false;
    }

    toast({ title: 'Success', description: 'Access granted successfully' });
    fetchUsersWithAccess();
    return true;
  };

  const revokeAccess = async (userId: string) => {
    const { error } = await supabase
      .from('user_benefits_access')
      .delete()
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to revoke access', variant: 'destructive' });
      return false;
    }

    toast({ title: 'Success', description: 'Access revoked successfully' });
    setUsersWithAccess(prev => prev.filter(u => u.user_id !== userId));
    return true;
  };

  return {
    usersWithAccess,
    loading,
    grantAccess,
    revokeAccess,
    refetch: fetchUsersWithAccess,
  };
};
