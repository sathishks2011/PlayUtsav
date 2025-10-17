# Session Soft Delete Feature

## Overview
Implemented soft delete functionality for game sessions, allowing hosts to archive inactive sessions while preserving data for analytics and potential recovery.

## What is Soft Delete?
Soft delete marks records as deleted by setting a `deletedAt` timestamp instead of permanently removing them from the database. This provides:
- **Data Preservation**: Keep session history for analytics and reporting
- **Recovery Option**: Restore accidentally deleted sessions
- **Audit Trail**: Track when sessions were archived
- **Safe Operations**: No risk of permanent data loss

## Changes Made

### Database Schema

#### Prisma Schema (`services/api/prisma/schema.prisma`)
- **New Field**: `deletedAt DateTime?` added to Session model
  - Optional field (nullable)
  - Set to current timestamp when session is deleted
  - `null` for active sessions

#### Migration
- **Migration**: `20251017021724_add_soft_delete_to_sessions`
  - Adds `deletedAt` column to Session table
  - Allows null values for backward compatibility

### Backend (API Service)

#### 1. Sessions Service (`services/api/src/services/sessions.service.ts`)

**Modified Methods**:
- **`list()`**: Updated to filter out soft-deleted sessions
  - Added `where: { deletedAt: null }` condition
  - Only returns active (non-deleted) sessions

**New Methods**:
- **`deleteSession(sessionId: string)`**
  - Sets `deletedAt` to current timestamp (soft delete)
  - Validates session exists and is not already deleted
  - Returns success message
  - Logs deletion action

- **`restoreSession(sessionId: string)`**
  - Clears `deletedAt` timestamp (restores session)
  - Validates session exists and is actually deleted
  - Returns success message
  - Logs restoration action

- **`listDeletedSessions()`**
  - Returns sessions where `deletedAt` is not null
  - Includes full session details (teams, participants, scores)
  - Ordered by deletion date (most recent first)

#### 2. Sessions Controller (`services/api/src/routes/sessions.controller.ts`)

**Endpoints**:
- **`DELETE /sessions/:id`** (Modified)
  - Performs soft delete instead of hard delete
  - Logs action as "soft-deleted"

- **`PUT /sessions/:id/restore`** (New)
  - Restores a soft-deleted session
  - Returns success response
  - Logs restoration action

- **`GET /sessions/deleted/list`** (New)
  - Returns list of all deleted sessions
  - For viewing archived sessions

### Frontend (Web App)

#### 3. API Client (`apps/web/src/lib/api.ts`)

**Functions**:
- **`deleteSession(sessionId: string)`** (Existing)
  - Still uses DELETE method
  - Backend now performs soft delete

- **`restoreSession(sessionId: string)`** (New)
  - Makes PUT request to `/sessions/{sessionId}/restore`
  - Returns success status and message

- **`listDeletedSessions()`** (New)
  - Makes GET request to `/sessions/deleted/list`
  - Returns array of deleted sessions

#### 4. Host Dashboard (`apps/web/src/screens/HostDashboard.tsx`)

**Modified**:
- **Confirmation Message**: Updated to mention restoration option
  - Old: "This action cannot be undone"
  - New: "You can restore it later if needed"

- **Success Message**: Updated to reflect archival nature
  - Old: "Session {code} deleted successfully"
  - New: "Session {code} archived successfully. You can restore it from the archived sessions list."

## Changes Made

### Backend (API Service)

#### 1. Sessions Service (`services/api/src/services/sessions.service.ts`)
- **New Method**: `deleteSession(sessionId: string)`
  - Validates session exists before deletion
  - Deletes session from database (cascade handles related records)
  - Returns success message
  - Logs deletion action

#### 2. Sessions Controller (`services/api/src/routes/sessions.controller.ts`)
- **Import**: Added `Delete` decorator to NestJS imports
- **New Endpoint**: `DELETE /sessions/:id`
  - Calls `sessions.deleteSession()`
  - Returns success response
  - Logs deletion action

### Frontend (Web App)

#### 3. API Client (`apps/web/src/lib/api.ts`)
- **New Function**: `deleteSession(sessionId: string)`
  - Makes DELETE request to `/sessions/{sessionId}`
  - Returns success status and message

#### 4. Host Dashboard (`apps/web/src/screens/HostDashboard.tsx`)
- **Import**: Added `deleteSession` to API imports
- **New Handler**: `handleDeleteSession(sessionId, sessionCode)`
  - Shows confirmation dialog with session code
  - Calls backend API to delete session
  - Reloads sessions list after successful deletion
  - Shows success/error alerts with internationalized messages
  - Handles errors gracefully

- **UI Button**: Delete button (🗑️ icon)
  - Positioned next to Manage button in each session row
  - Styled with red border/text for clear indication
  - Hover effect: red background tint
  - Includes tooltip and aria-label for accessibility
  - Icon-only design to save space

## Features

### Delete Button
- **Icon**: 🗑️ (trash bin emoji)
- **Color**: Red theme (`border-red-500/40`, `text-red-400`, hover: `bg-red-500/10`)
- **Location**: Right side of each session card, next to Manage button
- **Behavior**:
  1. Click triggers confirmation dialog
  2. Shows session code in confirmation message
  3. On confirm, soft-deletes session (sets `deletedAt`)
  4. Session disappears from active list
  5. Reloads session list automatically
  6. Shows success message mentioning restoration option

### Confirmation Dialog
- **Message**: "Are you sure you want to delete session {code}? You can restore it later if needed."
- **Internationalization**: Uses `FormattedMessage` with ID `host.session.deleteConfirm`
- **Cancel**: Clicking Cancel or closing dialog aborts deletion
- **Confirm**: Clicking OK proceeds with soft deletion

