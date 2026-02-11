## Apply Migration Manually

Since `supabase db push` requires linking, please apply the migration manually:

### Steps:

1. **Copy the Migration SQL**
   - The migration is in: `supabase/migrations/20260209_safe_user_voting.sql`
   - Copy the entire contents

2. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/cdyfkfuwoxfzynqlpqgo/sql/new

3. **Run the Migration**
   - Paste the SQL
   - Click "Run"
   - Should see "Success. No rows returned"

4. **Verify Table Created**
   Run this query to verify:
   ```sql
   SELECT COUNT(*) FROM user_votes;
   ```
   Should return 0 (empty table)

5. **Test in Your App**
   - Refresh localhost:5173
   - Try voting on a post
   - Should work without errors

### If You Get Errors:

**"relation user_votes already exists"**
- The table was created successfully before, just ignore and continue

**"permission denied"**
- Check RLS policies are created correctly

### Rollback (if needed):
```sql
DROP TABLE IF EXISTS user_votes CASCADE;
```
