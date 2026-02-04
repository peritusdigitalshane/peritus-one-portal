import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  benefits_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'member';
  created_at: string;
  email?: string;
  full_name?: string;
}

export const useOrganizations = () => {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = async () => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching organizations:', error);
    } else {
      setOrganizations(data as Organization[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrganizations();
  }, [isSuperAdmin]);

  const createOrganization = async (name: string, slug: string) => {
    const { data, error } = await supabase
      .from('organizations')
      .insert({ name, slug })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }

    // Create default business objective for the org
    await supabase.from('org_business_objectives').insert({
      organization_id: data.id,
      title: 'Business Objective',
      subtitle: 'Tracking Benefits Realisation',
    });

    setOrganizations(prev => [...prev, data as Organization]);
    toast({ title: 'Success', description: 'Organization created' });
    return data;
  };

  const updateOrganization = async (id: string, updates: Partial<Organization>) => {
    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }

    setOrganizations(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    toast({ title: 'Success', description: 'Organization updated' });
    return true;
  };

  const toggleBenefitsEnabled = async (id: string, enabled: boolean) => {
    return updateOrganization(id, { benefits_enabled: enabled });
  };

  const deleteOrganization = async (id: string) => {
    const { error } = await supabase.from('organizations').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }

    setOrganizations(prev => prev.filter(o => o.id !== id));
    toast({ title: 'Success', description: 'Organization deleted' });
    return true;
  };

  return {
    organizations,
    loading,
    createOrganization,
    updateOrganization,
    toggleBenefitsEnabled,
    deleteOrganization,
    refetch: fetchOrganizations,
  };
};

export const useOrganizationMembers = (organizationId: string | null) => {
  const { toast } = useToast();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    if (!organizationId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error fetching members:', error);
      setLoading(false);
      return;
    }

    // Enrich with profile info
    if (data && data.length > 0) {
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const enriched = data.map(member => {
        const profile = profiles?.find(p => p.id === member.user_id);
        return {
          ...member,
          email: profile?.email || '',
          full_name: profile?.full_name || '',
        } as OrganizationMember;
      });
      setMembers(enriched);
    } else {
      setMembers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [organizationId]);

  const addMember = async (userId: string, role: 'admin' | 'member' = 'member') => {
    if (!organizationId) return false;

    const { error } = await supabase
      .from('organization_members')
      .insert({ organization_id: organizationId, user_id: userId, role });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Info', description: 'User is already a member' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      return false;
    }

    toast({ title: 'Success', description: 'Member added' });
    fetchMembers();
    return true;
  };

  const updateMemberRole = async (memberId: string, role: 'admin' | 'member') => {
    const { error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('id', memberId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }

    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
    toast({ title: 'Success', description: 'Role updated' });
    return true;
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }

    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast({ title: 'Success', description: 'Member removed' });
    return true;
  };

  return {
    members,
    loading,
    addMember,
    updateMemberRole,
    removeMember,
    refetch: fetchMembers,
  };
};

// Hook for getting current user's organization
export const useUserOrganization = () => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserOrg = async () => {
      if (!user) {
        setOrganization(null);
        setMembership(null);
        setLoading(false);
        return;
      }

      // Get user's membership
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (memberError || !memberData) {
        setOrganization(null);
        setMembership(null);
        setLoading(false);
        return;
      }

      setMembership(memberData as OrganizationMember);

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', memberData.organization_id)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        setOrganization(null);
      } else {
        setOrganization(orgData as Organization);
      }
      setLoading(false);
    };

    fetchUserOrg();
  }, [user]);

  const isOrgAdmin = membership?.role === 'admin';
  const hasBenefitsAccess = organization?.benefits_enabled === true;

  return {
    organization,
    membership,
    loading,
    isOrgAdmin,
    hasBenefitsAccess,
  };
};
