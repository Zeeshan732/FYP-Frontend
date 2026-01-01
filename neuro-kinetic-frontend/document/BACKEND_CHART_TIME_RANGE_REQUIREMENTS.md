# Backend Changes Required for Chart Time Range Filters

## Overview
The frontend now supports dynamic time range selection for charts (Usage by Day, Usage by Month, Usage by Year). The backend API needs to be updated to accept and process these time range parameters.

---

## API Endpoint Changes

### Current Endpoint
```
GET /api/admin/dashboard/analytics
```

### Updated Endpoint (with Query Parameters)
```
GET /api/admin/dashboard/analytics?days={days}&months={months}&years={years}
```

### Query Parameters

| Parameter | Type | Required | Description | Default | Example Values |
|-----------|------|----------|-------------|---------|----------------|
| `days` | `int` | No | Number of days to include in "Usage by Day" chart | `30` | `7`, `15`, `30`, `60`, `90` |
| `months` | `int` | No | Number of months to include in "Usage by Month" chart | `12` | `3`, `6`, `12`, `18`, `24` |
| `years` | `int` | No | Number of years to include in "Usage by Year" chart | `5` | `1`, `2`, `3`, `5`, `10` |

---

## Implementation Details

### 1. Request Handling

**C# Example:**
```csharp
[HttpGet("dashboard/analytics")]
[Authorize(Roles = "Admin")]
public async Task<ActionResult<AdminDashboardAnalyticsDto>> GetDashboardAnalytics(
    [FromQuery] int? days = 30,
    [FromQuery] int? months = 12,
    [FromQuery] int? years = 5)
{
    // Validate parameters
    if (days.HasValue && (days < 1 || days > 365))
        return BadRequest("Days parameter must be between 1 and 365");
    
    if (months.HasValue && (months < 1 || months > 60))
        return BadRequest("Months parameter must be between 1 and 60");
    
    if (years.HasValue && (years < 1 || years > 20))
        return BadRequest("Years parameter must be between 1 and 20");
    
    // Use parameters or defaults
    var daysToInclude = days ?? 30;
    var monthsToInclude = months ?? 12;
    var yearsToInclude = years ?? 5;
    
    // Fetch and process data based on parameters
    var analytics = await _analyticsService.GetDashboardAnalyticsAsync(
        daysToInclude, 
        monthsToInclude, 
        yearsToInclude
    );
    
    return Ok(analytics);
}
```

### 2. Data Processing Logic

#### Usage by Day
- **Input**: `days` parameter (e.g., 15, 30, 60)
- **Logic**: 
  - Calculate start date: `DateTime.Now.AddDays(-days)`
  - Group test records by day for the last N days
  - Include all days in the range (even if count is 0)
  - Format labels: `"MMM dd"` (e.g., "Jan 15", "Feb 01")

**Example SQL Query:**
```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as count,
    DATE_FORMAT(created_at, '%b %d') as label
FROM test_records
WHERE created_at >= DATE_SUB(NOW(), INTERVAL @days DAY)
GROUP BY DATE(created_at)
ORDER BY date ASC
```

#### Usage by Month
- **Input**: `months` parameter (e.g., 6, 12, 18)
- **Logic**:
  - Calculate start date: `DateTime.Now.AddMonths(-months)`
  - Group test records by month for the last N months
  - Include all months in the range (even if count is 0)
  - Format labels: `"MMM yyyy"` (e.g., "Jan 2024", "Feb 2024")

**Example SQL Query:**
```sql
SELECT 
    DATE_FORMAT(created_at, '%Y-%m-01') as date,
    COUNT(*) as count,
    DATE_FORMAT(created_at, '%b %Y') as label
FROM test_records
WHERE created_at >= DATE_SUB(NOW(), INTERVAL @months MONTH)
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY date ASC
```

#### Usage by Year
- **Input**: `years` parameter (e.g., 1, 2, 3, 5)
- **Logic**:
  - Calculate start date: `DateTime.Now.AddYears(-years)`
  - Group test records by year for the last N years
  - Include all years in the range (even if count is 0)
  - Format labels: `"yyyy"` (e.g., "2022", "2023", "2024")

