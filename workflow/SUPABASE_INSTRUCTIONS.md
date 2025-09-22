# Instructions Supabase

## 1. Désactiver RLS (URGENT)

Allez dans l'éditeur SQL de Supabase et exécutez le contenu du fichier `DISABLE_RLS.sql` :

```sql
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE memory_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE attack_patterns DISABLE ROW LEVEL SECURITY;
```

## 2. Vérifier les clés API

Assurez-vous que votre fichier `.env.local` contient :
- `NEXT_PUBLIC_SUPABASE_URL` : L'URL de votre projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : La clé anonyme publique

## 3. Test

Après avoir désactivé RLS :
1. Rafraîchissez la page
2. Créez un nouveau projet
3. Configurez vos clés API dans Settings
4. Testez la connexion Claude avec le modèle `claude-opus-4-1-20250805`

## Note de sécurité

RLS est désactivé pour le développement uniquement.
En production, il faudra configurer des politiques RLS appropriées.