# Admin User Creation - Backend Requirements

**Date:** December 2024  
**Status:** ✅ Frontend Complete - Backend Requirements Documented

---

## 🎯 **Overview**

The frontend now includes a dedicated admin user creation feature with **two different flows**:

### **Flow 1: First Admin (Bootstrap)**
- **No authentication required** - For initial system setup
- **Route:** `/bootstrap-admin`
- **Endpoint:** `POST /api/admin/users/bootstrap`
- **When to use:** When no admin accounts exist in the system

### **Flow 2: Additional Admins**
- **Requires Admin authentication** - Only existing admins can create other admins
- **Route:** `/account-requests` (click "Create Admin" button)
- **Endpoint:** `POST /api/admin/users/admin`
- **When to use:** When at least one admin already exists

### **Common Features:**
1. **Account Type is Disabled** - Fixed to "Admin" (cannot be changed)
2. **Account Status is Automatically Approved** - No pending status for admin accounts
3. **Separate from Regular Registration** - Different endpoints and flows

---

## 📋 **Frontend Implementation**

### **Component Created:**
- `CreateAdminModalComponent` - Dedicated modal for creating admin users
- Located at: `src/app/components/modals/create-admin-modal/`

### **Features:**
- ✅ Account type field is **disabled** and fixed to "Admin"
- ✅ Clear indication that account will be **automatically approved**
- ✅ Uses `POST /api/admin/users/admin` endpoint
- ✅ Only accessible to existing admins (via account-requests page)
- ✅ Form validation (email, password strength, required fields)

### **API Method:**
```typescript
createAdminUser(data: CreateAdminUserRequest): Observable<string>
```

**Request Body:**
```typescript
{
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  institution?: string;
  researchFocus?: string;
}
```

**Response:**
- Content-Type: `text/plain`
- Returns success message string

---

## 🔧 **Backend Requirements**

### **1. Endpoint: `GET /api/admin/users/exists`**

**Purpose:** Check if any admin account exists in the system

**Required Behavior:**
- ✅ **Public endpoint** (no authentication required)
- ✅ **Returns boolean** (`true` if admin exists, `false` if not)

**Response:**
- **Status Code:** `200 OK`
- **Content-Type:** `application/json`
- **Body:** `true` or `false`

**Use Case:** Frontend uses this to determine if bootstrap flow is needed

---

### **2. Endpoint: `POST /api/admin/users/bootstrap`**

**Purpose:** Create the first admin account (initial system setup)

**Required Behavior:**
- ✅ **Public endpoint** (no authentication required)
- ✅ **Only works if NO admin exists** (return error if admin already exists)
- ✅ **Automatically set role to "Admin"** (ignore any role in request body)
- ✅ **Automatically set status to "Approved"** (not "Pending")
- ✅ **Return text/plain response** with success message

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "institution": "Medical Center",      // Optional
  "researchFocus": "Neurology"          // Optional
}
```

**Expected Response:**
- **Status Code:** `200 OK` or `201 Created`
- **Content-Type:** `text/plain`
- **Body:** Success message (e.g., "First admin account created successfully")

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `409 Conflict` - Admin account already exists (use regular admin creation endpoint)
- `409 Conflict` - Email already exists

---

### **3. Endpoint: `POST /api/admin/users/admin`**

**Purpose:** Create additional admin accounts (after first admin exists)

**Required Behavior:**
- ✅ **Must require Admin authentication** (only admins can create other admins)
- ✅ **Automatically set role to "Admin"** (ignore any role in request body)
- ✅ **Automatically set status to "Approved"** (not "Pending")
- ✅ **Return text/plain response** with success message

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "institution": "Medical Center",      // Optional
  "researchFocus": "Neurology"          // Optional
}
```

**Expected Response:**
- **Status Code:** `200 OK` or `201 Created`
- **Content-Type:** `text/plain`
- **Body:** Success message (e.g., "Admin user created successfully")

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not an admin user
- `409 Conflict` - Email already exists

---

### **2. Key Differences from Regular Registration**

