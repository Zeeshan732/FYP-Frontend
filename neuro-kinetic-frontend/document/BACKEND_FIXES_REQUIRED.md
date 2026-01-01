# Backend Fixes Required

**Date:** November 2024  
**Status:** 🔴 **URGENT - Frontend Ready, Waiting on Backend**

---

## 🚨 **Priority 1: Role Selection During Signup**

### **Issue:**
Frontend now allows users to select their role during signup, but the backend `/auth/register` endpoint doesn't accept the `role` parameter.

### **What Frontend Sends:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "institution": "Medical Center",
  "role": "Researcher"  // ⚠️ NEW - Backend needs to accept this
}
```

### **What Backend Needs to Do:**

1. **Update Register DTO:**
   ```csharp
   public class RegisterDto
   {
       public string Email { get; set; }
       public string Password { get; set; }
       public string FirstName { get; set; }
       public string LastName { get; set; }
       public string? Institution { get; set; }
       public string? ResearchFocus { get; set; }
       public string? Role { get; set; } // ⚠️ ADD THIS
   }
   ```

2. **Update Register Endpoint:**
   ```csharp
   [HttpPost("register")]
   public async Task<ActionResult<AuthResponse>> Register(RegisterDto dto)
   {
       // Validate role if provided
       if (!string.IsNullOrEmpty(dto.Role))
       {
           var validRoles = new[] { "Public", "Researcher", "MedicalProfessional" };
           if (!validRoles.Contains(dto.Role))
           {
               return BadRequest("Invalid role. Allowed roles: Public, Researcher, MedicalProfessional");
           }
       }

       // Create user with role
       var user = new User
       {
           Email = dto.Email,
           FirstName = dto.FirstName,
           LastName = dto.LastName,
           Institution = dto.Institution,
           ResearchFocus = dto.ResearchFocus,
           Role = dto.Role ?? "Public" // Default to "Public" if not provided
       };

       // ... rest of registration logic
   }
   ```

3. **Security Validation:**
   - ✅ **MUST REJECT** if `role = "Admin"` (Admin cannot be self-selected)
   - ✅ **MUST ACCEPT** only: `"Public"`, `"Researcher"`, `"MedicalProfessional"`
   - ✅ **MUST DEFAULT** to `"Public"` if role is null/empty

### **Expected Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "Researcher",  // Should match what was sent
    "institution": "Medical Center"
  }
}
```

---

## ✅ **Priority 2: Verify Existing Endpoints**

### **These Should Already Work (Please Verify):**

#### **1. Authentication Endpoints:**
- ✅ `POST /api/auth/login` - Login
- ✅ `POST /api/auth/register` - Register (needs role support - see Priority 1)
- ✅ `GET /api/auth/validate` - Validate token

#### **2. Test Records Endpoints:**
- ✅ `GET /api/testrecords` - Get all (paginated, filtered by userId for non-admins)
- ✅ `GET /api/testrecords/all` - Get all (no pagination)
- ✅ `GET /api/testrecords/{id}` - Get by ID
- ✅ `POST /api/testrecords` - Create new
- ✅ `PUT /api/testrecords/{id}` - Update
- ✅ `DELETE /api/testrecords/{id}` - Delete (Admin only)

#### **3. Admin Dashboard:**
- ✅ `GET /api/admin/dashboard/analytics` - Get analytics (Admin only)

#### **4. File Upload:**
- ✅ `POST /api/fileupload/upload` - Upload voice recording

---

## 🔍 **Priority 3: Test These Scenarios**

### **Scenario 1: User Signup with Role Selection**
1. Send registration request with `role: "Researcher"`
2. **Expected:** User created with role "Researcher"
3. **Current:** Check if backend accepts role parameter

### **Scenario 2: User Signup without Role**
1. Send registration request without `role` field
2. **Expected:** User created with default role "Public"
3. **Current:** Verify default behavior

### **Scenario 3: Invalid Role Attempt**
1. Send registration request with `role: "Admin"`
2. **Expected:** Error response: "Invalid role. Admin cannot be self-selected"
3. **Current:** Verify backend rejects Admin role

