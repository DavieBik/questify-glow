-- Remove duplicate answer options for ALL quiz questions by keeping only one of each unique option per question
WITH duplicate_options AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY question_id, option_text, is_correct, order_index 
           ORDER BY created_at
         ) as rn
  FROM quiz_answer_options 
)
DELETE FROM quiz_answer_options 
WHERE id IN (
  SELECT id FROM duplicate_options WHERE rn > 1
);