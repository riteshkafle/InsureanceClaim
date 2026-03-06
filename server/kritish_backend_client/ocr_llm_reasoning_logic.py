"""OCR + LLM pipeline for pre-filling an insurance claim.

What it does:
- OCR the user-supplied policy document (PDF) to text using Tesseract via pdf2image.
- Uses an LLM (NVIDIA by default, or OpenAI) to extract structured policy fields.
- Optionally OCRs a user-supplied medical bill photo/PDF to extract total_expense, dates, and provider info.
- Combines UI-provided user details with extracted policy/bill data.
- Emits artifacts used by later steps (claim_file.py, pdf_creator.py):
  - output/policy_extracted.json
  - output/claim_form.json
  - output/schedule_a_medical.json
  - output/claim.md
  - output/low_income_assistance_letter.md
  - output1.txt (raw OCR text from the policy PDF)

What the UI must provide:
- Files:
  - policy_pdf_path: the policy/benefits summary PDF uploaded by the user.
  - bill_image_path (photo or PDF): the medical bill image/PDF uploaded by the user (if available).
- User fields (editable in the UI):
  - first_name, last_name, email, phone_number
  - address, city, state, zip_code
  - income (number), date_of_birth (YYYY-MM-DD), gender
  - incident_date (YYYY-MM-DD), description_of_what_happened
  - hospital_name, hospital_address
  - member_id_number, group_number
  - provider_tax_id, npi, provider_phone_number

Configuration and requirements:
- Tesseract installed and accessible at /opt/homebrew/bin/tesseract (macOS ARM default).
- poppler installed (for pdf2image to rasterize PDFs).
- .env contains NVIDIA_API_KEY (default) or OPENAI_API_KEY if USE_NVIDIA=False.
- In this sample, paths and user_data are hardcoded; the UI should pass real values
  (or write them to config) before calling main(), or adapt main() to accept arguments.
"""

import os
import json
import datetime
import pytesseract
from pdf2image import convert_from_path
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure OCR tool path
pytesseract.pytesseract.tesseract_cmd = r"/opt/homebrew/bin/tesseract"

# Choose model source
USE_NVIDIA = True
if USE_NVIDIA:
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.getenv("NVIDIA_API_KEY"),
    )
    MODEL_NAME = "nvidia/nvidia-nemotron-nano-9b-v2"
else:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    MODEL_NAME = "gpt-4o-mini"


def ocr_pdf_to_text(pdf_path, output_txt_path, dpi=300):
    print("Reading and converting PDF pages to text...")
    pages = convert_from_path(pdf_path, dpi=dpi)
    with open(output_txt_path, "w", encoding="utf-8") as f:
        for i, page in enumerate(pages, start=1):
            text = pytesseract.image_to_string(page)
            f.write(f"--- PAGE {i} ---\n{text}\n\n")
            print(f"Processed page {i} of {len(pages)}")
    print("PDF to text conversion completed.")
    with open(output_txt_path, "r", encoding="utf-8") as f:
        return f.read()


def extract_policy_fields(ocr_text):
    print("Extracting policy information from OCR text...")
    prompt = f"""
You are an insurance-policy analyzer.
Extract all policy information useful for filing a claim.
Return strict JSON:
{{
  "coverage_details": "", "claim_limit": "", "deductible_amount": "", "policy_start": "",
  "policy_end": "", "insurance_provider": "", "policy_number": "", "contact_phone": "",
  "contact_email": "", "filing_instructions": "", "claim_exceptions": ""
}}
OCR:
\"\"\"{ocr_text}\"\"\""""
    c = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    t = c.choices[0].message.content.strip()
    try:
        return json.loads(t)
    except:
        return {"raw_output": t}


def extract_medical_expense(ocr_text):
    print("Extracting details from medical bill text...")
    prompt = f"""
Extract total_expense, service_date, provider_name, bill_number from this medical bill OCR text.
Return strict JSON:
{{"total_expense":"","service_date":"","provider_name":"","bill_number":""}}
OCR:
\"\"\"{ocr_text}\"\"\""""
    c = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    t = c.choices[0].message.content.strip()
    try:
        return json.loads(t)
    except:
        return {"raw_output": t}


