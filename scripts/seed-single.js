#!/usr/bin/env node

/**
 * Single-tenant seeding script for SkillBridge
 * 
 * This script sets up a fresh SkillBridge deployment with:
 * - Default organization
 * - Admin user
 * - Sample courses and content
 * 
 * Usage: node scripts/seed-single.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Organization configuration
const ORG_CONFIG = {
  ORG_ID: process.env.ORG_ID || '00000000-0000-0000-0000-000000000001',
  ORG_NAME: process.env.ORG_NAME || 'SkillBridge Learning',
  ORG_SLUG: process.env.ORG_SLUG || 'skillbridge',
  ORG_CONTACT_EMAIL: process.env.ORG_CONTACT_EMAIL || 'admin@skillbridge.com.au',
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL || 'admin@skillbridge.com.au',
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD || 'SkillBridge2024!',
  DEFAULT_ADMIN_FIRST_NAME: process.env.DEFAULT_ADMIN_FIRST_NAME || 'System',
  DEFAULT_ADMIN_LAST_NAME: process.env.DEFAULT_ADMIN_LAST_NAME || 'Administrator',
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedSingleTenant() {
  console.log('🌱 Starting single-tenant seeding...');
  console.log(`📋 Organization: ${ORG_CONFIG.ORG_NAME} (${ORG_CONFIG.ORG_SLUG})`);

  try {
    // 1. Ensure organization exists
    console.log('🏢 Setting up organization...');
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', ORG_CONFIG.ORG_ID)
      .maybeSingle();

    if (!existingOrg) {
      const { error: orgError } = await supabase
        .from('organizations')
        .insert({
          id: ORG_CONFIG.ORG_ID,
          name: ORG_CONFIG.ORG_NAME,
          slug: ORG_CONFIG.ORG_SLUG,
          contact_email: ORG_CONFIG.ORG_CONTACT_EMAIL,
          subscription_plan: 'enterprise',
          max_users: 999,
          is_active: true,
          primary_color: '#059669'
        });

      if (orgError) throw orgError;
      console.log('✅ Organization created');
    } else {
      console.log('✅ Organization already exists');
    }

    // 1.5. Ensure app_settings has the correct default org
    console.log('⚙️ Setting up app settings...');
    const { error: appSettingsError } = await supabase
      .from('app_settings')
      .upsert({
        id: 1,
        default_org_id: ORG_CONFIG.ORG_ID
      });

    if (appSettingsError) throw appSettingsError;
    console.log('✅ App settings configured');

    // 2. Create admin user
    console.log('👤 Setting up admin user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ORG_CONFIG.DEFAULT_ADMIN_EMAIL,
      password: ORG_CONFIG.DEFAULT_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: ORG_CONFIG.DEFAULT_ADMIN_FIRST_NAME,
        last_name: ORG_CONFIG.DEFAULT_ADMIN_LAST_NAME
      }
    });

    if (authError && !authError.message.includes('already been registered')) {
      throw authError;
    }

    const userId = authData?.user?.id;
    if (userId) {
      // Add user to users table
      await supabase
        .from('users')
        .upsert({
          id: userId,
          email: ORG_CONFIG.DEFAULT_ADMIN_EMAIL,
          first_name: ORG_CONFIG.DEFAULT_ADMIN_FIRST_NAME,
          last_name: ORG_CONFIG.DEFAULT_ADMIN_LAST_NAME,
          role: 'admin',
          organization_id: ORG_CONFIG.ORG_ID,
          is_active: true,
          password_hash: 'hashed'
        }, { onConflict: 'id' });

      // Add to org_members
      await supabase
        .from('org_members')
        .upsert({
          organization_id: ORG_CONFIG.ORG_ID,
          user_id: userId,
          role: 'admin'
        }, { onConflict: 'organization_id,user_id' });

      console.log('✅ Admin user created/updated');
    }

    // 3. Create sample departments
    console.log('🏢 Setting up departments...');
    const departments = [
      { name: 'Administration', organization_id: ORG_CONFIG.ORG_ID },
      { name: 'Support Staff', organization_id: ORG_CONFIG.ORG_ID },
      { name: 'Management', organization_id: ORG_CONFIG.ORG_ID }
    ];

    for (const dept of departments) {
      await supabase
        .from('departments')
        .upsert(dept, { onConflict: 'name,organization_id' });
    }
    console.log('✅ Departments created');

    // 4. Create sample courses
    console.log('📚 Setting up sample courses...');
    const courses = [
      {
        title: 'NDIS Worker Orientation',
        description: 'Essential training for new NDIS support workers',
        short_description: 'NDIS basics for new workers',
        category: 'Orientation',
        difficulty: 'beginner',
        estimated_duration_minutes: 120,
        is_mandatory: true,
        is_active: true,
        organization_id: ORG_CONFIG.ORG_ID,
        visibility_type: 'private'
      },
      {
        title: 'Person-Centered Approach',
        description: 'Understanding and implementing person-centered support practices',
        short_description: 'Person-centered support fundamentals',
        category: 'Core Skills',
        difficulty: 'intermediate',
        estimated_duration_minutes: 90,
        is_mandatory: true,
        is_active: true,
        organization_id: ORG_CONFIG.ORG_ID,
        visibility_type: 'private'
      },
      {
        title: 'Communication Skills',
        description: 'Effective communication techniques for disability support',
        short_description: 'Communication in disability support',
        category: 'Core Skills',
        difficulty: 'beginner',
        estimated_duration_minutes: 60,
        is_mandatory: false,
        is_active: true,
        organization_id: ORG_CONFIG.ORG_ID,
        visibility_type: 'private'
      }
    ];

    for (const course of courses) {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .upsert(course, { 
          onConflict: 'title,organization_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (courseError) {
        console.warn(`⚠️ Course creation warning: ${courseError.message}`);
        continue;
      }

      // Add sample modules for each course
      const modules = [
        {
          course_id: courseData.id,
          title: 'Introduction',
          description: 'Course introduction and overview',
          content_type: 'video',
          order_index: 1,
          is_required: true,
          organization_id: ORG_CONFIG.ORG_ID
        },
        {
          course_id: courseData.id,
          title: 'Knowledge Check',
          description: 'Test your understanding',
          content_type: 'quiz',
          order_index: 2,
          is_required: true,
          organization_id: ORG_CONFIG.ORG_ID
        }
      ];

      for (const module of modules) {
        await supabase
          .from('modules')
          .upsert(module, { onConflict: 'course_id,order_index' });
      }
    }
    console.log('✅ Sample courses and modules created');

    // 5. Create sample announcements
    console.log('📢 Setting up announcements...');
    await supabase
      .from('announcements')
      .upsert({
        title: 'Welcome to SkillBridge',
        content: 'Welcome to your new learning management system! Explore the courses and start your learning journey.',
        priority: 'high',
        is_pinned: true,
        organization_id: ORG_CONFIG.ORG_ID,
        created_by: userId
      }, { onConflict: 'title,organization_id' });
    console.log('✅ Sample announcements created');

    console.log('\n🎉 Single-tenant seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Organization: ${ORG_CONFIG.ORG_NAME}`);
    console.log(`   Admin Email: ${ORG_CONFIG.DEFAULT_ADMIN_EMAIL}`);
    console.log(`   Admin Password: ${ORG_CONFIG.DEFAULT_ADMIN_PASSWORD}`);
    console.log(`   Courses: ${courses.length} sample courses created`);
    console.log(`   Departments: ${departments.length} departments created`);
    console.log('\n🚀 Your SkillBridge instance is ready to use!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedSingleTenant();