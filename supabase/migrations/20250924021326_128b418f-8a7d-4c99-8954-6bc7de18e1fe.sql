-- Add quiz questions for Module 1
INSERT INTO quiz_questions (
  module_id,
  question_text,
  question_type,
  explanation,
  points,
  order_index
) 
SELECT 
  m.id,
  'What is the main purpose of mandatory notifications?',
  'multiple_choice',
  'Mandatory notifications are designed to protect people with disability by ensuring harmful or unsafe conduct is reported and addressed.',
  10,
  1
FROM modules m
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 1;

-- Add answer options for Module 1 question
INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index)
SELECT 
  qq.id,
  'To punish workers',
  false,
  1
FROM quiz_questions qq
JOIN modules m ON qq.module_id = m.id
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 1
UNION ALL
SELECT 
  qq.id,
  'To protect people with disability',
  true,
  2
FROM quiz_questions qq
JOIN modules m ON qq.module_id = m.id
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 1
UNION ALL
SELECT 
  qq.id,
  'To replace workplace supervision',
  false,
  3
FROM quiz_questions qq
JOIN modules m ON qq.module_id = m.id
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 1
UNION ALL
SELECT 
  qq.id,
  'To create paperwork',
  false,
  4
FROM quiz_questions qq
JOIN modules m ON qq.module_id = m.id
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 1;

-- Add quiz questions for Module 2
INSERT INTO quiz_questions (
  module_id,
  question_text,
  question_type,
  explanation,
  points,
  order_index
) 
SELECT 
  m.id,
  'Which of the following is NOT notifiable conduct?',
  'multiple_choice',
  'Being late to a shift is not notifiable conduct. Notifiable conduct includes sexual misconduct, working while intoxicated, and practising while impaired.',
  10,
  1
FROM modules m
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 2;

-- Add answer options for Module 2 question
INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index)
SELECT 
  qq.id,
  'Being late to a shift',
  true,
  1
FROM quiz_questions qq
JOIN modules m ON qq.module_id = m.id
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 2
UNION ALL
SELECT 
  qq.id,
  'Sexual misconduct',
  false,
  2
FROM quiz_questions qq
JOIN modules m ON qq.module_id = m.id
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 2
UNION ALL
SELECT 
  qq.id,
  'Working while intoxicated',
  false,
  3
FROM quiz_questions qq
JOIN modules m ON qq.module_id = m.id
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 2
UNION ALL
SELECT 
  qq.id,
  'Practising while impaired',
  false,
  4
FROM quiz_questions qq
JOIN modules m ON qq.module_id = m.id
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 2;

-- Add quiz questions for Module 3
INSERT INTO quiz_questions (
  module_id,
  question_text,
  question_type,
  explanation,
  points,
  order_index
) 
SELECT 
  m.id,
  'How can you notify the Commission?',
  'multiple_choice',
  'You can notify the VDWC using the online notification form on their website or by calling them directly.',
  10,
  1
FROM modules m
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 3;

-- Add answer options for Module 3 question
INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index)
SELECT 
  qq.id,
  'Online form',
  true,
  1
FROM quiz_questions qq
JOIN modules m ON qq.module_id = m.id
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 3
UNION ALL
SELECT 
  qq.id,
  'Postcard',
  false,
  2
FROM quiz_questions qq
JOIN modules m ON qq.module_id = m.id
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 3
UNION ALL
SELECT 
  qq.id,
  'Wait until your next team meeting',
  false,
  3
FROM quiz_questions qq
JOIN modules m ON qq.module_id = m.id
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 3
UNION ALL
SELECT 
  qq.id,
  'You cannot notify',
  false,
  4
FROM quiz_questions qq
JOIN modules m ON qq.module_id = m.id
WHERE m.course_id = '8168fcab-00cc-45af-a865-db31af9223bf' 
AND m.order_index = 3;