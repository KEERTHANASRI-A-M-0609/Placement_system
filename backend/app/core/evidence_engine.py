def build_evidence(data: dict):

    evidence_score = 0

    # GitHub proxy logic (simulate now)
    if data["resume"] > 70:
        evidence_score += 25

    # DSA consistency proxy
    if data["dsa"] > 70:
        evidence_score += 25

    # Momentum as consistency indicator
    if data["momentum"] > 70:
        evidence_score += 25

    # Communication readiness
    if data["communication"] > 70:
        evidence_score += 25

    return {
        "evidence_score": evidence_score,
        "signal_quality": "strong" if evidence_score > 75 else "medium" if evidence_score > 40 else "weak"
    }