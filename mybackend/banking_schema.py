"""
Banking Training Schema
-----------------------
This module defines the MongoDB schema for storing user training progress
in the banking conversation simulation.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime
from bson import ObjectId

# Helper class for handling MongoDB ObjectId with Pydantic
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

# Model for a single training attempt
class AttemptModel(BaseModel):
    """Model for storing individual conversation attempt data"""
    timestamp: datetime = Field(default_factory=datetime.now)
    conversation_id: str
    overall_score: int
    banking_knowledge_score: int  # Changed from grammar_score
    customer_handling_score: int
    policy_adherence_score: int   # New field
    improvement_suggestions: List[str]
    
    class Config:
        json_encoders = {ObjectId: str}

# Model for a scenario's progress
class ScenarioProgress(BaseModel):
    """Model for tracking progress in a specific scenario"""
    scenario_id: str
    scenario_title: str
    completed: bool = False
    total_attempts: int = 0
    first_attempt_date: Optional[datetime] = None
    last_attempt_date: Optional[datetime] = None
    best_score: Optional[int] = None
    latest_score: Optional[int] = None
    attempts: List[AttemptModel] = []
    
    class Config:
        json_encoders = {ObjectId: str}

# Main user training document model
class UserBankingTraining(BaseModel):
    """Main model for a user's banking training progress"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    last_updated: datetime = Field(default_factory=datetime.now)
    scenarios: List[ScenarioProgress] = []
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}