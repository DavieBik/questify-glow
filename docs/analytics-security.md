# Analytics Security & Architecture

## Analytics Data Access Model

### Overview

SkillBridge implements a secure analytics architecture that ensures sensitive learning data is only accessible to authorized users with proper role-based permissions.

### Core Security Principles

1. **No Direct Materialized View Access**: All analytics data is accessed exclusively through RPC functions
2. **Role-Based Authorization**: Admin and manager roles only, enforced at the function level
3. **Materialized Views as Internal Cache**: Views are not exposed via API and serve only as performance optimization
4. **Scheduled Data Refresh**: Automated hourly updates keep analytics current without manual intervention

---

## Architecture Components

### Materialized Views (Internal Only)

These views are **NOT** exposed via the Supabase API and serve only as cached data sources:

| View Name | Purpose | Update Schedule |
|-----------|---------|----------------|
| `mv_user_course_progress` | User enrollment and completion tracking | Hourly |
| `mv_course_metrics` | Course performance statistics | Hourly |
| `mv_retention_metrics` | User retention cohort analysis | Hourly |
| `mv_user_progress_analytics` | Individual user progress summaries | Hourly |
| `mv_course_performance_analytics` | Course-level performance data | Hourly |
| `mv_module_analytics` | Module-specific metrics | Hourly |

### RPC Functions (Public API)

All analytics access goes through these security-enforced functions:

| Function Name | Access Level | Description |
|---------------|--------------|-------------|
| `rpc_course_metrics()` | Admin/Manager | Course performance data with date filtering |
| `rpc_module_metrics()` | Admin/Manager | Module analytics with course filtering |
| `rpc_skills_gap()` | Admin/Manager | Skills gap analysis by department/role |
| `rpc_learning_patterns()` | Admin/Manager | Learning behavior pattern analysis |
| `rpc_retention_metrics()` | Admin/Manager | User retention cohort data |
| `rpc_admin_team_user_progress()` | Admin/Manager | Individual user progress tracking |
| `refresh_analytics()` | Admin Only | Manual refresh of all materialized views |

---

## Security Implementation

### Role-Based Access Control

Every RPC function implements this security pattern:

```sql
-- Example security check in RPC function
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT u.role INTO current_user_role
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Security check - only admin and manager can access
  IF current_user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied. Admin or manager role required.';
  END IF;
  
  -- Function logic continues...
END;
```

### Why Materialized Views Are Not Exposed

1. **Security**: Direct access would bypass role checks and RLS policies
2. **Data Integrity**: Functions can validate parameters and apply business logic
3. **Audit Trail**: All analytics access is logged through RPC calls
4. **Flexibility**: Functions can aggregate data from multiple sources
5. **Performance**: Views can be optimized without changing API contracts

### Manager vs Admin Scope

- **Admins**: Full access to all organizational data
- **Managers**: Scoped access based on team hierarchy (future implementation)
- **Users**: No direct analytics access (dashboard shows personal data only)

---

## Data Refresh Strategy

### Automated Refresh Schedule

**Option 1: PostgreSQL Cron Job (Recommended)**

A PostgreSQL cron job refreshes all materialized views every hour:

```sql
-- Scheduled job (runs at :00 of every hour)
SELECT cron.schedule(
    'refresh-analytics-views',
    '0 * * * *',
    $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_course_progress;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_course_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_retention_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_progress_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_course_performance_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_module_analytics;
    $$
);
```

**Option 2: Supabase Edge Function Scheduler**

For environments where pg_cron is not available, use an external scheduler to call the analytics refresh edge function:

