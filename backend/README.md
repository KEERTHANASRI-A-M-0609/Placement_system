# PrepUp Backend

RESTful API for PrepUp — Placement Intelligence Platform

## Deploy on Render

1. Create a **Web Service** from this repo (or use the included `render.yaml` Blueprint).
2. **Build command:** `npm install`
3. **Start command:** `npm start` (runs the API with `tsx`)
4. Set environment variables from `.env.example` (at minimum `MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_ORIGINS`, `FRONTEND_URL`).
5. Health check path: `/health`

Render sets `PORT` automatically — the app reads it from `process.env.PORT`.
