"""Project orchestrator for the BE_SMART pipeline.

What it does:
- Runs three steps in order:
  1) ocr_llm_reasoning_logic.main: OCRs the user’s policy document and bill photo (if provided),
     extracts structured policy/billing data, and writes JSON/Markdown artifacts to ./output.
  2) claim_file.main: consumes JSON artifacts and prepares/fills claim-related PDFs.
  3) pdf_creator.main: renders letters/reports into compact PDFs from the generated JSON/Markdown.

What the UI must supply (before running this script):
- Uploaded files saved to expected locations used by ocr_llm_reasoning_logic:
  - policy_pdf_path (policy/benefits PDF)
  - bill_image_path (photo/PDF of medical bill; optional)
- User fields persisted where ocr_llm_reasoning_logic reads them (or passed into that module):
  first_name, last_name, email, phone_number, address, city, state, zip_code,
  income, date_of_birth, gender, incident_date, description_of_what_happened,
  hospital_name, hospital_address, member_id_number, group_number,
  provider_tax_id, npi, provider_phone_number.

Requirements:
- .env with NVIDIA_API_KEY (default) or OPENAI_API_KEY.
- Tesseract installed at /opt/homebrew/bin/tesseract (macOS ARM default) and poppler for pdf2image.
- Any template/input PDFs expected by claim_file/pdf_creator present in the workspace.

Behavior:
- Sets working directory to the project root (this file’s folder).
- Executes each step sequentially and stops on first failure, printing stack traces.
"""

import os
import sys
import traceback
from pathlib import Path
from status_manager import init_status, update_status, clear_status


def _run_step(name: str, fn, status_step: str = None):
    print(f"\n=== {name} ===")
    if status_step:
        update_status(status_step, f"Running {name}...")
    fn()
    print(f"=== {name} completed ===\n")


def main():
    # Ensure relative paths (used by the other modules) resolve from project root
    os.chdir(Path(__file__).resolve().parent)
    
    # Initialize status tracking
    clear_status()
    init_status()

    try:
        from ocr_llm_reasoning_logic import main as ocr_main
        from claim_file import main as claim_main
        from pdf_creator import main as pdf_main
    except Exception as e:
        print(f"Import error: {e}")
        update_status("error", f"Import error: {e}", str(e))
        traceback.print_exc()
        sys.exit(1)

    steps = [
        ("OCR + LLM pipeline", ocr_main, "ocr_extraction"),
        ("Claim PDF filler", claim_main, "claim_generation"),
        ("Letter PDF creator", pdf_main, "report_creation"),
    ]

    for name, fn, status_step in steps:
        try:
            _run_step(name, fn, status_step)
        except SystemExit as se:
            code = se.code if isinstance(se.code, int) else 1
            error_msg = f"{name} exited with code {code}"
            print(error_msg)
            update_status("error", error_msg, error_msg)
            sys.exit(code)
        except Exception as e:
            error_msg = f"Error during {name}: {e}"
            print(error_msg)
            update_status("error", error_msg, str(e))
            traceback.print_exc()
            sys.exit(1)

    # Finalizing step
    update_status("finalizing", "Finalizing all documents...")
    print("Finalizing documents...")
    
    # Mark as completed
    update_status("completed", "All documents generated successfully!")
    print("All steps completed successfully.")


if __name__ == "__main__":
    main()
