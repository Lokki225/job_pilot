# CV Extractor Setup Guide

The CV extractor service has been integrated into the profile settings upload flow. This guide will help you set it up.

## What Changed

**Before:** Resume upload → Affinda API → AI normalization → Profile update

**Now:** Resume upload → **Local CV Extractor (PDF + OCR merge)** → AI normalization → Profile update

## Benefits

- ✅ **No API costs** - Runs locally
- ✅ **Maximum text coverage** - Merges PDF text + OCR
- ✅ **Better quality** - Handles scanned CVs, multi-column layouts
- ✅ **Privacy** - Data never leaves your infrastructure

## Setup Instructions

### 1. Install Tesseract OCR

**Windows:**
1. Download from: https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe
2. Run the installer (default path: `C:\Program Files\Tesseract-OCR`)
3. Restart your terminal

**Verify installation:**
```bash
tesseract --version
```

### 2. Poppler is Already Configured

✅ You already have Poppler downloaded at:
`C:\Users\FranklinOuattara\Downloads\Release-25.12.0-0\poppler-25.12.0\Library\bin`

The code is already configured to use this path.

### 3. Python Dependencies are Installed

✅ All Python packages are already installed:
- FastAPI, uvicorn
- PyMuPDF (PDF text extraction)
- pytesseract (OCR)
- pdf2image (PDF to image conversion)
- Pillow (image processing)

### 4. Start the CV Extractor API

```bash
cd cv-extractor
python -m app.main
```

The service will run on `http://localhost:8001`

### 5. Add Environment Variable (Optional)

If you want to use a different URL, add to your `.env`:

```env
CV_EXTRACTOR_URL=http://localhost:8001
```

Default is `http://localhost:8001` if not specified.

## Testing

### Test the API directly:

```bash
curl http://localhost:8001/health
```

Should return:
```json
{
  "status": "healthy",
  "extractors": {
    "pdf": "available",
    "ocr": "available",
    "merger": "available"
  }
}
```

### Test CV upload in the app:

1. Start the CV extractor: `cd cv-extractor && python -m app.main`
2. Start Next.js: `npm run dev`
3. Go to Settings → Profile tab
4. Upload a resume (PDF, DOC, DOCX)
5. Watch the console logs to see the extraction process

## How It Works

### Extraction Flow

```
1. User uploads CV in Settings
   ↓
2. File saved to Supabase Storage
   ↓
3. Resume record created in DB
   ↓
4. /api/parse-resume endpoint called
   ↓
5. CV Extractor Service (Python)
   - Extracts PDF text (PyMuPDF)
   - Runs OCR on pages (Tesseract)
   - Intelligently merges both sources
   - Returns complete text + metadata
   ↓
6. AI Service (Groq)
   - Parses extracted text
   - Structures into profile data
   ↓
7. Profile updated with parsed data
```

### Merge Strategy

The extractor uses an intelligent merge:

1. **PDF text extraction** (fast, reliable for digital PDFs)
2. **OCR extraction** (catches scanned content, headers, images)
3. **Smart merge:**
   - Uses PDF text as base
   - Adds unique OCR content
   - Deduplicates similar lines
   - Tracks source per page
   - Provides confidence scores

## Fallback Behavior

If the CV extractor service is not running:
- The system will detect it's unavailable
- Falls back to basic parsing
- Logs a warning but doesn't fail
- You'll see: "CV extractor service not available, falling back to direct AI parsing"

## Troubleshooting

### "Tesseract not found"
- Ensure Tesseract is installed
- Check it's in your PATH: `tesseract --version`
- Restart your terminal after installation

### "CV extractor service not available"
- Make sure the Python service is running: `cd cv-extractor && python -m app.main`
- Check it's accessible: `curl http://localhost:8001/health`

### "Low OCR confidence" warnings
- This is normal for poor quality scans
- The system still extracts what it can
- Consider rescanning at higher DPI if possible

### Port 8001 already in use
- Change the port in `cv-extractor/app/main.py` (line 295)
- Update `CV_EXTRACTOR_URL` in your `.env`

## Files Modified

| File | Change |
|------|--------|
| `app/api/parse-resume/route.ts` | Replaced Affinda with CV extractor service |
| `lib/services/cv-extractor/index.ts` | New TypeScript client for Python API |
| `cv-extractor/` | New Python FastAPI service |

## Next Steps

1. ✅ Install Tesseract OCR
2. ✅ Start the CV extractor service
3. ✅ Test with a sample resume
4. ✅ Monitor logs for any issues

The integration is complete and ready to use!
