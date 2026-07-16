import os
import sys
# Add project root to sys.path so 'backend.app' can be resolved
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import csv
import json
import random
from typing import Tuple, List
from datetime import datetime, timedelta
from faker import Faker
from sqlalchemy.orm import Session
from backend.app.database import engine, Base, User, ActivityLog, Incident, SystemPolicy, SessionLocal, AuditLog
from backend.app.quantum_safe import kyber_keygen, quantum_encrypt
from backend.app.ml_model import train_model, get_role_level
from backend.app.auth import get_password_hash

# Initialize Faker
fake = Faker()

# Create directories
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATASET_DIR = os.path.join(PROJECT_ROOT, "dataset")
os.makedirs(DATASET_DIR, exist_ok=True)
CSV_PATH = os.path.join(DATASET_DIR, "banking_logs_10k.csv")

# Define banking details
DEPARTMENTS = ["Treasury", "Retail Banking", "Compliance", "IT Infrastructure", "Wealth Management", "Risk Operations"]
COUNTRIES = ["United States", "United Kingdom", "Switzerland", "Singapore", "Germany", "Japan", "Canada"]
DEVICES = ["Lenovo ThinkPad SOC-01", "MacBook Pro SecOps", "Dell Latitude Compliance-03", "HP EliteBook Trader-04"]

NORMAL_COMMANDS = [
    "SELECT balance FROM customer_accounts WHERE id = 1045",
    "UPDATE account_status SET active = 1 WHERE account_id = 9928",
    "GET /api/v1/compliance/reports",
    "VIEW ledger_summary --date=today",
    "CHECK wire_transfer_status --id=TRX-94812",
    "SELECT * FROM audit_logs WHERE user_id = 302",
    "EXPORT tax_statement --year=2025"
]

PRIVILEGED_COMMANDS = [
    "DROP DATABASE customer_records CASCADE;",
    "RESET password FOR USER db_admin;",
    "CREATE USER threat_hunter WITH SUPERUSER;",
    "iptables -A INPUT -p tcp --dport 22 -j DROP; # Modify Firewall",
    "DOWNLOAD FROM S3 bucket 'customer_PII_export_large';",
    "CHMOD 777 /etc/ssl/certs/banking_private_key.pem;",
    "REBOOT system_core_server --force"
]

# Standard locations and devices per employee to detect changes
EMPLOYEE_PROFILES = {
    "admin_sec": {"country": "United States", "device": "MacBook Pro SecOps", "role": "Super Admin", "dept": "IT Infrastructure"},
    "chief_soc": {"country": "United States", "device": "Lenovo ThinkPad SOC-01", "role": "Super Admin", "dept": "IT Infrastructure"},
    "analyst_01": {"country": "United Kingdom", "device": "Dell Latitude Compliance-03", "role": "Security Analyst", "dept": "Compliance"},
    "analyst_02": {"country": "Germany", "device": "Lenovo ThinkPad SOC-01", "role": "Security Analyst", "dept": "Compliance"},
    "cyber_hunter": {"country": "Singapore", "device": "MacBook Pro SecOps", "role": "Security Analyst", "dept": "Compliance"},
    "db_admin": {"country": "United States", "device": "Dell Latitude Compliance-03", "role": "Privileged User", "dept": "IT Infrastructure"},
    "sys_admin": {"country": "Canada", "device": "HP EliteBook Trader-04", "role": "Privileged User", "dept": "IT Infrastructure"},
    "network_lead": {"country": "United Kingdom", "device": "Lenovo ThinkPad SOC-01", "role": "Privileged User", "dept": "IT Infrastructure"},
    "finance_director": {"country": "Switzerland", "device": "MacBook Pro SecOps", "role": "Privileged User", "dept": "Treasury"},
    "dev_ops_01": {"country": "Germany", "device": "Dell Latitude Compliance-03", "role": "Privileged User", "dept": "IT Infrastructure"}
}

