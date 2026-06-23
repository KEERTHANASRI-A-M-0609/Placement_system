# CareerOS Implementation Plan

## Executive Summary
CareerOS is a **Placement Intelligence Operating System** — not a prep platform. It continuously understands a student's readiness, identifies gaps, learns from failures, and predicts placement outcomes based on real user data.

**Current Status:**
- ✅ Frontend: React 19 + TypeScript + Tailwind + Framer Motion setup complete
- ✅ Most pages scaffolded (Landing, Onboarding, Dashboard, etc.)
- ❌ Backend: Not started
- ❌ Database: Not connected
- ❌ Authentication: Not implemented
- ❌ Data persistence: Using localStorage (needs MongoDB)
- ❌ Analytics/Intelligence engines: Not implemented

**Recommendation:** Build backend in phases. Start with MVP authentication + assessment engine, then add intelligence layers.

---

## Phase 0: Backend Foundation (Week 1-2)

### Tech Stack Decision
**Backend:** Node.js + Express + MongoDB  
**Auth:** JWT + Google OAuth2  
**Database:** MongoDB Atlas (cloud-based, free tier available)  
**API Design:** RESTful with clear separation of concerns

### Deliverables

#### 0.1 Backend Project Setup
```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── auth.ts
│   │   └── env.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── assessments.ts
│   │   ├── applications.ts
│   │   ├── failures.ts
│   │   └── recovery.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Assessment.ts
│   │   ├── Application.ts
│   │   ├── FailureEntry.ts
│   │   └── RecoveryLog.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── assessmentService.ts (Readiness Engine)
│   │   ├── gapService.ts (Gap Intelligence)
│   │   ├── forecastService.ts (Readiness Forecasting)
│   │   └── recoveryService.ts (Recovery Intelligence)
│   ├── utils/
│   │   ├── logger.ts
│   │   └── validators.ts
│   └── server.ts
├── .env.example
├── package.json
└── tsconfig.json
```

#### 0.2 Database Schema

**User Collection**
```typescript
{
  _id: ObjectId,
  email: string,
  googleId?: string,
  name: string,
  college: string,
  branch: string,
  graduationYear: number,
  cgpa: number,
  targetRole: string,
  targetCompanies: string[],
  weeklyHours: number,
  currentStage: 'Just Started' | 'Preparing' | 'Interview Ready',
  createdAt: Date,
  updatedAt: Date,
  lastActive: Date
}
```

**Assessment Collection**
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  dsa: number,
  projects: number,
  resume: number,
  communication: number,
  aptitude: number,
  completedAt: Date,
  details: {
    dsa: {
      easyCount: number,
      mediumCount: number,
      hardCount: number,
      platforms: string[]
    },
    projects: {
      count: number,
      complexity: string[],
      hasGithub: boolean
    },
    resume: {
      atsScore: number,
      completeness: number
    },
    communication: {
      mockInterviewScore: number,
      confidenceRating: number
    },
    aptitude: {
      score: number
    }
  }
}
```

**Application Collection**
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  company: string,
  role: string,
  status: 'Wishlist' | 'Applied' | 'Online Assessment' | 'Technical Interview' | 'HR Interview' | 'Selected' | 'Rejected',
  appliedDate: Date,
  deadline?: Date,
  notes: string,
  interviewRounds: [{
    roundNumber: number,
    type: 'Online Assessment' | 'Technical' | 'HR',
    questionsAsked: string,
    difficulty: 'Easy' | 'Medium' | 'Hard',
    performanceRating: number
  }]
}
```

**FailureEntry Collection**
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  company: string,
  role: string,
  round: string,
  interviewDate: Date,
  questionsAsked: string,
  difficulty: 'Easy' | 'Medium' | 'Hard',
  confidence: 1 | 2 | 3 | 4 | 5,
  rejectionReason: 'DSA' | 'Projects' | 'Communication' | 'System Design' | 'Unknown',
  tags: string[],
  insights: string[]
}
```

**RecoveryLog Collection**
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  inactiveStartDate: Date,
  inactiveDays: number,
  reason: 'Busy' | 'Exams' | 'Burnout' | 'Lost Motivation' | 'Personal Reasons',
  recoveryPlanCreated: Date,
  originalDailyHours: number,
  adjustedDailyHours: number,
  recoveryTasksScheduled: {
    date: Date,
    task: string,
    estimatedTime: number
  }[]
}
```

#### 0.3 Authentication APIs
- `POST /api/auth/register` — Email registration
- `POST /api/auth/login` — Email login with JWT
- `POST /api/auth/google` — Google OAuth callback
- `POST /api/auth/logout` — Invalidate session
- `GET /api/auth/me` — Verify token & get user

---

## Phase 1: Frontend - Landing & Authentication (Week 1-2)

### 1.1 Landing Page
✅ **Already has structure.** Tasks:
- [ ] Add smooth animations (scroll-triggered)
- [ ] Add "Start Assessment" button → redirects to signup
- [ ] Add "Watch Product Tour" → modal video
- [ ] Make hero responsive on mobile
- [ ] Add FAQ section

### 1.2 Authentication Flow
- [ ] Create Auth UI component
  - Sign up form (name, email, password, college)
  - Login form
  - Google OAuth button
  - Forgot password flow
- [ ] Integrate with backend `/api/auth/*`
- [ ] Store JWT in `localStorage` or secure httpOnly cookie
- [ ] Add route protection middleware
- [ ] Add loading states and error handling

### 1.3 User Redux/Store Update
```typescript
// Update AppContext to include auth state
auth: {
  isAuthenticated: boolean,
  user: UserProfile | null,
  token: string | null,
  loading: boolean,
  error: string | null
}
setAuth: (auth: Partial<AuthState>) => void
```

---

## Phase 2: Frontend - Onboarding Flow (Week 2)

### 2.1 Intelligent Onboarding
✅ **Partially started.** Complete:
- [ ] Step 1: Personal Info (name, college, branch, graduation year, CGPA)
- [ ] Step 2: Career Goal (Placement, Internship, Higher Studies, Competitive Exams, Career Switch)
- [ ] Step 3: Target Role (Software Engineer, Product Manager, Data Analyst, Data Scientist, UI/UX, Cybersecurity)
- [ ] Step 4: Target Companies (Multi-select: Product-based, Service-based, Startup, Dream Companies)
- [ ] Step 5: Available Hours (5, 10, 15, 20+ hours/week)
- [ ] Step 6: Current Preparation Stage (Just Started, Preparing, Interview Ready)
- [ ] Confirmation screen with summary
- [ ] Save to backend via `POST /api/users/profile`

### 2.2 Placement Blueprint Generation
After onboarding, trigger:
- [ ] Analyze target role requirements
- [ ] Create personalized competencies list (DSA, Projects, Resume, Communication, Interview Skills)
- [ ] Show visual roadmap
- [ ] Save blueprint to backend

---

## Phase 3: Readiness Assessment Engine (Week 3)

### 3.1 Assessment UI
- [ ] Multi-step assessment form:
  - **DSA Assessment:** Easy/Medium/Hard problem counts, platforms (LeetCode, GeeksforGeeks, etc.)
  - **Projects Assessment:** GitHub Repo Link Analysis (Evidence-based)
  - **Resume Assessment:** PDF/Image/Drive Link Ingestion (Authentication-based)
  - **Communication Assessment:** Voice-to-Text / Audio Recording Analysis (Universal)
  - **Aptitude Assessment:** Interactive Quiz (Optional)
- [ ] Live score preview as user fills
- [ ] Submit assessment → triggers backend calculation

### 3.2 Readiness Calculation Service (Backend)
```typescript
// assessmentService.ts
export interface ReadinessScores {
  dsa: number;           // 0-100
  projects: number;
  resume: number;
  communication: number;
  aptitude: number;
  overall: number;
  breakdown: {
    category: string;
    current: number;
    expected: number;
    gap: number;
  }[];
}

calculateReadiness(assessmentData): ReadinessScores {
  // DSA: (Easy×10 + Medium×15 + Hard×25) / (total expected)
  // Projects: (count × 15) + (github × 10) + (deployed × 15)
  // Resume: (ATS × 0.6) + (completeness × 0.4)
  // Communication: (mock score × 0.7) + (confidence × 0.3)
  // Aptitude: direct score
  // Overall: weighted average
}
```

### 3.3 Readiness Card on Dashboard
- [ ] Large score ring showing overall readiness %
- [ ] 5 sub-category scores (DSA, Projects, Resume, Communication, Aptitude)
- [ ] Exact breakdown of how score was calculated
- [ ] "Retake Assessment" button
- [ ] Last assessment timestamp

---

## Phase 4: Gap Intelligence Engine (Week 3-4)

### 4.1 Gap Analysis Service (Backend)
```typescript
// gapService.ts
export interface CompetencyGap {
  category: string;
  expected: number;      // What's needed for target role
  current: number;       // What user has
  gap: number;           // Difference
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  impact: string;        // Why this matters
}

calculateGaps(userProfile, assessment): CompetencyGap[] {
  // Role requirements defined by target role
  // Compare current vs expected
  // Sort by gap size
  // Assign priorities based on role-specific importance
}
```

### 4.2 Gaps Page UI
- [ ] "Placement Blockers" section
  - List gaps sorted by size (largest first)
  - Visual progress bars for each gap
  - Impact statement ("This is blocking 40% of your interviews")
- [ ] "Prioritized Improvement Areas" section
  - Color-coded by priority (Critical/High/Medium/Low)
  - Actionable recommendation for each gap
- [ ] "Your Blueprint vs Reality" comparison view

---

## Phase 5: Dynamic Action Engine (Week 4)

### 5.1 Task Generation Service (Backend)
```typescript
// actionService.ts
export interface DailyTask {
  date: Date;
  weakestArea: string;
  task: string;
  estimatedTime: number;
  category: 'DSA' | 'Projects' | 'Resume' | 'Communication' | 'Aptitude';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  resources: Resource[];
}

generateDailyTasks(userProfile, gaps, assessmentHistory): DailyTask[] {
  // Based on weakest areas from gaps
  // Rotate between categories
  // Increase difficulty gradually
  // Return 3-5 tasks for the day
}
```

### 5.2 Preparation Page
- [ ] "Today's Focus" section
  - Today's main task (largest visual emphasis)
  - Estimated time to complete
  - Link to resources
  - "Start" and "Complete" buttons
- [ ] "This Week's Plan" section
  - Daily task list
  - Upcoming focus areas
- [ ] "Recommended Resources" for each task
- [ ] Progress tracking (tasks completed this week)

---

## Phase 6: Interview Intelligence & Failure Analysis (Week 5)

### 6.1 Applications Tracking
- [ ] Create Application UI
  - Company, role, application date
  - Pipeline status (Wishlist → Selected/Rejected)
  - Interview rounds tracking
  - Notes section
- [ ] Interview Round Details
  - Questions asked
  - Difficulty level
  - Your confidence (1-5)
  - Performance rating (after result)
- [ ] Save to `/api/applications/`

### 6.2 Failure Intelligence Engine
- [ ] When marked as "Rejected":
  - Popup: "Why do you think you were rejected?"
  - Options: DSA, Projects, Communication, System Design, Unknown
  - Store failure entry in MongoDB
  - Add qualitative notes
- [ ] Pattern Detection Service (Backend)
  ```typescript
  // analyzeFailurePatterns(userId)
  // Returns:
  // - Most common rejection reason (with % confidence)
  // - Topics that appeared in failed interviews
  // - Failure trend over time
  // - Recovery recommendations
  ```

### 6.3 Failure Intelligence Dashboard
- [ ] Interview timeline (chart of all attempts)
- [ ] Failure reasons breakdown (pie chart)
- [ ] "Pattern Alert" (e.g., "80% of rejections are DSA-related")
- [ ] Improvement suggestions based on patterns
- [ ] Topic difficulty analysis (what's asked in interviews vs what you're weak in)

---

## Phase 7: Recovery Intelligence Engine (Week 5)

### 7.1 Inactivity Detection (Backend)
```typescript
// recoveryService.ts
// Runs as a scheduled job (e.g., daily cron)
detectInactivity(userId) {
  lastActive = user.lastActive
  daysSinceActive = today - lastActive
  
  if (daysSinceActive === 3 || 7 || 14) {
    createInactivityAlert(userId, daysSinceActive)
  }
}
```

### 7.2 Recovery Plan UI
- [ ] Inactivity Alert appears on dashboard after 3 days
  - "We noticed you haven't been active for 3 days"
  - "What happened?" (dropdown with reasons)
  - Options: Busy, Exams, Burnout, Lost Motivation, Personal Reasons
- [ ] After reason selection:
  - Generate recovery plan
  - Show adjusted daily goals (e.g., 20 min/day instead of 1 hour)
  - Create scaled-down task list
  - Show motivation message
- [ ] Recovery Progress tracking
  - Days active in recovery plan
  - Tasks completed
  - Gradual ramp-up back to normal

---

## Phase 8: Readiness Forecasting (Week 6)

### 8.1 Forecasting Service (Backend)
```typescript
// forecastService.ts
calculateForecast(userId) {
  consistency = calculateStreak(userId)
  readinessTrend = calculateReadinessTrend(userId)
  interviewPerformance = calculateInterviewSuccessRate(userId)
  applicationRate = getApplicationsPerWeek(userId)
  
  return {
    placementReadiness: 'Low' | 'Medium' | 'High',
    readinessTrend: number,  // -10 to +10 (declining to improving)
    estimatedOfferDate: Date,
    reasons: string[]
  }
}
```

### 8.2 Career Health Dashboard
- [ ] Placement Progress Index (0-100%)
- [ ] Trend line (last 4 weeks)
- [ ] Forecast: "You're on track for placement in X weeks"
- [ ] Key factors:
  - Consistency score
  - Readiness improvement rate
  - Interview success rate
  - Applications pipeline
- [ ] "What's helping" vs "What's hurting" your progress

---

## Phase 9: Resource Intelligence Layer (Week 6)

### 9.1 Resource Mapping
- [ ] Create Resource database
  ```
  Role → Skill → Topic → [Curated Resources]
  Example:
  Software Engineer → DSA → Trees → [LeetCode Trees, GeeksforGeeks Trees, etc.]
  ```
- [ ] API: `GET /api/resources?role=SWE&topic=Trees`

### 9.2 Resource Recommendation UI
- [ ] Show resources based on:
  - Current weakest area
  - Target role requirements
  - User's learning level
- [ ] For each resource:
  - Title, description, link
  - Type (article, video, problem set, course)
  - Duration estimate
  - Difficulty
  - User ratings (1-5 stars)
- [ ] Allow users to:
  - Save resources
  - Rate resources
  - Add custom resources

---

## Phase 10: Advanced Features (Week 7)

### 10.1 Weekly Reports
- [ ] Generate weekly PDF/email report
  - Tasks completed this week
  - Time spent per category
  - Readiness progress
  - Interview performance (if applicable)
  - Recommendations for next week

### 10.2 Settings Page
- [ ] User profile management
- [ ] Goal/role updates
- [ ] Notification preferences
- [ ] Theme (light/dark)
- [ ] Export data
- [ ] Delete account

### 10.3 Notifications
- [ ] Inactivity alerts
- [ ] Application status updates
- [ ] Interview reminders
- [ ] Daily task reminders
- [ ] Weekly summary

---

## Phase 11: Polish & Deployment (Week 7-8)

### 11.1 Frontend Optimization
- [ ] Mobile responsiveness
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] Dark mode polish
- [ ] Animation refinements
- [ ] Error boundaries

### 11.2 Backend Hardening
- [ ] Rate limiting
- [ ] Input validation
- [ ] Error handling standardization
- [ ] Logging system
- [ ] Database indexing

### 11.3 Testing
- [ ] Unit tests (backend services)
- [ ] Integration tests (API endpoints)
- [ ] E2E tests (key user flows)

### 11.4 Deployment
- [ ] Backend: Deploy to Heroku, Railway, or Render
- [ ] Frontend: Deploy to Vercel
- [ ] Database: MongoDB Atlas
- [ ] Environment variables setup
- [ ] SSL/HTTPS enabled
- [ ] CI/CD pipeline

---

## API Specification

### Authentication Endpoints
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/google-callback
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/refresh
```

### User Endpoints
```
GET    /api/users/profile
PUT    /api/users/profile
PUT    /api/users/goals
GET    /api/users/blueprint
```

### Assessment Endpoints
```
POST   /api/assessments
GET    /api/assessments/latest
GET    /api/assessments/history
POST   /api/assessments/calculate-readiness
```

### Gap Analysis Endpoints
```
GET    /api/gaps/current
GET    /api/gaps/analysis
```

### Applications Endpoints
```
POST   /api/applications
GET    /api/applications
PUT    /api/applications/:id
DELETE /api/applications/:id
```

### Failure Analysis Endpoints
```
POST   /api/failures
GET    /api/failures/patterns
GET    /api/failures/analysis
```

### Recovery Endpoints
```
POST   /api/recovery/detect-inactivity
POST   /api/recovery/create-plan
GET    /api/recovery/plan
PUT    /api/recovery/status
```

### Forecasting Endpoints
```
GET    /api/forecast/placement-readiness
GET    /api/forecast/trend
```

### Resources Endpoints
```
GET    /api/resources
GET    /api/resources/recommended
POST   /api/resources/rate
```

---

## Data Flow Architecture

```
User Input (Assessment)
    ↓
Backend Service (Calculate Readiness)
    ↓
MongoDB (Store Assessment + Metadata)
    ↓
Service Triggers (Gap Calc, Forecast, etc.)
    ↓
MongoDB (Store Insights)
    ↓
Frontend Queries (GET /api/dashboard/insights)
    ↓
UI Renders (Charts, Cards, Recommendations)
```

---

## Key Design Principles

1. **No Hardcoded Data**
   - Every score, chart, insight must come from user data
   - Never show fake analytics
   - All recommendations generated dynamically

2. **Transparency**
   - Show exact calculation behind every score
   - Explain why gaps exist
   - Reasons for recommendations

3. **Behavioral Intelligence**
   - Detect inactivity, not just track time
   - Adapt recovery plans to circumstances
   - Learn from failure patterns

4. **Continuous Intelligence**
   - Update insights whenever new data arrives
   - Real-time readiness recalculation
   - Streaming updates for charts

---

## Next Steps

1. **Immediate:** Choose between
   - Option A: Build backend first (recommended)
   - Option B: Build frontend while mocking backend responses

2. **Backend Setup:**
   - Initialize Express server
   - Connect to MongoDB Atlas
   - Set up authentication flow
   - Create user model & API

3. **Frontend Integration:**
   - Connect Auth UI to backend
   - Implement API calls in AppContext
   - Replace demo data with real data

4. **First Intelligence Engine:**
   - Build assessment form
   - Implement readiness calculation
   - Display scores transparently

---

## Success Metrics

- ✅ User sees real readiness score (not fake)
- ✅ Gaps are calculated from user's actual state
- ✅ Daily tasks change based on weaknesses
- ✅ Failure patterns are detected after 3-5 entries
- ✅ Recovery plans adapt to circumstances
- ✅ All charts update when new data is added
- ✅ No static preloaded content anywhere
