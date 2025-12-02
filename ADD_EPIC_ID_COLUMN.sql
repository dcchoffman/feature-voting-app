-- Add epic_id and work_item_type columns to features table
-- These columns store Azure DevOps work item information

-- Add epic_id column (stores the Azure DevOps Epic work item ID for linking purposes)
ALTER TABLE features 
ADD COLUMN IF NOT EXISTS epic_id TEXT;

-- Add work_item_type column (stores the Azure DevOps work item type like Feature, Bug, Epic, etc.)
ALTER TABLE features 
ADD COLUMN IF NOT EXISTS work_item_type TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN features.epic_id IS 'Azure DevOps Epic work item ID for creating links to Epic work items';
COMMENT ON COLUMN features.work_item_type IS 'Azure DevOps work item type (e.g., Feature, Bug, Epic, User Story, Task)';

