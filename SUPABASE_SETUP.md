# 🚀 Supabase Setup Instructions

## ⚠️ IMPORTANT: You need to create the api_keys table in Supabase!

### Step 1: Go to your Supabase Dashboard
1. Open your browser and go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project

### Step 2: Run the Migration SQL
1. Click on **SQL Editor** in the left sidebar (it has a `< >` icon)
2. Click on **New query**
3. Copy ALL the content from the file `SUPABASE_MIGRATION.sql`
4. Paste it in the SQL Editor
5. Click **Run** (green button at the bottom right)

✅ You should see "Success. No rows returned" message

### Step 3: Verify the Table was Created
1. Go to **Table Editor** in the left sidebar
2. You should now see the `api_keys` table listed
3. Click on it to verify it has these columns:
   - id
   - user_id
   - service_name
   - api_key
   - is_valid
   - last_verified_at
   - metadata
   - created_at
   - updated_at

### Step 4: Test the API Key Configuration
1. Go back to your application: http://localhost:3001/settings
2. Enter an API key for any service (e.g., Mem0)
3. Click the blue **Save & Validate** button
4. You should see:
   - "Validating..." while it processes
   - Green checkmark ✓ if the key is valid
   - Red X if the key is invalid

## 🔧 Troubleshooting

### If you get "Failed to save API key" error:
- Make sure you ran the SQL migration
- Check that RLS policies are enabled
- Verify your Supabase connection in `.env.local`

### If the table already exists:
- The migration includes `IF NOT EXISTS` so it's safe to run multiple times

## 📝 How it Works

1. **Encryption**: API keys are encrypted before being stored in Supabase
2. **Validation**: Each key is automatically validated when saved
3. **Visual Feedback**:
   - Yellow = Required but not configured
   - Green = Valid and working
   - Red = Invalid key
4. **Security**: Row Level Security ensures users only see their own keys

## ✨ Features

- **Save & Validate Button**: Click to save and verify your API key
- **Eye Icon**: Toggle visibility of the API key
- **Refresh Icon**: Re-verify an existing key
- **Trash Icon**: Delete an API key
- **Status Indicators**: Real-time validation status

Now you're all set! Your API keys will be securely stored in Supabase! 🎉