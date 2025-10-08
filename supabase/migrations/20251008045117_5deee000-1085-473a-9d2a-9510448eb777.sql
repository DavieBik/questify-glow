
-- Remove duplicate quiz questions and their answer options
-- Step 1: Get the IDs of questions to keep (earliest created for each unique question)
WITH questions_to_keep AS (
  SELECT DISTINCT ON (module_id, order_index, question_text) 
    id
  FROM quiz_questions
  WHERE module_id = 'fddfc0bb-593f-45df-a4ee-3aec8c156d8c'
  ORDER BY module_id, order_index, question_text, created_at ASC
),
questions_to_delete AS (
  SELECT id 
  FROM quiz_questions
  WHERE module_id = 'fddfc0bb-593f-45df-a4ee-3aec8c156d8c'
    AND id NOT IN (SELECT id FROM questions_to_keep)
)
-- Delete answer options for duplicate questions first
DELETE FROM quiz_answer_options
WHERE question_id IN (SELECT id FROM questions_to_delete);

-- Step 2: Delete the duplicate questions
WITH questions_to_keep AS (
  SELECT DISTINCT ON (module_id, order_index, question_text) 
    id
  FROM quiz_questions
  WHERE module_id = 'fddfc0bb-593f-45df-a4ee-3aec8c156d8c'
  ORDER BY module_id, order_index, question_text, created_at ASC
)
DELETE FROM quiz_questions
WHERE module_id = 'fddfc0bb-593f-45df-a4ee-3aec8c156d8c'
  AND id NOT IN (SELECT id FROM questions_to_keep);
