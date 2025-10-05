-- Script de test data pour workflow Pattern → Rule
-- Projet ID: 6eb4e422-a10c-437e-a962-61af206d79ff

-- 1. Attack Patterns avec success_rate > 70%
INSERT INTO public.attack_patterns (
  project_id,
  pattern_type,
  context,
  technique,
  usage_count,
  success_count,
  last_success_at
) VALUES
  -- Pattern 1: SQL Injection (85% success)
  (
    '6eb4e422-a10c-437e-a962-61af206d79ff'::uuid,
    'sqli',
    'authentication',
    'UNION-based SQLi with ORDER BY enumeration',
    20,
    17,
    NOW()
  ),
  -- Pattern 2: IDOR (90% success)
  (
    '6eb4e422-a10c-437e-a962-61af206d79ff'::uuid,
    'idor',
    'api',
    'Sequential ID enumeration with JWT token',
    30,
    27,
    NOW()
  ),
  -- Pattern 3: XSS (75% success)
  (
    '6eb4e422-a10c-437e-a962-61af206d79ff'::uuid,
    'xss',
    'business-logic',
    'Stored XSS via user profile fields',
    16,
    12,
    NOW() - INTERVAL '2 hours'
  );

-- 2. Learned Patterns avec confidence > 80%
INSERT INTO public.learned_patterns (
  project_id,
  pattern_type,
  condition,
  action,
  confidence,
  sample_size
) VALUES
  -- Pattern auto-rangement Success
  (
    '6eb4e422-a10c-437e-a962-61af206d79ff'::uuid,
    'save_memory',
    '{"context": "success_detected", "keywords": ["vulnerability found", "exploit successful"]}'::jsonb,
    '{"target_folder": "Success", "auto_save": true}'::jsonb,
    0.92,
    25
  ),
  -- Pattern création rule pour tentatives répétées
  (
    '6eb4e422-a10c-437e-a962-61af206d79ff'::uuid,
    'rule_trigger',
    '{"context": "repeated_attempt", "min_count": 3}'::jsonb,
    '{"create_rule": true, "template": "Always test multiple payloads for this endpoint"}'::jsonb,
    0.88,
    18
  );

-- 3. Suggestions en attente (pending)
INSERT INTO public.suggestions_queue (
  project_id,
  type,
  status,
  confidence,
  suggestion
) VALUES
  -- Suggestion storage
  (
    '6eb4e422-a10c-437e-a962-61af206d79ff'::uuid,
    'storage',
    'pending',
    0.89,
    '{
      "name": "XSS Payload Collection",
      "content": "<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n<svg onload=alert(1)>",
      "target_folder_id": null,
      "reason": "Detected successful XSS exploitation pattern"
    }'::jsonb
  ),
  -- Suggestion rule
  (
    '6eb4e422-a10c-437e-a962-61af206d79ff'::uuid,
    'rule',
    'pending',
    0.85,
    '{
      "name": "Auto-test IDOR on API endpoints",
      "trigger": "When new API endpoint discovered",
      "action": "Automatically test sequential ID enumeration (user IDs 1-100)",
      "reason": "90% success rate detected on IDOR attacks in API context"
    }'::jsonb
  ),
  -- Suggestion improvement
  (
    '6eb4e422-a10c-437e-a962-61af206d79ff'::uuid,
    'improvement',
    'pending',
    0.76,
    '{
      "type": "prompt_optimization",
      "recommendation": "Add SQLi focus when context=authentication detected",
      "rationale": "85% success rate with UNION-based SQLi in auth flows"
    }'::jsonb
  );

-- 4. User Decisions pour pattern learning
INSERT INTO public.user_decisions (
  project_id,
  decision_type,
  context
) VALUES
  ('6eb4e422-a10c-437e-a962-61af206d79ff'::uuid, 'accept', '{"type": "storage", "target": "Success"}'::jsonb),
  ('6eb4e422-a10c-437e-a962-61af206d79ff'::uuid, 'accept', '{"type": "storage", "target": "Success"}'::jsonb),
  ('6eb4e422-a10c-437e-a962-61af206d79ff'::uuid, 'accept', '{"type": "rule", "trigger": "IDOR"}'::jsonb),
  ('6eb4e422-a10c-437e-a962-61af206d79ff'::uuid, 'reject', '{"type": "storage", "target": "Failed"}'::jsonb),
  ('6eb4e422-a10c-437e-a962-61af206d79ff'::uuid, 'accept', '{"type": "storage", "target": "Success"}'::jsonb);

SELECT 'Test data created successfully!' AS result;
