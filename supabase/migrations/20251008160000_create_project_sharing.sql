-- Enable project sharing between users

-- 1. Create project_members table for sharing
CREATE TABLE IF NOT EXISTS project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 2. Create invitations table
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add owners to project_members for existing projects
INSERT INTO project_members (project_id, user_id, role, accepted_at)
SELECT id, user_id, 'owner', NOW()
FROM projects
ON CONFLICT (project_id, user_id) DO NOTHING;

-- 4. Drop old RLS policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- 5. Create new RLS policies for projects (shared access)
CREATE POLICY "Users can view projects they are members of"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Project owners and editors can update"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Only project owners can delete"
  ON projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
      AND project_members.role = 'owner'
    )
  );

-- 6. RLS policies for project_members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their projects"
  ON project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage members"
  ON project_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- 7. RLS policies for invitations
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations for their projects"
  ON project_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_invitations.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Project owners and editors can create invitations"
  ON project_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_invitations.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Project owners can delete invitations"
  ON project_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_invitations.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role = 'owner'
    )
  );

-- 8. Function to accept invitation
CREATE OR REPLACE FUNCTION accept_project_invitation(invitation_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation project_invitations%ROWTYPE;
  v_user_id UUID;
  v_result JSON;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get invitation
  SELECT * INTO v_invitation
  FROM project_invitations
  WHERE token = invitation_token
  AND accepted_at IS NULL
  AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Add user to project_members
  INSERT INTO project_members (project_id, user_id, role, invited_by, accepted_at)
  VALUES (v_invitation.project_id, v_user_id, v_invitation.role, v_invitation.invited_by, NOW())
  ON CONFLICT (project_id, user_id) DO NOTHING;

  -- Mark invitation as accepted
  UPDATE project_invitations
  SET accepted_at = NOW()
  WHERE id = v_invitation.id;

  RETURN json_build_object(
    'success', true,
    'project_id', v_invitation.project_id,
    'role', v_invitation.role
  );
END;
$$;

-- 9. Function to remove member
CREATE OR REPLACE FUNCTION remove_project_member(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Get caller's role
  SELECT role INTO v_caller_role
  FROM project_members
  WHERE project_id = p_project_id
  AND user_id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this project';
  END IF;

  -- Get target user's role
  SELECT role INTO v_target_role
  FROM project_members
  WHERE project_id = p_project_id
  AND user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this project';
  END IF;

  -- Only owners can remove members
  IF v_caller_role != 'owner' THEN
    RAISE EXCEPTION 'Only owners can remove members';
  END IF;

  -- Cannot remove the last owner
  IF v_target_role = 'owner' THEN
    IF (SELECT COUNT(*) FROM project_members WHERE project_id = p_project_id AND role = 'owner') <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last owner';
    END IF;
  END IF;

  -- Remove member
  DELETE FROM project_members
  WHERE project_id = p_project_id
  AND user_id = p_user_id;

  RETURN TRUE;
END;
$$;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);

COMMENT ON TABLE project_members IS 'Users who have access to a project';
COMMENT ON TABLE project_invitations IS 'Pending invitations to join projects';
COMMENT ON FUNCTION accept_project_invitation IS 'Accept a project invitation using a token';
COMMENT ON FUNCTION remove_project_member IS 'Remove a member from a project (owner only)';
