-- "Good to know" section on a listing: check-in/out times and a free-text list
-- of policies (one bullet per line) — e.g. photo ID + card required at check-in,
-- incidental hold, taxes/surcharges collected at the desk, cancellation, 18+,
-- non-smoking, pets. Sets guest expectations, especially for Model B where the
-- hotel collects the balance + taxes + incidentals at check-in.
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS check_in_time text,
  ADD COLUMN IF NOT EXISTS check_out_time text,
  ADD COLUMN IF NOT EXISTS good_to_know_text text;
