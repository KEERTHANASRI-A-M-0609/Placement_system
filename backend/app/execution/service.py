def generate_daily_plan(weakness):

    plans = {
        "Communication": [
            {
                "task": "Mock Interview",
                "time": 20,
                "impact": 5
            },
            {
                "task": "Self Introduction Practice",
                "time": 10,
                "impact": 3
            }
        ],

        "DSA": [
            {
                "task": "Solve 2 Array Problems",
                "time": 30,
                "impact": 5
            }
        ]
    }

    return plans.get(weakness, [])