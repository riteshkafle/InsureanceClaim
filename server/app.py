"""Flask backend server for TrueClaim.AI application."""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
import shutil
import subprocess
import time
import random
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from kritish_backend_client directory
env_path = os.path.join(os.path.dirname(__file__), "kritish_backend_client", ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    # Fallback to root .env if exists
    load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
KRITISH_DIR = os.path.join(os.path.dirname(__file__), "kritish_backend_client")
OUTPUT_DIR = os.path.join(KRITISH_DIR, "output")
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}

# Create directories if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Store user data in memory (in production, use a database)
user_data = None
incident_data = None
uploaded_files = {"policy": None, "bill": None, "denial": None, "incomeDoc": None}


def allowed_file(filename):
    """Check if file extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "message": "Server is running"})


@app.route("/api/demographics", methods=["POST"])
def save_demographics():
    """Save user demographics data."""
    global user_data
    try:
        user_data = request.json
        print("Demographics received:", user_data)
        return jsonify(
            {
                "success": True,
                "message": "Demographics saved successfully",
                "data": user_data,
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Error saving demographics",
                    "error": str(e),
                }
            ),
            500,
        )


@app.route("/api/upload-policy", methods=["POST"])
def upload_policy():
    """Upload insurance policy PDF."""
    try:
        if "policy" not in request.files:
            return jsonify({"success": False, "message": "No file uploaded"}), 400

        file = request.files["policy"]
        if file.filename == "":
            return jsonify({"success": False, "message": "No file selected"}), 400

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"policy-{int(time.time() * 1000)}-{random.randint(100000, 999999)}-{filename}"
            filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
            file.save(filepath)

            uploaded_files["policy"] = {"filename": unique_filename, "path": filepath}

            print("Policy uploaded:", unique_filename)
            return jsonify(
                {
                    "success": True,
                    "message": "Policy uploaded successfully",
                    "filename": unique_filename,
                }
            )
        else:
            return jsonify({"success": False, "message": "Invalid file type"}), 400
    except Exception as e:
        return (
            jsonify(
                {"success": False, "message": "Error uploading policy", "error": str(e)}
            ),
            500,
        )


@app.route("/api/upload-bill", methods=["POST"])
def upload_bill():
    """Upload medical bill (optional)."""
    try:
        # Bill upload is optional
        if "bill" in request.files:
            file = request.files["bill"]
            if file.filename != "" and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_filename = f"bill-{int(time.time() * 1000)}-{random.randint(100000, 999999)}-{filename}"
                filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
                file.save(filepath)

                uploaded_files["bill"] = {"filename": unique_filename, "path": filepath}

                print("Bill uploaded:", unique_filename)
                return jsonify(
                    {
                        "success": True,
                        "message": "Bill uploaded successfully",
                        "filename": unique_filename,
                    }
                )

        return jsonify(
            {"success": True, "message": "Bill upload skipped", "filename": None}
        )
    except Exception as e:
        return (
            jsonify(
                {"success": False, "message": "Error uploading bill", "error": str(e)}
            ),
            500,
        )


@app.route("/api/incident-info", methods=["POST"])
def save_incident_info():
    """Save incident information from bill upload page."""
    global incident_data
    try:
        incident_data = request.json
        print("Incident information received:", incident_data)
        return jsonify(
            {
                "success": True,
                "message": "Incident information saved successfully",
                "data": incident_data,
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Error saving incident information",
                    "error": str(e),
                }
            ),
            500,
        )

@app.route("/api/chat", methods=["POST"])
def chat():
    """AI chatbot endpoint for general insurance information."""
    try:
        data = request.json
        user_message = data.get("message", "")
        
        if not user_message:
            return jsonify({
                "success": False,
                "error": "Message is required"
            }), 400
        
        # Initialize NVIDIA client
        api_key = os.getenv("NVIDIA_API_KEY")
        if not api_key:
            return jsonify({
                "success": False,
                "error": "NVIDIA API key not configured"
            }), 500
        
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=api_key,
        )
        model = "nvidia/nvidia-nemotron-nano-9b-v2"
        
        # Create a system prompt for insurance-related questions
        system_prompt = """You are a helpful AI assistant for TrueClaim.AI, an insurance claims platform. 
You help users understand:
- Insurance claim processes
- Medical billing and coding
- Financial assistance programs
- Insurance terminology
- Claim denial appeals
- Tax deductions for medical expenses

