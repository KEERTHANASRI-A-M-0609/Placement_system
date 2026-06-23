# Placement System (Vertex)

Full-stack placement readiness and execution platform for students preparing for campus placements.

## Stack

- **Frontend** — React + TypeScript + Vite (`frontend/`)
- **API** — Node.js + Express + MongoDB (`backend/src/`)
- **Services** — Python FastAPI for voice, WhatsApp relay, scoring (`backend/app/`)

## Quick start

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB Atlas (or local MongoDB)

### Run

```bash
# Backend (port 5000)
cd backend
cp .env.example .env   # add MongoDB URI, SMTP, Twilio as needed
npm install
npm run dev

# Frontend (port 5173)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Or use `start.bat` from the project root on Windows.

### Environment

Copy `backend/.env.example` and `frontend/.env.example` to `.env` and fill in:

- `MONGODB_URI` — MongoDB connection string
- `SMTP_*` — optional email notifications
- `TWILIO_*` — optional WhatsApp notifications

## Features

- Career health assessments (resume, coding, aptitude, communication, mock interviews)
- Application pipeline tracking with deadline alerts
- Daily planner with verified task execution
- In-app, email, and WhatsApp notifications
- Readiness scoring and gap analysis

## License

MIT
