import os
import sys

# Add the project root to sys.path so 'backend.app' resolves correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import subprocess

def check_and_seed():
    db_exists = os.path.exists("sentinel_ai.db")
    model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models"))
    model_exists = os.path.exists(os.path.join(model_dir, "model.pkl"))
    
    if not db_exists or not model_exists:
        print("--- SentinelAI Initial Setup ---")
        print("Database or Machine Learning model not detected. Running seeding and training pipeline...")
        # Resolve python executable in virtual env if available, else system python
        python_exe = sys.executable
        if os.path.exists(".venv/Scripts/python.exe"):
            python_exe = os.path.abspath(".venv/Scripts/python.exe")
        elif os.path.exists(".venv/bin/python"):
            python_exe = os.path.abspath(".venv/bin/python")
            
        print(f"Executing: {python_exe} -m backend.app.seed")
        # Run seed script
        # Add root to pythonpath
        env = os.environ.copy()
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        env["PYTHONPATH"] = root_dir
        subprocess.run([python_exe, "-m", "backend.app.seed"], check=True, env=env)
        print("--- Setup Complete ---")

if __name__ == "__main__":
    # Ensure current directory is backend folder
    os.chdir(os.path.abspath(os.path.dirname(__file__)))
    
    # Run database check and ML training seed
    check_and_seed()
    
    # Launch Uvicorn Server
    import uvicorn
    print("Starting SentinelAI FastAPI server on http://localhost:8000...")
    
    # We change the module path to 'app.main:app' since we are running inside 'backend/' working directory
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