def calculate_risk_score(hour: int, device_change: bool, country_change: bool, failed_logins: int, command_privileged: bool) -> Tuple[float, str]:
    """
    Calculates risk score based on requirements:
    30% Login Time (off-hours [22:00 to 06:00])
    20% Device change
    20% Location (country) change
    15% Failed Login (>2 failed attempts)
    15% Privileged Command
    """
    score = 0.0
    
    # 30% Off hours
    is_off_hour = 1 if (hour >= 22 or hour < 6) else 0
    score += 30.0 * is_off_hour
    
    # 20% Device change
    score += 20.0 * (1 if device_change else 0)
    
    # 20% Country change
    score += 20.0 * (1 if country_change else 0)
    
    # 15% Failed Logins >= 3
    is_failed_trigger = 1 if failed_logins >= 3 else 0
    score += 15.0 * is_failed_trigger
    
    # 15% Privileged Command
    score += 15.0 * (1 if command_privileged else 0)
    
    # Map to threat level
    if score >= 80.0:
        level = "High Risk"
    elif score >= 40.0:
        level = "Suspicious"
    else:
        level = "Normal"
        
    return float(score), level

def generate_10k_logs():
    """Generates 10,000 realistic logs and writes them to a CSV file."""
    print("Generating 10,000 synthetic logs...")
    
    logs = []
    start_date = datetime.utcnow() - timedelta(days=90)
    
    # Users available for log entries (we use profiles + some randomly generated employees)
    usernames = list(EMPLOYEE_PROFILES.keys())
    # Add random employees to flesh out the logs
    for i in range(15):
        uname = f"employee_{i:02d}"
        usernames.append(uname)
        EMPLOYEE_PROFILES[uname] = {
            "country": random.choice(COUNTRIES),
            "device": random.choice(DEVICES),
            "role": "Privileged User",
            "dept": random.choice(DEPARTMENTS)
        }
        
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        # Header matching standard fields
        writer.writerow([
            "Username", "Role", "Department", "LoginTime", 
            "Country", "Device", "VPN", "IP", "Command", 
            "FailedLogin", "RiskScore", "Verdict", "LoginHour",
            "CountryChange", "DeviceChange", "PrivilegedCommand"
        ])
        
        for idx in range(10000):
            user = random.choice(usernames)
            profile = EMPLOYEE_PROFILES[user]
            
            # Anomaly injection (approx 3.5% rate)
            is_anomaly = random.random() < 0.035
            
            # Set Hour
            if is_anomaly:
                hour = random.choice([22, 23, 0, 1, 2, 3, 4, 5])
            else:
                hour = random.choice(list(range(6, 22)))
                
            # Date creation
            log_date = start_date + timedelta(
                seconds=random.randint(0, 90 * 24 * 3600)
            )
            log_date = log_date.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))
            
            # Location/Device changes
            country_change = False
            device_change = False
            
            if is_anomaly:
                country_change = random.random() < 0.8
                device_change = random.random() < 0.7
                vpn = random.choice([True, False])
                failed_logins = random.choice([0, 1, 3, 4, 5])
                cmd = random.choice(PRIVILEGED_COMMANDS) if random.random() < 0.8 else random.choice(NORMAL_COMMANDS)
                downloaded_files = random.randint(10, 200)
            else:
                country_change = random.random() < 0.02
                device_change = random.random() < 0.01
                vpn = random.choice([True, False]) if random.random() < 0.1 else False
                failed_logins = random.choice([0, 0, 0, 0, 1])
                cmd = random.choice(NORMAL_COMMANDS) if random.random() < 0.9 else ""
                downloaded_files = random.randint(0, 3)
                
            country = random.choice([c for c in COUNTRIES if c != profile["country"]]) if country_change else profile["country"]
            device = random.choice([d for d in DEVICES if d != profile["device"]]) if device_change else profile["device"]
            
            ip = f"10.{random.randint(10, 250)}.{random.randint(1, 254)}.{random.randint(1, 254)}"
            if vpn:
                ip = f"192.168.{random.randint(50, 100)}.{random.randint(1, 254)}"
                
            is_priv_cmd = cmd in PRIVILEGED_COMMANDS
            
            # Risk scoring
            risk_score, verdict = calculate_risk_score(
                hour, device_change, country_change, failed_logins, is_priv_cmd
            )
            
            writer.writerow([
                user, profile["role"], profile["dept"], log_date.isoformat(),
                country, device, 1 if vpn else 0, ip, cmd,
                failed_logins, risk_score, verdict, hour,
                1 if country_change else 0, 1 if device_change else 0, 1 if is_priv_cmd else 0
            ])
            
            # Store in local list to train Isolation Forest
            priv_val = get_role_level(profile["role"])
            logs.append({
                "features": [
                    hour, failed_logins, 1 if country_change else 0,
                    1 if device_change else 0, 1 if vpn else 0,
                    len(cmd.split()) if cmd else 0, downloaded_files, priv_val
                ],
                "db_record": {
                    "timestamp": log_date, "username": user, "role": profile["role"],
                    "department": profile["dept"], "location": country, "ip_address": ip,
                    "device": device, "vpn": vpn, "command": cmd if cmd else None,
                    "failed_logins": failed_logins, "downloaded_files": downloaded_files,
                    "privileged": is_priv_cmd, "risk_score": risk_score, "anomaly_verdict": verdict,
                    "login_hour": hour
                }
            })
            
    print(f"Dataset generated at {CSV_PATH}.")
    return logs

