# Letter Generator App

A professional letter generation web app powered by AI (Google Gemini / Groq).

## Features

- Select from predefined letter templates (Event Hosting Request, Support Request)
- Upload custom `.docx` files — AI detects and fills required fields
- AI-powered letter enhancement (Gemini 2.5 Flash or Groq Llama 3.3 70B)
- Smart form inputs (date picker, time picker, number, email, etc.)
- Preview, copy, and download letters as PDF
- AWS Lambda backend with Serverless Framework

## Project Structure

```
├── frontend/          # Static HTML/CSS/JS frontend
│   ├── index.html
│   ├── app.js
│   └── style.css
├── backend/           # AWS Lambda backend
│   ├── handler.js     # Lambda entry point (all routes)
│   ├── llmClient.js   # Gemini + Groq AI integration
│   ├── pdfGenerator.js
│   ├── storage.js
│   ├── templateEngine.js
│   ├── registry.js
│   ├── templates/
│   │   └── index.js   # Add new letter templates here
│   └── server.js      # Local dev server
├── serverless.yml     # AWS Lambda deployment config
└── README.md
```

## Local Development

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and add your API keys
```

### 3. Start local server
```bash
cd backend
npm start
# Open http://localhost:3000
```

## AWS Lambda Deployment

### Prerequisites
- [Node.js 20+](https://nodejs.org)
- [AWS CLI](https://aws.amazon.com/cli/) configured with credentials
- [Serverless Framework](https://www.serverless.com/)

```bash
npm install -g serverless
```

### Deploy
```bash
# Set environment variables
export GEMINI_API_KEY=your_key
export GROQ_API_KEY=your_key
export LLM_PROVIDER=groq

# Deploy to AWS
serverless deploy
```

### Local Lambda simulation
```bash
serverless offline
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/letter-types` | List all letter templates |
| POST | `/generate` | Generate a letter from template |
| POST | `/download-pdf` | Download letter as PDF |
| POST | `/analyze-docx` | Upload & analyze a .docx file |
| POST | `/enhance-docx` | Enhance docx with user fields |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | AI provider: `gemini`, `groq`, or `none` | `gemini` |
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `GROQ_API_KEY` | Groq API key | - |
| `PORT` | Local server port | `3000` |
| `STORAGE_PATH` | Local storage path | `./storage` |

## Adding New Letter Templates

Edit `backend/templates/index.js` and add a new entry:

```js
{
  id: 'my-new-letter',
  displayName: 'My New Letter',
  template: `Dear {{recipient_name}},\n\n{{body}}\n\nSincerely,\n{{sender_name}}`,
  fields: [
    { key: 'recipient_name', label: 'Recipient Name', required: true },
    { key: 'body', label: 'Letter Body', required: true },
    { key: 'sender_name', label: 'Your Name', required: true },
  ],
}
```

No other changes needed — the new template appears automatically.

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, AWS Lambda, Serverless Framework
- **AI**: Google Gemini 2.5 Flash / Groq Llama 3.3 70B
- **PDF**: pdfkit (Lambda) / html-pdf-node (local)
- **DOCX**: mammoth