### Success/Error Handling
- **Success Alert**: "Session {code} archived successfully. You can restore it from the archived sessions list."
- **Error Alert**: "Failed to delete session: {error message}"
- **Auto-refresh**: Session list automatically reloads after successful deletion
- **Console Logging**: All actions and errors logged for debugging

## How It Works

### Soft Delete Process
1. User clicks delete button (🗑️)
2. Confirmation dialog appears
3. On confirmation:
   - Backend sets `deletedAt = new Date()` on session record
   - Session remains in database but marked as deleted
   - All related records (participants, teams, scores) remain intact
4. Active sessions list filters out records where `deletedAt IS NOT NULL`
5. Session disappears from view but data is preserved

### Restore Process (Future Implementation)
1. View archived/deleted sessions list
2. Click restore button
3. Backend sets `deletedAt = null`
4. Session reappears in active sessions list
5. All data (participants, teams, scores) intact

## Data Preservation

### What's Preserved
When a session is soft-deleted, the following data remains in the database:
- Session metadata (code, status, host info, etc.)
- All participants and their join times
- All teams and team assignments
- All scores and score history
- Quiz template associations
- Round progress (category/question indices)
- Quiz states and answers
- Buzzer states and press history

### Database Relations
- **No Cascade Deletion**: Related records are NOT deleted
- **Referential Integrity**: All foreign keys remain valid
- **Query Filtering**: Application filters by `deletedAt` field

## Benefits of Soft Delete

1. **Data Recovery**: Restore accidentally deleted sessions
2. **Analytics**: Analyze historical session data even after deletion
3. **Audit Trail**: Track when sessions were archived
4. **Reporting**: Include deleted sessions in historical reports
5. **Debugging**: Investigate issues with past sessions
6. **User Error Protection**: Undo mistaken deletions
7. **Compliance**: Meet data retention requirements

## Database Considerations

### Migration
Run the migration to add the `deletedAt` field:
```bash
npx prisma migrate dev --name add_soft_delete_to_sessions
```

### Index Recommendations (Optional)
Consider adding an index on `deletedAt` for performance:
```prisma
@@index([deletedAt])
```

### No Cascade Deletion
Since we're using soft delete:
- Cascade rules in Prisma schema are NOT triggered
- Related records remain untouched
- All foreign key relationships stay valid
- No orphaned records created

## Internationalization Keys

New and updated i18n keys (ensure these are in your translation files):
- `host.session.delete`: "Delete"
- `host.session.deleteTooltip`: "Archive this session"
- `host.session.deleteConfirm`: "Are you sure you want to delete session {code}? You can restore it later if needed."
- `host.session.deleteSuccess`: "Session {code} archived successfully. You can restore it from the archived sessions list."
- `host.session.deleteError`: "Failed to delete session: {error}"
- `host.session.restore`: "Restore"
- `host.session.restoreConfirm`: "Restore session {code}?"
- `host.session.restoreSuccess`: "Session {code} restored successfully"
- `host.session.viewArchived`: "View Archived Sessions"

## Security Considerations

- **TODO**: Add authentication/authorization checks
  - Currently no auth guard on delete endpoint
  - Should verify user is the session host before allowing deletion
  - Consider adding role-based access control

## Testing Checklist

- [ ] Delete button appears for all sessions in the list
- [ ] Clicking delete shows confirmation with restoration mention
- [ ] Canceling confirmation does not delete session
- [ ] Confirming deletion soft-deletes session (sets `deletedAt`)
- [ ] Deleted session disappears from active sessions list
- [ ] Session data remains in database after deletion
- [ ] Success message mentions archival and restoration
- [ ] Error messages display properly if deletion fails
- [ ] Cannot delete already-deleted session (shows error)
- [ ] `GET /sessions` does not return deleted sessions
- [ ] `GET /sessions/deleted/list` returns only deleted sessions
- [ ] Restore endpoint clears `deletedAt` timestamp
- [ ] Restored session reappears in active list
- [ ] All related data (participants, teams, scores) intact after restore
- [ ] Console logs show proper soft-delete tracking
- [ ] Database query performance acceptable with `deletedAt` filter

## Future Enhancements

1. **Archived Sessions UI**: Add dedicated page to view and manage archived sessions
   - List all deleted sessions
   - Restore button for each
   - Permanent delete option (hard delete)
   - Search and filter archived sessions

2. **Auto-Cleanup**: Implement automatic permanent deletion
   - Delete sessions older than X days/months
   - Configurable retention period
   - Scheduled cleanup job

3. **Bulk Operations**:
   - Select and archive multiple sessions
   - Bulk restore
   - Bulk permanent delete

4. **Delete Restrictions**:
   - Prevent deletion of ACTIVE sessions with participants
   - Warn if session has recent activity
   - Only allow archiving of ENDED or old LOBBY sessions

5. **Confirmation Modal**: Replace browser `confirm()` with custom modal
   - Better styling and UX
   - Show session details before deletion
   - More control over appearance

6. **Undo Feature**: Temporary notification with undo button
   - Toast/snackbar notification after deletion
   - Click undo within 5 seconds to restore
   - Better UX than confirmation dialog

7. **Audit Log**: Track deletion and restoration history
   - Who deleted/restored
   - When it happened
   - Reason for deletion (optional)

8. **Export Before Delete**: Option to export session data
   - Download JSON/CSV of session data
   - Include all participants, scores, answers
   - Archive externally before deletion

## Date Implemented
October 16, 2025