def parse_hospital_address(addr):
    if not addr:
        return {"address": "", "city": "", "state": "", "zip": ""}
    parts = [p.strip() for p in addr.split(",")]
    street = parts[0] if len(parts) > 0 else ""
    city = parts[1] if len(parts) > 1 else ""
    state_zip = parts[2] if len(parts) > 2 else ""
    tokens = state_zip.split() if state_zip else []
    state = tokens[0] if tokens else ""
    zip_code = tokens[-1] if len(tokens) > 1 else ""
    return {"address": street, "city": city, "state": state, "zip": zip_code}


def main():
    try:
        from status_manager import update_status
    except ImportError:
        # If status_manager not available, create a no-op function
        def update_status(step, message=None, error=None):
            pass
    
    print("Step 1: Starting OCR extraction from insurance PDF...")
    update_status("ocr_extraction", "Extracting text from policy document...")
    pdf_path = "2025-178-1 Summary Flyer.pdf"
    txt_path = "output1.txt"
    os.makedirs("output", exist_ok=True)
    
    # Check if PDF exists
    if not os.path.exists(pdf_path):
        error_msg = f"Error: Policy PDF not found at {pdf_path}"
        print(error_msg)
        update_status("error", error_msg, error_msg)
        return
    
    ocr_text = ocr_pdf_to_text(pdf_path, txt_path)

    print("Step 2: Extracting policy fields...")
    update_status("policy_analysis", "Analyzing policy details with AI...")
    policy_data = extract_policy_fields(ocr_text)
    with open("output/policy_extracted.json", "w") as f:
        json.dump(policy_data, f, indent=2)
    print("Policy information saved to output/policy_extracted.json")

    print("Step 3: Loading user data from JSON...")
    # Load user data from JSON file if it exists, otherwise use defaults
    user_data_path = "user_data.json"
    if os.path.exists(user_data_path):
        with open(user_data_path, "r") as f:
            user_data = json.load(f)
        print("User data loaded from user_data.json")
    else:
        print("Warning: user_data.json not found, using default values")
        user_data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone_number": "+1-555-123-4567",
            "address": "123 Maple Street",
            "city": "Baltimore",
            "state": "MD",
            "zip_code": "21201",
            "income": 32000,
            "date_of_birth": "1988-07-14",
            "gender": "Male",
            "incident_date": "2025-11-02",
            "hospital_name": "Mercy Medical Center",
            "hospital_address": "301 St. Paul Pl, Baltimore, MD 21202",
            "description_of_what_happened": "On November 2, 2025, I was involved in a car accident and received emergency treatment for multiple injuries.",
            "member_id_number": "BC1234567",
            "group_number": "GRP890123",
            "provider_tax_id": "1213131",
            "npi": "21213331312",
            "provider_phone_number": "6739870822",
        }

    final_data = {**user_data, **policy_data}
    provider_addr = parse_hospital_address(user_data["hospital_address"])

    claim_form = {
        "member_information": {
            "member_id_number": final_data["member_id_number"],
            "group_number": final_data["group_number"],
        },
        "patient_information": {
            "patient_name": f"{user_data['last_name']}, {user_data['first_name']}",
            "home_address": user_data["address"],
            "city": user_data["city"],
            "state": user_data["state"],
            "zip_code": user_data["zip_code"],
            "phone_number": user_data["phone_number"],
            "date_of_birth": user_data["date_of_birth"],
            "gender": user_data["gender"],
            "relationship_to_policyholder": "Subscriber/Policyholder",
        },
        "provider_information": {
            "provider_name": user_data["hospital_name"],
            "provider_tax_id": user_data["provider_tax_id"],
            "npi": user_data["npi"],
            "group_or_facility_name": user_data["hospital_name"],
            "provider_address": user_data["hospital_address"],
            "services_rendered_address": user_data["hospital_address"],
            "city": provider_addr["city"],
            "state": provider_addr["state"],
            "zip_code": provider_addr["zip"],
            "phone_number": user_data["provider_phone_number"],
        },
        "accident_information": {
            "date_of_accident": user_data["incident_date"],
            "type_of_accident": "Auto",
            "description": user_data["description_of_what_happened"],
        },
    }

    with open("output/claim_form.json", "w") as f:
        json.dump(claim_form, f, indent=2)
    print("Claim form JSON saved.")

    bill_data = {
        "total_expense": "4800",
        "service_date": "2025-11-02",
        "bill_number": "INV-7823",
    }
    total_expenses = float(bill_data["total_expense"])
    deductible = 500
    coverage_percent = 0.8
    covered_amount = max(0, (total_expenses - deductible) * coverage_percent)
    out_of_pocket = total_expenses - covered_amount

    agi = user_data["income"]
    limit = agi * 0.075
    deduction = max(total_expenses - limit, 0)
    schedule_a = {
        "taxpayer_information": {
            "name": f"{user_data['first_name']} {user_data['last_name']}"
        },
        "medical_and_dental_expenses": {
            "total_expenses": f"{total_expenses:.2f}",
            "adjusted_gross_income": str(agi),
            "seven_point_five_percent_of_agi": f"{limit:.2f}",
            "deduction_amount": f"{deduction:.2f}",
        },
    }
    with open("output/schedule_a_medical.json", "w") as f:
        json.dump(schedule_a, f, indent=2)
    print("Schedule A medical JSON saved.")

    # Create claim report
    print("Creating claim report...")
    today = datetime.date.today().strftime("%B %d, %Y")
    # Use policy_number from user_data if available, otherwise from policy_data
    policy_number = user_data.get('policy_number') or policy_data.get('policy_number', 'N/A')
    # Get description from user input, with fallback
    description = user_data.get('description_of_what_happened', 'I received medical treatment')
    
    claim_md = f"""# Insurance Claim Report

Date: {today}  
Claimant: {user_data['first_name']} {user_data['last_name']}  
Date of Birth: {user_data['date_of_birth']}  
Policy Number: {policy_number}  
Insurance Provider: {policy_data.get('insurance_provider','N/A')}  
Member ID: {user_data['member_id_number']}  
Group Number: {user_data['group_number']}

---

## 1. Incident Overview
On {user_data['incident_date']}, {description}. I received medical care at {user_data['hospital_name']}. The incident required immediate treatment and diagnostic tests.

---

## 2. Provider Details
Name: {user_data['hospital_name']}  
Address: {user_data['hospital_address']}  
Phone: {user_data['provider_phone_number']}  
Tax ID: {user_data['provider_tax_id']}  
NPI: {user_data['npi']}

---

## 3. Billing and Coverage Summary
| Item | Amount |
|------|---------|
| Total Medical Bill | ${total_expenses:,.2f} |
| Deductible | ${deductible:,.2f} |
| Insurance Coverage | ${covered_amount:,.2f} |
| Estimated Out-of-Pocket | ${out_of_pocket:,.2f} |

Coverage Details: {policy_data.get('coverage_details','Comprehensive accident coverage.')}  
Claim Limit: {policy_data.get('claim_limit','$25,000')}  
Deductible: {policy_data.get('deductible_amount','$500')}  

---

## 4. Financial Summary
Insurance is expected to pay approximately ${covered_amount:,.2f}, leaving an out-of-pocket cost of ${out_of_pocket:,.2f}.  
This claim is submitted for reimbursement in accordance with my active policy.

---

Signature:  
{user_data['first_name']} {user_data['last_name']}  
{user_data['address']}, {user_data['city']}, {user_data['state']} {user_data['zip_code']}  
Phone: {user_data['phone_number']}  
Email: {user_data['email']}
"""
    with open("output/claim.md", "w") as f:
        f.write(claim_md)
    print("Claim report saved to output/claim.md")

    # Create financial assistance letter
    print("Creating financial assistance request letter...")
    assistance_md = f"""# Financial Assistance Request Letter

Date: {today}  
To: Financial Assistance Department  
Hospital: {user_data['hospital_name']}  
Address: {user_data['hospital_address']}

Dear Financial Assistance Officer,

I am writing to request consideration under your hospital's Financial Assistance Program. On {user_data['incident_date']}, {description}. I was treated at {user_data['hospital_name']}.

The total medical bill for my care was ${total_expenses:,.2f}, with insurance expected to cover ${covered_amount:,.2f}. My remaining balance of ${out_of_pocket:,.2f} is a financial hardship given my annual income of ${user_data['income']:,}.

I am kindly requesting that the hospital review my case and consider reducing or forgiving the outstanding balance. I have included my insurance claim report and Schedule A deduction summary for reference.

Thank you for your time and understanding.

Sincerely,  
{user_data['first_name']} {user_data['last_name']}  
{user_data['address']}  
{user_data['city']}, {user_data['state']} {user_data['zip_code']}  
Phone: {user_data['phone_number']}  
Email: {user_data['email']}
"""
    with open("output/low_income_assistance_letter.md", "w") as f:
        f.write(assistance_md)
    print("Financial assistance letter saved to output/low_income_assistance_letter.md")

    print("All documents have been successfully created in the output folder.")


if __name__ == "__main__":
    main()
