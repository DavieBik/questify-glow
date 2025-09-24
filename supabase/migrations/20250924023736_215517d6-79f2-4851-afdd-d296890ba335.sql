-- Clean up duplicate quiz questions and answer options
WITH duplicate_questions AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY module_id, question_text, order_index ORDER BY created_at) as rn
  FROM quiz_questions 
  WHERE module_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')
)
DELETE FROM quiz_answer_options 
WHERE question_id IN (
  SELECT id FROM duplicate_questions WHERE rn > 1
);

-- Delete duplicate questions (keep only the first occurrence)
WITH duplicate_questions AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY module_id, question_text, order_index ORDER BY created_at) as rn
  FROM quiz_questions 
  WHERE module_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')
)
DELETE FROM quiz_questions 
WHERE id IN (
  SELECT id FROM duplicate_questions WHERE rn > 1
);