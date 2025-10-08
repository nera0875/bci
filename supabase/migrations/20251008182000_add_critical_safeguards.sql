-- Corrections critiques pour la robustesse du système multi-utilisateur
-- Empêche les bugs de concurrence, doublons, et incohérences

-- ============================================
-- 1. EMPÊCHER LA SUPPRESSION DU DERNIER OWNER
-- ============================================
CREATE OR REPLACE FUNCTION prevent_last_owner_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_count INTEGER;
BEGIN
  -- Si on supprime ou change un owner
  IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR
     (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner') THEN

    -- Compter les owners restants pour ce projet
    SELECT COUNT(*) INTO owner_count
    FROM project_members
    WHERE project_id = OLD.project_id
    AND role = 'owner'
    AND id != OLD.id;

    -- Empêcher si c'est le dernier owner
    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last owner from project. Each project must have at least one owner.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_last_owner_removal ON project_members;
CREATE TRIGGER trigger_prevent_last_owner_removal
BEFORE UPDATE OR DELETE ON project_members
FOR EACH ROW
EXECUTE FUNCTION prevent_last_owner_removal();

-- ============================================
-- 2. AUTO-CRÉER PROJECT_MEMBER LORS DE LA CRÉATION DE PROJET
-- ============================================
CREATE OR REPLACE FUNCTION create_project_owner_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Créer automatiquement le member owner
  INSERT INTO project_members (project_id, user_id, role, accepted_at)
  VALUES (NEW.id, NEW.user_id, 'owner', NOW())
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_project_owner_member ON projects;
CREATE TRIGGER trigger_create_project_owner_member
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_project_owner_member();

-- ============================================
-- 3. EMPÊCHER LES DOUBLONS D'INVITATIONS
-- ============================================
-- Ajouter contrainte unique sur project_id + email pour invitations non acceptées
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation
ON project_invitations (project_id, email)
WHERE accepted_at IS NULL;

-- ============================================
-- 4. NETTOYER LES INVITATIONS EXPIRÉES AUTOMATIQUEMENT
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM project_invitations
  WHERE expires_at < NOW()
  AND accepted_at IS NULL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- 5. EMPÊCHER LA MODIFICATION DE user_id SUR PROJECTS
-- ============================================
CREATE OR REPLACE FUNCTION prevent_project_user_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Empêcher de changer user_id une fois défini
  IF OLD.user_id IS NOT NULL AND NEW.user_id != OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change project owner user_id. Use project_members table instead.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_project_user_id_change ON projects;
CREATE TRIGGER trigger_prevent_project_user_id_change
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION prevent_project_user_id_change();

-- ============================================
-- 6. VALIDATION DES RÔLES SUR PROJECT_INVITATIONS
-- ============================================
ALTER TABLE project_invitations
DROP CONSTRAINT IF EXISTS project_invitations_role_check;

ALTER TABLE project_invitations
ADD CONSTRAINT project_invitations_role_check
CHECK (role IN ('editor', 'viewer'));

-- ============================================
-- 7. GARANTIR QUE INVITED_BY EXISTE
-- ============================================
ALTER TABLE project_invitations
DROP CONSTRAINT IF EXISTS project_invitations_invited_by_fkey;

-- Ne pas ajouter de FK vers auth.users (cross-schema)
-- Mais valider dans le code applicatif

-- ============================================
-- 8. CRÉER INDEX POUR PERFORMANCE RLS
-- ============================================
-- Index pour accélérer les vérifications RLS sur project_members
CREATE INDEX IF NOT EXISTS idx_project_members_user_project
ON project_members (user_id, project_id)
WHERE accepted_at IS NOT NULL;

-- Index pour les invitations par email
CREATE INDEX IF NOT EXISTS idx_project_invitations_email
ON project_invitations (email)
WHERE accepted_at IS NULL;

-- ============================================
-- 9. CRÉER project_members POUR PROJETS EXISTANTS SANS MEMBERS
-- ============================================
INSERT INTO project_members (project_id, user_id, role, accepted_at)
SELECT p.id, p.user_id, 'owner', NOW()
FROM projects p
WHERE p.user_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = p.id
  AND pm.user_id = p.user_id
)
ON CONFLICT (project_id, user_id) DO NOTHING;
