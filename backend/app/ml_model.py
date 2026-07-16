import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import Dict, Tuple, List

# Define path for saving models in the 'models' directory at the project root
MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models"))
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")

# Feature columns in exact order:
# 0: login_hour (0-23)
# 1: failed_logins (int)
# 2: country_change (0 or 1)
# 3: device_change (0 or 1)
# 4: vpn (0 or 1)
# 5: command_count (int)
# 6: downloaded_files (int)
# 7: privilege_level (1: Analyst, 2: Privileged, 3: Admin)

# Global variables for cached model & scaler
_model = None
_scaler = None

def get_role_level(role: str) -> int:
    """Helper to convert user role to privilege level integer for ML features"""
    if role == "Super Admin":
        return 3
    elif role == "Privileged User":
        return 2
    elif role == "Security Analyst":
        return 1
    return 0

def load_ml_resources() -> Tuple[IsolationForest, StandardScaler]:
    """Loads and caches the model and scaler, or initializes them if not saved yet"""
    global _model, _scaler
    if _model is not None and _scaler is not None:
        return _model, _scaler
    
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        try:
            with open(MODEL_PATH, "rb") as f:
                _model = pickle.load(f)
            with open(SCALER_PATH, "rb") as f:
                _scaler = pickle.load(f)
            return _model, _scaler
        except Exception as e:
            print(f"Error loading saved ML models: {e}. Retraining on fly.")
            
    # Fallback/On-the-fly training if no model is found
    # (Prevents API crashes before the seeding script runs)
    print("No ML model found. Training fallback Isolation Forest...")
    train_and_save_fallback_model()
    return _model, _scaler

def train_and_save_fallback_model():
    """Generates dummy baseline data to create a valid fallback model/scaler"""
    global _model, _scaler
    # Generate 200 normal points and 10 anomaly points
    normal_data = []
    for _ in range(200):
        normal_data.append([
            np.random.randint(8, 18),   # normal work hours
            np.random.choice([0, 1], p=[0.95, 0.05]), # failed logins
            0,                          # country change
            0,                          # device change
            np.random.choice([0, 1], p=[0.8, 0.2]), # vpn
            np.random.randint(5, 30),   # commands
            np.random.randint(0, 5),    # downloaded files
            np.random.choice([1, 2, 3]) # roles
        ])
    anomalous_data = []
    for _ in range(10):
        anomalous_data.append([
            np.random.choice([1, 2, 3, 22, 23]), # off hours
            np.random.randint(3, 8),    # failed logins
            1,                          # country change
            1,                          # device change
            1,                          # vpn
            np.random.randint(80, 200), # extreme commands
            np.random.randint(50, 150), # extreme file downloads
            np.random.choice([1, 2, 3])
        ])
        
    df = pd.DataFrame(normal_data + anomalous_data)
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(df)
    
    model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    model.fit(scaled_features)
    
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    with open(SCALER_PATH, "wb") as f:
        pickle.dump(scaler, f)
        
    _model = model
    _scaler = scaler
    print(f"Fallback Isolation Forest trained and saved successfully at {MODEL_PATH}.")

def train_model(features_list: List[List[float]], contamination: float = 0.03):
    """
    Trains the Isolation Forest on the supplied dataset and saves model.pkl and scaler.pkl.
    Args:
        features_list: List of 8-feature lists
        contamination: The expected proportion of anomalies in the dataset
    """
    global _model, _scaler
    df = pd.DataFrame(features_list)
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(df)
    
    model = IsolationForest(n_estimators=150, contamination=contamination, random_state=42)
    model.fit(scaled_features)
    
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    with open(SCALER_PATH, "wb") as f:
        pickle.dump(scaler, f)
        
    _model = model
    _scaler = scaler
    print(f"Isolation Forest model and scaler trained on {len(features_list)} rows and saved in 'models/' directory.")

def predict_anomaly(features: List[float]) -> Dict[str, any]:
    """
    Predicts threat level, anomaly score, and confidence for a single feature vector.
    Args:
        features: [login_hour, failed_logins, country_change, device_change, vpn, command_count, downloaded_files, privilege_level]
    Returns:
        {
            "verdict": "Normal" | "Suspicious" | "High Risk",
            "anomaly_score": float (0.0 to 1.0),
            "confidence": float (0.0 to 1.0)
        }
    """
    model, scaler = load_ml_resources()
    
    # Scale feature vector
    x = np.array(features).reshape(1, -1)
    x_scaled = scaler.transform(x)
    
    # Predict (-1 for anomaly, 1 for normal)
    pred = model.predict(x_scaled)[0]
    
    # Decision function score (negative is anomalous, positive is normal)
    # Typically ranges between -0.5 and +0.5.
    dec_score = model.decision_function(x_scaled)[0]
    
    # Calculate anomaly score (0 = highly normal, 1 = highly anomalous)
    # Normalizing decision function: 0.5 is very normal (dec_score ~ 0.25+), -0.5 is very anomalous (dec_score ~ -0.3)
    # Let's map dec_score to a 0.0 - 1.0 range
    # Center dec_score: mapping dec_score range [-0.4, 0.4] to [1.0, 0.0]
    raw_anomaly_score = -dec_score
    # Sigmoid or linear normalization
    anomaly_score = 1.0 / (1.0 + np.exp(dec_score * 8.0)) # Maps nicely: negative values -> high score (>0.5), positive -> low (<0.5)
    anomaly_score = float(np.round(anomaly_score, 4))
    
    # Map to threat levels based on anomaly_score
    if pred == -1:
        if anomaly_score > 0.75:
            verdict = "High Risk"
        else:
            verdict = "Suspicious"
    else:
        if anomaly_score > 0.45:
            verdict = "Suspicious"
        else:
            verdict = "Normal"
            
    # Calculate model confidence based on isolation path consistency
    # Confidence represents proximity to the decision boundary
    confidence = float(np.round(abs(dec_score) / 0.4, 4))
    confidence = min(max(confidence, 0.5), 0.99) # Lock between 50% and 99%
    
    return {
        "verdict": verdict,
        "anomaly_score": anomaly_score,
        "confidence": confidence
    }
