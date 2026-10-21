-- No-show charges waiting on the guest's bank (3DS): when we asked, and when we
-- reminded them. The sweep reminds after 48h and gives up after 7 days.
ALTER TABLE public.no_show_charges ADD COLUMN IF NOT EXISTS action_requested_at timestamptz;
ALTER TABLE public.no_show_charges ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
