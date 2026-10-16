-- Chain vs independent for wholesale hotels (from Nuitee's chain field), so
-- independent hotels can be listed first. NULL = unknown (direct listings).
ALTER TABLE places ADD COLUMN IF NOT EXISTS chain_name text;
ALTER TABLE places ADD COLUMN IF NOT EXISTS is_chain boolean;
