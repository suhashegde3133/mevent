# Testing Checklist: Per-User Data Scoping

## Pre-Testing Setup

- [ ] Backend server is running (`cd backend && npm start`)
- [ ] Frontend is running (`cd frontend && npm start`)
- [ ] MongoDB is accessible
- [ ] JWT_SECRET is set in backend/.env

## Step 1: Database Preparation (Choose One)

### Option A: Fresh Start (Recommended for Testing)

- [ ] Clear all data from database (optional)
- [ ] Ready to create new test accounts

### Option B: Migrate Existing Data

- [ ] Edit `backend/migrate-add-owner.js` and set DEFAULT_OWNER
- [ ] Run: `cd backend && node migrate-add-owner.js`
- [ ] Verify migration completed successfully

### Option C: Add Performance Indexes

- [ ] Run: `cd backend && node create-indexes.js`
- [ ] Verify indexes created successfully

## Step 2: Create Test Users

### User A (Primary Test User)

- [ ] Register User A via `/api/auth/register`
  - Email: `usera@test.com`
  - Password: `password123`
  - Name: `User A`
- [ ] Save User A's token
- [ ] Verify User A can login

### User B (Secondary Test User)

- [ ] Register User B via `/api/auth/register`
  - Email: `userb@test.com`
  - Password: `password123`
  - Name: `User B`
- [ ] Save User B's token
- [ ] Verify User B can login

## Step 3: Test Authentication

### Without Token

- [ ] GET `/api/events` without token → Should return 401
- [ ] GET `/api/dashboard` without token → Should return 401
- [ ] POST `/api/projects` without token → Should return 401

### With Invalid Token

- [ ] GET `/api/events` with invalid token → Should return 403
- [ ] POST `/api/services` with invalid token → Should return 403

### With Valid Token

- [ ] GET `/api/events` with User A token → Should return 200
- [ ] GET `/api/dashboard` with User A token → Should return 200

## Step 4: Test Data Isolation (Events)

### Create Data as User A

- [ ] POST `/api/events` as User A
  - Create "Event A1"
- [ ] POST `/api/events` as User A
  - Create "Event A2"
- [ ] GET `/api/events` as User A → Should see 2 events

### Create Data as User B

- [ ] POST `/api/events` as User B
  - Create "Event B1"
- [ ] GET `/api/events` as User B → Should see only 1 event (Event B1)

### Verify Isolation

- [ ] GET `/api/events` as User A → Should still see only Events A1, A2 (not B1)
- [ ] GET `/api/events` as User B → Should still see only Event B1 (not A1, A2)

## Step 5: Test Data Isolation (Projects)

### User A Projects

- [ ] POST `/api/projects` as User A → Create "Project A1"
- [ ] GET `/api/projects` as User A → Should see 1 project
- [ ] GET `/api/projects` as User B → Should see 0 projects

### User B Projects

- [ ] POST `/api/projects` as User B → Create "Project B1"
- [ ] GET `/api/projects` as User B → Should see 1 project
- [ ] GET `/api/projects` as User A → Should still see 1 project (Project A1 only)

## Step 6: Test Data Isolation (Team Members)

### User A Team

- [ ] POST `/api/team` as User A → Add "Member A1"
- [ ] GET `/api/team` as User A → Should see 1 member
- [ ] GET `/api/team` as User B → Should see 0 members

### User B Team

- [ ] POST `/api/team` as User B → Add "Member B1"
- [ ] GET `/api/team` as User B → Should see 1 member
- [ ] GET `/api/team` as User A → Should still see 1 member (Member A1 only)

### Email Uniqueness Per User

- [ ] POST `/api/team` as User A with email "test@example.com" → Success
- [ ] POST `/api/team` as User B with email "test@example.com" → Should also succeed
- [ ] Both users can have team members with same email (scoped per user)

## Step 7: Test Dashboard Stats Isolation

### User A Stats

- [ ] Create: 2 events, 1 project, 1 quotation, 1 billing record as User A
- [ ] GET `/api/dashboard/stats` as User A
- [ ] Verify counts: events=2, projects=1, quotations=1, billing=1

### User B Stats

