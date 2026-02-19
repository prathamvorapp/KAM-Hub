import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import csv from 'csv-parser'

const supabase = createClient(
  'https://qvgnrdarwsnweizifech.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2Z25yZGFyd3Nud2VpemlmZWNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg4ODc5OCwiZXhwIjoyMDg2NDY0Nzk4fQ.HLTCQ54D8DNHM5gJteRv6l9MZ8_i0c3A2_SqRxuAcAw'
)

const users = []

fs.createReadStream('users.csv')
  .pipe(csv())
  .on('data', (row) => users.push(row))
  .on('end', async () => {
    console.log(`🚀 Migrating ${users.length} users...\n`)

    for (const user of users) {
      try {
        // Step 1: Create auth user
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email.trim(),
          password: 'Temp@1234',
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
            role: user.role,
            team_name: user.team_name
          }
        })

        if (error) {
          console.log(`❌ ${user.email}: ${error.message}`)
          continue
        }

        const authId = data.user.id

        // Step 2: Update user_profiles ID
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ id: authId })
          .eq('email', user.email.trim())

        if (updateError) {
          console.log(`⚠️ Profile update failed for ${user.email}`)
          continue
        }

        // Step 3: Send reset password email
        await supabase.auth.resetPasswordForEmail(user.email.trim())

        console.log(`✅ ${user.email} done`)
      } catch (err) {
        console.log(`⚠️ Error: ${user.email}`, err.message)
      }
    }

    console.log('\n🎉 Migration Completed')
  })
