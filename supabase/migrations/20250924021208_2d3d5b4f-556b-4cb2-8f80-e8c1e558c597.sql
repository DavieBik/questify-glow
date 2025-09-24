-- Create the Mandatory Reporting Requirements course
INSERT INTO courses (
  id,
  title,
  description,
  short_description,
  category,
  difficulty,
  estimated_duration_minutes,
  format,
  is_mandatory,
  is_active,
  ndis_compliant,
  organization_id,
  created_at,
  updated_at
) VALUES (
  '8168fcab-00cc-45af-a865-db31af9223bf',
  'Mandatory Reporting Requirements in Disability Services',
  'A comprehensive course covering the legal requirements for mandatory notifications in Victorian disability services. Learn when, how, and why to report notifiable conduct to the VDWC.',
  'Legal requirements for mandatory notifications in disability services',
  'Compliance & Legal',
  'intermediate',
  60,
  'online',
  true,
  true,
  true,
  '00000000-0000-0000-0000-000000000001',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  category = EXCLUDED.category,
  updated_at = now();

-- Delete existing modules for this course to avoid conflicts
DELETE FROM modules WHERE course_id = '8168fcab-00cc-45af-a865-db31af9223bf';

-- Create Module 1: Introduction
INSERT INTO modules (
  course_id,
  title,
  description,
  body,
  content_type,
  content_url,
  order_index,
  is_required,
  pass_threshold_percentage,
  max_attempts,
  organization_id,
  created_at,
  updated_at
) VALUES (
  '8168fcab-00cc-45af-a865-db31af9223bf',
  'Module 1 – Introduction: What is a Mandatory Notification?',
  'Learn the fundamentals of mandatory notifications and their importance in protecting people with disability.',
  '<div class="space-y-6">
    <div class="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
      <h3 class="text-lg font-semibold text-blue-900 mb-3">What is a Mandatory Notification?</h3>
      <p class="text-blue-800 leading-relaxed">
        Mandatory notifications are a legal safeguard that help protect people with disability. 
        Disability workers must report certain types of unsafe or harmful conduct to the 
        Victorian Disability Worker Commission (VDWC).
      </p>
    </div>
    
    <div class="bg-yellow-50 p-6 rounded-lg">
      <h4 class="text-md font-semibold mb-4 text-yellow-900">📹 Watch: Introduction to Mandatory Notifications</h4>
      <p class="text-yellow-800 mb-4">
        The following video from the Victorian Disability Worker Commission provides an overview 
        of mandatory notifications and their importance in the disability sector.
      </p>
      <div class="bg-white p-4 rounded border">
        <p class="text-sm text-gray-600">YouTube – Introduction to Mandatory Notifications (VDWC)</p>
      </div>
    </div>
    
    <div class="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
      <h4 class="text-md font-semibold text-green-900 mb-3">🔑 Key Points</h4>
      <ul class="space-y-2 text-green-800">
        <li class="flex items-start">
          <span class="mr-2">•</span>
          <span>A notification is a <strong>legal duty</strong>, not an optional report.</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">•</span>
          <span>Notifiers are <strong>protected from legal or workplace repercussions</strong> when reporting in good faith.</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">•</span>
          <span>The goal is to <strong>protect clients and uphold safety</strong> in the disability sector.</span>
        </li>
      </ul>
    </div>
  </div>',
  'quiz',
  null,
  1,
  true,
  80.00,
  3,
  '00000000-0000-0000-0000-000000000001',
  now(),
  now()
);

-- Create Module 2: What Conduct Must Be Notified
INSERT INTO modules (
  course_id,
  title,
  description,
  body,
  content_type,
  content_url,
  order_index,
  is_required,
  pass_threshold_percentage,
  max_attempts,
  organization_id,
  created_at,
  updated_at
) VALUES (
  '8168fcab-00cc-45af-a865-db31af9223bf',
  'Module 2 – What Conduct Must Be Notified?',
  'Understand the specific types of conduct that must be reported to the VDWC.',
  '<div class="space-y-6">
    <div class="bg-red-50 p-6 rounded-lg border-l-4 border-red-500">
      <h3 class="text-lg font-semibold text-red-900 mb-3">Notifiable Conduct</h3>
      <p class="text-red-800 mb-4">
        Disability workers and employers must notify the VDWC if they form a <strong>reasonable belief</strong> 
        that a worker has engaged in:
      </p>
      <ul class="space-y-3 text-red-800">
        <li class="flex items-start">
          <span class="w-6 h-6 bg-red-200 rounded-full flex items-center justify-center text-red-800 text-sm font-bold mr-3 mt-0.5">1</span>
          <span><strong>Sexual misconduct</strong> in connection with their work.</span>
        </li>
        <li class="flex items-start">
          <span class="w-6 h-6 bg-red-200 rounded-full flex items-center justify-center text-red-800 text-sm font-bold mr-3 mt-0.5">2</span>
          <span><strong>Practising while intoxicated</strong> by drugs or alcohol.</span>
        </li>
        <li class="flex items-start">
          <span class="w-6 h-6 bg-red-200 rounded-full flex items-center justify-center text-red-800 text-sm font-bold mr-3 mt-0.5">3</span>
          <span><strong>Placing the public at risk</strong> due to physical or mental impairment.</span>
        </li>
        <li class="flex items-start">
          <span class="w-6 h-6 bg-red-200 rounded-full flex items-center justify-center text-red-800 text-sm font-bold mr-3 mt-0.5">4</span>
          <span><strong>Significant departure from accepted professional standards</strong> that places people at risk of harm.</span>
        </li>
      </ul>
    </div>
    
    <div class="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-500">
      <h4 class="text-md font-semibold text-orange-900 mb-3">📋 Case Scenario Example</h4>
      <div class="bg-white p-4 rounded border border-orange-200">
        <p class="text-orange-800 mb-2">
          <strong>Scenario:</strong> A worker arrives to support a client but appears to be under the influence of alcohol.
        </p>
        <p class="text-orange-900 font-semibold">
          ➤ <span class="bg-orange-200 px-2 py-1 rounded">This must be notified.</span>
        </p>
      </div>
    </div>
    
    <div class="bg-blue-50 p-6 rounded-lg">
      <h4 class="text-md font-semibold text-blue-900 mb-3">💡 Remember</h4>
      <p class="text-blue-800">
        You need a <strong>reasonable belief</strong> that notifiable conduct has occurred. 
        This means you have formed a view based on reasonable grounds, not just suspicion or gossip.
      </p>
    </div>
  </div>',
  'quiz',
  null,
  2,
  true,
  80.00,
  3,
  '00000000-0000-0000-0000-000000000001',
  now(),
  now()
);

-- Create Module 3: How and When to Notify
INSERT INTO modules (
  course_id,
  title,
  description,
  body,
  content_type,
  content_url,
  order_index,
  is_required,
  pass_threshold_percentage,
  max_attempts,
  organization_id,
  created_at,
  updated_at
) VALUES (
  '8168fcab-00cc-45af-a865-db31af9223bf',
  'Module 3 – How and When to Notify',
  'Learn the process and timeline for making mandatory notifications to the VDWC.',
  '<div class="space-y-6">
    <div class="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
      <h3 class="text-lg font-semibold text-green-900 mb-4">The Notification Process</h3>
      
      <div class="space-y-4">
        <div class="bg-white p-4 rounded border border-green-200">
          <h4 class="font-semibold text-green-900 mb-2">⏰ When to Notify</h4>
          <p class="text-green-800">
            <strong>As soon as you have a reasonable belief</strong> of notifiable conduct. 
            Do not delay or wait for more information.
          </p>
        </div>
        
        <div class="bg-white p-4 rounded border border-green-200">
          <h4 class="font-semibold text-green-900 mb-2">📝 How to Notify</h4>
          <ul class="text-green-800 space-y-1">
            <li>• Use the <strong>online notification form</strong> on the VDWC website</li>
            <li>• Or <strong>phone the Commission</strong> directly</li>
          </ul>
        </div>
        
        <div class="bg-white p-4 rounded border border-green-200">
          <h4 class="font-semibtal text-green-900 mb-2">🔍 What Happens Next</h4>
          <p class="text-green-800">
            The Commission will review the notification, assess risk, and decide if further action is required.
          </p>
        </div>
      </div>
    </div>
    
    <div class="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
      <h4 class="text-md font-semibold text-blue-900 mb-3">📚 Resources</h4>
      <div class="space-y-2">
        <a href="https://www.vdwc.vic.gov.au/notifications" 
           target="_blank" 
           class="inline-flex items-center text-blue-700 hover:text-blue-900 font-medium">
          🔗 VDWC Notification page
        </a>
        <p class="text-blue-800 text-sm">
          Visit the official Victorian Disability Worker Commission website for forms and guidance.
        </p>
      </div>
    </div>
    
    <div class="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500">
      <h4 class="text-md font-semibold text-purple-900 mb-3">🛡️ Your Protection</h4>
      <p class="text-purple-800">
        Remember: You are <strong>legally protected</strong> when making notifications in good faith. 
        It is better to report and be wrong than to not report when you should have.
      </p>
    </div>
  </div>',
  'quiz',
  null,
  3,
  true,
  80.00,
  3,
  '00000000-0000-0000-0000-000000000001',
  now(),
  now()
);