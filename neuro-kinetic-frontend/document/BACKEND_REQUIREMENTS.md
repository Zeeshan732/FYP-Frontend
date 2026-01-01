# Backend Requirements - Patient Test Functionality

**Last Updated:** November 2024  
**Status:** 📋 Requirements for Backend Team

---

## 📋 **What's Needed from Backend**

This document outlines all backend requirements to support the Patient Test functionality that has been implemented on the frontend.

---

## 1️⃣ **UserTestRecord Model & Database**

### **Model Structure (.NET)**

```csharp
public class UserTestRecord
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public DateTime TestDate { get; set; }
    public string TestResult { get; set; } = "Uncertain"; // "Positive", "Negative", "Uncertain"
    public double Accuracy { get; set; } // Percentage (0-100)
    public string Status { get; set; } = "Pending"; // "Completed", "Pending", "Failed"
    public string? VoiceRecordingUrl { get; set; }
    public string? AnalysisNotes { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Navigation property (optional)
    public User? User { get; set; }
}
```

### **Database Table Schema**

```sql
CREATE TABLE UserTestRecords (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    UserName NVARCHAR(255) NOT NULL,
    TestDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    TestResult NVARCHAR(50) NOT NULL DEFAULT 'Uncertain', -- 'Positive', 'Negative', 'Uncertain'
    Accuracy FLOAT NOT NULL DEFAULT 0.0, -- 0-100
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Completed', 'Pending', 'Failed'
    VoiceRecordingUrl NVARCHAR(500) NULL,
    AnalysisNotes NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- Foreign key (if User table exists)
    CONSTRAINT FK_UserTestRecord_User FOREIGN KEY (UserId) REFERENCES Users(Id),
    
    -- Indexes for performance
    INDEX IX_UserTestRecord_UserId (UserId),
    INDEX IX_UserTestRecord_TestDate (TestDate),
    INDEX IX_UserTestRecord_Status (Status),
    INDEX IX_UserTestRecord_TestResult (TestResult)
);
```

### **DTOs (Data Transfer Objects)**

```csharp
// Request DTO for creating test record
public class CreateUserTestRecordDto
{
    public int? UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? TestResult { get; set; } // "Positive", "Negative", "Uncertain"
    public double? Accuracy { get; set; } // 0-100
    public string? Status { get; set; } // "Completed", "Pending", "Failed"
    public string? VoiceRecordingUrl { get; set; }
    public string? AnalysisNotes { get; set; }
}

// Response DTO
public class UserTestRecordDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public DateTime TestDate { get; set; }
    public string TestResult { get; set; } = "Uncertain";
    public double Accuracy { get; set; }
    public string Status { get; set; } = "Pending";
    public string? VoiceRecordingUrl { get; set; }
    public string? AnalysisNotes { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

---

## 2️⃣ **API Endpoints Required**

### **A. Test Records Endpoints**

#### **1. Get All Test Records (Paginated)**
```
GET /api/testrecords
```

**Query Parameters:**
- `pageNumber` (int, optional, default: 1)
- `pageSize` (int, optional, default: 10)
- `sortBy` (string, optional, default: "testDate")
  - Values: "testDate", "accuracy", "testResult", "status", "userName"
- `sortOrder` (string, optional, default: "desc")
  - Values: "asc", "desc"
- `userId` (int, optional) - Filter by user ID
- `status` (string, optional) - Filter by status
  - Values: "Completed", "Pending", "Failed"
- `testResult` (string, optional) - Filter by result
  - Values: "Positive", "Negative", "Uncertain"

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "userId": 123,
      "userName": "user@example.com",
      "testDate": "2024-11-02T10:00:00Z",
      "testResult": "Positive",
      "accuracy": 85.5,
      "status": "Completed",
      "voiceRecordingUrl": "/uploads/voice/recording_123.wav",
      "analysisNotes": "Test completed successfully",
      "createdAt": "2024-11-02T10:00:00Z"
    }
  ],
  "totalCount": 100,
  "pageNumber": 1,
  "pageSize": 10,
  "totalPages": 10,
  "hasPrevious": false,
  "hasNext": true
}
```

#### **2. Get All Test Records (No Pagination)**
```
GET /api/testrecords/all
```

