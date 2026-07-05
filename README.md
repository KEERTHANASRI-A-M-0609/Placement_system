# Placement System (PrepUp)

Full-stack placement readiness and execution platform for students preparing for campus placements.

## Stack

- **Frontend** — React + TypeScript + Vite (`frontend/`)
- **API** — Node.js + Express + MongoDB (`backend/src/`)
- **Services** — Python FastAPI for AI/ML scoring, NLP, Gemini LLM, WhatsApp (`backend/app/`)

## AI / ML Stack

| Component | Technology | Used for |
|-----------|------------|----------|
| Placement predictor | Random Forest (scikit-learn) | Placement probability from assessment features |
| Interview scorer | Random Forest Regressor | Mock interview transcript scoring |
| Communication scorer | Random Forest Regressor | Speech fluency & filler analysis |
| Failure clustering | TF-IDF + K-Means | Rejection pattern detection |
| Resume matching | TF-IDF cosine similarity | Resume–role semantic match |
| Career coach | Google Gemini (optional) | Chat, interview feedback, resume tips |

Set `GEMINI_API_KEY` in `backend/.env` for full LLM features. ML models work offline without any API key.

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

# Python AI/ML API (port 8000) — powers ML scoring + optional Gemini LLM
cd ..
.venv\Scripts\pip install -r backend\requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir backend
```

Or use `start.bat` from the project root on Windows (starts Node + Frontend + AI API).

### Environment

Copy `backend/.env.example` and `frontend/.env.example` to `.env` and fill in:

- `MONGODB_URI` — MongoDB connection string
- `GEMINI_API_KEY` — optional Google Gemini for LLM coaching (ML works without it)
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
