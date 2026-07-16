import json
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Dict, Optional, Tuple
from backend.app.database import User, Session as UserSession, ActivityLog, Incident, Notification, AuditLog, SystemPolicy
from backend.app.quantum_safe import kyber_keygen, quantum_encrypt

# --- User Management ---

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, username: str, password_hash: str, role: str, department: str) -> User:
    # Generate ML-KEM Keypair for the User
    pk, sk = kyber_keygen()
    
    # Encrypt a mock system credential for this user using their new Kyber public key
    credential_plaintext = f"Credential_Token_For_{username}_SecureKey123"
    enc_payload = quantum_encrypt(credential_plaintext, pk)
    encrypted_credential_json = json.dumps(enc_payload)
    
    db_user = User(
        username=username,
        password_hash=password_hash,
        role=role,
        department=department,
        status="Active",
        mfa_enabled=True,
        mfa_secret="SECRET123",
        kyber_pk=pk,
        kyber_sk=sk,
        encrypted_credential=encrypted_credential_json,
        plaintext_credential_hint=f"{role} API Access Token"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_status(db: Session, username: str, status: str) -> Optional[User]:
    db_user = get_user_by_username(db, username)
    if db_user:
        db_user.status = status
        db.commit()
        db.refresh(db_user)
        # Log this state change
        create_audit_log(db, "System", f"Account Status Change", f"User {username} status updated to {status}", "Success")
    return db_user

# --- Session Management ---

def create_session(db: Session, user_id: int, username: str, ip_address: str, device: str, country: str) -> UserSession:
    db_session = UserSession(
        user_id=user_id,
        username=username,
        ip_address=ip_address,
        device=device,
        country=country,
        login_time=datetime.utcnow(),
        active=True
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def deactivate_sessions_by_user(db: Session, username: str):
    sessions = db.query(UserSession).filter(UserSession.username == username, UserSession.active == True).all()
    for s in sessions:
        s.active = False
    db.commit()

# --- Activity Log ---

def create_activity_log(db: Session, username: str, role: str, department: str, location: str, 
                        ip_address: str, device: str, vpn: bool, command: Optional[str], 
                        failed_logins: int, downloaded_files: int, privileged: bool, 
                        risk_score: float, anomaly_verdict: str, login_hour: int) -> ActivityLog:
    db_log = ActivityLog(
        timestamp=datetime.utcnow(),
        username=username,
        role=role,
        department=department,
        location=location,
        ip_address=ip_address,
        device=device,
        vpn=vpn,
        command=command,
        failed_logins=failed_logins,
        downloaded_files=downloaded_files,
        privileged=privileged,
        risk_score=risk_score,
        anomaly_verdict=anomaly_verdict,
        login_hour=login_hour
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def get_activity_logs(db: Session, username: Optional[str] = None, role: Optional[str] = None, 
                      verdict: Optional[str] = None, skip: int = 0, limit: int = 50) -> Tuple[List[ActivityLog], int]:
    query = db.query(ActivityLog)
    if username:
        query = query.filter(ActivityLog.username.like(f"%{username}%"))
    if role:
        query = query.filter(ActivityLog.role == role)
    if verdict:
        query = query.filter(ActivityLog.anomaly_verdict == verdict)
        
    total = query.count()
    logs = query.order_by(desc(ActivityLog.timestamp)).offset(skip).limit(limit).all()
    return logs, total

# --- Incident Management ---

def create_incident(db: Session, username: str, risk_score: float, description: str) -> Incident:
    # Find system administrator key or user public key to encrypt report details
    # For general security, let's encrypt it with a default system public key generated on the fly, 
    # or the user's public key. Let's use the Super Admin's public key if available, else a static system key pair.
    admin = db.query(User).filter(User.role == "Super Admin").first()
    pk = admin.kyber_pk if admin else None
    
    if not pk:
        # Generate temporary public key for system encryption if no Admin exists
        pk, _ = kyber_keygen()
        
    enc_payload = quantum_encrypt(description, pk)
    encrypted_description_json = json.dumps(enc_payload)
    
    # Generate unique Incident ID e.g. INC-2026-XXXX
    count = db.query(Incident).count()
    inc_num = f"INC-2026-{1000 + count + 1}"
    
    db_incident = Incident(
        incident_number=inc_num,
        user=username,
        risk_score=risk_score,
        timestamp=datetime.utcnow(),
        status="Open",
        comments="[]",
        encrypted_description=encrypted_description_json
    )
    db.add(db_incident)
    
    # Create notification for SOC
    create_notification(db, f"Incident {inc_num} Created", f"High risk detected for user {username} (Score: {risk_score}%)", "High")
    
    db.commit()
    db.refresh(db_incident)
    return db_incident

def get_incidents(db: Session, skip: int = 0, limit: int = 100) -> List[Incident]:
    return db.query(Incident).order_by(desc(Incident.timestamp)).offset(skip).limit(limit).all()

def get_incident_by_number(db: Session, incident_number: str) -> Optional[Incident]:
    return db.query(Incident).filter(Incident.incident_number == incident_number).first()

def update_incident_status(db: Session, incident_number: str, status: str) -> Optional[Incident]:
    db_inc = get_incident_by_number(db, incident_number)
    if db_inc:
        db_inc.status = status
        db.commit()
        db.refresh(db_inc)
    return db_inc

def assign_incident_analyst(db: Session, incident_number: str, analyst_name: str) -> Optional[Incident]:
    db_inc = get_incident_by_number(db, incident_number)
    if db_inc:
        db_inc.assigned_analyst = analyst_name
        db.commit()
        db.refresh(db_inc)
    return db_inc

def add_incident_comment(db: Session, incident_number: str, analyst: str, comment_text: str) -> Optional[Incident]:
    db_inc = get_incident_by_number(db, incident_number)
    if db_inc:
        comments_list = json.loads(db_inc.comments or "[]")
        comments_list.append({
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "analyst": analyst,
            "comment": comment_text
        })
        db_inc.comments = json.dumps(comments_list)
        db.commit()
        db.refresh(db_inc)
    return db_inc

# --- Notifications ---

def create_notification(db: Session, title: str, message: str, severity: str = "Info") -> Notification:
    db_notif = Notification(
        title=title,
        message=message,
        severity=severity,
        timestamp=datetime.utcnow(),
        read=False
    )
    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)
    return db_notif

def get_unread_notifications(db: Session) -> List[Notification]:
    return db.query(Notification).filter(Notification.read == False).order_by(desc(Notification.timestamp)).all()

def mark_all_notifications_read(db: Session):
    unread = db.query(Notification).filter(Notification.read == False).all()
    for n in unread:
        n.read = True
    db.commit()

# --- Audit Logs ---

def create_audit_log(db: Session, user: str, action: str, description: str, status: str = "Success") -> AuditLog:
    db_log = AuditLog(
        timestamp=datetime.utcnow(),
        user=user,
        action=action,
        description=description,
        status=status
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def get_audit_logs(db: Session, limit: int = 100) -> List[AuditLog]:
    return db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit).all()

# --- System Policies ---

def get_policy(db: Session, name: str, default_val: str = "") -> str:
    policy = db.query(SystemPolicy).filter(SystemPolicy.name == name).first()
    if policy:
        return policy.value
    # Create if not exists
    new_policy = SystemPolicy(name=name, value=default_val, description=f"System value for {name}")
    db.add(new_policy)
    db.commit()
    return default_val

def update_policy(db: Session, name: str, value: str) -> SystemPolicy:
    policy = db.query(SystemPolicy).filter(SystemPolicy.name == name).first()
    if not policy:
        policy = SystemPolicy(name=name, value=value, description=f"System value for {name}")
        db.add(policy)
    else:
        policy.value = value
    db.commit()
    db.refresh(policy)
    return policy
