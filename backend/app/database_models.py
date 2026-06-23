from sqlalchemy import Column, Integer, String
from app.core.db import Base

class StudentDB(Base):

    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String)

    email = Column(String)

    target_role = Column(String)

class AssessmentDB(Base):

    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer)

    dsa = Column(Integer)

    aptitude = Column(Integer)

    communication = Column(Integer)

    resume = Column(Integer)
class InterviewAttemptDB(Base):

    __tablename__ = "interview_attempts"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer)

    company = Column(String)

    round = Column(String)

    result = Column(String)

    failure_reason = Column(String)

class DailyPlanDB(Base):

    __tablename__ = "daily_plans"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer)

    task = Column(String)

    impact = Column(String)

    time_required = Column(String)

    status = Column(String)