-- Migration: Fix system_prompts trigger
-- Date: 2025-10-10
-- Description: Fix incorrect trigger function reference causing 500 errors on INSERT/UPDATE

-- Drop the incorrect trigger
DROP TRIGGER IF EXISTS system_prompts_updated_at ON system_prompts;

-- Create the correct trigger using the generic update function
CREATE TRIGGER system_prompts_updated_at
  BEFORE UPDATE ON system_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER system_prompts_updated_at ON system_prompts IS 'Automatically update updated_at timestamp on row update';
