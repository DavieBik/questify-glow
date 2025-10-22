#!/usr/bin/env node

/**
 * Organization data truncation script for SkillBridge
 * 
 * This script safely removes all demo/test data while preserving
 * the organization structure for fresh demos or testing.
 * 
 * WARNING: This will delete all user data, courses, enrollments, etc.
 * Only use this on development/demo environments!
 * 
 * Usage: node scripts/truncate-org.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import readline from 'readline';

// Load environment variables
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function truncateOrganizationData() {
  console.log('🚨 DANGER: Organization Data Truncation');
  console.log('==========================================');
  console.log('This will DELETE ALL of the following:');
  console.log('  • All user accounts (except system)');
  console.log('  • All courses and modules');
  console.log('  • All enrollments and completions');
  console.log('  • All messages and conversations');
  console.log('  • All announcements');
  console.log('  • All certificates');
  console.log('  • All forums and posts');
  console.log('  • All projects and submissions');
  console.log('  • All departments');
  console.log('  • All badges and user badges');
  console.log('');
  console.log('The organization structure will be preserved.');
  console.log('');

  const confirmation1 = await askQuestion('Are you absolutely sure? (type "yes" to continue): ');
  if (confirmation1.toLowerCase() !== 'yes') {
    console.log('❌ Aborted');
    rl.close();
    return;
  }

  const confirmation2 = await askQuestion('This action cannot be undone. Type "DELETE ALL DATA" to proceed: ');
  if (confirmation2 !== 'DELETE ALL DATA') {
    console.log('❌ Aborted');
    rl.close();
    return;
  }

  rl.close();

  console.log('🧹 Starting data truncation...');

  try {
    // Get the organization ID
    const orgId = process.env.ORG_ID || '00000000-0000-0000-0000-000000000001';

    // Delete in order of dependencies (children first)
    console.log('🗑️  Deleting user completions...');
    await supabase.from('completions').delete().neq('id', '');

    console.log('🗑️  Deleting quiz data...');
    await supabase.from('quiz_answer_options').delete().neq('id', '');
    await supabase.from('quiz_questions').delete().neq('id', '');

    console.log('🗑️  Deleting course enrollments...');
    await supabase.from('user_course_enrollments').delete().neq('id', '');

    console.log('🗑️  Deleting certificates...');
    await supabase.from('certificates').delete().neq('id', '');

    console.log('🗑️  Deleting user badges...');
    await supabase.from('user_badges').delete().neq('id', '');

    console.log('🗑️  Deleting project submissions and reviews...');
    await supabase.from('peer_reviews').delete().neq('id', '');
    await supabase.from('project_submissions').delete().neq('id', '');

    console.log('🗑️  Deleting team memberships...');
    await supabase.from('team_members').delete().neq('id', '');
    await supabase.from('project_teams').delete().neq('id', '');

    console.log('🗑️  Deleting group memberships...');
    await supabase.from('group_members').delete().neq('id', '');

    console.log('🗑️  Deleting session RSVPs...');
    await supabase.from('session_rsvps').delete().neq('id', '');

    console.log('🗑️  Deleting forum posts...');
    await supabase.from('forum_posts').delete().neq('id', '');

    console.log('🗑️  Deleting messages and conversations...');
    await supabase.from('messages').delete().neq('id', '');
    await supabase.from('conversation_participants').delete().neq('id', '');
    await supabase.from('conversations').delete().neq('id', '');

    console.log('🗑️  Deleting announcement reads...');
    await supabase.from('announcement_reads').delete().neq('id', '');

    console.log('🗑️  Deleting user departments...');
    await supabase.from('user_departments').delete().neq('id', '');

    console.log('🗑️  Deleting main content...');
    await supabase.from('modules').delete().eq('organization_id', orgId);
    await supabase.from('courses').delete().eq('organization_id', orgId);
    await supabase.from('projects').delete().eq('organization_id', orgId);
    await supabase.from('groups').delete().eq('organization_id', orgId);
    await supabase.from('forums').delete().eq('organization_id', orgId);
    await supabase.from('sessions').delete().eq('organization_id', orgId);
    await supabase.from('announcements').delete().eq('organization_id', orgId);
    await supabase.from('departments').delete().eq('organization_id', orgId);

    console.log('🗑️  Deleting badges...');
    await supabase.from('badges').delete().neq('id', '');

    console.log('🗑️  Deleting bulk jobs...');
    await supabase.from('bulk_jobs').delete().eq('organization_id', orgId);

    console.log('🗑️  Deleting content imports...');
    await supabase.from('content_imports').delete().eq('organization_id', orgId);

    console.log('🗑️  Deleting analytics reports...');
    await supabase.from('analytics_saved_reports').delete().neq('id', '');

    console.log('🗑️  Deleting organization members...');
    await supabase.from('org_members').delete().eq('organization_id', orgId);

    console.log('🗑️  Deleting users...');
    await supabase.from('users').delete().eq('organization_id', orgId);

    // Delete auth users (this will cascade)
    console.log('🗑️  Deleting auth users...');
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    if (authUsers?.users) {
      for (const user of authUsers.users) {
        try {
          await supabase.auth.admin.deleteUser(user.id);
        } catch (error) {
          console.warn(`⚠️  Could not delete user ${user.email}: ${error.message}`);
        }
      }
    }

    console.log('✅ Data truncation completed successfully!');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Run "node scripts/seed-single.js" to set up fresh data');
    console.log('   2. Or manually create users and content through the UI');
    console.log('');
    console.log('🏢 Organization structure preserved and ready for new data.');

  } catch (error) {
    console.error('❌ Truncation failed:', error);
    process.exit(1);
  }
}

// Run the truncation
truncateOrganizationData();