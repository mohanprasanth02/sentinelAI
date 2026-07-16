import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Config database URL (PostgreSQL or fallback to SQLite)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sentinel_ai.db")

# For SQLite, we need connect_args={"check_same_thread": False}
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False) # Super Admin, Security Analyst, Privileged User
    department = Column(String, nullable=True)
    status = Column(String, default="Active") # Active, Locked
    mfa_enabled = Column(Boolean, default=True)
    mfa_secret = Column(String, default="SECRET123")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Store Quantum Safe Keypairs (ML-KEM Kyber-768)
    kyber_pk = Column(Text, nullable=True)
    kyber_sk = Column(Text, nullable=True)
    
    # Store credential details encrypted with Kyber + AES-GCM
    encrypted_credential = Column(Text, nullable=True) # JSON containing ciphertext, aes_ciphertext, nonce
    plaintext_credential_hint = Column(String, nullable=True) # Unencrypted indicator for demo e.g. "API Key" or "Root Password"

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    username = Column(String, nullable=False)
    ip_address = Column(String, nullable=False)
    device = Column(String, nullable=False)
    country = Column(String, nullable=False)
    login_time = Column(DateTime, default=datetime.utcnow)
    active = Column(Boolean, default=True)

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    username = Column(String, index=True)
    role = Column(String)
    department = Column(String)
    location = Column(String)
    ip_address = Column(String)
    device = Column(String)
    vpn = Column(Boolean, default=False)
    command = Column(String, nullable=True)
    failed_logins = Column(Integer, default=0)
    downloaded_files = Column(Integer, default=0)
    privileged = Column(Boolean, default=False)
    risk_score = Column(Float, default=0.0)
    anomaly_verdict = Column(String, default="Normal") # Normal, Suspicious, High Risk
    login_hour = Column(Integer, default=12)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_number = Column(String, unique=True, index=True, nullable=False)
    user = Column(String, index=True, nullable=False)
    risk_score = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="Open") # Open, Investigating, Resolved
    assigned_analyst = Column(String, nullable=True)
    
    # Comments stored as a serialized JSON string
    comments = Column(Text, default="[]") 
    
    # Encrypted fields containing incident descriptions
    # JSON containing { "ciphertext": ..., "aes_ciphertext": ..., "nonce": ... }
    encrypted_description = Column(Text, nullable=True)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    severity = Column(String, default="Info") # High, Medium, Info
    timestamp = Column(DateTime, default=datetime.utcnow)
    read = Column(Boolean, default=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user = Column(String, nullable=False)
    action = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="Success")

class SystemPolicy(Base):
    __tablename__ = "system_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    value = Column(String, nullable=False)
    description = Column(String, nullable=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