def seed_database(db: Session, logs_data):
    """Inserts seeded tables and registers standard users with Kyber keys."""
    print("Seeding SQLite database...")
    
    # 1. Clear database tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed Default System Policies
    policies = [
        {"name": "RISK_THRESHOLD_HIGH", "value": "80", "description": "Threshold for high-risk flags (MFA + SOC)"},
        {"name": "RISK_THRESHOLD_LOCKOUT", "value": "95", "description": "Threshold to lock account automatically"},
        {"name": "MFA_REQUIREMENT_ENABLED", "value": "true", "description": "Enables MFA prompts for privilege actions"},
        {"name": "SESSION_TIMEOUT_MINUTES", "value": "15", "description": "Idle session limit for Privileged Users"}
    ]
    for p in policies:
        db.add(SystemPolicy(name=p["name"], value=p["value"], description=p["description"]))
    db.commit()

    # 3. Create Default Users (Super Admin, Analyst, Privileged User)
    print("Creating core banking roles...")
    
    # Password: "password123" hashed
    pw_hash = get_password_hash("password123")
    
    users_to_create = [
        # Super Admins
        {"uname": "admin_sec", "role": "Super Admin", "dept": "IT Infrastructure"},
        {"uname": "chief_soc", "role": "Super Admin", "dept": "IT Infrastructure"},
        # Analysts
        {"uname": "analyst_01", "role": "Security Analyst", "dept": "Compliance"},
        {"uname": "analyst_02", "role": "Security Analyst", "dept": "Compliance"},
        # Privileged Users
        {"uname": "db_admin", "role": "Privileged User", "dept": "IT Infrastructure"},
        {"uname": "sys_admin", "role": "Privileged User", "dept": "IT Infrastructure"},
        {"uname": "network_lead", "role": "Privileged User", "dept": "IT Infrastructure"},
        {"uname": "finance_director", "role": "Privileged User", "dept": "Treasury"},
    ]
    
    for u in users_to_create:
        pk, sk = kyber_keygen()
        
        # Setup Kyber-encrypted credentials
        cred_text = f"API_SECRET_TOKEN_FOR_{u['uname'].upper()}_2026_MLKEM"
        enc_payload = quantum_encrypt(cred_text, pk)
        
        db_user = User(
            username=u["uname"],
            password_hash=pw_hash,
            role=u["role"],
            department=u["dept"],
            status="Active",
            mfa_enabled=True,
            mfa_secret="SECRET123",
            kyber_pk=pk,
            kyber_sk=sk,
            encrypted_credential=json.dumps(enc_payload),
            plaintext_credential_hint=f"{u['role']} API Token"
        )
        db.add(db_user)
    db.commit()
    print("Core roles created.")
    
    # 4. Insert subset of logs into the database (e.g. 2,000 logs to prevent lag while keeping search interesting)
    print("Inserting 2,000 audit logs into database...")
    db_logs = []
    # Take 2,000 recent logs to populate SQLite
    logs_data_sorted = sorted(logs_data, key=lambda x: x["db_record"]["timestamp"], reverse=True)
    db_records_to_insert = logs_data_sorted[:2000]
    
    for idx, item in enumerate(db_records_to_insert):
        rec = item["db_record"]
        log_entry = ActivityLog(
            timestamp=rec["timestamp"],
            username=rec["username"],
            role=rec["role"],
            department=rec["department"],
            location=rec["location"],
            ip_address=rec["ip_address"],
            device=rec["device"],
            vpn=rec["vpn"],
            command=rec["command"],
            failed_logins=rec["failed_logins"],
            downloaded_files=rec["downloaded_files"],
            privileged=rec["privileged"],
            risk_score=rec["risk_score"],
            anomaly_verdict=rec["anomaly_verdict"],
            login_hour=rec["login_hour"]
        )
        db_logs.append(log_entry)
        
    db.bulk_save_objects(db_logs)
    db.commit()
    print("Database logs seeded successfully.")
    
    # 5. Populate Incidents (Auto-generate for logs where risk_score >= 80)
    print("Populating initial incidents...")
    high_risk_logs = [x for x in db_records_to_insert if x["db_record"]["risk_score"] >= 80.0]
    
    # Insert 10 sample incidents
    for idx, item in enumerate(high_risk_logs[:12]):
        rec = item["db_record"]
        inc_num = f"INC-2026-{1000 + idx + 1}"
        
        # Descriptions detailing the threat
        reasons = []
        if rec["vpn"]: reasons.append("VPN connection established")
        if rec["failed_logins"] >= 3: reasons.append(f"{rec['failed_logins']} failed password attempts")
        if rec["privileged"]: reasons.append(f"privileged operation: '{rec['command']}'")
        if rec["login_hour"] >= 22 or rec["login_hour"] < 6: reasons.append("off-hours activity at " + rec["timestamp"].strftime("%H:%M"))
        
        desc_text = f"Insider Threat Triggered: User {rec['username']} logged in from {rec['location']} via {rec['device']}. Indicators: {', '.join(reasons)}."
        
        # Encrypt description with admin public key
        admin = db.query(User).filter(User.role == "Super Admin").first()
        pk = admin.kyber_pk
        
        enc_payload = quantum_encrypt(desc_text, pk)
        
        incident_comments = [
            {
                "timestamp": (rec["timestamp"] + timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S UTC"),
                "analyst": "analyst_01",
                "comment": "System generated alert. Correlated user activity log indicators. Flagged as High Risk."
            }
        ]
        
        db_inc = Incident(
            incident_number=inc_num,
            user=rec["username"],
            risk_score=rec["risk_score"],
            timestamp=rec["timestamp"],
            status="Open" if idx % 2 == 0 else "Investigating",
            comments=json.dumps(incident_comments),
            encrypted_description=json.dumps(enc_payload),
            assigned_analyst="analyst_01" if idx % 2 != 0 else None
        )
        db.add(db_inc)
        
    db.commit()
    print("Incidents seeded.")
    
    # 6. Audit & Notification seed
    db.add(AuditLog(
        timestamp=datetime.utcnow(),
        user="System",
        action="Database Initialized",
        description="Seeded 10,000 synthetic banking records, created core roles, and generated ML-KEM keys.",
        status="Success"
    ))
    db.commit()

if __name__ == "__main__":
    db = SessionLocal()
    try:
        # Generate 10k logs
        logs_data = generate_10k_logs()
        
        # Train ML Model using all 10k logs
        print("Training Isolation Forest on the 10,000 banking logs...")
        features_list = [x["features"] for x in logs_data]
        train_model(features_list, contamination=0.035)
        
        # Seed DB
        seed_database(db, logs_data)
        print("Seeding process completed successfully!")
    finally:
        db.close()
