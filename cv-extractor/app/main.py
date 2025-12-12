"""
FastAPI CV Extractor Service
Main application entry point
"""
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
from typing import Literal, Optional

from app.models import ExtractionResponse, ExtractionStats, PageInfo, TextBlock
from app.extractors.pdf_extractor import PDFTextExtractor
from app.extractors.ocr_extractor import OCRExtractor
from app.extractors.merger import TextMerger

app = FastAPI(
    title="CV Extractor API",
    description="Extract text from CVs/resumes using PDF text extraction + OCR with intelligent merging",
    version="1.0.0"
)

# CORS middleware for Next.js integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize extractors
pdf_extractor = PDFTextExtractor()
text_merger = TextMerger()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "CV Extractor API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "extractors": {
            "pdf": "available",
            "ocr": "available",
            "merger": "available"
        }
    }


@app.post("/v1/cv/extract-text", response_model=ExtractionResponse)
async def extract_cv_text(
    file: UploadFile = File(...),
    mode: Literal["auto", "pdf_only", "ocr_only"] = Form("auto"),
    return_blocks: bool = Form(False),
    language: str = Form("eng"),
    preprocess: bool = Form(True)
):
    """
    Extract text from CV/resume file
    
    Args:
        file: PDF, JPG, or PNG file
        mode: Extraction mode (auto, pdf_only, ocr_only)
        return_blocks: Include text blocks with coordinates
        language: OCR language (default: eng)
        preprocess: Apply image preprocessing for OCR
    
    Returns:
        ExtractionResponse with full text, pages, blocks, and stats
    """
    # Validate file type
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, JPG, PNG"
        )
    
    # Save uploaded file temporarily
    try:
        file_ext = os.path.splitext(file.filename)[1] if file.filename else '.pdf'
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        print(f"[extract_cv_text] Saved temp file: {tmp_file_path} ({len(content)} bytes)")
    except Exception as e:
        print(f"[extract_cv_text] Error saving temp file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")
    
    try:
        document_type = "pdf" if file.content_type == "application/pdf" else "image"
        warnings = []
        
        # === PDF Processing ===
        if document_type == "pdf":
            if mode == "ocr_only":
                # Force OCR only
                ocr_extractor = OCRExtractor(language=language)
                ocr_result = ocr_extractor.extract_from_pdf(tmp_file_path, preprocess=preprocess)
                
                pages = [
                    PageInfo(
                        page_number=p['page_number'],
                        text=p['text'],
                        source="ocr",
                        confidence=p.get('confidence'),
                        char_count=p['char_count']
                    )
                    for p in ocr_result['pages']
                ]
                
                full_text = ocr_result['full_text']
                stats = ExtractionStats(
                    total_chars=ocr_result['stats']['total_chars'],
                    emails_found=0,
                    phones_found=0,
                    urls_found=0,
                    num_pages=ocr_result['stats']['num_pages']
                )
                blocks = None
                mode_used = "ocr_only"
                
                if ocr_result.get('avg_confidence', 0) < 0.7:
                    warnings.append(f"Average OCR confidence is low ({ocr_result['avg_confidence']:.2f})")
            
            elif mode == "pdf_only":
                # PDF text extraction only
                pdf_result = pdf_extractor.extract_from_pdf(tmp_file_path, return_blocks=return_blocks)
                
                if not pdf_result['has_text']:
                    raise HTTPException(
                        status_code=400,
                        detail="PDF appears to be scanned with no extractable text. Use mode='auto' or 'ocr_only'"
                    )
                
                pages = [
                    PageInfo(
                        page_number=p['page_number'],
                        text=p['text'],
                        source="pdf_text",
                        confidence=None,
                        char_count=p['char_count']
                    )
                    for p in pdf_result['pages']
                ]
                
                full_text = pdf_result['full_text']
                stats = ExtractionStats(**pdf_result['stats'])
                blocks = [TextBlock(**b) for b in pdf_result['blocks']] if pdf_result['blocks'] else None
                mode_used = "pdf_only"
            
            else:  # mode == "auto"
                # Try PDF first, fallback to OCR if needed, merge if both available
                pdf_result = pdf_extractor.extract_from_pdf(tmp_file_path, return_blocks=return_blocks)
                
                if pdf_result['has_text']:
                    # PDF has text, but also run OCR to catch any missed content
                    ocr_extractor = OCRExtractor(language=language)
                    ocr_result = ocr_extractor.extract_from_pdf(tmp_file_path, preprocess=preprocess)
                    
                    # Merge both results
                    merged_result = text_merger.merge_full_extraction(pdf_result, ocr_result)
                    
                    pages = [
                        PageInfo(
                            page_number=p['page_number'],
                            text=p['text'],
                            source=p['source'],
                            confidence=p.get('confidence'),
                            char_count=p['char_count']
                        )
                        for p in merged_result['pages']
                    ]
                    
                    full_text = merged_result['full_text']
                    stats = ExtractionStats(**merged_result['stats'])
                    blocks = [TextBlock(**b) for b in merged_result['blocks']] if merged_result.get('blocks') else None
                    warnings.extend(merged_result.get('warnings', []))
                    mode_used = "auto"
                else:
                    # No PDF text, use OCR only
                    warnings.append("PDF has no extractable text; using OCR")
                    ocr_extractor = OCRExtractor(language=language)
                    ocr_result = ocr_extractor.extract_from_pdf(tmp_file_path, preprocess=preprocess)
                    
                    pages = [
                        PageInfo(
                            page_number=p['page_number'],
                            text=p['text'],
                            source="ocr",
                            confidence=p.get('confidence'),
                            char_count=p['char_count']
                        )
                        for p in ocr_result['pages']
                    ]
                    
                    full_text = ocr_result['full_text']
                    
                    # Recalculate stats with pattern matching
                    import re
                    emails = set(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', full_text))
                    phones = set(re.findall(r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}', full_text))
                    urls = set(re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', full_text))
                    
                    stats = ExtractionStats(
                        total_chars=len(full_text),
                        emails_found=len(emails),
                        phones_found=len(phones),
                        urls_found=len(urls),
                        num_pages=ocr_result['stats']['num_pages']
                    )
                    blocks = None
                    mode_used = "auto"
                    
                    if ocr_result.get('avg_confidence', 0) < 0.7:
                        warnings.append(f"Average OCR confidence is low ({ocr_result['avg_confidence']:.2f})")
        
        # === Image Processing ===
        else:
            ocr_extractor = OCRExtractor(language=language)
            ocr_result = ocr_extractor.extract_from_image_file(tmp_file_path, preprocess=preprocess)
            
            pages = [
                PageInfo(
                    page_number=p['page_number'],
                    text=p['text'],
                    source="ocr",
                    confidence=p.get('confidence'),
                    char_count=p['char_count']
                )
                for p in ocr_result['pages']
            ]
            
            full_text = ocr_result['full_text']
            
            # Recalculate stats
            import re
            emails = set(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', full_text))
            phones = set(re.findall(r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}', full_text))
            urls = set(re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', full_text))
            
            stats = ExtractionStats(
                total_chars=len(full_text),
                emails_found=len(emails),
                phones_found=len(phones),
                urls_found=len(urls),
                num_pages=1
            )
            blocks = None
            mode_used = mode
            
            if ocr_result.get('avg_confidence', 0) < 0.7:
                warnings.append(f"OCR confidence is low ({ocr_result['avg_confidence']:.2f})")
        
        # Build response
        response = ExtractionResponse(
            document_type=document_type,
            mode_used=mode_used,
            num_pages=stats.num_pages,
            full_text=full_text,
            pages=pages,
            blocks=blocks,
            stats=stats,
            warnings=warnings
        )
        
        return response
    
    except Exception as e:
        import traceback
        error_details = {
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc()
        }
        print(f"[ERROR] Extraction failed: {error_details}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}\nType: {type(e).__name__}")
    
    finally:
        # Clean up temp file
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
