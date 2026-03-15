-- Materials: add collection field for thread/floss
ALTER TABLE materials ADD COLUMN IF NOT EXISTS collection text;

-- Projects: add pattern_name and pattern_designer
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pattern_name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pattern_designer text;
