from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str
    mfa_code: Optional[str] = None
    role: Optional[str] = None # Role selection on front-end for visual choice

class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: str = "bearer"
    role: Optional[str] = None
    username: Optional[str] = None
    status: Optional[str] = None
    mfa_required: bool = False
    mfa_secret: Optional[str] = None

class PredictRequest(BaseModel):
    login_hour: int = Field(..., ge=0, le=23)
    failed_logins: int = Field(..., ge=0)
    country_change: int = Field(..., ge=0, le=1)
    device_change: int = Field(..., ge=0, le=1)
    vpn: int = Field(..., ge=0, le=1)
    command_count: int = Field(..., ge=0)
    downloaded_files: int = Field(..., ge=0)
    privilege_level: int = Field(..., ge=1, le=3) # 1: Analyst, 2: Privileged, 3: Admin

class PredictResponse(BaseModel):
    verdict: str
    anomaly_score: float
    confidence: float

class IncidentComment(BaseModel):
    timestamp: str
    analyst: str
    comment: str

class IncidentResponse(BaseModel):
    id: int
    incident_number: str
    user: str
    risk_score: float
    timestamp: datetime
    status: str
    assigned_analyst: Optional[str] = None
    comments: List[IncidentComment]
    encrypted_description: Optional[Dict[str, str]] = None
    decrypted_description: Optional[str] = None

    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    comment: str

class IncidentAssign(BaseModel):
    assigned_analyst: str

class StatusUpdate(BaseModel):
    status: str

class QuantumEncryptRequest(BaseModel):
    plaintext: str
    pk_hex: str

class QuantumEncryptResponse(BaseModel):
    ciphertext: str
    aes_ciphertext: str
    nonce: str

class QuantumDecryptRequest(BaseModel):
    ciphertext: str
    aes_ciphertext: str
    nonce: str
    sk_hex: str

class QuantumDecryptResponse(BaseModel):
    plaintext: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: str # Super Admin, Security Analyst, Privileged User
    department: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    department: Optional[str]
    status: str
    created_at: datetime
    kyber_pk: Optional[str]
    plaintext_credential_hint: Optional[str]

    class Config:
        from_attributes = True

class UserDirectoryResponse(BaseModel):
    id: int
    username: str
    role: str
    department: Optional[str]
    status: str
    created_at: datetime
    active_sessions: int
    kyber_pk: Optional[str]
    plaintext_credential_hint: Optional[str]

    class Config:
        from_attributes = True

class PolicyUpdate(BaseModel):
    value: str

class PolicyResponse(BaseModel):
    id: int
    name: str
    value: str
    description: Optional[str]

    class Config:
        from_attributes = True

class RiskDetailsResponse(BaseModel):
    risk_score: float
    threat_level: str
    breakdown: Dict[str, float]

class DashboardStats(BaseModel):
    active_users: int
    live_sessions: int
    threat_alerts: int
    blocked_accounts: int
    avg_risk_score: float
    threat_timeline: Dict[str, int]
    risk_distribution: Dict[str, int]
    top_risk_users: List[Dict[str, Any]]
    recent_logins: List[Dict[str, Any]]

class StreamIncidentCreate(BaseModel):
    username: str
    risk_score: float
    description: str
    command: Optional[str] = None
    location: Optional[str] = None
