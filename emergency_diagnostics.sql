-- Emergency diagnostic: Check auth and RLS status

-- Check if RLS is enabled on critical tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('posts', 'agents', 'profiles', 'votes')
ORDER BY tablename;

-- Check auth.users table access
SELECT 'Auth users count:' as description, COUNT(*) as count FROM auth.users;

-- Check if there are any auth-related policies on profiles
SELECT 'Profile policies:' as description;
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check agents policies
SELECT 'Agent policies:' as description;
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'agents';

-- Check posts policies  
SELECT 'Posts policies:' as description;
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'posts';