- [ ] Create: 1 event, 2 projects as User B
- [ ] GET `/api/dashboard/stats` as User B
- [ ] Verify counts: events=1, projects=2 (not affected by User A's data)

### Verify Totals

- [ ] User A dashboard should show only User A's counts
- [ ] User B dashboard should show only User B's counts

## Step 8: Test Update Operations

### Update User A's Data as User A

- [ ] PUT `/api/events/:id` as User A → Should succeed
- [ ] PUT `/api/projects/:id` as User A → Should succeed
- [ ] PUT `/api/team/:id` as User A → Should succeed

### Try to Update User A's Data as User B

- [ ] Get an event ID created by User A
- [ ] PUT `/api/events/:eventId` as User B → Should return 404
- [ ] Verify User A's event is unchanged

### Try to Update User B's Data as User A

- [ ] Get a project ID created by User B
- [ ] PUT `/api/projects/:projectId` as User A → Should return 404
- [ ] Verify User B's project is unchanged

## Step 9: Test Delete Operations

### Delete User A's Data as User A

- [ ] DELETE `/api/events/:id` as User A → Should succeed
- [ ] Verify event is deleted (GET should not return it)

### Try to Delete User A's Data as User B

- [ ] Get an event ID created by User A
- [ ] DELETE `/api/events/:eventId` as User B → Should return 404
- [ ] GET `/api/events` as User A → Event should still exist

### Try to Delete User B's Data as User A

- [ ] Get a project ID created by User B
- [ ] DELETE `/api/projects/:projectId` as User A → Should return 404
- [ ] GET `/api/projects` as User B → Project should still exist

## Step 10: Test All Other Routes

### Services

- [ ] POST `/api/services` as User A → Create service
- [ ] GET `/api/services` as User B → Should not see User A's service
- [ ] POST `/api/services` as User B → Create service
- [ ] GET `/api/services` as User A → Should not see User B's service

### Quotations

- [ ] POST `/api/quotations` as User A → Create quotation
- [ ] GET `/api/quotations` as User B → Should not see User A's quotation
- [ ] POST `/api/quotations` as User B → Create quotation
- [ ] GET `/api/quotations` as User A → Should not see User B's quotation

### Billing

- [ ] POST `/api/billing` as User A → Create billing record
- [ ] GET `/api/billing` as User B → Should not see User A's billing
- [ ] POST `/api/billing` as User B → Create billing record
- [ ] GET `/api/billing` as User A → Should not see User B's billing

### Policies

- [ ] POST `/api/policy` as User A → Create policy
- [ ] GET `/api/policy` as User B → Should not see User A's policy
- [ ] POST `/api/policy` as User B → Create policy
- [ ] GET `/api/policy` as User A → Should not see User B's policy

### Settings

- [ ] PUT `/api/settings/:id` as User A → Create/update settings
- [ ] GET `/api/settings` as User B → Should not see User A's settings
- [ ] PUT `/api/settings/:id` as User B → Create/update settings
- [ ] GET `/api/settings` as User A → Should not see User B's settings

### Chat

- [ ] POST `/api/chat/conversations` as User A → Create conversation
- [ ] GET `/api/chat/conversations` as User B → Should not see User A's conversation
- [ ] POST `/api/chat/conversations` as User B → Create conversation
- [ ] GET `/api/chat/conversations` as User A → Should not see User B's conversation

## Step 11: Test Edge Cases

### Expired Token

- [ ] Use an expired token → Should return 403
- [ ] Frontend should redirect to login

### Malformed Token

- [ ] Use a malformed token → Should return 403
- [ ] Frontend should handle error gracefully

### Missing Authorization Header

- [ ] Send request without Authorization header → Should return 401
- [ ] Frontend should redirect to login

### Empty Database

- [ ] New user with no data
- [ ] GET `/api/events` → Should return empty array []
- [ ] GET `/api/dashboard/stats` → Should return zeros

## Step 12: Performance Testing (Optional)

### Create Multiple Records

- [ ] Create 100 events as User A
- [ ] Create 100 events as User B
- [ ] GET `/api/events` as User A → Should be fast, return 100 items
- [ ] GET `/api/events` as User B → Should be fast, return 100 items

### Check Database Indexes

- [ ] Run: `cd backend && node create-indexes.js`
- [ ] Verify indexes were created
- [ ] Queries should be faster

## Final Verification

### Security Checklist

- [ ] ✅ Users cannot see other users' data
- [ ] ✅ Users cannot update other users' data
- [ ] ✅ Users cannot delete other users' data
- [ ] ✅ All routes require authentication
- [ ] ✅ Owner field is auto-assigned
- [ ] ✅ Owner field cannot be modified by users

### Functionality Checklist

- [ ] ✅ All CRUD operations work correctly
- [ ] ✅ Dashboard shows correct stats per user
- [ ] ✅ All routes tested with multiple users
- [ ] ✅ No errors in console
- [ ] ✅ Frontend handles auth errors properly

### Documentation Checklist

- [ ] ✅ Review `PER_USER_DATA_SCOPING.md`
- [ ] ✅ Review `PER_USER_SCOPING_QUICK_REF.md`
- [ ] ✅ Review `IMPLEMENTATION_COMPLETE.md`
- [ ] ✅ Team members briefed on changes

## Issues Found

Document any issues found during testing:

| Issue | Severity | Status | Notes |
| ----- | -------- | ------ | ----- |
|       |          |        |       |

## Test Results Summary

- **Date Tested**: ******\_\_\_******
- **Tested By**: ******\_\_\_******
- **Total Tests**: ******\_\_\_******
- **Tests Passed**: ******\_\_\_******
- **Tests Failed**: ******\_\_\_******
- **Overall Status**: [ ] PASS [ ] FAIL

## Notes

Add any additional notes or observations:

---

**Testing Complete**: [ ] YES [ ] NO

**Ready for Production**: [ ] YES [ ] NO

**Sign-off**: ******\_\_\_****** Date: ******\_\_\_******
