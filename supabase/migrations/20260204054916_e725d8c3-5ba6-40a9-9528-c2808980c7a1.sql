-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  benefits_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization memberships table
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Create organization-specific business objectives
CREATE TABLE public.org_business_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  title TEXT NOT NULL DEFAULT 'Business Objective',
  subtitle TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization-specific benefits
CREATE TABLE public.org_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  benefit_type benefit_type NOT NULL,
  target_percentage INTEGER,
  status initiative_status DEFAULT 'not_started',
  confidence confidence_level DEFAULT 'medium',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization-specific key initiatives
CREATE TABLE public.org_key_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization-specific roadmap items
CREATE TABLE public.org_roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_business_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_key_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_roadmap_items ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is member of an organization
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- Helper function to check if user is admin of an organization
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = 'admin'
  )
$$;

-- Helper function to get user's organization id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Organizations policies
CREATE POLICY "Super admins can manage organizations"
  ON public.organizations FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Members can view their organization"
  ON public.organizations FOR SELECT
  USING (is_org_member(auth.uid(), id));

-- Organization members policies
CREATE POLICY "Super admins can manage members"
  ON public.organization_members FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins can manage their org members"
  ON public.organization_members FOR ALL
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Members can view their org members"
  ON public.organization_members FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

-- Org business objectives policies
CREATE POLICY "Super admins can manage org objectives"
  ON public.org_business_objectives FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins can manage their objectives"
  ON public.org_business_objectives FOR ALL
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Members can view their org objectives"
  ON public.org_business_objectives FOR SELECT
  USING (
    is_org_member(auth.uid(), organization_id) AND
    (SELECT benefits_enabled FROM public.organizations WHERE id = organization_id)
  );

-- Org benefits policies
CREATE POLICY "Super admins can manage org benefits"
  ON public.org_benefits FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins can manage their benefits"
  ON public.org_benefits FOR ALL
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Members can view their org benefits"
  ON public.org_benefits FOR SELECT
  USING (
    is_org_member(auth.uid(), organization_id) AND
    (SELECT benefits_enabled FROM public.organizations WHERE id = organization_id)
  );

-- Org key initiatives policies
CREATE POLICY "Super admins can manage org initiatives"
  ON public.org_key_initiatives FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins can manage their initiatives"
  ON public.org_key_initiatives FOR ALL
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Members can view their org initiatives"
  ON public.org_key_initiatives FOR SELECT
  USING (
    is_org_member(auth.uid(), organization_id) AND
    (SELECT benefits_enabled FROM public.organizations WHERE id = organization_id)
  );

-- Org roadmap items policies
CREATE POLICY "Super admins can manage org roadmap"
  ON public.org_roadmap_items FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins can manage their roadmap"
  ON public.org_roadmap_items FOR ALL
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Members can view their org roadmap"
  ON public.org_roadmap_items FOR SELECT
  USING (
    is_org_member(auth.uid(), organization_id) AND
    (SELECT benefits_enabled FROM public.organizations WHERE id = organization_id)
  );

-- Add triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_business_objectives_updated_at
  BEFORE UPDATE ON public.org_business_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_benefits_updated_at
  BEFORE UPDATE ON public.org_benefits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_key_initiatives_updated_at
  BEFORE UPDATE ON public.org_key_initiatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_roadmap_items_updated_at
  BEFORE UPDATE ON public.org_roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();