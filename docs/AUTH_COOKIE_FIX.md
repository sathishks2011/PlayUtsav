# Unauthorized Error After Re-Login Fix

## Issue
User gets "unauthorized" error when they re-login and try to start a quiz. The authentication appears to work during login, but subsequent API calls (like starting a quiz) fail with 401 Unauthorized.

## Root Cause Analysis

### The Problem
1. **Cookie not properly cleared on logout** - The `clearCookie` call wasn't using the exact same options as `setCookie`, causing the old cookie to persist
2. **Cookie conflicts** - When logging in again, a new cookie was set but the old one might still be present, causing authentication confusion
3. **Missing path attribute** - Cookies without explicit path can have unexpected behavior across different routes

### How Authentication Works

**Backend Flow:**
1. User calls `/auth/login` with credentials
2. Backend validates and creates JWT token
3. Token is stored in HTTP-only cookie named `playutsav_token`
4. Protected routes (like `/sessions/:id/quiz/start`) require `@UseGuards(JwtAuthGuard)`
5. JWT guard extracts token from cookie and validates it

**Frontend Flow:**
1. All API calls use `credentials: 'include'` to send cookies
2. Browser automatically includes the `playutsav_token` cookie
3. Protected endpoints validate the token

## The Fix

### 1. Cookie Management (`auth.controller.ts`)

**Before:**
```typescript
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 12,
};

// Login
res.cookie(JWT_COOKIE_NAME, token, cookieOptions);

// Logout - WRONG: options don't match!
res.clearCookie(JWT_COOKIE_NAME, { 
  httpOnly: true, 
  sameSite: 'lax', 
  secure: process.env.NODE_ENV === 'production' 
});
```

**After:**
```typescript
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',  // ✅ Explicit path
  maxAge: 1000 * 60 * 60 * 12, // 12 hours
};

const clearCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',  // ✅ Must match setCookie options
};

// Login - Clear old cookie first
res.clearCookie(JWT_COOKIE_NAME, clearCookieOptions);
res.cookie(JWT_COOKIE_NAME, token, cookieOptions);

// Logout - Use consistent options
res.clearCookie(JWT_COOKIE_NAME, clearCookieOptions);
```

**Key Changes:**
1. ✅ Added explicit `path: '/'` to both set and clear operations
2. ✅ Created separate `clearCookieOptions` without `maxAge` (not needed for clearing)
3. ✅ Clear existing cookie before setting new one on login/signup
4. ✅ Use consistent options for clearCookie to ensure proper deletion

### 2. Enhanced JWT Guard Logging (`jwtAuth.guard.ts`)