| Feature | Regular Registration | Bootstrap Admin | Additional Admin |
|---------|---------------------|-----------------|------------------|
| **Endpoint** | `/api/auth/register` | `/api/admin/users/bootstrap` | `/api/admin/users/admin` |
| **Role** | User selects | Fixed to "Admin" | Fixed to "Admin" |
| **Status** | Starts as "Pending" | Automatically "Approved" | Automatically "Approved" |
| **Authentication** | Public | Public (no auth) | Requires Admin auth |
| **When Available** | Always | Only if no admin exists | Only if admin exists |
| **Response** | JSON with token/user | Plain text message | Plain text message |
| **Auto-login** | No (pending approval) | No (must log in) | No (must log in) |

---

### **3. Backend Implementation Checklist**

#### **Controller - Check Admin Exists:**
```csharp
[HttpGet("exists")]
[AllowAnonymous]  // ✅ Public endpoint
public async Task<ActionResult<bool>> CheckAdminExists()
{
    var adminExists = await _userService.AdminExistsAsync();
    return Ok(adminExists);
}
```

#### **Controller - Bootstrap First Admin:**
```csharp
[HttpPost("bootstrap")]
[AllowAnonymous]  // ✅ Public endpoint (no auth required)
public async Task<ActionResult<string>> BootstrapAdmin([FromBody] CreateAdminUserDto dto)
{
    // ✅ Check if admin already exists
    if (await _userService.AdminExistsAsync())
    {
        return Conflict("Admin account already exists. Please use the admin creation endpoint.");
    }
    
    // ✅ Validate input
    // ✅ Check if email already exists
    // ✅ Create user with role = "Admin"
    // ✅ Set status = "Approved" (not "Pending")
    // ✅ Return plain text success message
}
```

#### **Controller - Create Additional Admin:**
```csharp
[HttpPost("admin")]
[Authorize(Roles = "Admin")]  // ✅ Only admins can access
public async Task<ActionResult<string>> CreateAdminUser([FromBody] CreateAdminUserDto dto)
{
    // ✅ Validate input
    // ✅ Check if email already exists
    // ✅ Create user with role = "Admin"
    // ✅ Set status = "Approved" (not "Pending")
    // ✅ Return plain text success message
}
```

#### **DTO:**
```csharp
public class CreateAdminUserDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; }
    
    [Required]
    [MinLength(6)]
    public string Password { get; set; }
    
    [Required]
    public string FirstName { get; set; }
    
    [Required]
    public string LastName { get; set; }
    
    public string? Institution { get; set; }
    public string? ResearchFocus { get; set; }
}
```

#### **Service Logic:**
```csharp
public async Task<string> CreateAdminUserAsync(CreateAdminUserDto dto)
{
    // 1. Check if email exists
    if (await _userRepository.EmailExistsAsync(dto.Email))
    {
        throw new ConflictException("Email already exists");
    }
    
    // 2. Create user
    var user = new User
    {
        Email = dto.Email,
        FirstName = dto.FirstName,
        LastName = dto.LastName,
        Institution = dto.Institution,
        ResearchFocus = dto.ResearchFocus,
        Role = "Admin",           // ✅ Fixed to Admin
        Status = "Approved"        // ✅ Automatically approved
    };
    
    // 3. Hash password
    user.PasswordHash = HashPassword(dto.Password);
    
    // 4. Save to database
    await _userRepository.CreateAsync(user);
    
    // 5. Return success message
    return "Admin user created successfully";
}
```

---

### **4. Security Considerations**

1. **Authorization:**
   - ✅ Endpoint must require `[Authorize(Roles = "Admin")]`
   - ✅ Only authenticated admin users can create other admins
   - ✅ Regular users cannot access this endpoint

2. **Password Security:**
   - ✅ Hash passwords using secure hashing algorithm (e.g., BCrypt)
   - ✅ Never store plain text passwords
   - ✅ Enforce minimum password length (6+ characters)

3. **Email Validation:**
   - ✅ Check for duplicate emails before creation
   - ✅ Validate email format
   - ✅ Return appropriate error if email exists

4. **Input Validation:**
   - ✅ Validate all required fields
   - ✅ Sanitize input to prevent injection attacks
   - ✅ Return clear error messages

---

## 🧪 **Testing**

### **Test Cases:**

#### **1. Successful Admin Creation:**
```bash
POST /api/admin/users/admin
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "password": "SecurePass123",
  "firstName": "Jane",
  "lastName": "Admin",
  "institution": "Test Hospital"
}

Expected: 200 OK
Response: "Admin user created successfully"
```

