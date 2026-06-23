# CareerOS Backend

RESTful API for CareerOS - Placement Intelligence Operating System

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env

# 3. Update .env with your MongoDB URI and API keys

# 4. Start development server
npm run dev

# 5. Build for production
npm run build
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires token)

### Users

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Assessments

- `POST /api/assessments` - Create assessment
- `GET /api/assessments/latest` - Get latest assessment
- `GET /api/assessments/history` - Get assessment history
- `GET /api/assessments/gaps` - Get competency gaps
- `GET /api/assessments/trend` - Get readiness trend

### Applications

- `POST /api/applications` - Create application
- `GET /api/applications` - List all applications
- `GET /api/applications/:id` - Get application details
- `PUT /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application

### Failures

- `POST /api/failures` - Record failure
- `GET /api/failures/analysis` - Get failure pattern analysis
- `GET /api/failures/timeline` - Get interview timeline
- `GET /api/failures/topics` - Get failure topics frequency

### Recovery

- `POST /api/recovery/detect` - Detect inactivity
- `POST /api/recovery/plan` - Create recovery plan
- `GET /api/recovery/status` - Get recovery status

## Database Models

- **User** - User profiles with authentication
- **Assessment** - Readiness assessments and scores
- **Application** - Job/internship applications and interview tracking
- **FailureEntry** - Interview failures and rejection patterns
- **RecoveryLog** - Inactivity and recovery plans

## Environment Variables

See `.env.example` for all required variables.

## Architecture

```
src/
├── config/         # Configuration (database, auth, env)
├── middleware/     # Express middleware (auth, error handling)
├── models/         # Mongoose schemas
├── routes/         # API route handlers
├── services/       # Business logic and intelligence engines
├── utils/          # Utilities (logger, validators)
└── server.ts       # Main Express app
```

## Intelligence Services

1. **assessmentService** - Calculates readiness scores and identifies gaps
2. **failureAnalysisService** - Analyzes failure patterns and provides insights
3. **recoveryService** - Detects inactivity and creates recovery plans