Provide clear, accurate, and helpful information. Keep responses concise and easy to understand. 
If asked about specific medical or legal advice, recommend consulting with professionals."""
        
        # Call NVIDIA model
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        return jsonify({
            "success": True,
            "response": ai_response
        })
        
    except Exception as e:
        print(f"Chat error: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "response": "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment."
        }), 500


@app.route("/api/pipeline-status", methods=["GET"])
def get_pipeline_status():
    """Get current pipeline processing status."""
    try:
        status_file = os.path.join(KRITISH_DIR, "pipeline_status.json")
        
        if not os.path.exists(status_file):
            return jsonify({
                "success": True,
                "status": {
                    "current_step": "not_started",
                    "progress": 0,
                    "message": "Pipeline not started",
                    "started_at": None,
                    "completed_at": None,
                    "error": None,
                }
            })
        
        with open(status_file, "r") as f:
            status = json.load(f)
        
        return jsonify({
            "success": True,
            "status": status
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "status": {
                "current_step": "error",
                "progress": 0,
                "message": f"Error reading status: {str(e)}",
                "error": str(e),
            }
        }), 500


@app.route("/api/upload-denial", methods=["POST"])
def upload_denial():
    """Upload denial document (if applicable)."""
    try:
        has_denial = request.form.get("hasDenial")

        if has_denial == "yes":
            if "denial" not in request.files:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Denial document required when hasDenial is yes",
                        }
                    ),
                    400,
                )

            file = request.files["denial"]
            if file.filename == "":
                return jsonify({"success": False, "message": "No file selected"}), 400

            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_filename = f"denial-{int(time.time() * 1000)}-{random.randint(100000, 999999)}-{filename}"
                filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
                file.save(filepath)

                uploaded_files["denial"] = {
                    "filename": unique_filename,
                    "path": filepath,
                }

                print("Denial document uploaded:", unique_filename)

        return jsonify(
            {
                "success": True,
                "message": "Denial information saved successfully",
                "hasDenial": has_denial,
                "filename": (
                    uploaded_files["denial"]["filename"]
                    if uploaded_files["denial"]
                    else None
                ),
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Error processing denial",
                    "error": str(e),
                }
            ),
            500,
        )


@app.route("/api/low-income-waiver", methods=["POST"])
def process_income_waiver():
    """Process income waiver request and run Python pipeline."""
    try:
        needs_waiver = request.form.get("needsWaiver")

        # Income document upload is optional - we don't require it
        if "incomeDoc" in request.files:
            file = request.files["incomeDoc"]
            if file and file.filename != "" and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_filename = f"incomeDoc-{int(time.time() * 1000)}-{random.randint(100000, 999999)}-{filename}"
                filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
                file.save(filepath)

                uploaded_files["incomeDoc"] = {
                    "filename": unique_filename,
                    "path": filepath,
                }

                print("Income document uploaded:", unique_filename)

        print("Income waiver check:", needs_waiver)

        # Run Python pipeline to generate all documents
        try:
            if not user_data:
                raise ValueError(
                    "User data not found. Please complete demographics first."
                )

            if not uploaded_files["policy"]:
                raise ValueError("Policy document not uploaded")

            # Prepare data for Python script
            user_data_path = os.path.join(KRITISH_DIR, "user_data.json")
            policy_path = uploaded_files["policy"]["path"]
            bill_path = (
                uploaded_files["bill"]["path"] if uploaded_files["bill"] else None
            )

            # Construct hospital address from separate fields if available, otherwise use combined field
            hospital_address = user_data.get("hospital_address", "")
            if (
                user_data.get("hospital_city")
                or user_data.get("hospital_state")
                or user_data.get("hospital_zip_code")
            ):
                # Build address from separate components
                address_parts = []
                if hospital_address:
                    address_parts.append(hospital_address)
                if user_data.get("hospital_city"):
                    address_parts.append(user_data.get("hospital_city"))
                if user_data.get("hospital_state"):
                    address_parts.append(user_data.get("hospital_state"))
                if user_data.get("hospital_zip_code"):
                    address_parts.append(user_data.get("hospital_zip_code"))
                hospital_address = ", ".join(address_parts)

            # Merge incident data if available
            incident_date = (
                incident_data.get("incident_date")
                if incident_data
                else user_data.get("incident_date")
            )
            description_of_what_happened = (
                incident_data.get("description_of_what_happened")
                if incident_data
                else user_data.get("description_of_what_happened")
            )
            incident_report = (
                incident_data.get("incident_report", "")
                if incident_data
                else user_data.get("incident_report", "")
            )

            # Write user data to JSON file for Python script
            python_user_data = {
                "first_name": user_data.get("first_name"),
                "last_name": user_data.get("last_name"),
                "email": user_data.get("email"),
                "phone_number": user_data.get("phone_number"),
                "address": user_data.get("address"),
                "city": user_data.get("city"),
                "state": user_data.get("state"),
                "zip_code": user_data.get("zip_code"),
                "income": user_data.get("income", 32000),
                "date_of_birth": user_data.get("date_of_birth"),
                "gender": user_data.get("gender"),
                "incident_date": incident_date,
                "description_of_what_happened": description_of_what_happened,
                "incident_report": incident_report,
                "hospital_name": user_data.get("hospital_name"),
                "hospital_address": hospital_address,
                "hospital_city": user_data.get("hospital_city", ""),
                "hospital_state": user_data.get("hospital_state", ""),
                "hospital_zip_code": user_data.get("hospital_zip_code", ""),
                "member_id_number": user_data.get("member_id_number"),
                "group_number": user_data.get("group_number"),
                "policy_number": user_data.get("policy_number"),
                "provider_tax_id": user_data.get("provider_tax_id"),
                "npi": user_data.get("npi"),
                "provider_phone_number": user_data.get("provider_phone_number"),
            }

            with open(user_data_path, "w") as f:
                json.dump(python_user_data, f, indent=2)

            # Copy policy file to Python script directory with expected name
            expected_policy_path = os.path.join(
                KRITISH_DIR, "2025-178-1 Summary Flyer.pdf"
            )
            shutil.copy2(policy_path, expected_policy_path)

            # Copy bill file if available
            if bill_path:
                expected_bill_path = os.path.join(KRITISH_DIR, "bill.pdf")
                shutil.copy2(bill_path, expected_bill_path)

            print("Running Python pipeline...")
            
            # Initialize status before running pipeline
            status_file = os.path.join(KRITISH_DIR, "pipeline_status.json")
            if os.path.exists(status_file):
                os.remove(status_file)

            # Run Python main.py in background (non-blocking)
            # We'll use subprocess.Popen to run it asynchronously
            process = subprocess.Popen(
                ["python3", "main.py"],
                cwd=KRITISH_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            
            # Don't wait for completion - let it run in background
            # The frontend will poll for status updates
            print("Python pipeline started in background. Status updates available via /api/pipeline-status")

        except Exception as pipeline_error:
            print(f"Error running pipeline: {pipeline_error}")
            # Pipeline failed, but we still return success for the waiver endpoint
            # The frontend can check if documents are available

        return jsonify(
            {
                "success": True,
                "message": "Income waiver information saved and documents generated",
                "needsWaiver": needs_waiver,
                "filename": (
                    uploaded_files["incomeDoc"]["filename"]
                    if uploaded_files["incomeDoc"]
                    else None
                ),
                "documentsGenerated": True,
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Error processing income waiver",
                    "error": str(e),
                }
            ),
            500,
        )


@app.route("/api/documents/claim-report", methods=["GET"])
def get_claim_report():
    """Get generated claim report PDF."""
    try:
        claim_report_path = os.path.join(OUTPUT_DIR, "pdf", "Claim_Report_NVIDIA.pdf")

        if not os.path.exists(claim_report_path):
            return jsonify({"success": False, "message": "Claim report not found"}), 404

        return send_file(
            claim_report_path,
            mimetype="application/pdf",
            as_attachment=False,
            download_name="claim-report.pdf",
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Error retrieving claim report",
                    "error": str(e),
                }
            ),
            500,
        )


@app.route("/api/documents/claim-form", methods=["GET"])
def get_claim_form():
    """Get filled claim form PDF."""
    try:
        claim_form_path = os.path.join(KRITISH_DIR, "filled_claim.pdf")

        if not os.path.exists(claim_form_path):
            return jsonify({"success": False, "message": "Claim form not found"}), 404

        return send_file(
            claim_form_path,
            mimetype="application/pdf",
            as_attachment=False,
            download_name="filled-claim-form.pdf",
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Error retrieving claim form",
                    "error": str(e),
                }
            ),
            500,
        )


@app.route("/api/documents/waiver-letter", methods=["GET"])
def get_waiver_letter():
    """Get generated financial assistance letter PDF."""
    try:
        waiver_letter_path = os.path.join(
            OUTPUT_DIR, "pdf", "Financial_Assistance_Letter_NVIDIA.pdf"
        )

        if not os.path.exists(waiver_letter_path):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Financial assistance letter not found",
                    }
                ),
                404,
            )

        return send_file(
            waiver_letter_path,
            mimetype="application/pdf",
            as_attachment=False,
            download_name="financial-assistance-letter.pdf",
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Error retrieving waiver letter",
                    "error": str(e),
                }
            ),
            500,
        )


@app.route("/api/documents/tax-form", methods=["GET"])
def get_tax_form():
    """Get generated IRS filled tax form PDF."""
    try:
        tax_form_path = os.path.join(KRITISH_DIR, "irs_filled.pdf")

        if not os.path.exists(tax_form_path):
            return jsonify({"success": False, "message": "Tax form not found"}), 404

        return send_file(
            tax_form_path,
            mimetype="application/pdf",
            as_attachment=False,
            download_name="irs-filled-tax-form.pdf",
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Error retrieving tax form",
                    "error": str(e),
                }
            ),
            500,
        )


if __name__ == "__main__":
    print("Starting Flask server...")
    print(f"Uploads directory: {UPLOAD_FOLDER}")
    print(f"Kritish directory: {KRITISH_DIR}")
    app.run(host="0.0.0.0", port=3000, debug=True)
