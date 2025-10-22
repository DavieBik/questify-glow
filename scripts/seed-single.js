import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || 
    SUPABASE_URL === 'YOUR_SUPABASE_URL' || 
    SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
  console.error('❌ Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedSingleTenant() {
  console.log('🌱 Starting single-tenant database seeding...\n');

  try {
    // 1. Create default organization and set app settings
    console.log('📋 Setting up default organization...');
    
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Demo Learning Organization',
        slug: 'demo-org',
        contact_email: 'admin@demo-org.com',
        primary_color: '#059669',
        max_users: 100
      })
      .select()
      .single();

    if (orgError) throw orgError;
    console.log(`✅ Created organization: ${org.name} (${org.id})`);

    // Set default org in app settings
    const { error: settingsError } = await supabase
      .from('app_settings')
      .upsert({
        id: 1,
        default_org_id: org.id
      });

    if (settingsError) throw settingsError;
    console.log('✅ Updated app settings with default org\n');

    // 2. Create admin user
    console.log('👤 Creating admin user...');
    
    const adminEmail = 'admin@demo-org.com';
    const adminPassword = 'admin123!';
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Admin',
        last_name: 'User'
      }
    });

    if (authError) throw authError;

    // Create user profile
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: adminEmail,
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        organization_id: org.id,
        is_active: true
      });

    if (userError) throw userError;
    console.log(`✅ Created admin user: ${adminEmail}`);
    console.log(`🔑 Admin credentials: ${adminEmail} / ${adminPassword}\n`);

    // 3. Create demo departments
    console.log('🏢 Creating demo departments...');
    
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .insert([
        { name: 'Human Resources', organization_id: org.id },
        { name: 'Customer Service', organization_id: org.id },
        { name: 'Operations', organization_id: org.id },
        { name: 'Management', organization_id: org.id }
      ])
      .select();

    if (deptError) throw deptError;
    console.log(`✅ Created ${departments.length} departments\n`);

    // 4. Create demo users
    console.log('👥 Creating demo users...');
    
    const demoUsers = [
      { email: 'manager@demo-org.com', firstName: 'Sarah', lastName: 'Wilson', role: 'manager', dept: 'Management' },
      { email: 'john.smith@demo-org.com', firstName: 'John', lastName: 'Smith', role: 'worker', dept: 'Customer Service' },
      { email: 'mary.jones@demo-org.com', firstName: 'Mary', lastName: 'Jones', role: 'worker', dept: 'Human Resources' },
      { email: 'bob.davis@demo-org.com', firstName: 'Bob', lastName: 'Davis', role: 'worker', dept: 'Operations' }
    ];

    for (const user of demoUsers) {
      const { data: newAuthUser } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'password123!',
        email_confirm: true,
        user_metadata: {
          first_name: user.firstName,
          last_name: user.lastName
        }
      });

      if (newAuthUser?.user) {
        await supabase
          .from('users')
          .insert({
            id: newAuthUser.user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            role: user.role,
            department: user.dept,
            organization_id: org.id,
            is_active: true
          });
      }
    }
    console.log(`✅ Created ${demoUsers.length} demo users\n`);

    // 5. Create demo courses
    console.log('📚 Creating demo courses...');
    
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .insert([
        {
          title: 'NDIS Code of Conduct',
          description: 'Understanding the NDIS Code of Conduct and professional standards',
          short_description: 'Essential NDIS compliance training',
          category: 'compliance',
          difficulty: 'beginner',
          is_mandatory: true,
          ndis_compliant: true,
          estimated_duration_minutes: 45,
          organization_id: org.id
        },
        {
          title: 'Privacy and Confidentiality',
          description: 'Protecting client privacy and maintaining confidentiality',
          short_description: 'Privacy protection fundamentals',
          category: 'compliance',
          difficulty: 'beginner',
          is_mandatory: true,
          ndis_compliant: true,
          estimated_duration_minutes: 30,
          organization_id: org.id
        },
        {
          title: 'Person-Centered Support',
          description: 'Delivering person-centered support and building relationships',
          short_description: 'Advanced support techniques',
          category: 'skills',
          difficulty: 'intermediate',
          is_mandatory: false,
          ndis_compliant: true,
          estimated_duration_minutes: 60,
          organization_id: org.id
        },
        {
          title: 'Emergency Procedures',
          description: 'Responding to emergencies and critical incidents',
          short_description: 'Emergency response training',
          category: 'safety',
          difficulty: 'intermediate',
          is_mandatory: true,
          ndis_compliant: true,
          estimated_duration_minutes: 40,
          organization_id: org.id
        }
      ])
      .select();

    if (coursesError) throw coursesError;
    console.log(`✅ Created ${courses.length} courses\n`);

    // 6. Create modules for each course
    console.log('📖 Creating course modules...');
    
    const modules = [];
    for (const course of courses) {
      const courseModules = [
        {
          title: `${course.title} - Introduction`,
          description: `Introduction to ${course.title}`,
          content_type: 'text',
          body: `<h1>Welcome to ${course.title}</h1><p>This module covers the fundamentals of ${course.title.toLowerCase()}.</p>`,
          course_id: course.id,
          organization_id: org.id,
          order_index: 1,
          is_required: true
        },
        {
          title: `${course.title} - Core Concepts`,
          description: `Core concepts and practices`,
          content_type: 'text',
          body: `<h1>Core Concepts</h1><p>Learn the essential concepts and best practices.</p>`,
          course_id: course.id,
          organization_id: org.id,
          order_index: 2,
          is_required: true
        },
        {
          title: `${course.title} - Assessment`,
          description: `Knowledge assessment`,
          content_type: 'quiz',
          body: `<h1>Assessment</h1><p>Test your knowledge with this assessment.</p>`,
          course_id: course.id,
          organization_id: org.id,
          order_index: 3,
          is_required: true
        }
      ];
      modules.push(...courseModules);
    }

    const { error: modulesError } = await supabase
      .from('modules')
      .insert(modules);

    if (modulesError) throw modulesError;
    console.log(`✅ Created ${modules.length} modules\n`);

    // 7. Create curricula
    console.log('🎓 Creating curricula...');
    
    const { data: curricula, error: curriculaError } = await supabase
      .from('curricula')
      .insert([
        {
          name: 'Core Disability Worker Compliance (Annual)',
          description: 'Essential annual compliance training for all disability support workers',
          organization_id: org.id,
          created_by: authUser.user.id
        },
        {
          name: 'Advanced Support Skills',
          description: 'Advanced training for experienced support workers',
          organization_id: org.id,
          created_by: authUser.user.id
        }
      ])
      .select();

    if (curriculaError) throw curriculaError;

    // Add courses to curricula
    const curriculumItems = [
      // Core compliance curriculum
      { curriculum_id: curricula[0].id, course_id: courses[0].id, position: 1, due_days_offset: 30 },
      { curriculum_id: curricula[0].id, course_id: courses[1].id, position: 2, due_days_offset: 60 },
      { curriculum_id: curricula[0].id, course_id: courses[3].id, position: 3, due_days_offset: 90 },
      
      // Advanced skills curriculum
      { curriculum_id: curricula[1].id, course_id: courses[2].id, position: 1, due_days_offset: 14 },
      { curriculum_id: curricula[1].id, course_id: courses[3].id, position: 2, due_days_offset: 28 }
    ];

    const { error: itemsError } = await supabase
      .from('curriculum_items')
      .insert(curriculumItems);

    if (itemsError) throw itemsError;
    console.log(`✅ Created ${curricula.length} curricula with ${curriculumItems.length} items\n`);

    // 8. Create sample enrollments
    console.log('📝 Creating sample enrollments...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .neq('role', 'admin');

    if (usersError) throw usersError;

    const enrollments = [];
    for (const user of users) {
      // Enroll each user in mandatory courses
      const mandatoryCourses = courses.filter(c => c.is_mandatory);
      for (const course of mandatoryCourses) {
        enrollments.push({
          user_id: user.id,
          course_id: course.id,
          status: 'enrolled',
          enrollment_date: new Date().toISOString()
        });
      }
    }

    const { error: enrollError } = await supabase
      .from('user_course_enrollments')
      .insert(enrollments);

    if (enrollError) throw enrollError;
    console.log(`✅ Created ${enrollments.length} enrollments\n`);

    // 9. Create announcements
    console.log('📢 Creating announcements...');
    
    const { error: announcementsError } = await supabase
      .from('announcements')
      .insert([
        {
          title: 'Welcome to the Learning Platform',
          content: 'Welcome to our new learning management system! Please complete your mandatory training courses within the specified timeframes.',
          priority: 'high',
          is_pinned: true,
          created_by: authUser.user.id,
          organization_id: org.id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        },
        {
          title: 'New Course Available: Person-Centered Support',
          content: 'We have added a new advanced course on person-centered support. This course is optional but highly recommended for experienced workers.',
          priority: 'normal',
          is_pinned: false,
          created_by: authUser.user.id,
          organization_id: org.id,
          course_id: courses.find(c => c.title === 'Person-Centered Support')?.id
        }
      ]);

    if (announcementsError) throw announcementsError;
    console.log('✅ Created announcements\n');

    // 10. Set up branding defaults
    console.log('🎨 Setting up branding defaults...');
    
    const { error: brandingError } = await supabase
      .from('org_branding')
      .upsert({
        organization_id: org.id,
        primary_color: '#059669',
        external_link_title: 'Company Portal',
        external_link_url: 'https://example.com'
      });

    if (brandingError) throw brandingError;
    console.log('✅ Set up branding defaults\n');

    // Success summary
    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • Organization: ${org.name}`);
    console.log(`   • Admin user: ${adminEmail} (password: ${adminPassword})`);
    console.log(`   • Demo users: ${demoUsers.length}`);
    console.log(`   • Departments: ${departments.length}`);
    console.log(`   • Courses: ${courses.length}`);
    console.log(`   • Modules: ${modules.length}`);
    console.log(`   • Curricula: ${curricula.length}`);
    console.log(`   • Enrollments: ${enrollments.length}`);
    console.log(`   • Announcements: 2`);
    console.log('\n🔗 Next steps:');
    console.log('   1. Update your Supabase Auth settings (redirect URLs)');
    console.log('   2. Sign in as admin to explore the platform');
    console.log('   3. Customize branding and add your own content\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedSingleTenant();