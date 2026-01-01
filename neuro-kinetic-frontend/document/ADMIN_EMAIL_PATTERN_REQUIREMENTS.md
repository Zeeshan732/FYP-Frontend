# Admin Account Creation via Email Pattern Detection

**Date:** December 2024  
**Status:** ✅ Frontend Complete - Backend Requirements Documented

---

## 🎯 **Overview**

Admin accounts are created through the **regular signup form** by detecting admin email patterns. When an email matching the admin pattern is entered:

1. **Account Type** is automatically set to "Admin" and the dropdown is **disabled**
2. **Account Status** is automatically set to "Activated" (not "Pending")
3. **Backend enforces** this logic to prevent unauthorized manipulation

---

## 📋 **Frontend Implementation**

### **How It Works:**

1. User opens the regular signup form (same as regular users)
2. User enters email (e.g., `admin1@domain.com`, `admin2@domain.com`)
3. Frontend detects admin email pattern: `/^admin\d+@/i`
4. Account Type dropdown is **automatically disabled**
5. Account Type is **automatically set to "Administrator"**
6. User completes the form and submits
7. Backend validates and enforces admin creation rules

### **Admin Email Pattern:**
```
Pattern: admin1@domain.com, admin2@domain.com, admin3@domain.com, etc.
Regex: /^admin\d+@/i
```

**Examples:**
- ✅ `admin1@neurokinetic.com`
- ✅ `admin2@neurokinetic.com`
- ✅ `admin10@neurokinetic.com`
- ✅ `admin1@example.com`
- ❌ `administrator@neurokinetic.com` (doesn't match pattern)
- ❌ `admin@neurokinetic.com` (missing number)

---

## 🔧 **Backend Requirements**

### **Critical: Backend Must Enforce Admin Detection**

**⚠️ Security Note:** Frontend detection is for UX only. **Backend MUST validate and enforce** admin creation rules to prevent:
- Direct API calls bypassing frontend
- URL manipulation
- Unauthorized admin account creation

---

### **1. Endpoint: `POST /api/auth/register`**

**Required Behavior:**

1. **Check if email matches admin pattern:**
   ```csharp
   // Pattern: admin1@domain.com, admin2@domain.com, etc.
   bool isAdminEmail = Regex.IsMatch(email, @"^admin\d+@", RegexOptions.IgnoreCase);
   ```

2. **If admin email detected:**
   - ✅ **Force role to "Admin"** (ignore any role in request body)
   - ✅ **Set status to "Activated"** (not "Pending")
   - ✅ **Skip approval workflow**
   - ✅ **Return JWT token** (auto-login enabled)

3. **If NOT admin email:**
   - ✅ Use role from request (Public/Researcher/MedicalProfessional)
   - ✅ Set status to "Pending" (requires approval)
   - ✅ Do NOT return JWT token

**Request Body:**
```json
{
  "email": "admin1@neurokinetic.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "institution": "Medical Center",      // Optional
  "researchFocus": "Neurology",         // Optional
  "role": "Public"                      // IGNORED if admin email detected
}
```

**Response (Admin Email):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin1@neurokinetic.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "Admin",
    "status": "Activated"
  },
  "status": "Activated"
}
```

**Response (Regular Email):**
```json
{
  "message": "Registration submitted. Your account is under review.",
  "user": {
    "id": 2,
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "Public",
    "status": "Pending"
  },
  "status": "Pending"
}
```

---

### **2. Backend Implementation**

#### **Service Method:**
```csharp
public async Task<AuthResponse> RegisterAsync(RegisterDto dto)
{
    // 1. Check if email matches admin pattern
    bool isAdminEmail = Regex.IsMatch(dto.Email, @"^admin\d+@", RegexOptions.IgnoreCase);
    
    // 2. Determine role and status
    string role;
    string status;
    
    if (isAdminEmail)
    {
        // Admin email: Force Admin role and Activated status
        role = "Admin";
        status = "Activated";
    }
    else
    {
        // Regular email: Use provided role or default to Public
        role = dto.Role ?? "Public";
        status = "Pending"; // Requires approval
    }
    
    // 3. Validate role (prevent invalid roles)
    var validRoles = new[] { "Public", "Researcher", "MedicalProfessional", "Admin" };
    if (!validRoles.Contains(role))
    {
        throw new BadRequestException("Invalid role specified");
    }
    
    // 4. Check if email already exists
    if (await _userRepository.EmailExistsAsync(dto.Email))
    {
        throw new ConflictException("Email already exists");
    }
    
    // 5. Create user
    var user = new User
    {
        Email = dto.Email,
        FirstName = dto.FirstName,
        LastName = dto.LastName,
        Institution = dto.Institution,
        ResearchFocus = dto.ResearchFocus,
        Role = role,        // Set based on email pattern
        Status = status     // Activated for admin, Pending for others
    };
    
    // 6. Hash password
    user.PasswordHash = HashPassword(dto.Password);
    
    // 7. Save to database
    await _userRepository.CreateAsync(user);
    
    // 8. Generate JWT token (only for activated accounts)
    string? token = null;
    if (status == "Activated")
    {
        token = GenerateJwtToken(user);
    }
    
    // 9. Return response
    return new AuthResponse
    {
        Token = token,
        User = user,
        Status = status,
        Message = status == "Pending" 
            ? "Registration submitted. Your account is under review." 
            : "Account created successfully."
    };
}
```

---

### **3. Security Considerations**

#### **Backend Validation (CRITICAL):**

1. **Email Pattern Validation:**
   ```csharp
   // MUST validate on backend, not trust frontend
   bool isAdminEmail = Regex.IsMatch(email, @"^admin\d+@", RegexOptions.IgnoreCase);
   ```

2. **Role Enforcement:**
   ```csharp
   // If admin email detected, IGNORE role from request body
   if (isAdminEmail)
   {
       role = "Admin";  // Force Admin role
       status = "Activated";  // Force Activated status
   }
   ```

3. **Prevent Role Manipulation:**
   ```csharp
   // Even if request body says role="Public", if email is admin pattern,
   // backend MUST set role="Admin"
   ```

4. **Domain Whitelist (Optional):**
   ```csharp
   // Optional: Restrict admin emails to specific domain
   string[] allowedAdminDomains = { "neurokinetic.com", "example.com" };
   if (isAdminEmail && !allowedAdminDomains.Contains(emailDomain))
   {
       throw new BadRequestException("Admin emails must use authorized domain");
   }
   ```

---

### **4. Configuration Options**

#### **Admin Email Pattern:**
Can be configured in `appsettings.json`:
```json
{
  "AdminSettings": {
    "EmailPattern": "^admin\\d+@",
    "AllowedDomains": ["neurokinetic.com", "example.com"],
    "RequireDomainWhitelist": false
  }
}
```

#### **Pattern Examples:**
- `^admin\d+@` - admin1@, admin2@, admin10@, etc.
- `^admin@` - Only admin@domain.com
- `^admin.*@neurokinetic\.com$` - Any admin*@neurokinetic.com

---

## 🧪 **Testing**

### **Test Cases:**

#### **1. Admin Email Registration:**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin1@neurokinetic.com",
  "password": "SecurePass123",
  "firstName": "Admin",
  "lastName": "User",
  "role": "Public"  // Should be IGNORED
}

Expected Response:
- Status: 200 OK
- role: "Admin" (not "Public")
- status: "Activated" (not "Pending")
- token: JWT token provided (auto-login)
```

