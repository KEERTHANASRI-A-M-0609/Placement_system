from pydantic import BaseModel

class CareerTwin(BaseModel):
    target_role: str

    dsa_score: int
    aptitude_score: int
    communication_score: int
    resume_score: int

    github_activity: int
    leetcode_problems: int

    momentum_score: int