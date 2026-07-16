import json
import os
import sys
# Add project root to sys.path so 'backend.app' can be resolved
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.database import get_db, init_db, User, Session as UserSession, ActivityLog, Incident, Notification, AuditLog, SystemPolicy
from backend.app.schemas import (
    LoginRequest, LoginResponse, PredictRequest, PredictResponse, 
    IncidentResponse, CommentCreate, IncidentAssign, StatusUpdate,
    QuantumEncryptRequest, QuantumEncryptResponse, QuantumDecryptRequest, QuantumDecryptResponse,
    UserCreate, UserResponse, PolicyUpdate, PolicyResponse, DashboardStats, UserDirectoryResponse,
    StreamIncidentCreate
)
from backend.app.auth import (
    create_access_token, verify_password, get_password_hash, 
    get_current_user, RoleChecker
)
from backend.app.ml_model import predict_anomaly, get_role_level
from backend.app.quantum_safe import quantum_encrypt, quantum_decrypt, kyber_keygen
import backend.app.crud as crud

app = FastAPI(title="SentinelAI Security API", version="1.0.0")

# Enable CORS for the React Dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this. For visual mock/demo, allow all.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# --- AUTH ENDPOINTS ---

@app.on_event("startup")
def create_initial_admin():
    # Make sure database is initialized and there is at least one admin
    db = next(get_db())
    admin = db.query(User).filter(User.role == "Super Admin").first()
    if not admin:
        print("No users found. Creating default admin via seed data helper...")
        # Automatically generate default administrator if database is clean
        pk, sk = kyber_keygen()
        pw_hash = get_password_hash("password123")
        
        # Setup Kyber-encrypted credentials
        cred_text = "API_SECRET_TOKEN_FOR_ADMIN_SEC_2026_MLKEM"
        enc_payload = quantum_encrypt(cred_text, pk)
        
        db_user = User(
            username="admin_sec",
            password_hash=pw_hash,
            role="Super Admin",
            department="IT Infrastructure",
            status="Active",
            mfa_enabled=True,
            mfa_secret="SECRET123",
            kyber_pk=pk,
            kyber_sk=sk,
            encrypted_credential=json.dumps(enc_payload),
            plaintext_credential_hint="Super Admin Root API Key"
        )
        db.add(db_user)
        db.commit()

@app.post("/api/auth/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, req.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    if user.status == "Locked":
        raise HTTPException(status_code=403, detail="Account locked. Contact SOC administrator.")
        
    if not verify_password(req.password, user.password_hash):
        # Increment failed login counter in Audit log
        crud.create_audit_log(db, req.username, "Login Attempt", "Failed password authentication", "Failed")
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    # Check if MFA is simulated and required
    if user.mfa_enabled and not req.mfa_code:
        # Request MFA code
        return LoginResponse(
            mfa_required=True,
            mfa_secret=user.mfa_secret,
            status="MFA_Verification_Pending"
        )
        
    # Verify simulated MFA code (Accept "123456" for demo simplicity, or simple numeric string)
    if user.mfa_enabled and req.mfa_code != "123456":
        crud.create_audit_log(db, req.username, "MFA Verification", "Invalid MFA token entered", "Failed")
        raise HTTPException(status_code=400, detail="Invalid verification code. Enter '123456' for simulation.")
        
    # Success: Deactivate older active sessions & create a new session
    crud.deactivate_sessions_by_user(db, user.username)
    
    # Mock GeoIP metadata
    countries = ["United States", "Germany", "Singapore", "United Kingdom", "Switzerland"]
    country = "United States" if user.username == "admin_sec" else random_choice_from_list(countries)
    device = "Lenovo ThinkPad SOC-01" if user.username == "admin_sec" else "Dell Latitude Compliance-03"
    ip = "10.0.4.88" if user.username == "admin_sec" else f"10.0.{random_int_10_250()}.{random_int_10_250()}"
    
    crud.create_session(db, user.id, user.username, ip, device, country)
    crud.create_audit_log(db, user.username, "Login Access", f"Authenticated successfully via JWT + MFA from {country} ({ip})", "Success")
    
    # Generate Token
    token = create_access_token(data={"sub": user.username, "role": user.role})
    
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        username=user.username,
        status="Authenticated"
    )

def random_choice_from_list(lst):
    import random
    return random.choice(lst)

def random_int_10_250():
    import random
    return random.randint(10, 250)