#### **2. Unauthorized Access (Not Admin):**
```bash
POST /api/admin/users/admin
Authorization: Bearer {regular_user_jwt_token}

Expected: 403 Forbidden
```

#### **3. Duplicate Email:**
```bash
POST /api/admin/users/admin
Authorization: Bearer {admin_jwt_token}

{
  "email": "existing@example.com",  // Already exists
  "password": "SecurePass123",
  "firstName": "Test",
  "lastName": "User"
}

Expected: 409 Conflict
Response: { "message": "Email already exists" }
```

#### **4. Invalid Input:**
```bash
POST /api/admin/users/admin
Authorization: Bearer {admin_jwt_token}

{
  "email": "invalid-email",  // Invalid format
  "password": "123",         // Too short
  "firstName": "",           // Missing
  "lastName": "User"
}

Expected: 400 Bad Request
Response: { "errors": { ... } }
```

---

## 📝 **Summary**

### **Frontend Status:** ✅ Complete
- ✅ Admin creation modal component created
- ✅ Account type disabled and fixed to "Admin"
- ✅ Clear indication of auto-approval
- ✅ Integrated into account-requests page
- ✅ Form validation implemented

### **Backend Requirements:**
1. ✅ Endpoint: `POST /api/admin/users/admin`
2. ✅ Requires Admin authentication
3. ✅ Automatically sets role to "Admin"
4. ✅ Automatically sets status to "Approved"
5. ✅ Returns `text/plain` response
6. ✅ Validates input and checks for duplicate emails

---

## 🔗 **Related Files**

**Frontend:**
- `src/app/pages/bootstrap-admin/bootstrap-admin.component.ts` - First admin creation page
- `src/app/components/modals/create-admin-modal/create-admin-modal.component.ts` - Additional admin creation modal
- `src/app/services/api.service.ts` - API methods (checkAdminExists, createFirstAdmin, createAdminUser)
- `src/app/models/api.models.ts` - CreateAdminUserRequest interface
- `src/app/pages/account-requests/account-requests.component.ts` - Admin management page
- `src/app/guards/admin.guard.ts` - Updated to check admin existence

**Backend (To Implement):**
- `GET /api/admin/users/exists` - Check if admin exists
- `POST /api/admin/users/bootstrap` - Create first admin (no auth)
- `POST /api/admin/users/admin` - Create additional admin (requires auth)
- DTO: `CreateAdminUserDto`
- Service methods: `AdminExistsAsync()`, `BootstrapAdminAsync()`, `CreateAdminUserAsync()`

---

## ❓ **How to Identify Admin Account Creation**

The backend can identify admin account creation by:

### **Bootstrap Flow (First Admin):**
1. **Endpoint Path:** `/api/admin/users/bootstrap`
2. **Authorization:** None required (public endpoint)
3. **Check:** Must verify no admin exists before allowing creation

### **Regular Admin Creation (Additional Admins):**
1. **Endpoint Path:** `/api/admin/users/admin` (different from `/api/auth/register`)
2. **Authorization:** Requires Admin role authentication
3. **Request Context:** Only accessible to authenticated admin users

**The backend should:**
- ✅ Always set `role = "Admin"` (ignore any role in request)
- ✅ Always set `status = "Approved"` (never "Pending")
- ✅ Skip approval workflow (no pending state)

---

## 🚀 **User Flow**

### **Scenario 1: First Time Setup (No Admin Exists)**
1. User tries to access `/account-requests` or `/admin-dashboard`
2. `AdminGuard` checks if admin exists via `GET /api/admin/users/exists`
3. If no admin exists → Redirects to `/bootstrap-admin`
4. User fills out bootstrap form
5. Submits to `POST /api/admin/users/bootstrap`
6. Backend creates first admin account
7. User is redirected to `/login` to log in

### **Scenario 2: Additional Admin Creation (Admin Exists)**
1. Admin user logs in
2. Navigates to `/account-requests`
3. Clicks "Create Admin" button
4. Modal opens with admin creation form
5. Submits to `POST /api/admin/users/admin` (requires admin auth)
6. Backend creates additional admin account
7. Success message shown

---

**Note:** This is a separate flow from regular user registration. Regular users go through `/api/auth/register` and start with "Pending" status. Admin accounts created through either endpoint are immediately approved.

