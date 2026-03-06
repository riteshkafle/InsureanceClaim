"""PDF letter generator for insurance-claim artifacts.

Purpose:
- Convert previously generated artifacts (JSON/Markdown) into compact, one-page PDFs:
  - Claim report
  - Financial assistance request letter

How it works:
- Reads artifacts created by the OCR + LLM step:
  - output/claim.md
  - output/claim_form.json
  - output/policy_extracted.json
- Extracts key fields (amounts, policy/provider details) from claim.md using regex and merges with JSON.
- Calls an NVIDIA-hosted LLM via the OpenAI SDK to produce a strictly structured letter JSON.
- Falls back to a deterministic template if the model output is not valid JSON.
- Renders the structured letters to PDF with ReportLab.

Inputs (expected to exist before running this module):
- output/claim.md
- output/claim_form.json
- output/policy_extracted.json

Outputs:
- output/pdf/Claim_Report_NVIDIA.pdf
- output/pdf/Financial_Assistance_Letter_NVIDIA.pdf
(The output/pdf directory is created if it does not exist.)

Requirements:
- Python packages: reportlab, openai, python-dotenv
- .env with NVIDIA_API_KEY (used with the NVIDIA integrate API via OpenAI SDK)
- Internet access for the model call

Usage:
- As part of the pipeline orchestrator: `python3 main.py`
- Standalone (after OCR step has produced artifacts): `python3 pdf_creator.py`

Notes:
- Amount parsing depends on the Markdown table headers/format in claim.md.
- No Tesseract/poppler required here (only needed by the OCR step).
"""

import os
import re
import json
from datetime import date
from openai import OpenAI
from reportlab.lib.pagesizes import LETTER
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from dotenv import load_dotenv

load_dotenv()


def read_text(path):
    if not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def read_json(path):
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_first(pattern, text, default=""):
    m = re.search(pattern, text, re.IGNORECASE)
    return m.group(1).strip() if m else default


def find_money(pattern, text, default=0.0):
    m = re.search(pattern, text, re.IGNORECASE)
    if not m:
        return default
    s = m.group(1).replace(",", "").replace("$", "").strip()
    try:
        return float(s)
    except:
        return default


def clean_phone(s):
    s = re.sub(r"[^\d+]", "", s or "")
    return s


