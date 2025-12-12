"""
Data models for CV extraction API
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class TextBlock(BaseModel):
    """Represents a text block with position information"""
    page_number: int
    text: str
    bbox: Optional[List[float]] = None  # [x0, y0, x1, y1]
    block_type: Optional[str] = None  # e.g., "text", "header", "footer"


class PageInfo(BaseModel):
    """Information about a single page"""
    page_number: int
    text: str
    source: Literal["pdf_text", "ocr", "merged"]
    confidence: Optional[float] = None
    char_count: int


class ExtractionStats(BaseModel):
    """Statistics about the extraction"""
    total_chars: int
    emails_found: int
    phones_found: int
    urls_found: int
    num_pages: int


class ExtractionResponse(BaseModel):
    """Complete response from CV extraction"""
    document_type: str
    mode_used: Literal["auto", "pdf_only", "ocr_only"]
    num_pages: int
    full_text: str = Field(..., description="Complete merged text from all pages")
    pages: List[PageInfo]
    blocks: Optional[List[TextBlock]] = None
    stats: ExtractionStats
    warnings: List[str] = Field(default_factory=list)


class ExtractionRequest(BaseModel):
    """Request parameters for extraction"""
    mode: Literal["auto", "pdf_only", "ocr_only"] = "auto"
    return_blocks: bool = False
    language: str = "eng"
    preprocess: bool = True
