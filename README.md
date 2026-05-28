# InvoiceAI — Local Invoice Scanner

> Scan Amazon, Flipkart, and any e-commerce invoices locally using OCR + Ollama LLM. No cloud. No data leaves your machine.

## Features
- 📄 **PDF & Image support** — PDFs (native text + scanned/OCR), JPG, PNG, TIFF, WebP
- 🤖 **Ollama-powered extraction** — Uses local LLMs for structured data extraction
- 🔍 **Smart OCR** — Tesseract with OpenCV preprocessing (deskew, denoise, binarize)
- 🗄️ **SQLite database** — Stores all extracted data with full deduplication
- 📦 **Batch processing** — Upload hundreds of invoices at once
- 🌐 **Web dashboard** — React + Tailwind UI with charts, search, inline editing
- 📊 **Export** — CSV and Excel export with one click
- 🔒 **100% local** — Nothing sent to AWS/Azure/Google Cloud

---

## Setup Guide (For New GPU Devices)

Since your new device has a GPU, the AI processing will be blazingly fast. Follow these exact steps to set up the environment.

### 1. System Requirements
- **Python 3.11+** (Download from [python.org](https://python.org))
- **Node.js 18+** (Download from [nodejs.org](https://nodejs.org))
- **Git** (Download from [git-scm.com](https://git-scm.com))

### 2. Install Tesseract OCR (Crucial for Image/Scanned PDFs)
1. Download the Windows installer from: [UB-Mannheim Tesseract Wiki](https://github.com/UB-Mannheim/tesseract/wiki)
2. **IMPORTANT**: Install it exactly to the default path: `C:\Program Files\Tesseract-OCR\`

### 3. Install Ollama (AI Engine)
1. Download and install Ollama from [ollama.com](https://ollama.com/).
2. Open your terminal/command prompt and pull the models required by this project:
   ```bash
   ollama pull gemma4:latest
   ollama pull moondream
   ```
   *(Note: Since you have a GPU, `gemma4:latest` is highly recommended. For vision, `moondream` is lightning fast).*

### 4. Setup Backend (Python)
Open a terminal in the root folder of this project:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```
*(Make sure `OLLAMA_HOST` in your `.env` file is set to `http://localhost:11434` for local GPU processing).*

### 5. Setup Frontend (React)
Open a new terminal in the root folder of this project:
```bash
cd frontend
npm install
```

---

## Running the Application

### Option A: One-Click Launcher (Windows)
Double-click the **`start.bat`** file in the root directory. It will automatically check for models, start the Ollama server, launch the backend, and fire up the React frontend.

### Option B: Manual Start (If you want to see all logs)

**Terminal 1 — Backend API:**
```bash
cd backend
venv\Scripts\activate
python run.py
```

**Terminal 2 — Frontend UI:**
```bash
cd frontend
npm run dev
```

Then simply open **http://localhost:5173** in your browser!

---

## Troubleshooting

- **"Input redirection is not supported" on start.bat:** Ensure you double-click the file from the Windows File Explorer rather than running it inside a headless IDE terminal.
- **Tesseract Not Found:** Ensure you installed Tesseract to `C:\Program Files\Tesseract-OCR\tesseract.exe`. If you installed it elsewhere, update the `TESSERACT_CMD` path in your `backend/.env` file.
- **Extremely Slow Processing:** Ensure Ollama is utilizing your GPU. You can verify this by checking your Task Manager (Performance tab) while processing an invoice.