**Response:**
```json
[
  {
    "id": 1,
    "userId": 123,
    "userName": "user@example.com",
    ...
  }
]
```

#### **3. Get Test Record by ID**
```
GET /api/testrecords/{id}
```

**Response:**
```json
{
  "id": 1,
  "userId": 123,
  "userName": "user@example.com",
  "testDate": "2024-11-02T10:00:00Z",
  "testResult": "Positive",
  "accuracy": 85.5,
  "status": "Completed",
  "voiceRecordingUrl": "/uploads/voice/recording_123.wav",
  "analysisNotes": "Test completed successfully",
  "createdAt": "2024-11-02T10:00:00Z"
}
```

#### **4. Create Test Record**
```
POST /api/testrecords
```

**Request Body:**
```json
{
  "userId": 123,
  "userName": "user@example.com",
  "testResult": "Uncertain",
  "accuracy": 0,
  "status": "Pending",
  "voiceRecordingUrl": "/uploads/voice/recording_123.wav",
  "analysisNotes": "Test submitted"
}
```

**Response:**
```json
{
  "id": 1,
  "userId": 123,
  "userName": "user@example.com",
  "testDate": "2024-11-02T10:00:00Z",
  "testResult": "Uncertain",
  "accuracy": 0,
  "status": "Pending",
  "voiceRecordingUrl": "/uploads/voice/recording_123.wav",
  "analysisNotes": "Test submitted",
  "createdAt": "2024-11-02T10:00:00Z"
}
```

**Authorization:** Public (any authenticated user can create)

#### **5. Update Test Record**
```
PUT /api/testrecords/{id}
```

**Request Body:**
```json
{
  "testResult": "Positive",
  "accuracy": 85.5,
  "status": "Completed",
  "analysisNotes": "Analysis completed"
}
```

**Response:**
```json
{
  "id": 1,
  "userId": 123,
  "userName": "user@example.com",
  "testDate": "2024-11-02T10:00:00Z",
  "testResult": "Positive",
  "accuracy": 85.5,
  "status": "Completed",
  "voiceRecordingUrl": "/uploads/voice/recording_123.wav",
  "analysisNotes": "Analysis completed",
  "createdAt": "2024-11-02T10:00:00Z"
}
```

**Authorization:** 
- User can update their own records
- Admin can update any record

#### **6. Delete Test Record**
```
DELETE /api/testrecords/{id}
```

**Response:** 204 No Content

**Authorization:** Admin only

---

### **B. Admin Dashboard Analytics Endpoint**

#### **1. Get Admin Dashboard Analytics**
```
GET /api/admin/dashboard/analytics
```

**Authorization:** Admin only

**Response:**
```json
{
  "totalUsers": 1250,
  "totalTests": 3420,
  "positiveCases": 856,
  "negativeCases": 2314,
  "uncertainCases": 250,
  "averageAccuracy": 82.5,
  "usageByDay": [
    {
      "date": "2024-11-02T00:00:00Z",
      "count": 45,
      "label": "Nov 2"
    },
    {
      "date": "2024-11-01T00:00:00Z",
      "count": 38,
      "label": "Nov 1"
    }
    // ... last 30 days
  ],
  "usageByMonth": [
    {
      "date": "2024-11-01T00:00:00Z",
      "count": 1250,
      "label": "Nov 2024"
    },
    {
      "date": "2024-10-01T00:00:00Z",
      "count": 980,
      "label": "Oct 2024"
    }
    // ... last 12 months
  ],
  "usageByYear": [
    {
      "date": "2024-01-01T00:00:00Z",
      "count": 3420,
      "label": "2024"
    },
    {
      "date": "2023-01-01T00:00:00Z",
      "count": 2100,
      "label": "2023"
    }
    // ... last 5 years
  ],
  "recentTests": [
    {
      "id": 1,
      "userId": 123,
      "userName": "user@example.com",
      "testDate": "2024-11-02T10:00:00Z",
      "testResult": "Positive",
      "accuracy": 85.5,
      "status": "Completed",
      "createdAt": "2024-11-02T10:00:00Z"
    }
    // ... last 10 tests
  ],
  "testResultsDistribution": {
    "positive": 856,
    "negative": 2314,
    "uncertain": 250
  }
}
```

