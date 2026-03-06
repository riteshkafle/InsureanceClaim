# Claims Helper - Quick Start Guide

## Setup Instructions

### Backend Server

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:3000`

### Frontend Client

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The client will run on `http://localhost:8080` (or the port specified in vite.config.ts)

## Demo Flow

1. **Login**: Use hardcoded credentials
   - Email: `demo@claimshelper.com`
   - Password: `demo123`

2. **Step 1 - Demographics**: Fill out all personal and incident information
   - Data is POSTed to `http://localhost:3000/api/demographics`

3. **Step 2 - Upload Policy**: Upload your insurance policy PDF
   - File is POSTed to `http://localhost:3000/api/upload-policy`

4. **Step 3 - Denial Check**: Answer if you've been denied before
   - If yes, upload denial document
   - Data is POSTed to `http://localhost:3000/api/upload-denial`

5. **Step 4 - Income Waiver**: Choose if you need a low-income waiver
   - If yes, upload income verification document
   - Data is POSTed to `http://localhost:3000/api/low-income-waiver`
   - This generates all PDF documents

6. **Step 5 - Results**: View and download generated documents
   - Complete Claim Report
   - Low-Income Waiver Letter (if applicable)
   - Tax Deduction Form

## API Endpoints

- `POST /api/demographics` - Save demographics
- `POST /api/upload-policy` - Upload policy PDF
- `POST /api/upload-denial` - Upload denial document
- `POST /api/low-income-waiver` - Process waiver and generate PDFs
- `GET /api/documents/claim-form` - Get claim form PDF
- `GET /api/documents/waiver-letter` - Get waiver letter PDF
- `GET /api/documents/tax-form` - Get tax form PDF

## Notes

- Make sure both servers are running before testing
- The backend creates an `uploads/` directory for uploaded files
- Generated PDFs are created when Step 4 is completed
- All data is stored in memory (for demo purposes)

