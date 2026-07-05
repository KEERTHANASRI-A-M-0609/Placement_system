"""LLM service — Google Gemini with structured ML/NLP fallbacks."""

from __future__ import annotations

import json
import os
import re
from typing import Any

from app.ml.communication_scorer import score_communication_ml
from app.ml.interview_scorer import score_interview_ml
from app.ml.resume_matcher import match_resume_to_role


def _gemini_key() -> str:
    return (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY") or "").strip()


def llm_available() -> bool:
    return bool(_gemini_key())


def ai_status() -> dict:
    return {
        "ml_engine": "scikit-learn",
        "ml_models": [
            "RandomForestClassifier (placement)",
            "RandomForestRegressor (interview)",
            "TF-IDF + KMeans (failure clustering)",
            "TF-IDF Cosine Similarity (resume–role match)",
            "RandomForestRegressor (communication)",
        ],
        "llm_provider": "Google Gemini" if llm_available() else None,
        "llm_available": llm_available(),
        "nlp_pipeline": "TF-IDF vectorization + feature engineering",
    }


def _call_gemini(prompt: str, system: str = "") -> str | None:
    key = _gemini_key()
    if not key:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=key)
        model = genai.GenerativeModel(
            "gemini-2.0-flash",
            system_instruction=system or "You are PrepUp, a concise campus placement coach for Indian students.",
        )
        response = model.generate_content(prompt)
        text = (response.text or "").strip()
        return text if text else None
    except Exception:
        return None


def _ctx_summary(ctx: dict) -> str:
    user = ctx.get("user") or {}
    assessment = ctx.get("assessment") or {}
    parts = [
        f"Name: {user.get('name', 'Student')}",
        f"Role: {user.get('targetRole', user.get('domain', 'Software Engineer'))}",
        f"Companies: {', '.join(user.get('targetCompanies', [])[:5]) or 'not set'}",
        f"Readiness DSA: {assessment.get('dsa', 'N/A')}",
        f"Applications: {len(ctx.get('applications') or [])}",
        f"Failures logged: {len(ctx.get('failures') or [])}",
    ]
    return "\n".join(parts)


def chat_with_ai(message: str, ctx: dict) -> dict:
    system = (
        "You are PrepUp AI Career Coach. Answer in 2-4 short paragraphs. "
        "Use **bold** for key terms. Be specific to the student's profile. "
        "Suggest actionable next steps for campus placements in India."
    )
    prompt = f"Student context:\n{_ctx_summary(ctx)}\n\nUser question: {message}"
    llm_text = _call_gemini(prompt, system)
    if llm_text:
        return {"source": "gemini", "text": llm_text, "model": "gemini-2.0-flash"}

    # NLP fallback — template from context
    role = (ctx.get("user") or {}).get("targetRole", "your target role")
    dsa = (ctx.get("assessment") or {}).get("dsa")
    fallback = (
        f"Based on your profile for **{role}**, focus on closing evidence gaps first. "
    )
    if dsa is not None and dsa < 60:
        fallback += f"Your DSA score ({dsa}) is below campus bar — prioritize **2 medium LeetCode problems daily**. "
    fallback += (
        "Use **Daily Planner** for AI-prioritized tasks and log rejections in **Failure Intelligence** "
        "so our ML models can detect patterns. Add **GEMINI_API_KEY** for full LLM coaching."
    )
    return {"source": "ml_fallback", "text": fallback, "model": "contextual_nlp"}


def interview_feedback_ai(transcript: str, interview_type: str, questions: list[str]) -> dict:
    ml = score_interview_ml(transcript, interview_type, len(questions) or 4)
    prompt = (
        f"Interview type: {interview_type}\nQuestions: {json.dumps(questions[:6])}\n"
        f"Transcript:\n{transcript[:4000]}\n\n"
        "Return JSON with keys: feedback (array of 3 strings), strengths (array), improvements (array)."
    )
    raw = _call_gemini(prompt, "Return valid JSON only.")
    if raw:
        try:
            m = re.search(r"\{[\s\S]*\}", raw)
            if m:
                extra = json.loads(m.group())
                ml["feedback"] = extra.get("feedback", ml["feedback"])[:5]
                ml["strengths"] = extra.get("strengths", [])[:4]
                ml["improvements"] = extra.get("improvements", [])[:4]
                ml["source"] = "ml+gemini"
                return ml
        except json.JSONDecodeError:
            pass
    ml["source"] = "ml"
    ml["strengths"] = ["Completed full mock session", "Speech captured for analysis"]
    ml["improvements"] = ml.get("feedback", [])[:3]
    return ml


def communication_feedback_ai(transcript: str, duration_secs: int) -> dict:
    ml = score_communication_ml(transcript, duration_secs)
    prompt = (
        f"Analyze this spoken interview answer ({duration_secs}s):\n{transcript[:3000]}\n"
        "Return JSON: fluency_score (0-100), feedback (array of 3 tips), strengths (array)."
    )
    raw = _call_gemini(prompt, "Return valid JSON only.")
    if raw:
        try:
            m = re.search(r"\{[\s\S]*\}", raw)
            if m:
                extra = json.loads(m.group())
                ml["fluency"] = int(extra.get("fluency_score", ml["fluency"]))
                ml["feedback"] = extra.get("feedback", ml["feedback"])[:5]
                ml["strengths"] = extra.get("strengths", [])[:4]
                ml["source"] = "ml+gemini"
                return ml
        except json.JSONDecodeError:
            pass
    ml["source"] = "ml"
    return ml


def resume_insights_ai(resume_text: str, domain: str, local_score: int | None = None) -> dict:
    match = match_resume_to_role(resume_text, domain=domain)
    prompt = (
        f"Domain: {domain}\nResume excerpt:\n{resume_text[:3500]}\n"
        "Give 4 bullet ATS improvement tips for campus placements. Be specific."
    )
    llm = _call_gemini(prompt)
    tips: list[str] = []
    if llm:
        tips = [ln.strip("•- ").strip() for ln in llm.split("\n") if ln.strip()][:5]
    if not tips:
        tips = [
            f"Boost role match (currently {match['similarity_pct']}%) by adding: {', '.join(match['missing_keywords'][:3])}",
            "Quantify impact with metrics (%, users, latency ms).",
            "Lead bullets with strong action verbs (Built, Designed, Optimized).",
            "Align project titles with target role keywords.",
        ]
    return {
        **match,
        "local_structural_score": local_score,
        "ai_tips": tips,
        "source": "gemini" if llm else "ml",
    }


def gap_narrative_ai(gaps: list[dict], role: str, companies: list[str]) -> dict:
    gap_text = json.dumps(gaps[:8])
    prompt = (
        f"Role: {role}\nCompanies: {', '.join(companies[:5])}\nGaps: {gap_text}\n"
        "Write a 3-sentence personalized gap narrative and 3 prioritized actions."
    )
    llm = _call_gemini(prompt)
    if llm:
        return {"source": "gemini", "narrative": llm, "model": "gemini-2.0-flash"}
    top = gaps[0] if gaps else {"category": "DSA", "gap": 20}
    narrative = (
        f"ML analysis shows **{top.get('category', 'DSA')}** as your highest-impact gap for **{role}**. "
        f"Closing this improves readiness for {', '.join(companies[:2]) or 'campus companies'}. "
        "Follow the Daily Planner for AI-prioritized remediation."
    )
    return {"source": "ml_fallback", "narrative": narrative, "model": "rule_engine"}
