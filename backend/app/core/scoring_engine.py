def calculate_base_score(data: dict):
    return (
        data["dsa"] * 0.35 +
        data["aptitude"] * 0.20 +
        data["communication"] * 0.15 +
        data["resume"] * 0.15 +
        data["momentum"] * 0.15
    )


def normalize(score: float):
    return min(max(score, 0), 100)
