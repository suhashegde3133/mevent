# Per-User Data Scoping - Quick Reference

## How It Works

Every API route now:

1. **Requires authentication** - JWT token must be included in request headers
2. **Filters by owner** - Only shows data belonging to the logged-in user
3. **Auto-assigns owner** - New records automatically get the user's ID

## Request Format

```javascript
// All requests must include Authorization header
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

## Owner Field

The `owner` field stores the user ID from the JWT token's `sub` field:

- Automatically set on POST requests
- Used to filter all GET/PUT/DELETE operations
- Cannot be modified by users (security)

## Routes Protected

✅ `/api/dashboard` - Stats filtered by owner  
✅ `/api/policy` - CRUD operations filtered by owner  
✅ `/api/projects` - CRUD operations filtered by owner  
✅ `/api/events` - CRUD operations filtered by owner  
✅ `/api/services` - CRUD operations filtered by owner  
✅ `/api/quotations` - CRUD operations filtered by owner  
✅ `/api/billing` - CRUD operations filtered by owner  
✅ `/api/team` - CRUD operations filtered by owner  
✅ `/api/settings` - CRUD operations filtered by owner  
✅ `/api/chat` - All conversations and messages filtered by owner

## Error Responses

- **401 Unauthorized**: No token or invalid token
- **403 Forbidden**: Token expired
- **404 Not Found**: Resource doesn't exist OR belongs to another user

## Testing Multi-User Scenarios

```bash
# 1. Create User A
POST /api/auth/register
{
  "email": "userA@example.com",
  "password": "password123",
  "name": "User A"
}
# Save the token from response

# 2. Create data as User A
POST /api/events
Headers: { Authorization: "Bearer USER_A_TOKEN" }
Body: { "name": "User A Event", ... }

# 3. Create User B
POST /api/auth/register
{
  "email": "userB@example.com",
  "password": "password123",
  "name": "User B"
}
# Save the token from response

# 4. Try to access User A's data as User B
GET /api/events
Headers: { Authorization: "Bearer USER_B_TOKEN" }
# Should return empty array or not include User A's events

# 5. Verify User A can still see their data
GET /api/events
Headers: { Authorization: "Bearer USER_A_TOKEN" }
# Should return User A's events only
```

## Migration for Existing Data

If you have existing data without `owner` field:

```bash
# Option 1: Run migration script
cd backend
node migrate-add-owner.js

# Option 2: Delete existing data (fresh start)
# Use MongoDB Compass or mongo shell to drop collections
```

## Common Issues

### Issue: Getting empty arrays for all data

**Solution**: Existing data doesn't have `owner` field. Run migration script or delete and recreate data.

### Issue: 401 Unauthorized

**Solution**: Token is missing or invalid. Check:

- Token is included in Authorization header
- Token format is `Bearer YOUR_TOKEN`
- Token hasn't expired (check JWT_SECRET)

### Issue: Can't create new records

**Solution**: Check that:

- You're logged in (have valid token)
- Token is being sent in request headers
- Backend can decode the token (check JWT_SECRET matches)

## Code Examples

### React/Frontend

```javascript
// Store token after login
localStorage.setItem("token", response.token);

// Include token in all requests
const token = localStorage.getItem("token");
fetch("http://localhost:5000/api/events", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
```

### Backend/Route

```javascript
// Authentication is handled by middleware
router.use(authenticateToken);

// Owner filtering in queries
router.get("/", async (req, res) => {
  const docs = await col().find({ owner: req.user.sub });
  res.json(docs);
});

// Auto-assign owner on create
router.post("/", async (req, res) => {
  const body = req.body;
  body.owner = req.user.sub; // From JWT token
  // ... save to database
});
```

## Security Notes

✅ Users cannot access other users' data  
✅ Users cannot modify other users' data  
✅ Users cannot delete other users' data  
✅ Owner field is auto-assigned and protected  
✅ All routes require valid authentication

## Next Steps

1. **Test thoroughly** with multiple user accounts
2. **Migrate existing data** if needed
3. **Update frontend** to handle 401/404 errors properly
4. **Document for your team** which routes require auth
