
-- Remove duplicate modules created by multiple migration runs
WITH ranked_modules AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY course_id, order_index, title 
      ORDER BY created_at ASC
    ) as rn
  FROM modules
  WHERE course_id = '5908d4b0-0fe1-4186-b5fa-f1345cf57a45'
)
DELETE FROM modules
WHERE id IN (
  SELECT id FROM ranked_modules WHERE rn > 1
);