### **Scenario 4: Test Record Creation**
1. Create test record with `status: "Pending"`
2. **Expected:** Record created successfully
3. **Current:** Verify endpoint works

### **Scenario 5: Test Record Status Update**
1. Update test record status from "Pending" to "Completed"
2. **Expected:** Status updated, frontend polling detects change
3. **Current:** Verify PUT endpoint works

---

## 📋 **Checklist for Backend Developer**

### **Must Fix:**
- [ ] **Accept `role` parameter in `/api/auth/register` endpoint**
- [ ] **Validate role (only allow: Public, Researcher, MedicalProfessional)**
- [ ] **Reject Admin role during signup (security)**
- [ ] **Default to "Public" if role not provided**
- [ ] **Return user with correct role in response**

### **Should Verify:**
- [ ] Test Records endpoints work correctly
- [ ] Authorization works (users see own, admin sees all)
- [ ] Admin Dashboard analytics endpoint returns data
- [ ] File upload endpoint works
- [ ] CORS is configured for frontend (localhost:4200)

### **Nice to Have (Future):**
- [ ] Real-time status updates (SignalR) instead of polling
- [ ] ML model integration for automatic test analysis
- [ ] Background job processing for pending tests

---

## 🐛 **Known Issues to Check**

### **1. CORS Configuration**
- **Issue:** Frontend might not be able to call backend API
- **Fix:** Ensure CORS allows `http://localhost:4200`
- **Check:** `Program.cs` or `Startup.cs` CORS configuration

### **2. JWT Token Storage**
- **Issue:** Frontend stores token as `jwt_token` in localStorage
- **Backend:** Should return token in `AuthResponse.token`
- **Check:** Verify token is returned correctly

### **3. User Data in Response**
- **Issue:** Frontend expects `user` object with `role` field
- **Backend:** Should return complete user object including role
- **Check:** Verify `AuthResponse` includes full user data

---

## 📞 **Testing Instructions**

### **Test Role Selection:**

```bash
# Test 1: Register with Researcher role
POST http://localhost:7118/api/auth/register
Content-Type: application/json

{
  "email": "researcher@test.com",
  "password": "Test123!",
  "firstName": "Test",
  "lastName": "Researcher",
  "role": "Researcher"
}

# Expected Response:
{
  "token": "...",
  "user": {
    "id": 1,
    "email": "researcher@test.com",
    "firstName": "Test",
    "lastName": "Researcher",
    "role": "Researcher"  // ✅ Should match request
  }
}

# Test 2: Register without role (should default to Public)
POST http://localhost:7118/api/auth/register
Content-Type: application/json

{
  "email": "public@test.com",
  "password": "Test123!",
  "firstName": "Test",
  "lastName": "User"
}

# Expected Response:
{
  "token": "...",
  "user": {
    "role": "Public"  // ✅ Should default to Public
  }
}

# Test 3: Try to register as Admin (should fail)
POST http://localhost:7118/api/auth/register
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "Test123!",
  "firstName": "Test",
  "lastName": "Admin",
  "role": "Admin"
}

# Expected Response:
400 Bad Request
{
  "error": "Invalid role. Admin cannot be self-selected"
}
```

---

## 📝 **Summary**

### **Critical (Must Fix):**
1. ✅ **Accept `role` parameter in registration endpoint**
2. ✅ **Validate and assign role correctly**
3. ✅ **Reject Admin role selection**

### **Important (Should Verify):**
1. ✅ All existing endpoints work correctly
2. ✅ Authorization rules are enforced
3. ✅ CORS is configured properly

### **Optional (Future Enhancements):**
1. Real-time updates (SignalR)
2. ML model integration
3. Background job processing

---

## 🚀 **Next Steps**

1. **Backend Developer:**
   - Update `/api/auth/register` endpoint to accept `role` parameter
   - Add validation for allowed roles
   - Test all scenarios above
   - Verify existing endpoints still work

2. **Frontend Developer:**
   - Test registration with different roles
   - Verify role is correctly assigned
   - Test all existing functionality

3. **Integration Testing:**
   - Full end-to-end test of signup flow
   - Test role-based navigation
   - Verify authorization works

---

**Last Updated:** November 2024  
**Status:** ⏳ **Waiting for Backend Implementation**