**Calculation Requirements:**
- `totalUsers`: Count of unique users who have taken tests
- `totalTests`: Total count of test records
- `positiveCases`: Count where TestResult = "Positive"
- `negativeCases`: Count where TestResult = "Negative"
- `uncertainCases`: Count where TestResult = "Uncertain"
- `averageAccuracy`: Average of all Accuracy values where Status = "Completed"
- `usageByDay`: Group tests by day for last 30 days
- `usageByMonth`: Group tests by month for last 12 months
- `usageByYear`: Group tests by year for last 5 years
- `recentTests`: Last 10 test records ordered by TestDate desc
- `testResultsDistribution`: Count by TestResult

---

## 3️⃣ **Service Layer Requirements**

### **UserTestRecordService Interface**

```csharp
public interface IUserTestRecordService
{
    Task<PagedResult<UserTestRecordDto>> GetTestRecordsAsync(GetTestRecordsQuery query);
    Task<IEnumerable<UserTestRecordDto>> GetAllTestRecordsAsync();
    Task<UserTestRecordDto> GetTestRecordByIdAsync(int id);
    Task<UserTestRecordDto> CreateTestRecordAsync(CreateUserTestRecordDto dto);
    Task<UserTestRecordDto> UpdateTestRecordAsync(int id, UpdateUserTestRecordDto dto);
    Task DeleteTestRecordAsync(int id);
}
```

### **AdminDashboardService Interface**

```csharp
public interface IAdminDashboardService
{
    Task<AdminDashboardAnalyticsDto> GetAnalyticsAsync();
}
```

---

## 4️⃣ **Controller Requirements**

### **UserTestRecordController**

```csharp
[ApiController]
[Route("api/[controller]")]
public class TestRecordsController : ControllerBase
{
    private readonly IUserTestRecordService _service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<UserTestRecordDto>>> GetTestRecords(
        [FromQuery] int? pageNumber,
        [FromQuery] int? pageSize,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortOrder,
        [FromQuery] int? userId,
        [FromQuery] string? status,
        [FromQuery] string? testResult)
    {
        // Implementation
    }

    [HttpGet("all")]
    public async Task<ActionResult<IEnumerable<UserTestRecordDto>>> GetAllTestRecords()
    {
        // Implementation
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserTestRecordDto>> GetTestRecord(int id)
    {
        // Implementation
    }

    [HttpPost]
    [Authorize] // Any authenticated user
    public async Task<ActionResult<UserTestRecordDto>> CreateTestRecord(
        [FromBody] CreateUserTestRecordDto dto)
    {
        // Implementation
    }

    [HttpPut("{id}")]
    [Authorize] // User can update own, Admin can update any
    public async Task<ActionResult<UserTestRecordDto>> UpdateTestRecord(
        int id,
        [FromBody] UpdateUserTestRecordDto dto)
    {
        // Implementation
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")] // Admin only
    public async Task<IActionResult> DeleteTestRecord(int id)
    {
        // Implementation
    }
}
```

### **AdminDashboardController**

```csharp
[ApiController]
[Route("api/admin/[controller]")]
[Authorize(Roles = "Admin")]
public class DashboardController : ControllerBase
{
    private readonly IAdminDashboardService _service;

    [HttpGet("analytics")]
    public async Task<ActionResult<AdminDashboardAnalyticsDto>> GetAnalytics()
    {
        // Implementation
    }
}
```

---

## 5️⃣ **Pagination Helper**

### **PagedResult<T> Model**

```csharp
public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPrevious => PageNumber > 1;
    public bool HasNext => PageNumber < TotalPages;
}
```

### **GetTestRecordsQuery**

```csharp
public class GetTestRecordsQuery
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string SortBy { get; set; } = "testDate";
    public string SortOrder { get; set; } = "desc";
    public int? UserId { get; set; }
    public string? Status { get; set; }
    public string? TestResult { get; set; }
}
```

---

## 6️⃣ **File Upload Integration**

### **Voice Recording Storage**

The frontend uploads voice recordings via the existing `/api/fileupload/upload` endpoint.

**Integration:**
1. Frontend uploads file → gets `fileUrl`
2. Frontend creates test record with `voiceRecordingUrl` = `fileUrl`
3. Backend stores `voiceRecordingUrl` in UserTestRecord

