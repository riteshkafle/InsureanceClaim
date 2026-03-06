"""Status manager for pipeline progress tracking.

This module provides functions to update and read pipeline status,
allowing the frontend to show real-time progress updates.
"""

import json
import os
from pathlib import Path
from datetime import datetime

STATUS_FILE = "pipeline_status.json"

# Pipeline steps
STEPS = {
    "initializing": {"name": "Initializing Pipeline", "progress": 0},
    "ocr_extraction": {"name": "Extracting Policy Information", "progress": 20},
    "policy_analysis": {"name": "Analyzing Policy Details", "progress": 35},
    "claim_generation": {"name": "Generating Claim Forms", "progress": 55},
    "report_creation": {"name": "Creating Claim Reports", "progress": 75},
    "tax_documents": {"name": "Preparing Tax Documents", "progress": 85},
    "finalizing": {"name": "Finalizing Documents", "progress": 95},
    "completed": {"name": "Processing Complete", "progress": 100},
    "error": {"name": "Error Occurred", "progress": 0},
}


def init_status():
    """Initialize status file with starting state."""
    status = {
        "current_step": "initializing",
        "progress": 0,
        "message": "Starting pipeline...",
        "started_at": datetime.now().isoformat(),
        "completed_at": None,
        "error": None,
    }
    _write_status(status)
    return status


def update_status(step: str, message: str = None, error: str = None):
    """Update pipeline status.
    
    Args:
        step: Step key from STEPS dict
        message: Optional custom message
        error: Optional error message
    """
    if step not in STEPS:
        print(f"Warning: Unknown step '{step}'")
        return
    
    step_info = STEPS[step]
    status = {
        "current_step": step,
        "progress": step_info["progress"],
        "message": message or step_info["name"],
        "started_at": _get_status().get("started_at", datetime.now().isoformat()),
        "completed_at": None,
        "error": error,
    }
    
    if step == "completed":
        status["completed_at"] = datetime.now().isoformat()
    
    _write_status(status)
    print(f"Status update: {step} - {status['message']} ({status['progress']}%)")


def _write_status(status: dict):
    """Write status to JSON file."""
    status_path = Path(__file__).parent / STATUS_FILE
    with open(status_path, "w") as f:
        json.dump(status, f, indent=2)


def get_status() -> dict:
    """Get current pipeline status."""
    return _get_status()


def _get_status() -> dict:
    """Read status from JSON file."""
    status_path = Path(__file__).parent / STATUS_FILE
    if not status_path.exists():
        return init_status()
    
    try:
        with open(status_path, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return init_status()


def clear_status():
    """Clear status file (useful for new runs)."""
    status_path = Path(__file__).parent / STATUS_FILE
    if status_path.exists():
        status_path.unlink()

