import json
from sqlalchemy import Column, Integer, String, Text
from app.core.db import Base


class AssessmentModuleDB(Base):
    __tablename__ = "assessment_modules"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, index=True)
    module = Column(String)
    evidence_json = Column(Text, default="{}")


class MockInterviewDB(Base):
    __tablename__ = "mock_interviews"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, index=True)
    session_json = Column(Text, default="{}")
