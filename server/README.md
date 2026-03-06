# TrueClaim.AI Backend Server

Flask backend server for the TrueClaim.AI application.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
pip install -r kritish_backend_client/requirements.txt
```

2. Set up environment variables:
Create a `.env` file in `kritish_backend_client/` with:
```
NVIDIA_API_KEY=your_api_key_here
# OR
OPENAI_API_KEY=your_api_key_here
USE_NVIDIA=True
```

3. Start the server:
```bash
python3 app.py
```

The server will run on `https://trueclaimbackend.ngrok.app`

## API Endpoints

- `POST /api/demographics` - Save user demographics data
- `POST /api/upload-policy` - Upload insurance policy PDF
- `POST /api/upload-bill` - Upload medical bill (optional)
- `POST /api/upload-denial` - Upload denial document (if applicable)
- `POST /api/low-income-waiver` - Process income waiver request and run Python pipeline
- `GET /api/documents/claim-form` - Get generated claim form PDF
- `GET /api/documents/waiver-letter` - Get generated waiver letter PDF
- `GET /api/documents/tax-form` - Get generated tax form PDF
- `GET /api/health` - Health check endpoint

## Notes

- Uploaded files are stored in the `uploads/` directory
- Generated PDFs are created by the Python pipeline in `kritish_backend_client/output/`
- The server uses in-memory storage (for demo purposes)
- The Python pipeline runs automatically when income waiver is processed

## Requirements

- Python 3.8+
- Tesseract OCR installed (for PDF text extraction)
- Poppler installed (for PDF to image conversion)
