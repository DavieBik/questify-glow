
-- feat(course): make Infection Prevention & Control demo-ready with lessons + quiz + cert

-- Add 2 markdown lessons to the course
INSERT INTO public.modules (
  course_id, 
  title, 
  description, 
  order_index, 
  content_type, 
  body,
  is_required,
  pass_threshold_percentage,
  max_attempts,
  organization_id
) VALUES 
(
  '5908d4b0-0fe1-4186-b5fa-f1345cf57a45',
  'Introduction to Infection Control',
  'Learn the fundamentals of preventing infection spread in healthcare settings',
  1,
  'text',
  '# Introduction to Infection Control

Infection prevention and control is a critical component of healthcare quality and patient safety. This lesson covers the fundamental principles of preventing the spread of infectious diseases.

## Key Concepts

### Chain of Infection
Understanding how infections spread is essential:
1. **Infectious Agent** - The microorganism causing disease
2. **Reservoir** - Where the pathogen lives (humans, animals, environment)
3. **Portal of Exit** - How the pathogen leaves the reservoir
4. **Mode of Transmission** - How it spreads (contact, droplet, airborne)
5. **Portal of Entry** - How it enters a new host
6. **Susceptible Host** - A person at risk of infection

### Standard Precautions
These precautions apply to ALL patients:
- Hand hygiene before and after patient contact
- Use of personal protective equipment (PPE)
- Respiratory hygiene and cough etiquette
- Safe injection practices
- Safe handling of contaminated equipment

## Why It Matters

Healthcare-associated infections affect millions of patients worldwide each year. Proper infection control practices can prevent:
- Patient suffering and complications
- Extended hospital stays
- Increased healthcare costs
- Antimicrobial resistance

Remember: **Prevention is always better than treatment.**',
  true,
  60,
  3,
  (SELECT default_org_id FROM app_settings LIMIT 1)
),
(
  '5908d4b0-0fe1-4186-b5fa-f1345cf57a45',
  'Hand Hygiene Best Practices',
  'Master the WHO 5 Moments for Hand Hygiene and proper technique',
  2,
  'text',
  '# Hand Hygiene Best Practices

Hand hygiene is the single most effective measure to prevent the spread of infections. This lesson covers WHO guidelines and proper technique.

## WHO 5 Moments for Hand Hygiene

Perform hand hygiene at these critical moments:

1. **Before touching a patient**
   - Protects the patient from harmful germs on your hands

2. **Before clean/aseptic procedures**
   - Protects the patient from germs entering their body

3. **After body fluid exposure risk**
   - Protects you and the environment from harmful germs

4. **After touching a patient**
   - Protects you and the environment from patient germs

5. **After touching patient surroundings**
   - Protects you and the environment from germs

## Proper Handwashing Technique

### Duration: 40-60 seconds with soap and water

1. Wet hands with water
2. Apply enough soap to cover all hand surfaces
3. Rub hands palm to palm
4. Right palm over left dorsum, interlaced fingers (and vice versa)
5. Palm to palm with fingers interlaced
6. Backs of fingers to opposing palms with fingers interlocked
7. Rotational rubbing of right thumb in left palm (and vice versa)
8. Rotational rubbing of clasped fingers in palm
9. Rinse hands with water
10. Dry thoroughly with single-use towel
11. Use towel to turn off faucet

## Alcohol-Based Hand Rub

### Duration: 20-30 seconds

Use the same rubbing technique as handwashing. Continue until hands are completely dry.

### When to Use Each Method

- **Soap and water:** When hands are visibly soiled, after using restroom, before eating
- **Alcohol-based rub:** For routine decontamination when hands not visibly soiled

**Key Reminder:** Remove jewelry and keep nails short and clean!',
  true,
  60,
  3,
  (SELECT default_org_id FROM app_settings LIMIT 1)
);

-- Add quiz module
INSERT INTO public.modules (
  course_id, 
  title, 
  description, 
  order_index, 
  content_type, 
  is_required,
  pass_threshold_percentage,
  max_attempts,
  time_limit_minutes,
  organization_id
) VALUES (
  '5908d4b0-0fe1-4186-b5fa-f1345cf57a45',
  'Infection Control Knowledge Check',
  'Test your understanding of infection prevention principles',
  3,
  'quiz',
  true,
  60,
  3,
  15,
  (SELECT default_org_id FROM app_settings LIMIT 1)
);

