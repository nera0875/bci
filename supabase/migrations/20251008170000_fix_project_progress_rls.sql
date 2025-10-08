-- Fix project_progress RLS policies for project sharing
-- Drop existing policy
DROP POLICY IF EXISTS "Members can access project progress" ON project_progress;

-- Recreate with proper permissions for all CRUD operations
CREATE POLICY "Members can access project progress"
ON project_progress
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = project_progress.project_id
    AND project_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = project_progress.project_id
    AND project_members.user_id = auth.uid()
  )
);