@app.post("/api/auth/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    crud.deactivate_sessions_by_user(db, current_user.username)
    crud.create_audit_log(db, current_user.username, "Logout Session", "Session terminated by user request", "Success")
    return {"status": "Logged out successfully"}

# --- USER MANAGEMENT ENDPOINTS ---

@app.get("/api/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    return crud.get_users(db)

@app.post("/api/users", response_model=UserResponse)
def create_user(req: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin"]))):
    existing = crud.get_user_by_username(db, req.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    pw_hash = get_password_hash(req.password)
    user = crud.create_user(db, req.username, pw_hash, req.role, req.department)
    
    crud.create_audit_log(db, current_user.username, "User Provisioning", f"Provisioned account for {req.username} with role {req.role}", "Success")
    return user

@app.post("/api/users/{username}/lock")
def lock_user(username: str, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    user = crud.update_user_status(db, username, "Locked")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    crud.deactivate_sessions_by_user(db, username)
    return {"message": f"User {username} account has been locked"}

@app.post("/api/users/{username}/unlock")
def unlock_user(username: str, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    user = crud.update_user_status(db, username, "Active")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"User {username} account has been unlocked"}

@app.get("/api/users/directory", response_model=List[UserDirectoryResponse])
def get_users_directory(db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    users = crud.get_users(db)
    response = []
    for u in users:
        active_count = db.query(UserSession).filter(UserSession.username == u.username, UserSession.active == True).count()
        response.append(UserDirectoryResponse(
            id=u.id,
            username=u.username,
            role=u.role,
            department=u.department,
            status=u.status,
            created_at=u.created_at,
            active_sessions=active_count,
            kyber_pk=u.kyber_pk,
            plaintext_credential_hint=u.plaintext_credential_hint
        ))
    return response

@app.post("/api/users/{username}/terminate-sessions")
def terminate_sessions(username: str, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    crud.deactivate_sessions_by_user(db, username)
    crud.create_audit_log(db, current_user.username, "Session Revocation", f"Terminated all active sessions for user {username}", "Success")
    return {"message": f"All sessions for user {username} have been terminated."}

@app.post("/api/users/{username}/reset-password")
def reset_password(username: str, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    user = crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Reset password to "password123"
    pw_hash = get_password_hash("password123")
    user.password_hash = pw_hash
    
    # Regenerate Kyber Keys for demonstration
    pk, sk = kyber_keygen()
    import json
    cred_text = f"API_SECRET_TOKEN_FOR_{username.upper()}_2026_MLKEM"
    enc_payload = quantum_encrypt(cred_text, pk)
    
    user.kyber_pk = pk
    user.kyber_sk = sk
    user.encrypted_credential = json.dumps(enc_payload)
    
    db.commit()
    
    crud.create_audit_log(db, current_user.username, "Credential Reset", f"Reset password and regenerated post-quantum credentials for user {username}", "Success")
    return {"message": f"User {username} password has been reset to default 'password123' and quantum safe keys regenerated."}

# --- LOGS AND AUDIT TRAIL ENDPOINTS ---

@app.get("/api/logs")
def get_logs(
    username: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    verdict: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))
):
    skip = (page - 1) * limit
    logs, total = crud.get_activity_logs(db, username, role, verdict, skip, limit)
    
    return {
        "logs": [
            {
                "id": l.id,
                "timestamp": l.timestamp,
                "username": l.username,
                "role": l.role,
                "department": l.department,
                "location": l.location,
                "ip_address": l.ip_address,
                "device": l.device,
                "vpn": l.vpn,
                "command": l.command,
                "failed_logins": l.failed_logins,
                "downloaded_files": l.downloaded_files,
                "privileged": l.privileged,
                "risk_score": l.risk_score,
                "anomaly_verdict": l.anomaly_verdict
            } for l in logs
        ],
        "total": total,
        "page": page,
        "limit": limit
    }

@app.get("/api/activity")
def get_privileged_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))
):
    # Retrieve recent privileged actions
    logs = db.query(ActivityLog).filter(ActivityLog.privileged == True).order_by(desc(ActivityLog.timestamp)).limit(100).all()
    return logs

# --- INCIDENT MANAGEMENT ENDPOINTS ---

@app.get("/api/incidents", response_model=List[IncidentResponse])
def list_incidents(db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    incidents = crud.get_incidents(db)
    
    response = []
    for inc in incidents:
        comments_list = json.loads(inc.comments or "[]")
        enc_desc = json.loads(inc.encrypted_description) if inc.encrypted_description else None
        
        response.append(IncidentResponse(
            id=inc.id,
            incident_number=inc.incident_number,
            user=inc.user,
            risk_score=inc.risk_score,
            timestamp=inc.timestamp,
            status=inc.status,
            assigned_analyst=inc.assigned_analyst,
            comments=comments_list,
            encrypted_description=enc_desc,
            decrypted_description=None # Must request decapsulation explicitly
        ))
    return response

@app.post("/api/incidents/{incident_number}/assign")
def assign_incident(incident_number: str, req: IncidentAssign, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    inc = crud.assign_incident_analyst(db, incident_number, req.assigned_analyst)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    crud.add_incident_comment(db, incident_number, "System", f"Incident assigned to {req.assigned_analyst}")
    crud.create_audit_log(db, current_user.username, "Incident Allocation", f"Assigned {incident_number} to {req.assigned_analyst}", "Success")
    return {"message": f"Incident assigned to {req.assigned_analyst}"}

@app.post("/api/incidents/{incident_number}/status")
def update_status(incident_number: str, req: StatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    inc = crud.update_incident_status(db, incident_number, req.status)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    crud.add_incident_comment(db, incident_number, "System", f"Incident status updated to {req.status}")
    crud.create_audit_log(db, current_user.username, "Incident Transition", f"Updated status of {incident_number} to {req.status}", "Success")
    return {"message": f"Incident status updated to {req.status}"}

@app.post("/api/incidents/{incident_number}/comments")
def add_comment(incident_number: str, req: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    inc = crud.add_incident_comment(db, incident_number, current_user.username, req.comment)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return {"message": "Comment added successfully"}


# --- STREAM AUTO-TICKET: Create incident from live stream threshold breach ---

# StreamIncidentCreate is defined in schemas.py and imported above

@app.post("/api/incidents/create")
def create_stream_incident(
    req: StreamIncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))
):
    """Auto-create an incident ticket when a live stream event risk_score > 50."""
    desc = req.description
    if req.command:
        desc += f" | Flagged Command: {req.command}"
    if req.location:
        desc += f" | Origin: {req.location}"
    inc = crud.create_incident(db, req.username, req.risk_score, desc)
    crud.create_audit_log(
        db, current_user.username,
        "Auto-Ticket Created",
        f"Stream event for {req.username} (Risk Score: {req.risk_score}) auto-escalated to {inc.incident_number}",
        "Success"
    )
    return {"incident_number": inc.incident_number, "message": "Incident ticket created from stream event"}

# --- MACHINE LEARNING & RISK ENGINE ENDPOINTS ---

@app.post("/api/ml/predict", response_model=PredictResponse)
def ml_predict(req: PredictRequest, current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    features = [
        req.login_hour,
        req.failed_logins,
        req.country_change,
        req.device_change,
        req.vpn,
        req.command_count,
        req.downloaded_files,
        req.privilege_level
    ]
    prediction = predict_anomaly(features)
    return prediction

@app.post("/api/risk/evaluate")
def evaluate_risk(
    username: str,
    login_hour: int,
    vpn: bool,
    command: Optional[str] = None,
    failed_logins: int = 0,
    downloaded_files: int = 0,
    device_change: bool = False,
    country_change: bool = False,
    db: Session = Depends(get_db)
):
    """
    Simulates a login or command attempt, computes its risk score,
    runs Isolation Forest prediction, logs the activity,
    and runs Automated Response triggers.
    """
    user = crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Calculate score using mathematical formula weights
    is_priv_cmd = False
    if command:
        # Check if matches any high-risk privileged markers
        is_priv_cmd = any(marker in command.upper() for marker in ["DROP", "DELETE", "RESET", "CREATE USER", "IPTABLES", "DOWNLOAD", "CHMOD", "REBOOT"])
        
    # Calculate risk score
    score = 0.0
    is_off_hour = 1 if (login_hour >= 22 or login_hour < 6) else 0
    score += 30.0 * is_off_hour
    score += 20.0 * (1 if device_change else 0)
    score += 20.0 * (1 if country_change else 0)
    score += 15.0 * (1 if failed_logins >= 3 else 0)
    score += 15.0 * (1 if is_priv_cmd else 0)
    
    # Isolation Forest inference
    priv_level = get_role_level(user.role)
    features = [
        login_hour,
        failed_logins,
        1 if country_change else 0,
        1 if device_change else 0,
        1 if vpn else 0,
        len(command.split()) if command else 0,
        downloaded_files,
        priv_level
    ]
    pred = predict_anomaly(features)
    
    # Store Activity Log in database
    log = crud.create_activity_log(
        db, username, user.role, user.department,
        "Unknown (Simulated)" if country_change else user.department or "US Office", 
        "192.168.10.22" if vpn else "10.0.12.94",
        "New Simulated Device" if device_change else "Standard Workstation",
        vpn, command, failed_logins, downloaded_files, is_priv_cmd, score, pred["verdict"], login_hour
    )
    
    # Automated Action logic
    action_taken = "Logged"
    incident_number = None
    account_locked = False
    
    # Get Policies
    threshold_lock = float(crud.get_policy(db, "RISK_THRESHOLD_LOCKOUT", "95"))
    threshold_mfa = float(crud.get_policy(db, "RISK_THRESHOLD_HIGH", "80"))
    
    if score >= threshold_lock:
        # >95: Lock account, Generate incident
        crud.update_user_status(db, username, "Locked")
        crud.deactivate_sessions_by_user(db, username)
        
        desc_text = (
            f"Automated Lockout: User '{username}' triggered extreme risk profile ({score}%). "
            f"Indicators: Hour={login_hour}, FailedLogins={failed_logins}, VPN={vpn}, "
            f"PrivilegedCommand={is_priv_cmd}, CountryChange={country_change}, DeviceChange={device_change}. "
            f"Command Executed: '{command}'"
        )
        inc = crud.create_incident(db, username, score, desc_text)
        incident_number = inc.incident_number
        
        crud.create_audit_log(db, "System", "Automated Account Lockout", f"Locked account for {username} due to Risk Score {score}%", "Locked")
        action_taken = "LockAccount"
        account_locked = True
        
    elif score >= threshold_mfa:
        # >80: Require MFA verification, Notify SOC, but don't lock yet
        crud.create_notification(db, "High Risk Alert Triggered", f"User {username} logged activity with {score}% Risk. MFA required.", "High")
        crud.create_audit_log(db, "System", "MFA Escalation", f"Escalated authentication checks for {username} (Score: {score}%)", "Warning")
        action_taken = "RequireMFA"
        
    return {
        "activity_log_id": log.id,
        "username": username,
        "risk_score": score,
        "anomaly_verdict": pred["verdict"],
        "confidence": pred["confidence"],
        "action_taken": action_taken,
        "incident_number": incident_number,
        "account_locked": account_locked
    }

# --- QUANTUM SAFE SECURITY ENDPOINTS ---

@app.get("/api/quantum/user-key")
def get_user_kyber_key(username: str, db: Session = Depends(get_db)):
    """Exposes a user's Kyber Public Key for client encapsulation"""
    user = crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "username": username,
        "role": user.role,
        "kyber_pk": user.kyber_pk,
        "kyber_sk": user.kyber_sk,
        "plaintext_credential_hint": user.plaintext_credential_hint,
        "encrypted_credential": json.loads(user.encrypted_credential) if user.encrypted_credential else None
    }

@app.post("/api/quantum/encrypt", response_model=QuantumEncryptResponse)
def pqc_encrypt(req: QuantumEncryptRequest):
    """Symmetric GCM encryption using key encapsulation (ML-KEM Kyber-768)"""
    try:
        enc_payload = quantum_encrypt(req.plaintext, req.pk_hex)
        return QuantumEncryptResponse(
            ciphertext=enc_payload["ciphertext"],
            aes_ciphertext=enc_payload["aes_ciphertext"],
            nonce=enc_payload["nonce"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Kyber encapsulation failed: {str(e)}")

@app.post("/api/quantum/decrypt", response_model=QuantumDecryptResponse)
def pqc_decrypt(req: QuantumDecryptRequest):
    """Symmetric GCM decryption using key decapsulation (ML-KEM Kyber-768)"""
    try:
        payload = {
            "ciphertext": req.ciphertext,
            "aes_ciphertext": req.aes_ciphertext,
            "nonce": req.nonce
        }
        decrypted = quantum_decrypt(payload, req.sk_hex)
        return QuantumDecryptResponse(plaintext=decrypted)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Kyber decapsulation mismatch/failure: {str(e)}")

@app.get("/api/quantum/decrypt-incident/{incident_number}")
def decrypt_incident_report(incident_number: str, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin"]))):
    """Allows Super Admins to decrypt the incident details using their private key"""
    inc = crud.get_incident_by_number(db, incident_number)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if not inc.encrypted_description:
        raise HTTPException(status_code=400, detail="Incident has no encrypted body")
        
    enc_data = json.loads(inc.encrypted_description)
    
    # Decrypt description using the current Super Admin's private key
    try:
        decrypted = quantum_decrypt(enc_data, current_user.sk_hex)
        return {"incident_number": incident_number, "decrypted_description": decrypted}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Quantum decapsulation error: {str(e)}")

# --- SYSTEM & DASHBOARD STATS ENDPOINTS ---

@app.get("/api/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    # Active Users
    active_users = db.query(User).filter(User.status == "Active").count()
    
    # Live Sessions
    live_sessions = db.query(UserSession).filter(UserSession.active == True).count()
    
    # Threat Alerts (Open + Investigating)
    threat_alerts = db.query(Incident).filter(Incident.status.in_(["Open", "Investigating"])).count()
    
    # Blocked Accounts
    blocked_accounts = db.query(User).filter(User.status == "Locked").count()
    
    # Average Risk Score
    avg_risk = db.query(func.avg(ActivityLog.risk_score)).scalar() or 0.0
    avg_risk_score = round(float(avg_risk), 2)
    
    # Threat Timeline (Count of Incidents grouped by Date)
    # Return last 7 days count
    timeline = {}
    today = datetime.utcnow().date()
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        timeline[day_str] = 0
        
    incidents = db.query(Incident).all()
    for inc in incidents:
        day_str = inc.timestamp.date().strftime("%Y-%m-%d")
        if day_str in timeline:
            timeline[day_str] += 1
            
    # Risk Distribution (low, medium, high)
    risk_dist = {"Low (0-39)": 0, "Medium (40-79)": 0, "High (80-100)": 0}
    logs = db.query(ActivityLog.risk_score).all()
    for l in logs:
        score = l[0]
        if score < 40.0:
            risk_dist["Low (0-39)"] += 1
        elif score < 80.0:
            risk_dist["Medium (40-79)"] += 1
        else:
            risk_dist["High (80-100)"] += 1
            
    # Top Risk Users (distinct users with highest risk logs)
    top_users = db.query(
        ActivityLog.username,
        func.avg(ActivityLog.risk_score).label("avg_score"),
        func.max(ActivityLog.risk_score).label("max_score")
    ).group_by(ActivityLog.username).order_by(desc("avg_score")).limit(5).all()
    
    top_risk_users = [
        {"username": row[0], "avg_risk": round(float(row[1]), 2), "max_risk": round(float(row[2]), 2)}
        for row in top_users
    ]
    
    # Recent logins graph/table
    recent_sess = db.query(UserSession).order_by(desc(UserSession.login_time)).limit(10).all()
    recent_logins = [
        {
            "username": s.username,
            "ip_address": s.ip_address,
            "device": s.device,
            "country": s.country,
            "login_time": s.login_time
        } for s in recent_sess
    ]
    
    return DashboardStats(
        active_users=active_users,
        live_sessions=live_sessions,
        threat_alerts=threat_alerts,
        blocked_accounts=blocked_accounts,
        avg_risk_score=avg_risk_score,
        threat_timeline=timeline,
        risk_distribution=risk_dist,
        top_risk_users=top_risk_users,
        recent_logins=recent_logins
    )

@app.get("/api/settings/policies")
def get_policies(db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    policies = db.query(SystemPolicy).all()
    return policies

@app.put("/api/settings/policies/{name}")
def set_policy(name: str, req: PolicyUpdate, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin"]))):
    policy = crud.update_policy(db, name, req.value)
    crud.create_audit_log(db, current_user.username, "Policy Modification", f"Updated policy '{name}' to value '{req.value}'", "Success")
    return policy

@app.post("/api/settings/reset-database")
def reset_database(db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin"]))):
    # Re-run seed operations
    from backend.app.seed import generate_10k_logs, seed_database
    try:
        logs_data = generate_10k_logs()
        seed_database(db, logs_data)
        return {"status": "Success", "message": "Database successfully reseeded."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

# --- NOTIFICATION REAL TIME CHANNELS ---

@app.get("/api/notifications")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    return crud.get_unread_notifications(db)

@app.post("/api/notifications/read")
def read_notifications(db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    crud.mark_all_notifications_read(db)
    return {"message": "All notifications marked as read"}

@app.get("/api/audit-logs")
def view_audit_logs(db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["Super Admin", "Security Analyst"]))):
    return crud.get_audit_logs(db)
