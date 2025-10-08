-- Insert the "Getting Started with Skillbridge" onboarding course
INSERT INTO public.courses (
  id,
  title,
  description,
  short_description,
  category,
  difficulty,
  is_mandatory,
  is_active,
  organization_id,
  estimated_duration_minutes,
  format
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Getting Started with Skillbridge',
  'Welcome to Skillbridge! This quick course will help you understand how to use the platform, enroll in courses, complete training, and track your progress. Perfect for new users.',
  'Learn the basics of using Skillbridge LMS',
  'Orientation',
  'beginner',
  true,
  true,
  (SELECT id FROM public.organizations LIMIT 1),
  15,
  'online'
);

-- Insert Module 1: Overview
INSERT INTO public.modules (
  id,
  course_id,
  title,
  description,
  content_type,
  body,
  order_index,
  is_required,
  organization_id,
  pass_threshold_percentage,
  max_attempts
) VALUES (
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Platform Overview',
  'Get familiar with Skillbridge and its key features',
  'text',
  '<h2>Welcome to Skillbridge!</h2>
<p>Skillbridge is your comprehensive learning management system designed to help you grow professionally through structured training.</p>

<h3>Key Features:</h3>
<ul>
  <li><strong>Course Catalog:</strong> Browse all available training courses</li>
  <li><strong>My Learning:</strong> Track your enrolled courses and progress</li>
  <li><strong>Certificates:</strong> Earn and download certificates upon completion</li>
  <li><strong>Dashboard:</strong> View your learning statistics and upcoming deadlines</li>
</ul>

<h3>Navigation:</h3>
<p>Use the sidebar menu to access different sections:</p>
<ul>
  <li>Dashboard - Your learning overview</li>
  <li>Courses - Browse and enroll in training</li>
  <li>Certificates - View your earned credentials</li>
  <li>Profile - Manage your account settings</li>
</ul>

<p><strong>Tip:</strong> Click on any course card to see detailed information and module breakdowns!</p>',
  1,
  true,
  (SELECT id FROM public.organizations LIMIT 1),
  100,
  3
);

-- Insert Module 2: Enroll & Complete
INSERT INTO public.modules (
  id,
  course_id,
  title,
  description,
  content_type,
  body,
  order_index,
  is_required,
  organization_id,
  pass_threshold_percentage,
  max_attempts
) VALUES (
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'How to Enroll & Complete Courses',
  'Learn the process of enrolling in courses and completing modules',
  'text',
  '<h2>Enrolling in Courses</h2>
<p>Follow these simple steps to start your learning journey:</p>

<h3>1. Browse Courses</h3>
<ul>
  <li>Navigate to the "Courses" or "Course Catalog" section</li>
  <li>Use filters to find courses by category or difficulty</li>
  <li>Click on a course to view its details</li>
</ul>

<h3>2. Enroll</h3>
<ul>
  <li>Click the "Enroll" button on the course page</li>
  <li>Some courses may require manager approval</li>
  <li>Once enrolled, the course appears in your Dashboard</li>
</ul>

<h3>3. Complete Modules</h3>
<ul>
  <li>Courses are divided into modules</li>
  <li>Complete modules in order</li>
  <li>Read content, watch videos, or complete quizzes</li>
  <li>Track your progress with the progress bar</li>
</ul>

<h3>4. Earn Certificates</h3>
<ul>
  <li>Complete all required modules</li>
  <li>Pass any assessments with the minimum score</li>
  <li>Receive your certificate automatically</li>
  <li>Download or share your certificate</li>
</ul>

<p><strong>Pro Tip:</strong> Set aside regular time for learning to stay on track with deadlines!</p>',
  2,
  true,
  (SELECT id FROM public.organizations LIMIT 1),
  100,
  3
);

-- Insert Module 3: Manager/Admin Tracking
INSERT INTO public.modules (
  id,
  course_id,
  title,
  description,
  content_type,
  body,
  order_index,
  is_required,
  organization_id,
  pass_threshold_percentage,
  max_attempts
) VALUES (
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Progress Tracking & Compliance',
  'Understand how your progress is tracked and reported',
  'text',
  '<h2>Your Learning is Tracked</h2>
<p>Skillbridge helps ensure compliance and professional development by tracking your progress.</p>

<h3>What Gets Tracked?</h3>
<ul>
  <li><strong>Course Enrollment:</strong> When you enroll in courses</li>
  <li><strong>Module Completion:</strong> Your progress through each module</li>
  <li><strong>Time Spent:</strong> How long you spend learning</li>
  <li><strong>Assessment Scores:</strong> Your quiz and test results</li>
  <li><strong>Certificates:</strong> Earned credentials and expiry dates</li>
</ul>

<h3>Manager & Admin Visibility</h3>
<p>Your manager and administrators can view:</p>
<ul>
  <li>Your enrolled courses and completion status</li>
  <li>Overall completion rates for compliance reporting</li>
  <li>Upcoming course deadlines</li>
  <li>Team-wide analytics and trends</li>
</ul>

<h3>Why This Matters</h3>
<ul>
  <li><strong>Compliance:</strong> Ensures mandatory training is completed</li>
  <li><strong>Professional Growth:</strong> Tracks your skill development</li>
  <li><strong>Career Advancement:</strong> Demonstrates your commitment to learning</li>
  <li><strong>Team Performance:</strong> Helps managers support your development</li>
</ul>

<h3>Your Privacy</h3>
<p>Only authorized personnel (your managers and admins) can view your learning data. Individual module content and detailed session data remain private.</p>

<p><strong>Remember:</strong> Regular engagement with assigned courses helps you stay compliant and advance your career!</p>',
  3,
  true,
  (SELECT id FROM public.organizations LIMIT 1),
  100,
  3
);

-- Update handle_new_user trigger to auto-enroll in onboarding course
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Auto-enroll in "Getting Started with Skillbridge" course
  INSERT INTO public.user_course_enrollments (user_id, course_id, status, enrollment_date)
  VALUES (
    NEW.id,
    '00000000-0000-0000-0000-000000000001',
    'enrolled',
    NOW()
  )
  ON CONFLICT (user_id, course_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Failed to create profile or enroll user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;