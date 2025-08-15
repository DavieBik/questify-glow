# Deployment Health Widget

## Overview
The Deployment Health widget provides system administrators with a comprehensive view of the application's deployment status, data integrity, and system health metrics.

## Features

### Core Metrics
- **Organization ID**: Current default organization ID from `get_default_org_id()`
- **Data Counts**: Real-time counts of users, announcements, conversations, and projects
- **App Version**: Current application version and Git SHA
- **Migration Status**: Last applied database migration
- **Seed Status**: Database seeding status (seeded/partial/empty/unknown)

### Error Handling
- **Failed Query Detection**: Automatically detects RLS or environment issues
- **Red Badge Alerts**: Failed table queries are highlighted with red error badges
- **Error Summary**: Consolidated view of all failed queries at the bottom

### Status Indicators
- ✅ **Green/OK**: Query successful, data available
- 🔄 **Loading**: Query in progress
- ⚠️ **Error**: Query failed due to RLS or environment issues
- 📊 **Status Badges**: Visual indicators for seed status and system health

## Implementation

### Component Structure
```
src/components/admin/DeploymentHealthCard.tsx
```

### Database Queries
The widget performs the following queries with error handling:
- `supabase.rpc('get_default_org_id')` - Organization ID
- `supabase.from('users').select('*', { count: 'exact', head: true })` - User count
- `supabase.from('announcements').select('*', { count: 'exact', head: true })` - Announcement count
- `supabase.from('conversations').select('*', { count: 'exact', head: true })` - Conversation count
- `supabase.from('projects').select('*', { count: 'exact', head: true })` - Project count

### Seed Status Detection
Checks for the presence of:
1. Default organization in `organizations` table
2. Courses in `courses` table
3. Determines status: seeded/partial/empty/unknown

## Usage

### Admin Dashboard Integration
The widget is automatically included in the Admin Dashboard at:
```
/admin (AdminDashboard component)
```

### Access Control
- **Admin Only**: Only users with admin role can access this widget
- **RLS Protected**: All queries respect Row Level Security policies
- **Error Graceful**: Failed queries don't break the entire widget

## Troubleshooting

### Common Issues
1. **Red Error Badges**: Indicates RLS policy restrictions or missing permissions
2. **Unknown Seed Status**: Database connection issues or missing tables
3. **Failed Org ID**: `get_default_org_id()` function not available or returns null

### Error Resolution
- Check user permissions and admin role assignment
- Verify RLS policies allow admin access to required tables
- Ensure database functions are properly deployed
- Confirm organization seeding has completed

## Future Enhancements
- Real migration history tracking
- Performance metrics integration
- Automated health checks
- Alert system for critical failures