Added detailed logging to help debug authentication issues:

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const cookies = request.cookies || {};
    const authHeader = request.headers.authorization;
    
    this.logger.debug(`[JwtAuthGuard] Checking authentication for ${request.method} ${request.url}`);
    this.logger.debug(`[JwtAuthGuard] Has cookie: ${!!cookies.playutsav_token}`);
    this.logger.debug(`[JwtAuthGuard] Has auth header: ${!!authHeader}`);
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    
    if (err || !user) {
      this.logger.error(`[JwtAuthGuard] Authentication failed for ${request.method} ${request.url}`);
      this.logger.error(`[JwtAuthGuard] Error:`, err);
      this.logger.error(`[JwtAuthGuard] Info:`, info);
      throw err || new UnauthorizedException('Invalid or missing authentication token');
    }
    
    this.logger.debug(`[JwtAuthGuard] Authentication successful for user: ${user.userId}`);
    return user;
  }
}
```

**Benefits:**
- See exactly which requests are being authenticated
- Know if cookie or auth header is present
- Get detailed error messages when authentication fails
- Track which user is authenticated

## Testing the Fix

### Step 1: Clear Browser Cookies
Before testing, clear all cookies for your site:
1. Open DevTools (F12)
2. Go to Application tab → Cookies
3. Delete all cookies for `192.168.2.1:5173` and `192.168.2.1:3000`

### Step 2: Test Login Flow
1. **Login as host**
   - Go to host login page
   - Enter credentials
   - Click "Sign In"
   - ✅ Should succeed and redirect to dashboard

2. **Check cookie is set**
   - Open DevTools → Application → Cookies
   - Should see `playutsav_token` cookie with:
     - Path: `/`
     - HttpOnly: ✓
     - SameSite: Lax
     - Expires: (12 hours from now)

3. **Create session and start quiz**
   - Create a new session
   - Attach a quiz template
   - Add teams
   - Click "Start Quiz"
   - ✅ Should succeed without "unauthorized" error

### Step 3: Test Logout/Re-login Flow
1. **Logout**
   - Click logout button
   - ✅ Cookie should be deleted

2. **Login again**
   - Login with same credentials
   - ✅ New cookie should be set

3. **Start quiz again**
   - Create session → Attach template → Start quiz
   - ✅ Should work without "unauthorized" error

### Step 4: Check Backend Logs
Look for these logs in the API console:

**On successful authentication:**
```
[JwtAuthGuard] Checking authentication for POST /sessions/xxx/quiz/start
[JwtAuthGuard] Has cookie: true
[JwtAuthGuard] Has auth header: false
[JwtAuthGuard] Authentication successful for user: test-host-id
```

**On failed authentication:**
```
[JwtAuthGuard] Checking authentication for POST /sessions/xxx/quiz/start
[JwtAuthGuard] Has cookie: false
[JwtAuthGuard] Has auth header: false
[JwtAuthGuard] Authentication failed for POST /sessions/xxx/quiz/start
[JwtAuthGuard] Error: ...
[JwtAuthGuard] Info: No auth token
```

## Why This Fixes the Issue

### Problem 1: Cookie Not Cleared Properly
**Before:** `clearCookie` options didn't match `setCookie` options
- When you logout, the cookie wasn't fully cleared due to options mismatch
- Old cookie persisted in browser
- On re-login, browser had TWO cookies or confused state

**After:** Options match exactly
- Cookie is properly cleared on logout
- Clean state for new login
- No cookie conflicts

### Problem 2: Missing Path Attribute
**Before:** No explicit path set
- Browser might set cookie for specific path like `/auth`
- Cookie might not be sent to `/sessions` routes
- Quiz start fails because cookie isn't included

**After:** Explicit `path: '/'`
- Cookie is set for all routes
- Always sent with requests to `/sessions`, `/auth`, etc.
- Consistent behavior

### Problem 3: Cookie Conflicts on Re-login
**Before:** New cookie set without clearing old one
- Browser might have duplicate cookies
- Server might read wrong/expired token

**After:** Clear before set
- Old cookie removed first
- New cookie set cleanly
- No ambiguity

## Additional Debugging

If you still get unauthorized errors after this fix:

### 1. Check Browser Console
```javascript
// In browser console, check if cookie exists
document.cookie
// Should show: "playutsav_token=..."

// Check fetch credentials
fetch('http://192.168.2.1:3000/auth/me', {
  credentials: 'include'
}).then(r => r.json()).then(console.log)
// Should return user object
```

### 2. Check Network Tab
1. Open DevTools → Network tab
2. Try to start a quiz
3. Look at the request to `/sessions/xxx/quiz/start`
4. Check "Cookies" section - should include `playutsav_token`
5. Check response status - should be 200, not 401

### 3. Check CORS Configuration
Verify your web app URL is in the CORS allowlist (`main.ts`):
```typescript
cors: {
  origin: [
    'http://localhost:5173',
    'http://192.168.2.1:5173',  // ✅ Your network IP
    // ... other origins
  ],
  credentials: true,  // ✅ Must be true for cookies
}
```

### 4. Check Cookie Settings
In browser DevTools → Application → Cookies:
- **Name:** `playutsav_token`
- **Value:** (JWT token string)
- **Domain:** `192.168.2.1` (matches API)
- **Path:** `/`
- **HttpOnly:** ✓
- **Secure:** (empty in dev)
- **SameSite:** Lax

### 5. Common Issues

**Issue:** Cookie shows "Domain" as `localhost` but you're accessing via IP
**Fix:** Access web app via same domain as API (both 192.168.2.1)

**Issue:** Cookie shows "SameSite: Strict"
**Fix:** Should be "Lax" - check cookie options

**Issue:** Cookie expires immediately
**Fix:** Check system clock, verify maxAge is set correctly

## Files Modified

1. **`services/api/src/auth/auth.controller.ts`**
   - Added explicit `path: '/'` to cookie options
   - Created separate `clearCookieOptions`
   - Clear old cookie before setting new one on login/signup
   - Use consistent options for logout

2. **`services/api/src/auth/jwtAuth.guard.ts`**
   - Enhanced with detailed logging
   - Log cookie presence and auth header
   - Log authentication success/failure
   - Better error messages

## Prevention

To avoid similar issues in the future:

1. **Always match cookie options** - Set and clear must use same options
2. **Use explicit paths** - Don't rely on default path behavior
3. **Clear before set** - Prevent conflicts on re-authentication
4. **Add logging** - Makes debugging auth issues much easier
5. **Test logout/login flow** - Include in regular testing

## Related Files

- `services/api/src/auth/jwt.strategy.ts` - JWT extraction logic
- `services/api/src/main.ts` - CORS and cookie parser setup
- `apps/web/src/lib/api.ts` - Frontend API client with credentials
- `apps/web/src/store/slices/authSlice.ts` - Redux auth state management
