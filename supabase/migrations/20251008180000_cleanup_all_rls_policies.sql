-- Nettoyage complet des politiques RLS pour le partage de projet
-- Supprime toutes les politiques obsolètes qui vérifient projects.user_id
-- Et les remplace par des politiques basées sur project_members

-- ============================================
-- ATTACK_PATTERNS
-- ============================================
DROP POLICY IF EXISTS "Users access own attack_patterns" ON attack_patterns;
CREATE POLICY "Members can access project attack_patterns"
ON attack_patterns FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = attack_patterns.project_id
    AND project_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = attack_patterns.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- ============================================
-- IMPLICIT_RULES
-- ============================================
DROP POLICY IF EXISTS "Users can manage their project data" ON implicit_rules;
CREATE POLICY "Members can access project implicit_rules"
ON implicit_rules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = implicit_rules.project_id
    AND project_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = implicit_rules.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- ============================================
-- LEARNED_PATTERNS
-- ============================================
DROP POLICY IF EXISTS "Users can manage their project data" ON learned_patterns;
CREATE POLICY "Members can access project learned_patterns"
ON learned_patterns FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = learned_patterns.project_id
    AND project_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = learned_patterns.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- ============================================
-- MEMORY_CATEGORIES - Supprimer les doublons
-- ============================================
DROP POLICY IF EXISTS "Users can delete categories for their projects" ON memory_categories;
DROP POLICY IF EXISTS "Users can insert categories for their projects" ON memory_categories;
DROP POLICY IF EXISTS "Users can view categories for their projects" ON memory_categories;
DROP POLICY IF EXISTS "Users can update categories for their projects" ON memory_categories;
-- Garder seulement la politique members

-- ============================================
-- MESSAGES - Supprimer politique obsolète
-- ============================================
DROP POLICY IF EXISTS "Users can manage their project data" ON messages;
-- Garder seulement "Members can access project messages"

-- ============================================
-- PENDING_FACTS - Supprimer politique obsolète
-- ============================================
DROP POLICY IF EXISTS "Users can manage their project data" ON pending_facts;
-- Garder seulement "Members can access project pending_facts"

-- ============================================
-- PENTEST_FINDINGS - Supprimer politique obsolète
-- ============================================
DROP POLICY IF EXISTS "Users can manage own project findings" ON pentest_findings;
-- Garder seulement "Members can access project findings"

-- ============================================
-- PENTEST_PIPELINES
-- ============================================
DROP POLICY IF EXISTS "Users can manage own project pipelines" ON pentest_pipelines;
CREATE POLICY "Members can access project pipelines"
ON pentest_pipelines FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = pentest_pipelines.project_id
    AND project_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = pentest_pipelines.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- ============================================
-- PENTEST_TARGETS - Supprimer politique obsolète
-- ============================================
DROP POLICY IF EXISTS "Users can manage own project targets" ON pentest_targets;
-- Garder seulement "Members can access project targets"

-- ============================================
-- PROJECT_CONTEXT - Simplifier
-- ============================================
DROP POLICY IF EXISTS "Users can update their project context" ON project_context;
DROP POLICY IF EXISTS "Users can view their project context" ON project_context;
CREATE POLICY "Members can access project_context"
ON project_context FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = project_context.project_id
    AND project_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = project_context.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- ============================================
-- REQUESTS
-- ============================================
DROP POLICY IF EXISTS "Users can manage their project data" ON requests;
CREATE POLICY "Members can access project requests"
ON requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = requests.project_id
    AND project_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = requests.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- ============================================
-- RULE_CATEGORIES - Supprimer politiques obsolètes
-- ============================================
DROP POLICY IF EXISTS "Users can delete rule categories for their projects" ON rule_categories;
DROP POLICY IF EXISTS "Users can insert rule categories for their projects" ON rule_categories;
DROP POLICY IF EXISTS "Users can view rule categories for their projects" ON rule_categories;
DROP POLICY IF EXISTS "Users can update rule categories for their projects" ON rule_categories;
-- Garder seulement "Members can access project rule_categories"

-- ============================================
-- RULES - Supprimer politique "Allow all rules"
-- ============================================
DROP POLICY IF EXISTS "Allow all rules" ON rules;
-- Garder seulement "Members can access project rules"

-- ============================================
-- SYSTEM_PROMPTS - Supprimer politique trop permissive
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on system_prompts" ON system_prompts;
-- Garder seulement "Members can access project system_prompts"

-- ============================================
-- TAG_TEMPLATES - Supprimer politique obsolète
-- ============================================
DROP POLICY IF EXISTS "Users can manage their project data" ON tag_templates;
-- Garder seulement "Members can access project tag_templates"

-- ============================================
-- TEST_RESULTS - Supprimer politiques trop permissives
-- ============================================
DROP POLICY IF EXISTS "Anyone can delete test results" ON test_results;
DROP POLICY IF EXISTS "Anyone can insert test results" ON test_results;
DROP POLICY IF EXISTS "Anyone can view test results" ON test_results;
DROP POLICY IF EXISTS "Anyone can update test results" ON test_results;
-- Garder seulement "Members can access project test_results"

-- ============================================
-- USER_DECISIONS
-- ============================================
DROP POLICY IF EXISTS "Users can manage their project data" ON user_decisions;
CREATE POLICY "Members can access project user_decisions"
ON user_decisions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = user_decisions.project_id
    AND project_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = user_decisions.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- ============================================
-- VULNERABILITIES
-- ============================================
DROP POLICY IF EXISTS "Users can manage their project data" ON vulnerabilities;
CREATE POLICY "Members can access project vulnerabilities"
ON vulnerabilities FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = vulnerabilities.project_id
    AND project_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = vulnerabilities.project_id
    AND project_members.user_id = auth.uid()
  )
);
