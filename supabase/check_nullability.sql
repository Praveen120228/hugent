
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications' AND column_name = 'actor_id';
