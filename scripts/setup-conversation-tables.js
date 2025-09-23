const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupConversationTables() {
  try {
    console.log('Creating conversation system tables...')

    // Read SQL file
    const sqlContent = fs.readFileSync(
      path.join(__dirname, '../lib/sql/conversations_system.sql'),
      'utf8'
    )

    // Split by semicolons but be careful with function definitions
    const statements = []
    let currentStatement = ''
    let inFunction = false

    sqlContent.split('\n').forEach(line => {
      // Check if we're entering or leaving a function definition
      if (line.includes('CREATE OR REPLACE FUNCTION')) {
        inFunction = true
      }

      currentStatement += line + '\n'

      // If we hit a semicolon and we're not in a function, it's the end of a statement
      if (line.trim().endsWith(';')) {
        if (!inFunction) {
          statements.push(currentStatement.trim())
          currentStatement = ''
        } else if (line.includes('$$ LANGUAGE')) {
          // End of function
          statements.push(currentStatement.trim())
          currentStatement = ''
          inFunction = false
        }
      }
    })

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...')
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        }).single()

        if (error) {
          // Try direct execution as fallback
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
            {
              method: 'POST',
              headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ sql: statement })
            }
          )

          if (!response.ok) {
            console.error('Failed to execute:', statement.substring(0, 100))
            console.error('Error:', await response.text())
          }
        }
      }
    }

    console.log('✅ Conversation tables created successfully!')
    console.log('Tables created:')
    console.log('  - conversations (sessions)')
    console.log('  - messages (with embeddings & deduplication)')
    console.log('  - message_cache (for identical messages)')
    console.log('  - search_similar_messages function')

  } catch (error) {
    console.error('Error setting up tables:', error)
    process.exit(1)
  }
}

setupConversationTables()