#### **2. Regular Email Registration:**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "Regular",
  "lastName": "User",
  "role": "Public"
}

Expected Response:
- Status: 200 OK
- role: "Public"
- status: "Pending"
- token: null (no auto-login)
```

#### **3. Direct API Call (Security Test):**
```bash
# Try to bypass frontend and create admin with regular email
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "Hacker",
  "lastName": "User",
  "role": "Admin"  // Should be REJECTED (not admin email pattern)
}

Expected Response:
- Status: 400 Bad Request
- Error: "Invalid role. Admin role cannot be self-selected."
```

---

## 📝 **Summary**

### **Frontend:**
- ✅ Detects admin email pattern (`admin1@`, `admin2@`, etc.)
- ✅ Disables Account Type dropdown when admin email detected
- ✅ Auto-sets Account Type to "Administrator"
- ✅ Shows visual indicator (green border, lock icon)

### **Backend (MUST IMPLEMENT):**
- ✅ Validates admin email pattern on backend
- ✅ Forces role = "Admin" when admin email detected
- ✅ Forces status = "Activated" for admin emails
- ✅ Ignores role from request body if admin email detected
- ✅ Prevents role manipulation via direct API calls
- ✅ Returns JWT token for activated admin accounts

---

## 🔗 **Related Files**

**Frontend:**
- `src/app/components/modals/signup-modal/signup-modal.component.ts`
- `src/app/components/modals/signup-modal/signup-modal.component.html`
- `src/app/services/auth.service.ts` (register method)

**Backend (To Implement):**
- `POST /api/auth/register` endpoint
- Email pattern validation logic
- Role and status enforcement

---

## ⚠️ **Important Notes**

1. **Backend enforcement is CRITICAL** - Frontend detection is for UX only
2. **Pattern is configurable** - Can be adjusted in backend settings
3. **Domain whitelist is optional** - Can restrict to specific domains
4. **Same endpoint** - Uses regular registration endpoint, no separate admin endpoint needed

---

**This approach is simpler, more secure, and uses the existing signup flow!**