def generate_structured_letter(client, model, letter_type, context):
    """Use NVIDIA LLM to return a clean structured JSON letter."""
    # Build description instruction based on letter type
    description_instruction = ""
    if context.get("description"):
        if letter_type == "claim_report":
            description_instruction = f"\nIMPORTANT: In the paragraphs, include details about the incident: '{context.get('description')}'. Use this description to explain what happened on {context.get('incident_date', 'the incident date')}."
        elif letter_type == "financial_assistance":
            description_instruction = f"\nIMPORTANT: In the paragraphs, mention the incident: '{context.get('description')}' that occurred on {context.get('incident_date', 'the incident date')}. Explain how this incident led to the medical expenses."
    
    prompt = f"""
You are a professional correspondence writer. 
Produce a well-structured letter in strict JSON only (no markdown, no commentary).

JSON schema:
{{
  "title": "",
  "date": "",
  "address_block": "",
  "subject": "",
  "salutation": "",
  "intro": "",
  "paragraphs": [],
  "table": {{
    "headers": [],
    "rows": []
  }},
  "closing": "",
  "signature_block": ""
}}

Letter type: "{letter_type}"
{description_instruction}

Use ALL the provided context data including policy details, user information, financial amounts, and incident description.

Context:
{json.dumps(context, indent=2)}
"""

    print(f"Generating structured {letter_type} letter with NVIDIA...")
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    raw = resp.choices[0].message.content.strip()
    try:
        data = json.loads(raw)
        print(f"Structured {letter_type} letter JSON created.")
        return data
    except Exception:
        print("Model output not valid JSON, falling back to minimal template.")
        # Build paragraphs with description
        description = context.get("description", "I received medical treatment")
        incident_date = context.get("incident_date", "")
        
        if letter_type == "claim_report":
            intro_para = f"On {incident_date}, {description}. I received medical care and am submitting this claim for reimbursement."
            paragraphs = [
                intro_para,
                f"The total medical bill was ${context.get('total_bill', 0):,.2f}, with insurance coverage of ${context.get('coverage_amount', 0):,.2f} and an estimated out-of-pocket cost of ${context.get('out_of_pocket', 0):,.2f}."
            ]
        elif letter_type == "financial_assistance":
            intro_para = f"On {incident_date}, {description}. I was treated at {context.get('hospital_name', 'the hospital')}."
            paragraphs = [
                intro_para,
                f"The total medical bill for my care was ${context.get('total_bill', 0):,.2f}, with insurance expected to cover ${context.get('coverage_amount', 0):,.2f}. My remaining balance of ${context.get('out_of_pocket', 0):,.2f} is a financial hardship given my annual income of ${context.get('annual_income', 32000):,.2f}."
            ]
        else:
            paragraphs = ["This letter summarizes the claim and financial details based on the attached information."]
        
        return {
            "title": context.get("title", letter_type.title()),
            "date": context.get("today", ""),
            "address_block": context.get("address_block", ""),
            "subject": context.get("subject", ""),
            "salutation": "Dear Reviewer," if letter_type == "claim_report" else "Dear Financial Assistance Officer,",
            "intro": paragraphs[0] if paragraphs else "Please see the following details.",
            "paragraphs": paragraphs[1:] if len(paragraphs) > 1 else [],
            "table": {
                "headers": ["Item", "Amount (USD)"],
                "rows": [
                    ["Total Medical Bill", f"${context.get('total_bill', 0):,.2f}"],
                    ["Deductible", f"${context.get('deductible', 0):,.2f}"],
                    [
                        "Insurance Coverage",
                        f"${context.get('coverage_amount', 0):,.2f}",
                    ],
                    ["Out-of-Pocket", f"${context.get('out_of_pocket', 0):,.2f}"],
                ],
            },
            "closing": "Thank you for your time and consideration.",
            "signature_block": context.get("signature_block", ""),
        }


def render_letter_pdf(data, pdf_path):
    """Render structured JSON into a one-page formatted PDF letter."""
    print(f"Creating compact one-page PDF: {pdf_path}")
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=LETTER,
        leftMargin=65,
        rightMargin=65,
        topMargin=60,
        bottomMargin=60,
        title=data.get("title", "Letter"),
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontSize=17,
        alignment=TA_CENTER,
        spaceAfter=14,
    )
    subject_style = ParagraphStyle(
        "Subject", parent=styles["Heading2"], fontSize=12.5, spaceAfter=8
    )
    normal = ParagraphStyle(
        "Normal",
        parent=styles["Normal"],
        fontSize=10.5,
        leading=13.5,
        spaceAfter=6,
        alignment=TA_JUSTIFY,
    )
    signature = ParagraphStyle(
        "Signature",
        parent=styles["Normal"],
        fontSize=10.5,
        leading=13.5,
        spaceBefore=14,
    )

    story = []

    title = data.get("title") or "Letter"
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 6))

    date_line = data.get("date", "")
    if date_line:
        story.append(Paragraph(date_line, normal))
        story.append(Spacer(1, 3))

    address_block = data.get("address_block", "")
    if address_block:
        for line in address_block.split("\n"):
            if line.strip():
                story.append(Paragraph(line.strip(), normal))
        story.append(Spacer(1, 8))

    subject = data.get("subject", "")
    if subject:
        story.append(Paragraph(subject, subject_style))

    sal = data.get("salutation", "")
    if sal:
        story.append(Paragraph(sal, normal))
        story.append(Spacer(1, 4))

    intro = data.get("intro", "")
    if intro:
        story.append(Paragraph(intro, normal))

    for p in data.get("paragraphs", []):
        if isinstance(p, dict):
            text = p.get("text", "")
        else:
            text = str(p)
        if text.strip():
            story.append(Paragraph(text.strip(), normal))

    tbl = data.get("table", {})
    headers = tbl.get("headers") or []
    rows = tbl.get("rows") or []
    if headers and rows:
        table_data = [headers] + rows
        t = Table(table_data, hAlign="LEFT", colWidths=[250, 120])
        t.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(Spacer(1, 6))
        story.append(t)

    closing = data.get("closing", "")
    if closing:
        story.append(Spacer(1, 8))
        story.append(Paragraph(closing, normal))

    sig = data.get("signature_block", "")
    if sig:
        story.append(Paragraph(sig, signature))

    doc.build(story)
    print(f"Saved compact PDF: {pdf_path}")


