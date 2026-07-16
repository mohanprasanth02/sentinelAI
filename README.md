# SentinelAI 🛡️

**SentinelAI** is an advanced, high-fidelity Insider Threat Detection and Security Operations Center (SOC) Simulation platform. It combines **Machine Learning anomaly detection** with **Post-Quantum Cryptography (PQC)** to secure audit telemetry, geolocate network threats, and run interactive containment playbooks against compromised user identities.

---

## 🌟 Key Features

### 1. 🤖 AI-Driven Threat Detection & ML Engine
- **Behavior Profiling**: Evaluates user log events based on time of access, device changes, origin countries, failed authentication spurts, and execution of privileged commands.
- **Anomaly Score Prediction**: Uses a pre-trained **Scikit-learn** model to evaluate actions in real-time, assigning a risk percentage and an anomaly verdict (`Normal`, `Suspicious`, `High Risk`).
- **Policy Calibration**: Dynamically adjust security policies (such as MFA thresholds and account locking parameters) and retrain the ML model on the fly.

### 2. 🔐 Post-Quantum Cryptography (PQC) Integration
- **Kyber-768 / ML-KEM Security**: Secures sensitive audit logs using post-quantum hybrid public-private key pairs.
- **Encapsulated Decryption**: High-risk incident payloads are encrypted with Kyber. Only authorized roles (e.g., `Super Admin`) holding private keys can trigger decapsulation to read encrypted incident reports.

### 3. 🛰️ Terminal Security Telemetry & Real-Time Stream
- **Dynamic Logging Stream**: A rolling real-time operational stream representing system activity.
- **Auto-Escalation**: Any simulated risk event exceeding the **50% threshold** is automatically detected, pushed to the backend database as an active security incident ticket, and toasted as a system-wide top-right alert.
- **Geographic Geolocator Mapping**: Custom interactive SVG canvas tracking origin packet hops from regional targets (United States, Switzerland, Singapore, etc.) to the central server.

### 4. 🚨 SOC War Room & Incident Containment Playbooks
- **Audit Roster**: Comprehensive dashboard detailing open and investigating security tickets.
- **4-Step containment playbook**:
  1. **Lock Suspect Accounts** in Active Directory.
  2. **Decrypt Incident Payloads** using Kyber decapsulation keys.
  3. **Revoke active authenticated sessions** / clear network session caches.
  4. **Resolve Ticket** and generate high-fidelity PDF executive summaries.

---

## 🛠️ Technology Stack

### Backend
- **Core API**: FastAPI (Python 3.10+)
- **Server**: Uvicorn
- **Database**: SQLite (SQLAlchemy ORM)
- **Machine Learning**: Scikit-learn, Pandas, NumPy
- **Security**: PyCryptodome (AES), Cryptography (JWT/Bcrypt)

### Frontend
- **Framework**: React 19 + Vite + Javascript (ES6)
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **Reports**: html2canvas + jsPDF

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm

### 1. Set Up and Run the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # On Windows:
   .\.venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server (this will automatically seed sample data and train the initial ML model if not already present):
   ```bash
   python run.py
   ```
   *The server runs locally at `http://localhost:8000`.*

### 2. Set Up and Run the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *Open `http://localhost:5173` to access the application dashboard.*

### 3. Exposing on Local Network (WiFi Sharing)
To share and test the application with friends on the same WiFi network:
1. Allow ports `5173` and `8000` through your Windows Firewall.
2. Launch Vite using the `--host` flag:
   ```bash
   npm run dev -- --host
   ```
3. Friends can access the site at `http://<YOUR_LOCAL_IP>:5173`. The application dynamically resolves API routing endpoints.

---

## 🔑 Demo Credentials

To access the platform, log in with one of the seeded administrator profiles:

| Role | Username | Password | MFA Code |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin_sec` | `password123` | `123456` |
| **Super Admin** | `chief_soc` | `password123` | `123456` |
| **Security Analyst** | `analyst_01` | `password123` | `123456` |
| **Security Analyst** | `analyst_02` | `password123` | `123456` |