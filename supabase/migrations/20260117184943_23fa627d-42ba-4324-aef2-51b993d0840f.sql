-- Add columns to track SLA breach notifications
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS sla_breach_notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_at_risk_notified_at TIMESTAMP WITH TIME ZONE;