-- Create enum for benefit types
CREATE TYPE public.benefit_type AS ENUM ('tangible', 'intangible');

-- Create enum for initiative status
CREATE TYPE public.initiative_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Create enum for confidence level (for intangible benefits)
CREATE TYPE public.confidence_level AS ENUM ('low', 'medium', 'high');

-- Benefits table - stores both tangible and intangible benefits
CREATE TABLE public.benefits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    benefit_type benefit_type NOT NULL,
    -- For tangible benefits: target percentage (0-100)
    target_percentage INTEGER CHECK (target_percentage >= 0 AND target_percentage <= 100),
    -- For intangible benefits: status and confidence
    status initiative_status DEFAULT 'not_started',
    confidence confidence_level DEFAULT 'medium',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Key Initiatives table
CREATE TABLE public.key_initiatives (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Roadmap Items table
CREATE TABLE public.roadmap_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Business Objective table (the main header/objective)
CREATE TABLE public.business_objective (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Business Objective',
    subtitle TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Benefits Access table - which users can see the benefits module
CREATE TABLE public.user_benefits_access (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_objective ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_benefits_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for benefits
CREATE POLICY "Super admins can manage benefits" ON public.benefits
    FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users with benefits access can view" ON public.benefits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_benefits_access
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for key_initiatives
CREATE POLICY "Super admins can manage initiatives" ON public.key_initiatives
    FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users with benefits access can view initiatives" ON public.key_initiatives
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_benefits_access
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for roadmap_items
CREATE POLICY "Super admins can manage roadmap" ON public.roadmap_items
    FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users with benefits access can view roadmap" ON public.roadmap_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_benefits_access
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for business_objective
CREATE POLICY "Super admins can manage objective" ON public.business_objective
    FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users with benefits access can view objective" ON public.business_objective
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_benefits_access
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for user_benefits_access
CREATE POLICY "Super admins can manage access" ON public.user_benefits_access
    FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view their own access" ON public.user_benefits_access
    FOR SELECT USING (auth.uid() = user_id);

-- Create update triggers for updated_at
CREATE TRIGGER update_benefits_updated_at
    BEFORE UPDATE ON public.benefits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_initiatives_updated_at
    BEFORE UPDATE ON public.key_initiatives
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roadmap_updated_at
    BEFORE UPDATE ON public.roadmap_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_objective_updated_at
    BEFORE UPDATE ON public.business_objective
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default business objective
INSERT INTO public.business_objective (title, subtitle)
VALUES ('Business Objective', 'Tracking Tangible & Intangible Benefits');