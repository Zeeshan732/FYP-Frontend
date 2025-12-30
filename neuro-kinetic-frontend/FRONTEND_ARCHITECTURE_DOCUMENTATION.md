# NeuroSync Frontend - Client Layer Details

**Last Updated:** November 2024  
**Purpose:** Complete Architecture Diagram Client Layer  
**Status:** ✅ Complete

---

## 1. 🎨 Frontend Components/Views

### Main Pages/Components

| Component Name | Route | Purpose | Auth Required | Role Required |
|---------------|-------|---------|---------------|---------------|
| LandingComponent | `/landing`, `/` | Landing page with hero section, features, and contact info | No | Public |
| HomeComponent | `/home` | User home/dashboard page | Yes | All Roles |
| LoginComponent | `/login` | Login page (also available as modal) | No | Public |
| SignupComponent | `/signup` | Registration page (also available as modal) | No | Public |
| ServicesComponent | `/services` | Services information page | No | Public |
| ContactComponent | `/contact` | Contact form and information | No | Public |
| TechnologyComponent | `/technology` | Technology overview page | No | Public |
| TechnologyDemoComponent | `/technology-demo` | Technology demonstration page | No | Public |
| ResearchComponent | `/research` | Research information page | No | Public |
| ClinicalUseComponent | `/clinical-use` | Clinical use cases page | No | Public |
| CollaborationComponent | `/collaboration` | Collaboration request form | No | Public |
| PublicationsComponent | `/publications` | List of research publications | No | Public |
| PublicationDetailComponent | `/publications/:id` | Individual publication details | No | Public |
| MetricsDashboardComponent | `/metrics` | Performance metrics dashboard | Yes | Researcher, MedicalProfessional, Admin |
| CrossValidationComponent | `/cross-validation` | Cross-validation results | Yes | Researcher, MedicalProfessional, Admin |
| PatientTestComponent | `/patient-test` | Patient test recording and analysis | Yes | All Roles |
| TestRecordsComponent | `/test-records` | View and manage test records | Yes | All Roles |
| AdminDashboardComponent | `/admin-dashboard` | Admin analytics and statistics | Yes | Admin Only |
| VoiceAnalyzerComponent | `/voice-analysis` | Voice analysis module (lazy loaded) | Yes | All Roles |
| GaitVisualizerComponent | `/gait-analysis` | Gait analysis module (lazy loaded) | Yes | All Roles |

### Shared Components

| Component Name | Purpose | Used In |
|---------------|---------|---------|
| NavigationComponent | Top navbar (public) or sidebar (authenticated) | Global |
| HeaderComponent | Dynamic header with breadcrumbs and user badge | Authenticated pages |
| FooterComponent | Footer with links and contact info | Landing page only |
| LoginModalComponent | Login modal dialog | Global (triggered from navbar) |
| SignupModalComponent | Registration modal dialog | Global (triggered from navbar) |
| TestRecordDialogComponent | View/edit test record dialog | TestRecordsComponent |

---

## 2. 🔌 Frontend Services

### AuthService
**Location:** `src/app/services/auth.service.ts`

**Methods:**
- `login(email: string, password: string): Observable<AuthResponse>`
- `register(data: RegisterData): Observable<AuthResponse>`
- `logout(): void`
- `validateToken(): Observable<ValidationResponse>`
- `getCurrentUser(): User | null`
- `isAuthenticated(): boolean`
- `hasRole(role: string): boolean`
- `isResearcherOrAdmin(): boolean`
- `isAdmin(): boolean`

