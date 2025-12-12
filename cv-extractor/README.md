# CV Extractor API

Local Python service for extracting text from CV/resume files using PDF text extraction + OCR with intelligent merging.

## Features

- **PDF Text Extraction**: Direct text extraction from digital PDFs using PyMuPDF
- **OCR Fallback**: Tesseract OCR for scanned PDFs and images
- **Intelligent Merging**: Combines PDF text + OCR for maximum coverage
- **Multi-column Detection**: Handles complex CV layouts
- **Metadata Extraction**: Automatically detects emails, phones, URLs
- **Confidence Scoring**: OCR confidence metrics for quality assessment

## Installation

### 1. Install Tesseract OCR

**Windows:**
Download and install from: https://github.com/UB-Mannheim/tesseract/wiki
Default path: `C:\Program Files\Tesseract-OCR\tesseract.exe`

**macOS:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

### 2. Install Python Dependencies

```bash
cd cv-extractor
pip install -r requirements.txt
```

### 3. Install Poppler (for pdf2image)

**Windows:**
Download from: https://github.com/oschwartz10612/poppler-windows/releases
Add to PATH or place in project directory

**macOS:**
```bash
brew install poppler
```

**Linux:**
```bash
sudo apt-get install poppler-utils
```

## Usage

### Start the API Server

```bash
cd cv-extractor
python -m app.main
```

Server runs on: `http://localhost:8001`

### API Endpoints

#### `POST /v1/cv/extract-text`

Extract text from CV file.

**Parameters:**
- `file`: PDF, JPG, or PNG file (multipart/form-data)
- `mode`: `auto` | `pdf_only` | `ocr_only` (default: `auto`)
- `return_blocks`: `true` | `false` (default: `false`)
- `language`: OCR language code (default: `eng`)
- `preprocess`: Apply image preprocessing (default: `true`)

**Example with curl:**
```bash
curl -X POST http://localhost:8001/v1/cv/extract-text \
  -F "file=@resume.pdf" \
  -F "mode=auto" \
  -F "return_blocks=false"
```

**Response:**
```json
{
  "document_type": "pdf",
  "mode_used": "auto",
  "num_pages": 2,
  "full_text": "Complete extracted text...",
  "pages": [
    {
      "page_number": 1,
      "text": "Page 1 text...",
      "source": "merged",
      "confidence": 0.92,
      "char_count": 1245
    }
  ],
  "blocks": null,
  "stats": {
    "total_chars": 2450,
    "emails_found": 1,
    "phones_found": 1,
    "urls_found": 2,
    "num_pages": 2
  },
  "warnings": []
}
```

## Extraction Modes

### `auto` (Recommended)
- Tries PDF text extraction first
- Falls back to OCR if no text found
- Merges both sources if both available
- Best for maximum coverage

### `pdf_only`
- Only extracts embedded PDF text
- Fast but fails on scanned PDFs
- Use when you know PDFs are digital

### `ocr_only`
- Forces OCR on all pages
- Slower but works on scanned documents
- Use for image-based CVs

## Integration with Next.js

See the Next.js integration guide in the main project for server action examples.

## Architecture

```
cv-extractor/
├── app/
│   ├── main.py              # FastAPI application
│   ├── models.py            # Pydantic models
│   └── extractors/
│       ├── pdf_extractor.py # PDF text extraction
│       ├── ocr_extractor.py # Tesseract OCR
│       └── merger.py        # Intelligent text merging
├── requirements.txt
└── README.md
```

## Merge Strategy

The intelligent merger:
1. Uses PDF text as base (more reliable for digital text)
2. Adds unique OCR content (catches headers/footers/images)
3. Deduplicates similar lines
4. Provides source tracking per page
5. Includes confidence scores

## Troubleshooting

**"Tesseract not found"**
- Ensure Tesseract is installed and in PATH
- Or set path in `ocr_extractor.py`

**"Poppler not found"**
- Install poppler-utils for pdf2image
- Or place poppler binaries in project directory

**Low OCR confidence**
- Try with `preprocess=true`
- Check if image quality is sufficient
- Consider rescanning at higher DPI

## Performance

- PDF text extraction: ~100ms per page
- OCR: ~2-5 seconds per page (depends on resolution)
- Merge: ~50ms per page

## License

Part of JobPilot AI project.