**Optional:**
- Store file reference in UserTestRecord
- Link UserTestRecord to FileUpload record

---

## 7️⃣ **ML Model Integration (Future)**

### **Analysis Flow**

```csharp
// When test record is created with status "Pending"
public async Task<UserTestRecordDto> ProcessTestAsync(int testRecordId)
{
    // 1. Get test record
    var record = await GetTestRecordByIdAsync(testRecordId);
    
    // 2. Download voice recording
    var audioData = await DownloadAudioFileAsync(record.VoiceRecordingUrl);
    
    // 3. Run ML model analysis
    var analysisResult = await _mlModelService.AnalyzeVoiceAsync(audioData);
    
    // 4. Update test record with results
    var updateDto = new UpdateUserTestRecordDto
    {
        TestResult = analysisResult.PredictedClass, // "Positive", "Negative", "Uncertain"
        Accuracy = analysisResult.ConfidenceScore,
        Status = "Completed",
        AnalysisNotes = analysisResult.Notes
    };
    
    return await UpdateTestRecordAsync(testRecordId, updateDto);
}
```

**ML Model Service Interface:**

```csharp
public interface IMLModelService
{
    Task<VoiceAnalysisResult> AnalyzeVoiceAsync(byte[] audioData);
}

public class VoiceAnalysisResult
{
    public string PredictedClass { get; set; } // "Positive", "Negative", "Uncertain"
    public double ConfidenceScore { get; set; } // 0-100
    public string? Notes { get; set; }
}
```

---

## 8️⃣ **Authorization Requirements**

### **Roles Needed:**
- `Admin` - Full access to all endpoints
- `Public` / `User` - Can create and view own test records
- `Researcher` - Same as Public (can view own records)
- `MedicalProfessional` - Same as Public (can view own records)

### **Endpoint Authorization:**

| Endpoint | Method | Authorization |
|----------|--------|---------------|
| `/api/testrecords` | GET | Public (filter by own userId if not admin) |
| `/api/testrecords/all` | GET | Public (filter by own userId if not admin) |
| `/api/testrecords/{id}` | GET | Public (own records only, unless admin) |
| `/api/testrecords` | POST | Authenticated user |
| `/api/testrecords/{id}` | PUT | Own records only, or Admin |
| `/api/testrecords/{id}` | DELETE | Admin only |
| `/api/admin/dashboard/analytics` | GET | Admin only |

---

## 9️⃣ **Database Queries Examples**

### **Get Paginated Test Records**

```sql
SELECT 
    Id, UserId, UserName, TestDate, TestResult, 
    Accuracy, Status, VoiceRecordingUrl, AnalysisNotes, CreatedAt
FROM UserTestRecords
WHERE 
    (@UserId IS NULL OR UserId = @UserId)
    AND (@Status IS NULL OR Status = @Status)
    AND (@TestResult IS NULL OR TestResult = @TestResult)
ORDER BY 
    CASE @SortBy
        WHEN 'testDate' THEN TestDate
        WHEN 'accuracy' THEN Accuracy
        WHEN 'testResult' THEN TestResult
        WHEN 'status' THEN Status
        WHEN 'userName' THEN UserName
        ELSE TestDate
    END
    + CASE @SortOrder WHEN 'desc' THEN ' DESC' ELSE ' ASC' END
OFFSET @Offset ROWS
FETCH NEXT @PageSize ROWS ONLY;

SELECT COUNT(*) FROM UserTestRecords WHERE ...;
```

### **Get Analytics**

