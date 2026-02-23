# NeuroSync – What to Improve Next

**Generated:** February 2025  
**Scope:** Frontend (neuro-kinetic-frontend) + Backend (FYP-Backend)

---

## Already in good shape

- **Voice analysis flow:** Patient test → upload → POST `/api/analysis/process` → ML (training-model or ml_service) → results + PDF/CSV report with **Voice Feature Extraction** table.
- **Consultation / RAG chat:** Nebular Chat UI, screening-based Q&A, clear chat.
- **Auth, guards, test records, admin (users, account requests), notifications.**
- **PDF report:** Includes Voice Feature Extraction when voice features exist.
- **ML service:** Training-model supports WAV + (with FFmpeg) m4a/mp3; clear error when FFmpeg is missing.

---

## High priority – content & UX

### 1. **Clinical Use page** (`/clinical-use`)
- **Now:** Placeholder only (“clinical-use works!”).
- **Improve:** Add real content: implementation guidelines, “research use only” disclaimer, example use cases, links to Take Test / Consultation.

### 2. **Collaboration page** (`/collaboration`)
- **Now:** Placeholder only (“collaboration works!”).
- **Improve:** Add partnership/collaboration form and wire it to `POST /api/collaboration` (backend already has the endpoint). Show success/error and optional list of collaboration requests if API supports it.

### 3. **Audio format guidance for users**
- **Improve:** On patient-test or voice upload, show a short note: “WAV works best. M4A/MP3 may require server setup (FFmpeg).” and/or validate/block known problematic types (e.g. `videoplayback.m4a`-style names) with a friendly message.

---

## High priority – features

### 4. **Dataset display**
- **Now:** No dedicated UI; API exists (`GET /api/datasets`, `/datasets/public`, etc.).
- **Improve:** Add a page (e.g. `/datasets` or a section under Research/Admin) to list datasets with name, description, public/private, sample counts, and link to dataset detail if you have one.

### 5. **Voice Analysis module** (`/voice-analysis`)
- **Now:** Lazy-loaded module exists but is minimal/empty.
- **Improve:** Implement a proper voice analysis view (e.g. upload or link to a recording, show analysis result and optionally voice features), reusing existing API (`/api/analysis/process`, session, report).

### 6. **Gait Analysis module** (`/gait-analysis`)
- **Now:** Lazy-loaded module exists but is minimal/empty.
- **Improve:** Implement gait flow (upload/link video or data → call gait API if available → show results). Backend may already have or plan a gait pipeline; align UI with that.

---

## Medium priority – polish & ops

### 7. **Error messages from backend**
- **Now:** ML errors surface as “ML service error: BadRequest - {"detail":"..."}”.
- **Improve:** In .NET, parse the ML JSON `detail` when status is 400 and return a single clear message (e.g. “This format requires FFmpeg. Please use WAV or contact support.”) so the frontend can show it without raw JSON.

### 8. **Documentation**
- **Improve:** Update `document/PROJECT_STATUS.md` and `IMPLEMENTATION_STATUS.md`: remove references to technology-demo (deleted), add Consultation + Nebular chat, PDF voice features, training-model, and FFmpeg note for M4A/MP3.

### 9. **Task manager / in-app backlog**
- **Now:** `TaskManagerService` still lists “Real API Integration for Demo” and technology-demo–related tasks.
- **Improve:** Adjust or remove tasks that refer to the old technology-demo; add tasks for Clinical Use, Collaboration, Datasets, Voice/Gait modules so the in-app list matches reality.

---

## Lower priority – enhancements

### 10. **Cross-validation / metrics UI**
- **Now:** Docs mention cross-validation and metrics dashboards; routes may exist.
- **Improve:** If not already done, ensure `/metrics` and any cross-validation views call the right APIs and display fold-by-fold or dataset-level results clearly.

### 11. **Educational content**
- **Improve:** Add a simple “NeuroSync progression” or “Domain adaptation” explainer (text + optional diagram) on Technology or Clinical Use page.

### 12. **Charts and visualizations**
- **Improve:** Where you show metrics or trends, consider Chart.js (already used in patient-test) or D3 for custom charts. Lower priority than filling Clinical Use, Collaboration, and Datasets.

---

## Backend / DevOps

### 13. **Backend TODOs**
- **Now:** Comments in `AnalysisService.cs` and `Program.cs` about “Disabled old integration” and FastAPI ML service.
- **Improve:** Resolve or document the intended long-term design (e.g. “analysis/process uses IMLPredictionService; feature-only uses IVoicePredictionService”) and remove or update TODOs so the next developer isn’t confused.

### 14. **FFmpeg for M4A/MP3**
- **Now:** Training-model README explains FFmpeg; conversion error message is clear.
- **Improve:** In deployment (e.g. Docker or server docs), state that FFmpeg must be installed if you want to support M4A/MP3 uploads.

---

## Suggested order of work

1. **Clinical Use page** – content only, quick win.  
2. **Collaboration page** – form + API, high value.  
3. **User-facing audio hint** – short copy + optional validation.  
4. **Dataset display** – new page or section using existing APIs.  
5. **Backend error message cleanup** – parse ML `detail` and return a single message.  
6. **Voice Analysis module** – real flow using current voice API.  
7. **Gait Analysis module** – once backend gait pipeline is clear.  
8. **Docs and task list** – keep PROJECT_STATUS and in-app tasks in sync with the above.

---

## Quick reference

| Area            | Current state              | Next step                          |
|-----------------|----------------------------|------------------------------------|
| Clinical Use    | Placeholder                | Add real content                   |
| Collaboration   | Placeholder                | Form + POST /api/collaboration     |
| Datasets        | No UI                      | Page/section + existing APIs       |
| Voice Analysis  | Module empty               | Implement flow + reuse voice API   |
| Gait Analysis   | Module empty               | Implement flow + gait API           |
| Audio UX        | Generic errors             | WAV/M4A hint + clearer ML errors   |
| Docs / tasks    | Outdated / demo-focused    | Update status + task list          |
