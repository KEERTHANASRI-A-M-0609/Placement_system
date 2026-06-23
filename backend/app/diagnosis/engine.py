def run_diagnosis(data: dict):

    patterns = []

    if data["dsa"] < 50 and data["aptitude"] < 50:
        patterns.append("Low problem solving foundation")

    if data["resume"] < 50:
        patterns.append("Weak project visibility")

    if data["communication"] < 50:
        patterns.append("Interview risk high")

    if data["momentum"] < 50:
        patterns.append("Low consistency risk")

    return {
        "patterns": patterns,
        "risk_level": "high" if len(patterns) >= 3 else "medium" if len(patterns) == 2 else "low"
    }