def normalize_input(data: dict):

    return {
        "dsa": min(max(data.get("dsa", 0), 0), 100),
        "aptitude": min(max(data.get("aptitude", 0), 0), 100),
        "communication": min(max(data.get("communication", 0), 0), 100),
        "resume": min(max(data.get("resume", 0), 0), 100),
        "momentum": min(max(data.get("momentum", 0), 0), 100)
    }