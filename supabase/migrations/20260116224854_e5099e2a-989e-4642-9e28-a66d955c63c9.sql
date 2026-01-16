-- Ensure triggers exist for ticket number, SLA, and updated_at

-- support_tickets: generate ticket_number on insert
DROP TRIGGER IF EXISTS trg_generate_ticket_number ON public.support_tickets;
CREATE TRIGGER trg_generate_ticket_number
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.generate_ticket_number();

-- support_tickets: calculate sla_due_at on insert
DROP TRIGGER IF EXISTS trg_calculate_sla_due_at ON public.support_tickets;
CREATE TRIGGER trg_calculate_sla_due_at
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.calculate_sla_due_at();

-- support_tickets: maintain updated_at on update
DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Optional: ticket_comments updated_at isn't present, so no trigger there.