def main():
    try:
        from status_manager import update_status
    except ImportError:
        def update_status(step, message=None, error=None):
            pass
    
    update_status("report_creation", "Creating claim reports and financial assistance letters...")
    print("Preparing data from existing files...")
    os.makedirs("output/pdf", exist_ok=True)

    claim_md = read_text("output/claim.md")
    claim_form = read_json("output/claim_form.json")
    policy_extracted = read_json("output/policy_extracted.json")
    # Also load user_data.json to get all user input data including income and description
    user_data = read_json("user_data.json")

    # --- Extract data from claim.md ---
    total_bill = find_money(
        r"Total Medical Bill\s*\|\s*\$?([\d,]+\.\d{2})", claim_md, 0.0
    )
    deductible = find_money(r"Deductible\s*\|\s*\$?([\d,]+\.\d{2})", claim_md, 0.0)
    coverage_amount = find_money(
        r"Insurance Coverage.*\|\s*\$?([\d,]+\.\d{2})", claim_md, 0.0
    )
    out_of_pocket = find_money(
        r"Estimated Out-of-Pocket.*\|\s*\$?([\d,]+\.\d{2})", claim_md, 0.0
    )

    claimant = find_first(r"Claimant:\s*([^\n]+)", claim_md, "")
    dob = find_first(r"Date of Birth:\s*([^\n]+)", claim_md, "")
    member_id = find_first(r"Member ID:\s*([^\n]+)", claim_md, "")
    group_number = find_first(r"Group Number:\s*([^\n]+)", claim_md, "")
    policy_number = find_first(
        r"Policy Number:\s*([^\n]+)",
        claim_md,
        policy_extracted.get("policy_number", ""),
    )
    insurance_provider = find_first(
        r"Insurance Provider:\s*([^\n]+)",
        claim_md,
        policy_extracted.get("insurance_provider", ""),
    )

    hosp_name = find_first(r"Provider Details\s*[\s\S]*?Name:\s*([^\n]+)", claim_md, "")
    hosp_addr = find_first(r"Address:\s*([^\n]+)", claim_md, "")
    phone = clean_phone(find_first(r"Phone:\s*([^\n]+)", claim_md, ""))
    
    # Extract description from claim.md - look for the incident overview section
    # The format is: "On {date}, {description}. I received medical care..."
    # We want to extract just the description part
    description_match = re.search(
        r"## 1\. Incident Overview\s*\nOn\s*[^\n]+,\s*([^\.]+(?:\.[^\.]+)*?)(?=\.\s*I received)",
        claim_md,
        re.DOTALL
    )
    if description_match:
        description = description_match.group(1).strip()
    else:
        # Try simpler pattern - just get text after date until "I received"
        description_match = re.search(
            r"On\s*[^\n]+,\s*([^\.]+(?:\.[^\.]+)*?)(?=\.\s*I received)",
            claim_md,
            re.DOTALL
        )
        if description_match:
            description = description_match.group(1).strip()
        else:
            # Fallback to user_data
            description = user_data.get("description_of_what_happened", "I received medical treatment")
    
    # Clean up description - remove trailing periods and extra whitespace
    description = description.strip().rstrip('.')
    
    # Get income from user_data
    annual_income = user_data.get("income", 32000.0)

    pi = claim_form.get("patient_information", {})
    address_block_sender = "\n".join(
        [
            (
                f"{claimant}"
                if claimant
                else f"{pi.get('patient_name','')}".replace(",", "")
            ),
            f"{pi.get('home_address','')}",
            f"{pi.get('city','')}, {pi.get('state','')} {pi.get('zip_code','')}",
            f"Phone: {clean_phone(pi.get('phone_number',''))}",
        ]
    ).strip()

    address_block_hospital = "\n".join(
        [
            "Financial Assistance Department",
            (
                f"{hosp_name}"
                if hosp_name
                else claim_form.get("provider_information", {}).get("provider_name", "")
            ),
            (
                f"{hosp_addr}"
                if hosp_addr
                else (
                    f"{claim_form.get('provider_information',{}).get('provider_address','')}, "
                    f"{claim_form.get('provider_information',{}).get('city','')}, "
                    f"{claim_form.get('provider_information',{}).get('state','')} "
                    f"{claim_form.get('provider_information',{}).get('zip_code','')}"
                )
            ),
        ]
    ).strip()

    table_rows = [
        ["Total Medical Bill", f"${total_bill:,.2f}"],
        ["Deductible", f"${deductible:,.2f}"],
        ["Insurance Coverage", f"${coverage_amount:,.2f}"],
        ["Estimated Out-of-Pocket", f"${out_of_pocket:,.2f}"],
    ]

    today = date.today().strftime("%B %d, %Y")

    # Get incident date
    incident_date = find_first(r"On\s*([0-9-]+)", claim_md, user_data.get("incident_date", ""))
    
    # Get additional policy data
    coverage_details = policy_extracted.get("coverage_details", "Comprehensive accident coverage.")
    claim_limit = policy_extracted.get("claim_limit", "$25,000")
    deductible_amount = policy_extracted.get("deductible_amount", "$500")
    
    claim_context = {
        "title": "Insurance Claim Report",
        "today": today,
        "subject": "Claim Submission and Coverage Summary",
        "address_block": address_block_sender,
        "claimant": claimant,
        "dob": dob,
        "member_id": member_id,
        "group_number": group_number,
        "policy_number": policy_number,
        "insurance_provider": insurance_provider,
        "hospital_name": hosp_name,
        "hospital_address": hosp_addr,
        "hospital_phone": phone,
        "total_bill": total_bill,
        "deductible": deductible,
        "coverage_amount": coverage_amount,
        "out_of_pocket": out_of_pocket,
        "table_rows": table_rows,
        "signature_block": claimant or pi.get("patient_name", ""),
        "incident_date": incident_date,
        "description": description,
        "description_hint": description,
        "coverage_details": coverage_details,
        "claim_limit": claim_limit,
        "deductible_amount": deductible_amount,
        "annual_income": annual_income,
    }

    assistance_context = {
        "title": "Financial Assistance Request Letter",
        "today": today,
        "subject": "Request for Financial Assistance",
        "address_block": address_block_hospital,
        "patient_block": address_block_sender,
        "hospital_name": hosp_name,
        "hospital_address": hosp_addr,
        "incident_date": incident_date,
        "description": description,
        "total_bill": total_bill,
        "coverage_amount": coverage_amount,
        "out_of_pocket": out_of_pocket,
        "annual_income": annual_income,
        "table_rows": table_rows,
        "signature_block": claimant or pi.get("patient_name", ""),
        "policy_number": policy_number,
        "insurance_provider": insurance_provider,
        "member_id": member_id,
        "group_number": group_number,
    }

    # NVIDIA setup
    print("Initializing NVIDIA client...")
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise ValueError(
            "Missing NVIDIA_API_KEY. Please add it to your .env or export it in your shell."
        )

    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key,
    )
    model = "nvidia/nvidia-nemotron-nano-9b-v2"

    # Generate structured letters
    claim_json = generate_structured_letter(
        client, model, "claim_report", claim_context
    )
    assist_json = generate_structured_letter(
        client, model, "financial_assistance", assistance_context
    )

    # Ensure tables
    if not claim_json.get("table", {}).get("rows"):
        claim_json["table"] = {"headers": ["Item", "Amount (USD)"], "rows": table_rows}
    if not assist_json.get("table", {}).get("rows"):
        assist_json["table"] = {"headers": ["Item", "Amount (USD)"], "rows": table_rows}

    # Render PDFs
    render_letter_pdf(claim_json, "output/pdf/Claim_Report_NVIDIA.pdf")
    render_letter_pdf(assist_json, "output/pdf/Financial_Assistance_Letter_NVIDIA.pdf")

    print("\nAll NVIDIA-generated structured PDFs are ready in output/pdf.")


if __name__ == "__main__":
    main()
