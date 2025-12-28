# 📍 Where to Find Admin Account Creation in Frontend

## 🎯 **Two Locations for Admin Creation**

---

## **Location 1: First Admin (Bootstrap) - `/bootstrap-admin`**

### **When to Use:**
- ✅ **No admin exists in the system yet**
- ✅ **First time setup**
- ✅ **No login required**

### **How to Access:**

#### **Option A: Direct URL**
```
http://localhost:4200/bootstrap-admin
```

#### **Option B: Automatic Redirect**
- Try to access any admin page (like `/account-requests` or `/admin-dashboard`)
- If no admin exists, you'll be **automatically redirected** to `/bootstrap-admin`

### **What You'll See:**
- **Page Title:** "Initial Setup"
- **Subtitle:** "Create the first administrator account for the system"
- **Form Fields:**
  - First Name *
  - Last Name *
  - Email Address *
  - Organization
  - Research Focus
  - Account Type: **"Administrator"** (DISABLED - cannot change)
  - Password *
  - Confirm Password *
- **Button:** "Create First Admin Account"

### **File Location:**
```
src/app/pages/bootstrap-admin/
├── bootstrap-admin.component.ts
├── bootstrap-admin.component.html
└── bootstrap-admin.component.scss
```

---

## **Location 2: Additional Admins - `/account-requests` Page**

### **When to Use:**
- ✅ **At least one admin already exists**
- ✅ **You are logged in as an admin**
- ✅ **You want to create more admin accounts**

### **How to Access:**

#### **Step 1: Login as Admin**
- Go to: `http://localhost:4200/login`
- Login with admin credentials

#### **Step 2: Navigate to Account Requests**
**Option A: Via Sidebar Navigation**
1. After login, open the sidebar (if collapsed)
2. Look for **"Admin"** section at the bottom
3. Click on **"Account Requests"**

**Option B: Direct URL**
```
http://localhost:4200/account-requests
```

#### **Step 3: Click "Create Admin" Button**
- On the Account Requests page
- Look at the **top-right corner** of the page
- Find the green button with **"+" icon** and text **"Create Admin"**
- Click it to open the modal

### **What You'll See:**

#### **On Account Requests Page:**
```
┌─────────────────────────────────────────────────┐
│ Account Requests                                │
│ Review pending registrations and manage        │
│                                                 │
│ [Create Admin] [Filter ▼] [Search...] [Apply] │ ← Button is here!
└─────────────────────────────────────────────────┘
```

#### **In the Modal (After Clicking Button):**
- **Modal Title:** "Create Admin Account"
- **Subtitle:** "Create a new administrator account. Account will be automatically approved."
- **Form Fields:** (Same as bootstrap form)
  - Account Type: **"Administrator"** (DISABLED)
- **Button:** "Create Admin Account"

### **File Locations:**
```
src/app/pages/account-requests/
├── account-requests.component.ts
└── account-requests.component.html (line 11-19 has the button)

src/app/components/modals/create-admin-modal/
├── create-admin-modal.component.ts
├── create-admin-modal.component.html
└── create-admin-modal.component.scss
```

---

## 📋 **Quick Reference Table**

| Scenario | Route | Access Method | Login Required |
|----------|-------|---------------|----------------|
| **First Admin** | `/bootstrap-admin` | Direct URL or auto-redirect | ❌ No |
| **Additional Admins** | `/account-requests` | Sidebar → Account Requests → Button | ✅ Yes (Admin) |

---

## 🔍 **Visual Guide**

### **Finding "Create Admin" Button on Account Requests Page:**

```
┌─────────────────────────────────────────────────────────────┐
│  Account Requests                                           │
│  Review pending registrations and manage statuses.          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [Create Admin] [Status: All ▼] [Search...] [Apply]  │  │ ← HERE!
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ User    │ Email        │ Status │ Actions            │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ John    │ john@...     │ Pending│ [View]             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### **Button Details:**
- **Color:** Green (`bg-emerald-600`)
- **Icon:** Plus sign (+)
- **Text:** "Create Admin"
- **Location:** Top-right, next to filters

---

## 🚀 **Step-by-Step Instructions**

### **To Create First Admin:**

1. **Open browser:** `http://localhost:4200`
2. **Type in address bar:** `http://localhost:4200/bootstrap-admin`
3. **OR** try to access: `http://localhost:4200/account-requests` (will auto-redirect)
4. **Fill the form** and click "Create First Admin Account"
5. **Redirected to login** after creation

### **To Create Additional Admin:**

1. **Login:** Go to `http://localhost:4200/login` and login as admin
2. **Open Sidebar:** Click sidebar icon (if collapsed)
3. **Find "Account Requests":** Scroll to "Admin" section at bottom
4. **Click "Account Requests"** link
5. **Click "Create Admin"** button (green button, top-right)
6. **Fill modal form** and submit

---

## 🐛 **Troubleshooting**

### **"I can't see the Create Admin button"**
- ✅ Make sure you're logged in as **Admin** (not Public/Researcher)
- ✅ Check you're on `/account-requests` page
- ✅ Look at the **top-right corner** (next to filters)

### **"I can't access /account-requests"**
- ✅ Login first as admin
- ✅ If no admin exists, you'll be redirected to `/bootstrap-admin`

### **"Bootstrap page says admin already exists"**
- ✅ An admin account already exists
- ✅ Use the `/account-requests` page instead
- ✅ Login as admin first

---

## 📁 **Code References**

### **Bootstrap Admin Component:**
- **File:** `src/app/pages/bootstrap-admin/bootstrap-admin.component.ts`
- **Method:** `onSubmit()` - Creates first admin
- **API Call:** `apiService.createFirstAdmin()`

### **Create Admin Modal:**
- **File:** `src/app/components/modals/create-admin-modal/create-admin-modal.component.ts`
- **Method:** `onSubmit()` - Creates additional admin
- **API Call:** `apiService.createAdminUser()`

### **Account Requests Page:**
- **File:** `src/app/pages/account-requests/account-requests.component.html`
- **Line 11-19:** "Create Admin" button
- **Method:** `openCreateAdminModal()` - Opens the modal

---

## ✅ **Summary**

**Two places to create admin:**

1. **`/bootstrap-admin`** - First admin (no login needed)
2. **`/account-requests` → "Create Admin" button** - Additional admins (login as admin needed)

Both forms have the **Account Type disabled** and set to "Administrator"!

