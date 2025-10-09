-- Fix missing RLS policy for system_prompts table
-- The cleanup migration removed "Allow all operations on system_prompts" policy
-- but never created the replacement "Members can access project system_prompts" policy
-- This caused all operations on system_prompts to fail with 500 errors

-- ============================================
-- SYSTEM_PROMPTS - Create missing RLS policy
-- ============================================
CREATE POLICY "Members can access project system_prompts"
ON system_prompts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = system_prompts.project_id
    AND project_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = system_prompts.project_id
    AND project_members.user_id = auth.uid()
  )
);

COMMENT ON POLICY "Members can access project system_prompts" ON system_prompts
IS 'Allow project members to manage system prompts for their projects';
