# Session Timeout & Token Expiration - Implementation Guide

## 🔍 Problem Identified

**Issue:** When a user logs in, their JWT token is stored in `localStorage` and never checked for expiration. This means:
- If Ali logged in yesterday, the token is still in localStorage
- When the app loads, it shows Ali as logged in even though the token may be expired
- The header shows user info on the login/landing page because `isAuthenticated()` only checks if token exists, not if it's valid

## ✅ Solution Implemented

### 1. **JWT Token Expiration Checking**

Added `isTokenExpired()` method in `AuthService` that:
- Decodes the JWT token payload (without verification - just for expiration check)
- Extracts the `exp` (expiration) claim from the token
- Compares expiration time with current time
- Includes a 5-minute buffer to account for clock skew
- Returns `true` if token is expired or invalid

```typescript
private isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) {
      return true; // No expiration claim - consider expired
    }
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    return currentTime >= (expirationTime - bufferTime);
  } catch (error) {
    return true; // Can't decode - consider expired
  }
}
```

### 2. **Updated `isAuthenticated()` Method**

Now checks token expiration before returning authentication status:

```typescript
isAuthenticated(): boolean {
  const token = localStorage.getItem('token');
  
  // Check if token exists and is not expired
  if (!token || this.isTokenExpired(token)) {
    if (token) {
      this.clearAuthData(); // Clear expired token
    }
    return false;
  }
  
  return !!this.currentUserSubject.value;
}
```

### 3. **Token Validation on App Startup**

Added `validateTokenOnStartup()` method that:
- Validates the token with the backend when app loads
- Calls `/api/auth/validate` endpoint
- Clears auth data if validation fails
- Ensures token is still valid on server side

```typescript
private validateTokenOnStartup(): void {
  this.validateToken().subscribe({
    next: (response) => {
      if (!response.valid) {
        this.clearAuthData();
      }
    },
    error: (error) => {
      this.clearAuthData(); // Clear on any error
    }
  });
}
```

### 4. **Updated Landing Page**

Landing page now checks authentication and redirects authenticated users:

```typescript
ngOnInit() {
  if (this.authService.isAuthenticated()) {
    const user = this.authService.getCurrentUser();
    if (user?.role === 'Admin') {
      this.router.navigate(['/admin-dashboard']);
    } else {
      this.router.navigate(['/patient-test']);
    }
    return;
  }
  // Show landing page for unauthenticated users
}
```

## 🔧 Backend Requirements

### 1. **JWT Token Expiration**

The backend **MUST** include an `exp` (expiration) claim in the JWT token:

```json
{
  "sub": "user@example.com",
  "userId": 123,
  "role": "Admin",
  "exp": 1735689600,  // ← REQUIRED: Unix timestamp in seconds
  "iat": 1735603200   // Issued at (optional but recommended)
}
```

**Recommended Expiration Times:**
- **Access Token**: 15 minutes to 1 hour (for security)
- **Refresh Token**: 7-30 days (if implementing refresh tokens)

### 2. **Token Validation Endpoint**

