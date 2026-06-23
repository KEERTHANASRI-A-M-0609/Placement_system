from app.core.normalizer import normalize_input
from app.diagnosis.engine import run_diagnosis
from app.probability.service import run_probability
from app.recommendation.service import run_recommendation
from app.momentum.service import run_momentum

def run_full_analysis(data: dict):

    clean_data = normalize_input(data)

    diagnosis = run_diagnosis(clean_data)
    probability = run_probability(clean_data)
    recommendation = run_recommendation(clean_data)
    momentum = run_momentum(clean_data)

    return {
        "input": clean_data,
        "diagnosis": diagnosis,
        "probability": probability,
        "recommendation": recommendation,
        "momentum": momentum,
        "system_version": "phase_5_intelligence_engine"
    }