```sql
-- Total users
SELECT COUNT(DISTINCT UserId) FROM UserTestRecords;

-- Total tests
SELECT COUNT(*) FROM UserTestRecords;

-- Positive cases
SELECT COUNT(*) FROM UserTestRecords WHERE TestResult = 'Positive';

-- Negative cases
SELECT COUNT(*) FROM UserTestRecords WHERE TestResult = 'Negative';

-- Uncertain cases
SELECT COUNT(*) FROM UserTestRecords WHERE TestResult = 'Uncertain';

-- Average accuracy
SELECT AVG(Accuracy) FROM UserTestRecords WHERE Status = 'Completed';

-- Usage by day (last 30 days)
SELECT 
    CAST(TestDate AS DATE) AS Date,
    COUNT(*) AS Count,
    FORMAT(CAST(TestDate AS DATE), 'MMM d') AS Label
FROM UserTestRecords
WHERE TestDate >= DATEADD(DAY, -30, GETUTCDATE())
GROUP BY CAST(TestDate AS DATE)
ORDER BY Date ASC;

-- Usage by month (last 12 months)
SELECT 
    DATEPART(YEAR, TestDate) AS Year,
    DATEPART(MONTH, TestDate) AS Month,
    COUNT(*) AS Count,
    FORMAT(TestDate, 'MMM yyyy') AS Label
FROM UserTestRecords
WHERE TestDate >= DATEADD(MONTH, -12, GETUTCDATE())
GROUP BY DATEPART(YEAR, TestDate), DATEPART(MONTH, TestDate)
ORDER BY Year ASC, Month ASC;

-- Usage by year (last 5 years)
SELECT 
    DATEPART(YEAR, TestDate) AS Year,
    COUNT(*) AS Count,
    CAST(DATEPART(YEAR, TestDate) AS NVARCHAR) AS Label
FROM UserTestRecords
WHERE TestDate >= DATEADD(YEAR, -5, GETUTCDATE())
GROUP BY DATEPART(YEAR, TestDate)
ORDER BY Year ASC;
```

---

## 🔟 **Error Handling**

### **Error Response Format**

```json
{
  "message": "Error message here",
  "errors": {
    "fieldName": ["Error 1", "Error 2"]
  }
}
```

### **Common Error Scenarios:**

1. **404 Not Found** - Test record doesn't exist
2. **403 Forbidden** - User trying to access/modify another user's record
3. **400 Bad Request** - Invalid request data (missing required fields, invalid values)
4. **401 Unauthorized** - Not authenticated
5. **500 Internal Server Error** - Server error

---

## 1️⃣1️⃣ **Validation Rules**

### **CreateUserTestRecordDto Validation:**

- `UserName`: Required, max 255 characters
- `UserId`: Optional, must exist if provided
- `TestResult`: Optional, must be "Positive", "Negative", or "Uncertain"
- `Accuracy`: Optional, must be 0-100
- `Status`: Optional, must be "Completed", "Pending", or "Failed"
- `VoiceRecordingUrl`: Optional, must be valid URL format
- `AnalysisNotes`: Optional, max 5000 characters

### **UpdateUserTestRecordDto Validation:**

- All fields optional
- Same validation rules as Create DTO

---

## 1️⃣2️⃣ **Summary Checklist**

### **Backend Team Must Implement:**

- [ ] UserTestRecord model (.NET)
- [ ] Database table with indexes
- [ ] Migration for UserTestRecords table
- [ ] CreateUserTestRecordDto
- [ ] UpdateUserTestRecordDto
- [ ] UserTestRecordDto
- [ ] PagedResult<T> model (if not exists)
- [ ] GetTestRecordsQuery model
- [ ] AdminDashboardAnalyticsDto
- [ ] UserTestRecordService interface and implementation
- [ ] AdminDashboardService interface and implementation
- [ ] TestRecordsController with 6 endpoints
- [ ] AdminDashboardController with analytics endpoint
- [ ] Authorization logic (user can only access own records)
- [ ] Pagination helper methods
- [ ] Database queries for analytics
- [ ] Error handling and validation
- [ ] Unit tests for services
- [ ] Integration tests for controllers

---

## 📝 **Notes**

1. **Dummy Data:** Frontend currently uses dummy data for testing. Once backend is ready, replace API calls.

2. **ML Model Integration:** Analysis logic should be implemented separately and called when test status changes from "Pending" to "Completed".

3. **Performance:** Consider caching for analytics endpoint if data doesn't change frequently.

4. **File Storage:** Voice recordings are stored via existing FileUpload endpoint. Just link the URL to UserTestRecord.

5. **Future Enhancements:**
   - Real-time analysis webhooks
   - Batch processing for multiple tests
   - Export functionality for analytics
   - Email notifications on test completion

---

**Status:** 📋 Ready for Backend Implementation  
**Frontend Status:** ✅ Complete and Waiting for Backend

