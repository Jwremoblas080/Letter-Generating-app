# Letter Generator App - Project Summary

## Overview
AI-powered business letter generator with .docx template support, deployed on AWS Lambda with Vercel frontend.

**Live URL**: https://letter-generating-app.vercel.app  
**API Endpoint**: https://cbgis9lan3.execute-api.us-east-1.amazonaws.com/dev

---

## Tech Stack

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- Hosted on Vercel
- Dark mode support with localStorage persistence

### Backend
- Node.js on AWS Lambda (Serverless Framework)
- AI Integration: Google Gemini & Groq (with fallback)
- Template Processing: docxtemplater, pizzip
- PDF Generation: pdfkit, html-pdf-node
- Document Parsing: mammoth

---

## Key Features

### 1. Built-in Letter Templates (2 types)
- Event Hosting Request
- Support Request Letter

### 2. Custom Document Upload
- Upload your own .docx files
- AI detects required fields automatically
- Preserves original formatting, fonts, and layout

### 3. AI Enhancement
- Edit letters with natural language instructions
- Dual AI provider support (Gemini + Groq)
- Automatic fallback if one provider fails

### 4. Export Options
- Download as PDF
- Download as DOCX (preserves formatting)

### 5. Dark Mode
- System preference detection
- Manual toggle with persistence

---

## Architecture

```
Frontend (Vercel)
    ↓
AWS API Gateway
    ↓
AWS Lambda Functions
    ↓
AI APIs (Gemini/Groq)
```

### API Routes
- `GET /letter-types` - List available templates
- `POST /generate` - Generate letter from template
- `POST /analyze-docx` - Detect fields in uploaded document
- `POST /fill-docx` - Fill uploaded document with user data
- `POST /edit-letter` - AI-powered letter editing
- `POST /download-pdf` - Generate PDF
- `POST /download-docx` - Generate DOCX

---

## Template System

### Placeholder Format
Templates use `{placeholder_name}` syntax (single curly braces)

### Example
```
Dear {recipient_name},

I am writing to request {support_type} for {project_name}.

Sincerely,
{your_name}
```

### Storage
- .docx files in `backend/templates/docx/`
- Base64-encoded in `docx-base64.json` for Lambda deployment
- Lazy loading via getter functions

---

## Recent Improvements

### Template Migration (Latest)
- Migrated from hardcoded strings to .docx templates
- Implemented docxtemplater for format preservation
- AI now only detects fields, never rewrites content
- Users can download both PDF and DOCX formats

### UI Enhancements
- Added dark mode toggle
- Removed history section (per user request)
- Improved form layout and responsiveness

### Bug Fixes
- Fixed CORS issues for Vercel origin
- Fixed storage.list() 500 errors
- Removed hardcoded API keys from serverless.yml
- Fixed template filename typos
- Regenerated base64 embeddings for Lambda

---

## Environment Variables

```env
LLM_PROVIDER=groq
GEMINI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
PORT=3000
STORAGE_PATH=./storage
```

---

## Deployment

### Frontend (Vercel)
```bash
# Automatic deployment on git push to main
```

### Backend (AWS Lambda)
```bash
$env:GEMINI_API_KEY="your_key"
$env:GROQ_API_KEY="your_key"
npx serverless deploy
```

---

## File Structure

```
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── backend/
│   ├── handler.js          # Lambda entry point
│   ├── server.js           # Local dev server
│   ├── docxProcessor.js    # .docx template processing
│   ├── pdfGenerator.js     # PDF generation
│   ├── storage.js          # File storage (S3/local)
│   ├── registry.js         # Template registry
│   └── templates/
│       ├── index.js        # Template definitions
│       ├── docx/           # .docx template files
│       └── docx-base64.json # Embedded templates for Lambda
├── serverless.yml          # AWS Lambda configuration
└── package.json
```

---

## Security Features

- Input sanitization (XSS protection)
- Field length validation (2000 chars max)
- HTML tag stripping
- JavaScript injection prevention
- Environment variable protection

---

## AI Rate Limits

### Google Gemini (Free Tier)
- 15 requests/minute
- 1,500 requests/day

### Groq (Free Tier - Recommended)
- 30 requests/minute
- 14,400 requests/day

---

## Future Enhancements

### Planned Features
1. Add more built-in templates (as needed by users)
2. User authentication & history
3. Template marketplace
4. Multi-language support
5. Email integration
6. Batch letter generation

---

## Known Issues

### Resolved
- ✅ Template file not found errors
- ✅ 500 errors on /generate endpoint
- ✅ CORS issues with Vercel
- ✅ Missing docxBase64 errors
- ✅ Filename typos in templates

### Active
- None currently

---

## Testing

```bash
# Run tests
cd backend
npm test

# Start local server
npm start
```

---

## Documentation

- `README.md` - Setup and usage guide
- `PROJECT_DOCUMENTATION.md` - Detailed technical docs
- `GROQ_SETUP_GUIDE.md` - Groq API configuration
- `RATE_LIMIT_SOLUTION.md` - Rate limit handling
- `NETWORK_ISSUES_SOLUTION.md` - Network troubleshooting

---

## Repository

**GitHub**: https://github.com/Jwremoblas080/Letter-Generating-app

---

## License

MIT License

---

**Last Updated**: April 15, 2026  
**Status**: ✅ Production Ready