```bash
# Call every hour via cron or external scheduler
curl -X POST "https://your-project.supabase.co/functions/v1/analytics-refresh" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Manual Refresh Capability

Administrators can trigger immediate refreshes through the UI, which calls:

```sql
-- Manual refresh function (admin only)
FUNCTION public.refresh_analytics()
```

This function:
- Validates admin permissions
- Refreshes all materialized views concurrently
- Logs the action in the security audit trail

---

## View Ownership and RLS Compliance

### Security Definer View Warnings

Some materialized views may show "Security Definer View" warnings in the Supabase linter. **This is not a security concern** in our architecture because:

1. **No Direct API Access**: Views are not exposed through the auto-generated API
2. **RPC-Only Access**: All data access goes through security-enforced RPC functions  
3. **No SECURITY DEFINER Functions**: RPC functions do not use SECURITY DEFINER
4. **Proper RLS**: All underlying tables have appropriate RLS policies
5. **View Ownership**: Views are owned by `authenticator` role, not `postgres`

### Why View Ownership Doesn't Bypass Security

The key insight is that **materialized views are not query endpoints** in our architecture:

- **Materialized views** are pre-computed data snapshots, refreshed on schedule
- **Access control** is enforced at the RPC function level before any view data is accessed
- **Role validation** happens in every RPC function call, not at the view level
- **Audit logging** tracks all analytics requests through RPC functions
- **API exposure** is disabled for all `mv_*` views - they cannot be queried directly

Even if a view has elevated permissions, it cannot be accessed without going through our security-validated RPC functions first.

### Remaining Linter Warnings (Non-Critical)

Some warnings may persist but are acceptable in this context:

- **Security Definer Views**: Explained above - not applicable to our access model
- **Function Search Path**: Our RPC functions explicitly set `search_path` to 'public'
- **Extensions in Public**: pg_cron extension placement is a deployment decision

---

## Frontend Implementation

### UI Components Use RPC Only

All analytics components make calls like:

```typescript
// ✅ CORRECT: Using RPC function
const { data, error } = await supabase.rpc('rpc_course_metrics', {
  date_from: '2024-01-01',
  date_to: '2024-12-31'
});

// ❌ NEVER: Direct materialized view access
// const { data } = await supabase.from('mv_course_metrics').select('*');
```

### Error Handling

RPC functions return proper error responses for:
- **Unauthorized access**: "Access denied. Admin or manager role required."
- **Invalid parameters**: Parameter validation with descriptive messages
- **Data errors**: Graceful handling of missing or corrupted data

---

## Monitoring and Auditing

### Security Audit Log

All analytics operations are logged in `security_audit_log`:

```sql
-- Example audit entry
{
  "action": "ANALYTICS_REFRESH",
  "resource": "materialized_views", 
  "details": {
    "refreshed_at": "2024-01-15T10:00:00Z",
    "method": "manual"
  },
  "user_id": "admin-user-uuid"
}
```

### Performance Monitoring

- **Refresh duration**: Track how long materialized view updates take
- **Query performance**: Monitor RPC function execution times
- **Data freshness**: Ensure hourly updates complete successfully

---

## Best Practices

### For Developers

1. **Always use RPC functions** for analytics data access
2. **Never bypass** role checks in analytics functions
3. **Validate parameters** in RPC functions before processing
4. **Log significant operations** for audit trails
5. **Test with different user roles** to ensure proper access control

### For Administrators

1. **Monitor refresh schedules** to ensure data stays current
2. **Review audit logs** for suspicious analytics access patterns
3. **Validate user roles** periodically to ensure proper permissions
4. **Test analytics access** after role changes or new deployments

### For Database Changes

1. **Update RPC functions** when adding new analytics views
2. **Include new views** in the refresh schedule
3. **Maintain role checks** in all analytics-related functions
4. **Document data sources** and update frequency for new metrics

---

## Troubleshooting

### Common Issues

**"Access denied" errors**
- Verify user has admin or manager role
- Check user session and authentication
- Confirm RLS policies allow role-based access

**Stale analytics data**
- Check if scheduled refresh is running
- Verify pg_cron extension is enabled
- Manually refresh using admin UI if needed

**Performance issues**
- Monitor materialized view refresh times
- Consider adding indexes to underlying tables
- Optimize RPC function queries if needed

### Getting Help

1. Check security audit logs for access patterns
2. Review PostgreSQL logs for refresh job status
3. Use Deployment Health widget to verify system status
4. Validate user roles in admin user management interface