**Endpoint:** `GET /api/auth/validate`

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "valid": true,
  "message": "Token is valid"
}
```

**Response (401 Unauthorized):**
```json
{
  "valid": false,
  "message": "Token expired" // or "Invalid token"
}
```

**Backend Implementation (C#/.NET):**
```csharp
[HttpGet("validate")]
[Authorize] // Requires valid token
public IActionResult ValidateToken()
{
    // If we reach here, token is valid (Authorize attribute validated it)
    return Ok(new { valid = true, message = "Token is valid" });
}
```

### 3. **401 Response on Expired Token**

The backend **MUST** return `401 Unauthorized` when:
- Token is expired
- Token is invalid/malformed
- Token signature doesn't match
- Token is missing required claims

**Example Response:**
```json
{
  "message": "Token has expired",
  "statusCode": 401
}
```

### 4. **Token Generation (Backend)**

When creating JWT tokens, ensure:

```csharp
var tokenDescriptor = new SecurityTokenDescriptor
{
    Subject = new ClaimsIdentity(claims),
    Expires = DateTime.UtcNow.AddHours(1), // ← Set expiration
    SigningCredentials = new SigningCredentials(
        new SymmetricSecurityKey(key),
        SecurityAlgorithms.HmacSha256Signature
    )
};
```

## 📋 Frontend Implementation Details

### Files Modified:

1. **`src/app/services/auth.service.ts`**
   - Added `isTokenExpired()` method
   - Updated `isAuthenticated()` to check expiration
   - Added `validateTokenOnStartup()` method
   - Updated `loadUserFromStorage()` to validate tokens

2. **`src/app/pages/landing/landing.component.ts`**
   - Added authentication check on page load
   - Redirects authenticated users to appropriate pages

3. **`src/app/interceptors/auth.interceptor.ts`** (Already implemented)
   - Handles 401 errors from backend
   - Clears auth data on token expiration
   - Redirects to login page

## 🎯 How It Works Now

### Flow 1: User Opens App with Expired Token

1. App loads → `AuthService` constructor runs
2. `loadUserFromStorage()` is called
3. Token found in localStorage
4. `isTokenExpired()` checks token expiration
5. **Token is expired** → `clearAuthData()` is called
6. User data cleared from localStorage
7. `currentUserSubject` set to `null`
8. Landing page shows (no user info in header)

### Flow 2: User Opens App with Valid Token

1. App loads → `AuthService` constructor runs
2. `loadUserFromStorage()` is called
3. Token found and **not expired**
4. User data loaded from localStorage
5. `validateTokenOnStartup()` calls backend
6. Backend validates token → returns `{ valid: true }`
7. User remains authenticated
8. If on landing page → redirects to dashboard

### Flow 3: API Call with Expired Token

1. User makes API call
2. `AuthInterceptor` adds token to request
3. Backend receives request with expired token
4. Backend returns `401 Unauthorized`
5. `AuthInterceptor` catches 401 error
6. Clears token and user data
7. Redirects to `/login`

## ✅ Testing Checklist

- [ ] Login and wait for token to expire → Should be logged out automatically
- [ ] Close browser and reopen after token expiration → Should not show as logged in
- [ ] Make API call with expired token → Should redirect to login
- [ ] Login with valid credentials → Should work normally
- [ ] Token validation endpoint returns correct response
- [ ] Backend returns 401 when token is expired

## 🔐 Security Best Practices

1. **Short Token Expiration**: Use 15 minutes to 1 hour for access tokens
2. **Refresh Tokens**: Implement refresh token mechanism for longer sessions
3. **Token Revocation**: Backend should support token blacklisting
4. **HTTPS Only**: Always use HTTPS in production
5. **Secure Storage**: Consider using httpOnly cookies instead of localStorage (requires backend changes)

## 📝 Backend Developer Checklist

- [ ] JWT tokens include `exp` claim with expiration time
- [ ] Token expiration is set (recommended: 1 hour)
- [ ] `/api/auth/validate` endpoint implemented
- [ ] Endpoint returns `{ valid: true/false }` response
- [ ] 401 Unauthorized returned for expired tokens
- [ ] Token validation middleware checks expiration
- [ ] CORS configured correctly

## 🚀 Next Steps (Optional Enhancements)

1. **Refresh Token Implementation**
   - Long-lived refresh tokens (7-30 days)
   - Automatic token refresh before expiration
   - Silent re-authentication

2. **Session Activity Tracking**
   - Track last activity time
   - Auto-logout after inactivity period
   - Show "Session expired" message

3. **Token Blacklisting**
   - Backend maintains blacklist of revoked tokens
   - Check blacklist on every request
   - Support for "Logout All Devices"

---

**Last Updated:** December 31, 2024
**Status:** ✅ Fully Implemented - Backend Confirmed Ready

## ✅ Backend Status: CONFIRMED READY

The backend has **fully implemented** all requirements:

1. ✅ JWT tokens include `exp` claim (automatic via `SecurityTokenDescriptor`)
2. ✅ Token expiration: **60 minutes** (configurable via `JwtSettings:ExpirationInMinutes`)
3. ✅ `/api/auth/validate` endpoint: `GET /api/auth/validate` returns `{ valid: true, message: "Token is valid" }`
4. ✅ 401 Unauthorized automatically returned for expired tokens (via JWT middleware)
5. ✅ Token validation middleware checks expiration (`ValidateLifetime = true`)
6. ✅ CORS configured correctly

**Backend Implementation Details:**
- **Token Expiration:** 60 minutes (1 hour)
- **Validation Endpoint:** `GET /api/auth/validate` (requires `[Authorize]` attribute)
- **Automatic Expiration Check:** All protected endpoints validate token expiration via middleware
- **Clock Skew:** `TimeSpan.Zero` (strict expiration, no tolerance)

**Frontend Integration:** ✅ **COMPLETE** - All frontend code is compatible with backend implementation.

