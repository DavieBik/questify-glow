# E2E Testing Documentation

## Overview

This project uses Playwright for End-to-End (E2E) testing to verify Row Level Security (RLS) policies and core application functionality across different user roles.

## Test Structure

### Test Files

| File | Purpose | Coverage |
|------|---------|----------|
| `tests/auth.spec.ts` | Authentication & navigation | Login/logout, role-based access |
| `tests/announcements.spec.ts` | Announcements RLS | Admin create, learner read-only |
| `tests/messages.spec.ts` | Messaging system | Conversations, message sending |
| `tests/group-projects.spec.ts` | Project management | Teams, submissions, collaboration |
| `tests/utils/test-helpers.ts` | Test utilities | Login helpers, common functions |

### Test Users

Tests use predefined user accounts with different roles:

```typescript
// Admin user (full access)
admin: {
  email: 'admin@skillbridge.com.au',
  password: 'SkillBridge2024!',
  role: 'admin'
}

// Learner user (limited access)
learner: {
  email: 'learner@skillbridge.com.au', 
  password: 'Learner2024!',
  role: 'learner'
}
```

## Running Tests

### Local Development

```bash
# Install Playwright browsers (first time only)
npm run test:setup

# Run all E2E tests
npm run test:e2e

# Run tests with browser UI
npm run test:e2e:headed

# Run tests with Playwright UI mode
npm run test:e2e:ui
```

### Environment Variables

Create a `.env.local` file for testing:

```bash
# Test user credentials
TEST_ADMIN_EMAIL=admin@skillbridge.com.au
TEST_ADMIN_PASSWORD=SkillBridge2024!
TEST_LEARNER_EMAIL=learner@skillbridge.com.au
TEST_LEARNER_PASSWORD=Learner2024!

# Test environment
PLAYWRIGHT_BASE_URL=http://localhost:5173
```

## Test Scenarios

### Authentication Tests (`auth.spec.ts`)

- ✅ User can login and access dashboard
- ✅ Admin can access admin pages
- ✅ Learner cannot access admin pages
- ✅ Protected routes redirect unauthenticated users
- ✅ User logout works correctly

### Announcements RLS Tests (`announcements.spec.ts`)

- ✅ Admin can view ≥1 announcements (from seeding)
- ✅ Admin can create new announcements
- ✅ Learner can read announcements
- ✅ Learner cannot create announcements (403 or UI error)
- ✅ Unauthenticated users are redirected

### Messages Tests (`messages.spec.ts`)

- ✅ Shows seeded conversations + messages
- ✅ User can send messages in conversations
- ✅ Message interface is accessible
- ✅ Unauthenticated users are redirected

### Group Projects Tests (`group-projects.spec.ts`)

- ✅ Shows seeded projects/teams
- ✅ User can view team details
- ✅ User can create/join teams (if feature exists)
- ✅ Project submissions work correctly
- ✅ Unauthenticated users are redirected

## CI/CD Integration

### GitHub Actions Workflow

The CI pipeline runs E2E tests automatically:

1. **Build** - Creates production build
2. **Test Setup** - Installs Playwright browsers
3. **Test Execution** - Runs all E2E tests in headless mode
4. **Failure Handling** - Uploads screenshots and reports on failure
5. **Deployment Gate** - Blocks deployment if tests fail

### Secrets Configuration

Add these secrets to your GitHub repository:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Test User Credentials  
TEST_ADMIN_EMAIL=admin@skillbridge.com.au
TEST_ADMIN_PASSWORD=SkillBridge2024!
TEST_LEARNER_EMAIL=learner@skillbridge.com.au
TEST_LEARNER_PASSWORD=Learner2024!
```

### Build Failure Policy

The CI pipeline **fails the build** on:
- Any test failure
- Authentication errors
- RLS policy violations
- Page load errors
- JavaScript console errors (unexpected)

## Database Requirements

### Required Seed Data

For tests to pass, the database must contain:

1. **Test Users**:
   - Admin user with management permissions
   - Learner user with student permissions

2. **Sample Data**:
   - At least 1 announcement (for read tests)
   - At least 1 conversation with messages
   - At least 1 project with team structure

3. **RLS Policies**:
   - Announcements: Admin can CRUD, learners can read
   - Messages: Users can access their conversations
   - Projects: Team members can access their projects

### Seeding for Tests

Use the seeding script to ensure test data exists:

```bash
# Create test users and sample data
node scripts/seed-single.js

# Verify test users exist
node scripts/verify-test-data.js
```

## Debugging Test Failures

### Common Issues

**Authentication Failures**
- Check test user credentials in environment variables
- Verify users exist in Supabase Auth
- Check Supabase URL configuration

**RLS Policy Failures**
- Verify database policies match expected behavior
- Check user roles are correctly assigned
- Test policies manually in Supabase dashboard

**Page Load Errors**
- Check for JavaScript console errors
- Verify all required environment variables are set
- Test pages manually in development

### Debug Mode

Run tests with debug information:

```bash
# Show browser during tests
npm run test:e2e:headed

# Generate detailed trace files
PLAYWRIGHT_DEBUG=1 npm run test:e2e

# Run specific test file
npx playwright test tests/announcements.spec.ts --headed
```

### Test Reports

After test execution, view detailed reports:

```bash
# Open HTML report
npx playwright show-report

# View screenshots and traces
ls test-results/
```

## Best Practices

### Writing Tests

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always logout between tests
3. **Timeouts**: Use appropriate waits for network requests
4. **Assertions**: Test both positive and negative cases
5. **Error Handling**: Expect and verify error conditions

### Maintenance

1. **Update Credentials**: Rotate test user passwords regularly
2. **Seed Data**: Keep test data fresh and realistic
3. **Browser Updates**: Update Playwright browsers monthly
4. **Policy Changes**: Update tests when RLS policies change

### Performance

1. **Parallel Execution**: Tests run in parallel by default
2. **Selective Running**: Run specific test suites during development
3. **Headless Mode**: Use headless mode in CI for speed
4. **Resource Cleanup**: Ensure tests don't leave artifacts

## Troubleshooting

### Test Environment Issues

**Port Conflicts**
```bash
# Check if port 5173 is in use
lsof -i :5173

# Kill existing processes
kill -9 $(lsof -t -i:5173)
```

**Database Connection**
```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
  "https://your-project.supabase.co/rest/v1/users?select=count"
```

**Permission Errors**
```bash
# Check RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### Getting Help

1. Check test output for specific error messages
2. Review Playwright documentation for API issues
3. Verify database state matches test expectations
4. Run tests in headed mode to see browser interactions
5. Check GitHub Actions logs for CI-specific issues

---

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)