**Example SQL Query:**
```sql
SELECT 
    YEAR(created_at) as year,
    COUNT(*) as count,
    YEAR(created_at) as label
FROM test_records
WHERE created_at >= DATE_SUB(NOW(), INTERVAL @years YEAR)
GROUP BY YEAR(created_at)
ORDER BY year ASC
```

### 3. Response Structure

The response structure remains the same, but the arrays will contain data based on the selected time ranges:

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
      "date": "2024-01-15T00:00:00Z",
      "count": 45,
      "label": "Jan 15"
    },
    // ... more days based on 'days' parameter
  ],
  "usageByMonth": [
    {
      "date": "2024-01-01T00:00:00Z",
      "count": 320,
      "label": "Jan 2024"
    },
    // ... more months based on 'months' parameter
  ],
  "usageByYear": [
    {
      "date": "2024-01-01T00:00:00Z",
      "count": 1500,
      "label": "2024"
    },
    // ... more years based on 'years' parameter
  ],
  "recentTests": [...],
  "testResultsDistribution": {
    "positive": 856,
    "negative": 2314,
    "uncertain": 250
  }
}
```

---

## Important Considerations

### 1. Data Completeness
- **Include zero-count periods**: Ensure all days/months/years in the selected range are included, even if there are no test records for that period.
- **Example**: If `days=15`, return 15 entries (one for each day), even if some days have 0 tests.

### 2. Date Range Calculation
- **Use UTC or consistent timezone**: Ensure date calculations use a consistent timezone (preferably UTC).
- **Start from today**: The range should start from the current date and go back N days/months/years.

### 3. Performance Optimization
- **Index on created_at**: Ensure the `test_records` table has an index on `created_at` column for efficient queries.
- **Caching**: Consider caching results for frequently requested ranges (e.g., last 30 days, last 12 months).

### 4. Validation
- **Maximum limits**: Set reasonable maximum values to prevent performance issues:
  - `days`: Maximum 365 (1 year)
  - `months`: Maximum 60 (5 years)
  - `years`: Maximum 20
- **Minimum limits**: Ensure minimum values are at least 1.

### 5. Backward Compatibility
- **Default values**: If parameters are not provided, use the default values (30 days, 12 months, 5 years) to maintain backward compatibility.

---

## Testing Checklist

- [ ] Test with default parameters (no query params)
- [ ] Test with `days=15` (last 15 days)
- [ ] Test with `days=7` (last 7 days)
- [ ] Test with `months=6` (last 6 months)
- [ ] Test with `months=3` (last 3 months)
- [ ] Test with `years=1` (last 1 year)
- [ ] Test with `years=2` (last 2 years)
- [ ] Test with `years=3` (last 3 years)
- [ ] Test with all parameters together (`days=15&months=6&years=2`)
- [ ] Test with invalid parameters (negative values, too large)
- [ ] Verify data completeness (all periods included, even with 0 counts)
- [ ] Verify date ordering (ascending order)
- [ ] Verify label formatting (correct format for each chart type)
- [ ] Test performance with maximum values
- [ ] Test with empty database (no test records)

---

## Frontend Integration

The frontend will send requests like:
```
GET /api/admin/dashboard/analytics?days=15&months=6&years=2
```

The frontend automatically:
- Sends parameters when admin changes time range selectors
- Updates charts when new data is received
- Shows loading state during API calls
- Handles errors gracefully

---

## Summary

**Backend Changes Required:**
1. ✅ Add query parameters to `/api/admin/dashboard/analytics` endpoint
2. ✅ Implement parameter validation (min/max values)
3. ✅ Update data aggregation logic to use dynamic time ranges
4. ✅ Ensure all periods in range are included (even with 0 counts)
5. ✅ Format labels correctly for each chart type
6. ✅ Maintain backward compatibility with default values

**No Changes Required:**
- Response structure (same DTO)
- Authentication/Authorization (Admin role required)
- Other endpoints

---

## Contact

If you have any questions or need clarification on the implementation, please refer to the frontend code in:
- `src/app/pages/admin-dashboard/admin-dashboard.component.ts`
- `src/app/services/api.service.ts`

