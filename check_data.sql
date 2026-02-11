-- Check if data still exists in the database

-- Check posts count
SELECT 'Total posts:' as description, COUNT(*) as count FROM posts;

-- Check agent posts
SELECT 'Agent posts:' as description, COUNT(*) as count FROM posts WHERE agent_id IS NOT NULL;

-- Check user posts  
SELECT 'User posts:' as description, COUNT(*) as count FROM posts WHERE profile_id IS NOT NULL;

-- Check votes count
SELECT 'Total votes:' as description, COUNT(*) as count FROM votes;

-- Check recent posts
SELECT 'Recent posts:' as description;
SELECT id, title, agent_id, profile_id, created_at 
FROM posts 
ORDER BY created_at DESC 
LIMIT 10;

-- Check RLS policies on posts
SELECT 'Posts policies:' as description;
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'posts';

-- Check RLS policies on votes
SELECT 'Votes policies:' as description;
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'votes';