-- Insert quiz questions and answers
DO $$
DECLARE
  quiz_module_id UUID;
  q1_id UUID;
  q2_id UUID;
  q3_id UUID;
  q4_id UUID;
  q5_id UUID;
BEGIN
  -- Get the quiz module ID
  SELECT id INTO quiz_module_id 
  FROM public.modules 
  WHERE course_id = '5908d4b0-0fe1-4186-b5fa-f1345cf57a45' 
    AND content_type = 'quiz' 
    AND order_index = 3
  LIMIT 1;

  -- Question 1
  INSERT INTO public.quiz_questions (module_id, question_text, question_type, points, order_index)
  VALUES (quiz_module_id, 'What is the single most effective measure to prevent the spread of infections in healthcare settings?', 'multiple_choice', 20, 1)
  RETURNING id INTO q1_id;

  INSERT INTO public.quiz_answer_options (question_id, option_text, is_correct, order_index) VALUES
  (q1_id, 'Hand hygiene', true, 1),
  (q1_id, 'Wearing gloves at all times', false, 2),
  (q1_id, 'Using antibiotics', false, 3),
  (q1_id, 'Environmental cleaning', false, 4);

  -- Question 2
  INSERT INTO public.quiz_questions (module_id, question_text, question_type, points, order_index)
  VALUES (quiz_module_id, 'How many critical moments for hand hygiene are defined by WHO?', 'multiple_choice', 20, 2)
  RETURNING id INTO q2_id;

  INSERT INTO public.quiz_answer_options (question_id, option_text, is_correct, order_index) VALUES
  (q2_id, '3', false, 1),
  (q2_id, '5', true, 2),
  (q2_id, '7', false, 3),
  (q2_id, '10', false, 4);

  -- Question 3
  INSERT INTO public.quiz_questions (module_id, question_text, question_type, points, order_index)
  VALUES (quiz_module_id, 'Which is the correct duration for handwashing with soap and water?', 'multiple_choice', 20, 3)
  RETURNING id INTO q3_id;

  INSERT INTO public.quiz_answer_options (question_id, option_text, is_correct, order_index) VALUES
  (q3_id, '10-15 seconds', false, 1),
  (q3_id, '20-30 seconds', false, 2),
  (q3_id, '40-60 seconds', true, 3),
  (q3_id, '90-120 seconds', false, 4);

  -- Question 4
  INSERT INTO public.quiz_questions (module_id, question_text, question_type, points, order_index)
  VALUES (quiz_module_id, 'What is a "portal of entry" in the chain of infection?', 'multiple_choice', 20, 4)
  RETURNING id INTO q4_id;

  INSERT INTO public.quiz_answer_options (question_id, option_text, is_correct, order_index) VALUES
  (q4_id, 'Where the pathogen lives', false, 1),
  (q4_id, 'How the pathogen leaves the reservoir', false, 2),
  (q4_id, 'How the pathogen enters a new host', true, 3),
  (q4_id, 'The person at risk of infection', false, 4);

  -- Question 5
  INSERT INTO public.quiz_questions (module_id, question_text, question_type, points, order_index)
  VALUES (quiz_module_id, 'When should you use soap and water instead of alcohol-based hand rub?', 'multiple_choice', 20, 5)
  RETURNING id INTO q5_id;

  INSERT INTO public.quiz_answer_options (question_id, option_text, is_correct, order_index) VALUES
  (q5_id, 'Before every patient contact', false, 1),
  (q5_id, 'When hands are visibly soiled', true, 2),
  (q5_id, 'After wearing gloves', false, 3),
  (q5_id, 'Between different body sites on same patient', false, 4);
END $$;

-- Update course to add Demo-Ready tag and set certificate expiry
UPDATE public.courses
SET 
  estimated_duration_minutes = 30,
  expiry_period_months = 12,
  description = description || E'\n\n**Demo-Ready Course** - Complete with interactive lessons and knowledge assessment.'
WHERE id = '5908d4b0-0fe1-4186-b5fa-f1345cf57a45';

COMMENT ON COLUMN public.courses.expiry_period_months IS 'Certificate expiry period in months. Certificates will be issued with expiry date on course completion.';
