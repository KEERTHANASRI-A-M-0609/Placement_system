def calculate_readiness(twin):

    readiness = (
        twin.dsa_score +
        twin.aptitude_score +
        twin.communication_score +
        twin.resume_score
    ) / 4

    return round(readiness)