**API Endpoints Used:**
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/validate`

**State Management:**
- Uses `BehaviorSubject<User | null>` for current user state
- Stores JWT token in `localStorage`
- Stores user data in `localStorage`

---

### ApiService
**Location:** `src/app/services/api.service.ts`

**Main Methods by Feature:**

#### Publications
- `getPublications(params): Observable<PagedResult<Publication>>`
- `getAllPublications(): Observable<Publication[]>`
- `getPublication(id): Observable<Publication>`
- `getFeaturedPublications(params): Observable<PagedResult<Publication>>`
- `searchPublications(query): Observable<Publication[]>`
- `createPublication(data): Observable<Publication>`
- `updatePublication(id, data): Observable<Publication>`
- `deletePublication(id): Observable<void>`

**Endpoints:** `/api/publications`, `/api/publications/all`, `/api/publications/{id}`, `/api/publications/featured`, `/api/publications/search`

#### Metrics
- `getMetrics(params): Observable<PagedResult<PerformanceMetric>>`
- `getMetric(id): Observable<PerformanceMetric>`
- `getMetricsByDataset(datasetName, params): Observable<PagedResult<PerformanceMetric>>`
- `getAllMetrics(): Observable<PerformanceMetric[]>`
- `getMetricsDashboard(): Observable<PerformanceMetric[]>`
- `getMetricsDashboardAggregated(): Observable<MetricsDashboardDto>`
- `createMetric(data): Observable<PerformanceMetric>`

**Endpoints:** `/api/metrics`, `/api/metrics/{id}`, `/api/metrics/dataset/{name}`, `/api/metrics/all`, `/api/metrics/dashboard`, `/api/metrics/dashboard/aggregated`

#### Datasets
- `getAllDatasets(): Observable<Dataset[]>`
- `getDatasets(params): Observable<PagedResult<Dataset>>`
- `getPublicDatasets(params): Observable<PagedResult<Dataset>>`
- `getDataset(id): Observable<Dataset>`
- `createDataset(data): Observable<Dataset>`
- `updateDataset(id, data): Observable<Dataset>`
- `deleteDataset(id): Observable<void>`

**Endpoints:** `/api/datasets/all`, `/api/datasets`, `/api/datasets/public`, `/api/datasets/{id}`

#### Analysis
- `submitAnalysis(data): Observable<AnalysisResult>`
- `processAnalysis(data): Observable<AnalysisResult>` (legacy)
- `getAnalysisResult(id): Observable<AnalysisResult>`
- `getAnalysisBySessionId(sessionId): Observable<AnalysisResult>`

**Endpoints:** `/api/analysis/submit`, `/api/analysis/results/{id}`, `/api/analysis/session/{sessionId}`

#### Cross-Validation
- `getCrossValidationResults(params): Observable<PagedResult<CrossValidationResult>>`
- `getAllCrossValidationResults(): Observable<CrossValidationResult[]>`
- `getCrossValidationResult(id): Observable<CrossValidationResult>`
- `getCrossValidationByDataset(datasetName, params): Observable<PagedResult<CrossValidationResult>>`
- `getCrossValidationByDatasetAggregated(datasetName): Observable<CrossValidationAggregatedDto>`
- `createCrossValidationResult(data): Observable<CrossValidationResult>`

**Endpoints:** `/api/crossvalidation`, `/api/crossvalidation/all`, `/api/crossvalidation/{id}`, `/api/crossvalidation/dataset/{name}`, `/api/crossvalidation/dataset/{name}/aggregated`

#### Collaboration
- `createCollaborationRequest(data): Observable<CollaborationRequest>`
- `getCollaborationRequests(): Observable<CollaborationRequest[]>`
- `getCollaborationRequest(id): Observable<CollaborationRequest>`
- `updateCollaborationStatus(id, status, notes): Observable<CollaborationRequest>`

**Endpoints:** `/api/collaboration`, `/api/collaboration/{id}`, `/api/collaboration/{id}/status`

#### Health Checks
- `getHealthCheck(): Observable<HealthCheckResponse>`
- `getHealthReadiness(): Observable<HealthCheckResponse>`
- `getHealthLiveness(): Observable<HealthCheckResponse>`

**Endpoints:** `/api/health`, `/api/health/ready`, `/api/health/live`

#### User Test Records
- `getUserTestRecords(params): Observable<PagedResult<UserTestRecord>>`
- `getAllUserTestRecords(): Observable<UserTestRecord[]>`
- `getUserTestRecord(id): Observable<UserTestRecord>`
- `createUserTestRecord(data): Observable<UserTestRecord>`
- `updateUserTestRecord(id, data): Observable<UserTestRecord>`
- `deleteUserTestRecord(id): Observable<void>`

**Endpoints:** `/api/testrecords`, `/api/testrecords/all`, `/api/testrecords/{id}`

#### Admin Dashboard
- `getAdminDashboardAnalytics(params?): Observable<AdminDashboardAnalytics>`
  - Parameters: `days`, `months`, `years` (optional time range filters)

**Endpoints:** `/api/admin/dashboard/analytics`

---

### FileUploadService
**Location:** `src/app/services/file-upload.service.ts`

**Methods:**
- `uploadFile(file, fileType, sessionId?, description?): Observable<FileUploadResponse>`
- `uploadFileWithProgress(file, fileType, sessionId?, description?): Observable<HttpEvent<FileUploadResponse>>`
- `downloadFile(fileId): Observable<Blob>`
- `getFileUrl(fileId): Observable<string>`
- `getFilesBySession(sessionId): Observable<FileUploadResponse[]>`
- `getAllowedFileTypes(): Observable<FileTypes>`
- `deleteFile(fileId): Observable<void>`
- `validateFile(file, fileType): ValidationResult`
- `formatFileSize(bytes): string`

**API Endpoints Used:**
- `POST /api/fileupload/upload`
- `GET /api/fileupload/download/{fileId}`
- `GET /api/fileupload/url/{fileId}`
- `GET /api/fileupload/session/{sessionId}`
- `GET /api/fileupload/types`
- `DELETE /api/fileupload/{fileId}`

**File Types Supported:**
- Voice: `wav`, `mp3`, `m4a`, `flac`, `ogg`
- Gait/Video: `mp4`, `avi`, `mov`, `mkv`, `webm`
- Image: `jpg`, `jpeg`, `png`, `gif`, `webp`
- Max file size: 100 MB

---

### ModalService
**Location:** `src/app/services/modal.service.ts`

**Methods:**
- `openLoginModal(): void`
- `closeLoginModal(): void`
- `openSignupModal(): void`
- `closeSignupModal(): void`

**State Management:**
- Uses `BehaviorSubject<boolean>` for login modal state
- Uses `BehaviorSubject<boolean>` for signup modal state

---

### SidebarService
**Location:** `src/app/services/sidebar.service.ts`

**Methods:**
- `toggleSidebar(): void`
- `setSidebarCollapsed(collapsed: boolean): void`
- `getSidebarCollapsed(): boolean`

**State Management:**
- Uses `BehaviorSubject<boolean>` for sidebar collapsed state
- Persists state in `localStorage`

---

### TaskManagerService
**Location:** `src/app/services/task-manager.service.ts`

**Purpose:** Manages task-related operations (if implemented)

---

## 3. 🗺️ Routing Structure

```typescript
const routes: Routes = [
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: 'landing', component: LandingComponent },
  { path: 'home', component: HomeComponent },
  { path: 'services', component: ServicesComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'login', component: LoginComponent },
  { path: 'technology', component: TechnologyComponent },
  { path: 'technology-demo', component: TechnologyDemoComponent },
  { path: 'research', component: ResearchComponent },
  { path: 'publications', component: PublicationsComponent },
  { path: 'publications/:id', component: PublicationDetailComponent },
  { path: 'metrics', component: MetricsDashboardComponent },
  { path: 'cross-validation', component: CrossValidationComponent },
  { path: 'patient-test', component: PatientTestComponent },
  { path: 'test-records', component: TestRecordsComponent },
  { path: 'admin-dashboard', component: AdminDashboardComponent },
  { path: 'clinical-use', component: ClinicalUseComponent },
  { path: 'collaboration', component: CollaborationComponent },
  { 
    path: 'voice-analysis', 
    loadChildren: () => import('./modules/voice-analysis/voice-analysis.module').then(m => m.VoiceAnalysisModule) 
  },
  { 
    path: 'gait-analysis', 
    loadChildren: () => import('./modules/gait-analysis/gait-analysis.module').then(m => m.GaitAnalysisModule) 
  },
  { path: '**', redirectTo: '/landing' }
];
```

### Route Summary

| Route | Component | Auth Required | Role Required |
|-------|-----------|---------------|---------------|
| `/` | LandingComponent (redirect) | No | Public |
| `/landing` | LandingComponent | No | Public |
| `/home` | HomeComponent | Yes | All Roles |
| `/login` | LoginComponent | No | Public |
| `/services` | ServicesComponent | No | Public |
| `/contact` | ContactComponent | No | Public |
| `/technology` | TechnologyComponent | No | Public |
| `/technology-demo` | TechnologyDemoComponent | No | Public |
| `/research` | ResearchComponent | No | Public |
| `/publications` | PublicationsComponent | No | Public |
| `/publications/:id` | PublicationDetailComponent | No | Public |
| `/metrics` | MetricsDashboardComponent | Yes | Researcher, MedicalProfessional, Admin |
| `/cross-validation` | CrossValidationComponent | Yes | Researcher, MedicalProfessional, Admin |
| `/patient-test` | PatientTestComponent | Yes | All Roles |
| `/test-records` | TestRecordsComponent | Yes | All Roles |
| `/admin-dashboard` | AdminDashboardComponent | Yes | Admin Only |
| `/clinical-use` | ClinicalUseComponent | No | Public |
| `/collaboration` | CollaborationComponent | No | Public |
| `/voice-analysis` | VoiceAnalyzerComponent (lazy) | Yes | All Roles |
| `/gait-analysis` | GaitVisualizerComponent (lazy) | Yes | All Roles |

**Note:** Currently, there are **no route guards** implemented. Authentication checks are done at the component level using `AuthService`.

---

## 4. 🛡️ Guards and Interceptors

### Guards

**Status:** ❌ **No route guards currently implemented**

**Recommendation:** Should implement:
- `AuthGuard` - Protect authenticated routes
- `RoleGuard` - Protect role-specific routes (e.g., Admin only)

**Current Implementation:**
- Authentication checks are performed in component `ngOnInit()` methods
- Example: `AdminDashboardComponent` checks `authService.isAdmin()` and redirects if not admin

---

### Interceptors

#### AuthInterceptor
**Location:** `src/app/interceptors/auth.interceptor.ts`

**Purpose:**
- Adds JWT token to all HTTP requests via `Authorization: Bearer {token}` header
- Handles 401 Unauthorized errors (token expired/invalid)
- Handles 403 Forbidden errors (insufficient permissions)
- Automatically redirects to `/login` on 401 errors
- Clears token and user data from localStorage on authentication errors

**Implementation:**
```typescript
intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
  const token = localStorage.getItem('token');
  
  if (token) {
    request = request.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  
  return next.handle(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (this.router.url !== '/login') {
          this.router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
}
```

**Registered in:** `app.module.ts` as HTTP_INTERCEPTOR provider

---

## 5. 📦 State Management

### Current Implementation

**State Management:** ✅ **RxJS BehaviorSubject** (Simple state management)

**No NgRx, Akita, or NgXs** - Using lightweight RxJS-based state management

### State Stores

#### AuthService State
- **Store:** `BehaviorSubject<User | null>`
- **Observable:** `currentUser$`
- **Storage:** `localStorage` (token, user data)
- **Methods:** `getCurrentUser()`, `isAuthenticated()`, `hasRole()`, etc.

#### ModalService State
- **Login Modal:** `BehaviorSubject<boolean>`
- **Signup Modal:** `BehaviorSubject<boolean>`
- **Observables:** `loginModal$`, `signupModal$`

#### SidebarService State
- **Sidebar Collapsed:** `BehaviorSubject<boolean>`
- **Observable:** `sidebarCollapsed$`
- **Storage:** `localStorage` (persists collapsed state)

### Component-Level State
- Most components manage their own local state using component properties
- Data fetched from API services and stored in component properties
- No global state management library

---

## 6. 🎯 Feature Modules

### App Structure

```
src/
├── app/
│   ├── components/              # Shared components
│   │   ├── footer/
│   │   ├── header/
│   │   ├── modals/
│   │   │   ├── login-modal/
│   │   │   └── signup-modal/
│   │   ├── navigation/
│   │   └── test-record-dialog/
│   ├── interceptors/            # HTTP interceptors
│   │   └── auth.interceptor.ts
│   ├── models/                  # TypeScript interfaces/models
│   │   └── api.models.ts
│   ├── modules/                 # Feature modules (lazy loaded)
│   │   ├── voice-analysis/
│   │   │   ├── voice-analysis.module.ts
│   │   │   ├── voice-analysis-routing.module.ts
│   │   │   └── voice-analyzer/
│   │   └── gait-analysis/
│   │       ├── gait-analysis.module.ts
│   │       ├── gait-analysis-routing.module.ts
│   │       └── gait-visualizer/
│   ├── pages/                   # Main page components
│   │   ├── admin-dashboard/
│   │   ├── clinical-use/
│   │   ├── collaboration/
│   │   ├── contact/
│   │   ├── cross-validation/
│   │   ├── home/
│   │   ├── landing/
│   │   ├── login/
│   │   ├── metrics-dashboard/
│   │   ├── patient-test/
│   │   ├── publications/
│   │   ├── publication-detail/
│   │   ├── research/
│   │   ├── services/
│   │   ├── signup/
│   │   ├── technology/
│   │   ├── technology-demo/
│   │   └── test-records/
│   ├── services/                # Angular services
│   │   ├── api.service.ts
│   │   ├── auth.service.ts
│   │   ├── file-upload.service.ts
│   │   ├── modal.service.ts
│   │   ├── sidebar.service.ts
│   │   └── task-manager.service.ts
│   ├── app.component.ts
│   ├── app.component.html
│   ├── app.module.ts
│   └── app-routing.module.ts
```

### Feature Modules

#### VoiceAnalysisModule (Lazy Loaded)
- **Route:** `/voice-analysis`
- **Component:** `VoiceAnalyzerComponent`
- **Purpose:** Voice analysis and visualization

#### GaitAnalysisModule (Lazy Loaded)
- **Route:** `/gait-analysis`
- **Component:** `GaitVisualizerComponent`
- **Purpose:** Gait analysis and visualization

### Shared Components
- **NavigationComponent** - Used globally
- **HeaderComponent** - Used on authenticated pages
- **FooterComponent** - Used on landing page
- **LoginModalComponent** - Used globally
- **SignupModalComponent** - Used globally
- **TestRecordDialogComponent** - Used in TestRecordsComponent

---

## 7. 🔗 API Integration Points

### ✅ Currently Used Endpoints

#### Authentication
- ✅ `POST /api/auth/register` - User registration
- ✅ `POST /api/auth/login` - User login
- ✅ `GET /api/auth/validate` - Token validation

#### Test Records
- ✅ `GET /api/testrecords` - Get paginated test records
- ✅ `GET /api/testrecords/all` - Get all test records
- ✅ `GET /api/testrecords/{id}` - Get single test record
- ✅ `POST /api/testrecords` - Create test record
- ✅ `PUT /api/testrecords/{id}` - Update test record
- ✅ `DELETE /api/testrecords/{id}` - Delete test record

#### Admin Dashboard
- ✅ `GET /api/admin/dashboard/analytics` - Get analytics with time range filters (days, months, years)

#### Analysis
- ✅ `POST /api/analysis/submit` - Submit analysis request
- ✅ `GET /api/analysis/results/{id}` - Get analysis result by ID
- ✅ `GET /api/analysis/session/{sessionId}` - Get analysis by session ID

#### Publications
- ✅ `GET /api/publications` - Get paginated publications
- ✅ `GET /api/publications/all` - Get all publications
- ✅ `GET /api/publications/{id}` - Get single publication
- ✅ `GET /api/publications/featured` - Get featured publications
- ✅ `GET /api/publications/search?query={query}` - Search publications
- ✅ `POST /api/publications` - Create publication (if admin)
- ✅ `PUT /api/publications/{id}` - Update publication (if admin)
- ✅ `DELETE /api/publications/{id}` - Delete publication (if admin)

#### File Upload
- ✅ `POST /api/fileupload/upload` - Upload file
- ✅ `GET /api/fileupload/download/{fileId}` - Download file
- ✅ `GET /api/fileupload/url/{fileId}` - Get file URL
- ✅ `GET /api/fileupload/session/{sessionId}` - Get files by session
- ✅ `GET /api/fileupload/types` - Get allowed file types
- ✅ `DELETE /api/fileupload/{fileId}` - Delete file

#### Metrics
- ✅ `GET /api/metrics` - Get paginated metrics
- ✅ `GET /api/metrics/{id}` - Get single metric
- ✅ `GET /api/metrics/dataset/{name}` - Get metrics by dataset
- ✅ `GET /api/metrics/all` - Get all metrics
- ✅ `GET /api/metrics/dashboard` - Get metrics dashboard
- ✅ `GET /api/metrics/dashboard/aggregated` - Get aggregated metrics
- ✅ `POST /api/metrics` - Create metric (if admin)

#### Datasets
- ✅ `GET /api/datasets/all` - Get all datasets
- ✅ `GET /api/datasets` - Get paginated datasets
- ✅ `GET /api/datasets/public` - Get public datasets
- ✅ `GET /api/datasets/{id}` - Get single dataset
- ✅ `POST /api/datasets` - Create dataset (if admin)
- ✅ `PUT /api/datasets/{id}` - Update dataset (if admin)
- ✅ `DELETE /api/datasets/{id}` - Delete dataset (if admin)

#### Cross-Validation
- ✅ `GET /api/crossvalidation` - Get paginated cross-validation results
- ✅ `GET /api/crossvalidation/all` - Get all cross-validation results
- ✅ `GET /api/crossvalidation/{id}` - Get single cross-validation result
- ✅ `GET /api/crossvalidation/dataset/{name}` - Get by dataset
- ✅ `GET /api/crossvalidation/dataset/{name}/aggregated` - Get aggregated by dataset
- ✅ `POST /api/crossvalidation` - Create cross-validation result (if admin)

#### Collaboration
- ✅ `POST /api/collaboration` - Create collaboration request
- ✅ `GET /api/collaboration` - Get collaboration requests
- ✅ `GET /api/collaboration/{id}` - Get single collaboration request
- ✅ `PUT /api/collaboration/{id}/status` - Update collaboration status (if admin)

#### Health Checks
- ✅ `GET /api/health` - Health check
- ✅ `GET /api/health/ready` - Readiness check
- ✅ `GET /api/health/live` - Liveness check

---

## 8. 📱 UI Framework/Libraries

### UI Framework

**Framework:** ✅ **PrimeNG** + **Tailwind CSS**

**PrimeNG Version:** `^17.18.15`  
**PrimeIcons Version:** `^7.0.0`  
**Tailwind CSS Version:** `^3.4.18`

### PrimeNG Modules Used

- `ButtonModule` - Buttons
- `DialogModule` - Modal dialogs
- `ToastModule` - Toast notifications
- `ConfirmPopupModule` - Confirmation popups
- `InputTextModule` - Text inputs
- `DropdownModule` - Dropdown selects
- `CalendarModule` - Date pickers
- `InputTextareaModule` - Textarea inputs
- `TooltipModule` - Tooltips

### PrimeNG Components Used

- `<p-button>` - Buttons with icons
- `<p-dialog>` - Modal dialogs
- `<p-toast>` - Toast notifications
- `<p-confirmPopup>` - Confirmation popups
- `<p-inputText>` - Text inputs
- `<p-dropdown>` - Dropdown selects
- `<p-calendar>` - Date pickers
- `<p-inputTextarea>` - Textarea inputs
- `<p-tooltip>` - Tooltips

### PrimeNG Theme

**Theme:** `lara-dark-blue` (Dark theme)

**Location:** `src/styles.scss`
```scss
@import "primeng/resources/themes/lara-dark-blue/theme.css";
@import "primeng/resources/primeng.css";
@import "primeicons/primeicons.css";
```

### Tailwind CSS

- Used for utility-first styling
- Custom configuration in `tailwind.config.js`
- Responsive design classes (sm, md, lg, xl, 2xl)
- Dark theme customizations

### Custom Styling

- **SCSS** for component-specific styles
- **Global styles** in `src/styles.scss`
- **Custom scrollbar** styles
- **Responsive media queries** for large screens

---

## 9. 📊 Data Visualization

### Charting Library

**Library:** ✅ **Chart.js**

**Version:** `4.4.0` (loaded via CDN)

**CDN:** `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`

**Location:** `src/index.html`

### Charts Used

#### AdminDashboardComponent
- **Usage by Day Chart** - Line chart showing test records per day
- **Usage by Month Chart** - Bar chart showing test records per month (last 12 months)
- **Usage by Year Chart** - Bar chart showing test records per year (last 5 years)
- **Result Distribution Chart** - Doughnut chart showing test result distribution

**Chart Types:**
- Line Chart (Usage by Day)
- Bar Chart (Usage by Month, Usage by Year)
- Doughnut Chart (Result Distribution)

**Features:**
- Gradient backgrounds
- Smooth animations
- Custom tooltips
- Responsive design
- Time range filtering (days, months, years)

**Chart Configuration:**
- Professional styling with gradients
- Custom color schemes
- Interactive tooltips
- Responsive canvas sizing

---

## 10. 🔄 Real-time Features

### Current Implementation

**Status:** ❌ **No real-time features currently implemented**

**No WebSocket, SignalR, or polling** for live updates

**Recommendation:** Could implement:
- WebSocket connection for live analysis status updates
- SignalR for real-time notifications
- Polling for test record status updates

---

## 11. 🎨 Layout Structure

### Main Layout Components

```
AppComponent (Root)
├── NavigationComponent
│   ├── Top Navbar (when not authenticated or on landing page)
│   └── Sidebar (when authenticated and not on landing page)
├── HeaderComponent (when authenticated and not on landing page)
│   ├── Breadcrumb navigation (dynamic route display)
│   └── User badge/avatar (right corner)
├── RouterOutlet (main content area)
│   └── Page components render here
├── FooterComponent (only on landing page)
├── p-toast (PrimeNG toast notifications)
├── p-confirmPopup (PrimeNG confirmation popups)
├── LoginModalComponent (global modal)
└── SignupModalComponent (global modal)
```

### Navigation Structure

#### Top Navbar (Public/Landing Page)
- Logo
- Navigation links: Home, Services, Technology, Research, Publications, Contact
- Login/Signup buttons
- Mobile menu toggle

#### Sidebar (Authenticated)
- Logo
- Navigation menu items:
  - Home
  - Patient Test
  - Test Records
  - Metrics Dashboard (Researcher/MedicalProfessional/Admin)
  - Cross Validation (Researcher/MedicalProfessional/Admin)
  - Admin Dashboard (Admin only)
  - Publications
  - Research
  - Technology
  - Collaboration
  - Clinical Use
- Collapse/Expand toggle button
- Logout button

### Header Component

**Shown when:** User is authenticated and not on landing page

**Features:**
- Dynamic breadcrumb navigation (e.g., "Home / Test Records")
- User badge/avatar on right corner
- User name/initials display
- Responsive design (hides user info when sidebar collapsed)

### Layout Behavior

- **Sidebar Collapsed:** Content area adjusts with `ml-20` (80px margin)
- **Sidebar Expanded:** Content area adjusts with `ml-64` (256px margin)
- **Header Height:** `pt-16` (64px padding-top) for content area
- **Smooth Transitions:** CSS transitions for layout changes
- **Responsive:** Adapts to different screen sizes

---

## 12. 🔐 Authentication Flow

### Authentication Process

1. **User submits login form** (LoginComponent or LoginModalComponent)
   - Email and password entered

2. **AuthService.login() called**
   - Makes `POST /api/auth/login` request
   - Sends email and password in request body

3. **Backend responds with AuthResponse**
   - Contains `token` (JWT) and `user` object

4. **Token and user data stored**
   - JWT token stored in `localStorage.setItem('token', token)`
   - User data stored in `localStorage.setItem('user', JSON.stringify(user))`
   - User data also stored in `BehaviorSubject<User>` (currentUser$)

5. **Navigation**
   - User redirected to `/home` or intended destination
   - Navigation component switches from navbar to sidebar

6. **Subsequent requests**
   - `AuthInterceptor` automatically adds `Authorization: Bearer {token}` header to all HTTP requests

7. **Token validation**
   - `AuthService.validateToken()` can be called to verify token validity
   - Endpoint: `GET /api/auth/validate`

8. **Token expiration handling**
   - If API returns 401 Unauthorized, `AuthInterceptor`:
     - Clears token and user data from localStorage
     - Redirects to `/login`
     - Shows error message

9. **Logout**
   - `AuthService.logout()` called
   - Clears token and user data from localStorage
   - Clears BehaviorSubject
   - Redirects to `/login`
   - Sidebar collapses

### Registration Flow

1. **User submits registration form** (SignupModalComponent)
   - Fields: firstName, lastName, email, password, confirmPassword, institution (optional), role

2. **AuthService.register() called**
   - Makes `POST /api/auth/register` request
   - Sends registration data including role selection

3. **Backend responds with AuthResponse**
   - Contains token and user object

4. **Auto-login after registration**
   - Token and user data stored (same as login)
   - User redirected to `/home`

### Role Selection

**Available roles during signup:**
- Public (default)
- Researcher
- MedicalProfessional

**Note:** Admin role cannot be self-selected during registration

---

## 13. 📋 Forms and Validation

### Login Form

**Component:** `LoginModalComponent`, `LoginComponent`

**Fields:**
- `email` (string) - Required, email format
- `password` (string) - Required

**Validation:**
- Client-side: Required fields check
- Server-side: Email/password validation

**Submission:**
- Endpoint: `POST /api/auth/login`
- On success: Store token, redirect to `/home`
- On error: Display error message

---

### Registration Form

**Component:** `SignupModalComponent`, `SignupComponent`

**Fields:**
- `firstName` (string) - Required
- `lastName` (string) - Required
- `email` (string) - Required, email format
- `password` (string) - Required, minLength(6)
- `confirmPassword` (string) - Required, must match password
- `institution` (string) - Optional
- `role` (dropdown) - Required, options: Public, Researcher, MedicalProfessional

**Validation:**
- Client-side:
  - All required fields must be filled
  - Password must be at least 6 characters
  - Password and confirmPassword must match
- Server-side: Email uniqueness, password strength, etc.

**Submission:**
- Endpoint: `POST /api/auth/register`
- On success: Auto-login, redirect to `/home`
- On error: Display error message

---

### Test Record Form (Edit/View)

**Component:** `TestRecordDialogComponent`

**Fields:**
- `userName` (string) - Read-only, disabled
- `testDate` (Date) - Read-only, disabled
- `testResult` (dropdown) - Required, options: Positive, Negative, Uncertain
- `accuracy` (number) - Required, min(0), max(100)
- `status` (dropdown) - Required, options: Pending, Completed, Reviewed
- `voiceRecordingUrl` (string) - Read-only when viewing
- `analysisNotes` (textarea) - Optional

**Validation:**
- Client-side: Required fields, min/max values
- Server-side: Data validation

**Submission:**
- Endpoint: `PUT /api/testrecords/{id}` (for edit)
- On success: Close dialog, refresh records list, show success toast
- On error: Display error message

**Design:**
- Professional form layout with sections
- Icon labels for fields
- Required field indicators
- Accuracy indicator bar
- Custom scrollbar
- Responsive two-column grid

---

### Collaboration Request Form

**Component:** `CollaborationComponent`

**Fields:**
- `institutionName` (string) - Required
- `contactName` (string) - Required
- `contactEmail` (string) - Required, email format
- `contactPhone` (string) - Optional
- `proposalDescription` (textarea) - Optional
- `collaborationType` (string) - Optional

**Validation:**
- Client-side: Required fields, email format
- Server-side: Data validation

**Submission:**
- Endpoint: `POST /api/collaboration`
- On success: Show success message, reset form
- On error: Display error message

---

### Patient Test Form

**Component:** `PatientTestComponent`

**Fields:**
- File upload (voice/gait data)
- Session ID
- Analysis type selection
- Metadata fields

**Validation:**
- File type validation (via FileUploadService)
- File size validation (max 100 MB)
- Required fields

**Submission:**
- Endpoint: `POST /api/fileupload/upload` (file upload)
- Endpoint: `POST /api/analysis/submit` (analysis)
- On success: Show results, redirect to analysis view
- On error: Display error message

---

## 14. 🎯 User Roles and Permissions

### Available Roles

1. **Public** (Default)
   - Can view public pages (landing, services, publications, etc.)
   - Can register and login
   - Can submit patient tests
   - Can view own test records

2. **Researcher**
   - All Public permissions
   - Can access Metrics Dashboard
   - Can access Cross Validation
   - Can view research data

3. **MedicalProfessional**
   - All Public permissions
   - Can access Metrics Dashboard
   - Can access Cross Validation
   - Can view clinical data

4. **Admin**
   - All Researcher/MedicalProfessional permissions
   - Can access Admin Dashboard
   - Can manage all test records
   - Can manage publications, datasets, metrics
   - Can manage collaboration requests

### Role Storage

- User role stored in `User` object
- Retrieved from backend during login/registration
- Stored in `localStorage` and `BehaviorSubject`

### Role Checking

**AuthService Methods:**
- `hasRole(role: string): boolean` - Check if user has specific role
- `isResearcherOrAdmin(): boolean` - Check if user is researcher or admin
- `isAdmin(): boolean` - Check if user is admin

**Component-Level Checks:**
```typescript
// Example from AdminDashboardComponent
ngOnInit() {
  this.authService.currentUser$.subscribe(user => {
    if (user?.role !== 'Admin') {
      this.router.navigate(['/home']);
    } else {
      this.loadAnalytics();
    }
  });
}
```

**Template-Level Checks:**
```html
<!-- Example from navigation component -->
<div *ngIf="isAdmin">
  <a routerLink="/admin-dashboard">Admin Dashboard</a>
</div>
```

### Role-Specific Routes

- `/admin-dashboard` - Admin only (checked in component)
- `/metrics` - Researcher, MedicalProfessional, Admin
- `/cross-validation` - Researcher, MedicalProfessional, Admin
- All other routes - All authenticated users

**Note:** Currently no route guards, so role checks are done in components. Should implement `RoleGuard` for better security.

---

## 15. 📦 Third-Party Integrations

### Current Integrations

**Status:** ❌ **No third-party integrations currently implemented**

**No integrations with:**
- Google Analytics
- Sentry (error tracking)
- Stripe (payments)
- Google Maps
- Other external services

**Recommendation:** Could add:
- Google Analytics for usage tracking
- Sentry for error monitoring
- Payment gateway if needed
- Social media login (Google, Facebook)

---

## 16. 🚀 Build and Deployment

### Build Configuration

**Build Command:**
```bash
ng build --configuration production
```

**Output Directory:**
```
dist/NeuroSync-frontend/
```

**Build Configuration:**
- **TypeScript:** `~5.4.5`
- **Angular:** `^17.3.0`
- **Output:** ES2020 modules
- **Optimization:** Enabled in production
- **Source Maps:** Disabled in production

### Environment Configuration

**Development Environment:**
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7118/api'
  // Alternative: 'http://localhost:5130/api'
};
```

**Production Environment:**
```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.NeuroSync.com/api' // Update with production URL
};
```

### Deployment

**Current Status:** Not deployed (development only)

**Recommended Deployment Options:**
- **Static Hosting:** Netlify, Vercel, GitHub Pages
- **Cloud Storage:** AWS S3 + CloudFront, Azure Blob Storage
- **Container:** Docker + Kubernetes
- **Traditional:** Nginx, Apache

**Environment Variables:**
- `apiUrl` - Backend API URL (configured in environment files)

### Build Scripts

```json
{
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  }
}
```

---

## 📝 Summary

### Technology Stack

- **Framework:** Angular 17.3.0
- **Language:** TypeScript 5.4.5
- **UI Library:** PrimeNG 17.18.15
- **Styling:** Tailwind CSS 3.4.18 + SCSS
- **Charts:** Chart.js 4.4.0
- **State Management:** RxJS BehaviorSubject
- **HTTP Client:** Angular HttpClient
- **Routing:** Angular Router

### Key Features

✅ **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (Public, Researcher, MedicalProfessional, Admin)
- Token storage in localStorage
- Automatic token injection via interceptor

✅ **Responsive Design**
- Mobile-first approach
- Tailwind CSS utility classes
- PrimeNG responsive components
- Custom media queries for large screens

✅ **Professional UI/UX**
- Dark theme (lara-dark-blue)
- Smooth animations and transitions
- Toast notifications
- Confirmation dialogs
- Professional form designs

✅ **Data Visualization**
- Chart.js integration
- Admin dashboard analytics
- Time range filtering
- Interactive charts

✅ **File Upload**
- Multi-file type support
- Progress tracking
- File validation
- Session-based file management

### Architecture Highlights

- **Modular Structure:** Feature modules for voice/gait analysis (lazy loaded)
- **Service-Oriented:** Centralized API service for all backend communication
- **Component-Based:** Reusable components (modals, dialogs, navigation)
- **Type-Safe:** TypeScript interfaces for all API models
- **Error Handling:** Centralized error handling via interceptor

### Recommendations for Improvement

1. **Route Guards:** Implement `AuthGuard` and `RoleGuard` for better security
2. **State Management:** Consider NgRx if state becomes more complex
3. **Real-time Features:** Add WebSocket/SignalR for live updates
4. **Error Tracking:** Integrate Sentry for production error monitoring
5. **Analytics:** Add Google Analytics for usage tracking
6. **Testing:** Add unit tests and e2e tests
7. **Documentation:** Add JSDoc comments to services and components

---

## 📞 Contact

**Frontend Developer:** [Your Name]  
**Repository:** https://github.com/Zeeshan732/FYP (NeuroSync-frontend folder)  
**Last Updated:** November 2024

---

**Document Status:** ✅ Complete and Ready for Architecture Diagram

