"""
PDF text extraction using PyMuPDF
Extracts text directly from PDF with layout preservation
"""
import fitz  # PyMuPDF
from typing import List, Tuple, Dict
import re


class PDFTextExtractor:
    """Extract text from PDF files with layout awareness"""
    
    def __init__(self):
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.phone_pattern = re.compile(r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}')
        self.url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
    
    def extract_from_pdf(self, pdf_path: str, return_blocks: bool = False) -> Dict:
        """
        Extract text from PDF with optional block-level detail
        
        Returns:
            {
                'pages': [{'page_number': int, 'text': str, 'char_count': int}],
                'blocks': [{'page_number': int, 'text': str, 'bbox': [x0,y0,x1,y1]}],
                'full_text': str,
                'has_text': bool,
                'stats': {...}
            }
        """
        doc = fitz.open(pdf_path)
        num_pages = len(doc)  # Save page count before closing
        pages_data = []
        blocks_data = []
        full_text_parts = []
        
        total_chars = 0
        emails = set()
        phones = set()
        urls = set()
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Extract text with layout preservation
            if return_blocks:
                # Get text blocks with coordinates
                blocks = page.get_text("blocks")
                page_text_parts = []
                
                # Sort blocks by vertical position (top to bottom), then horizontal (left to right)
                sorted_blocks = sorted(blocks, key=lambda b: (b[1], b[0]))
                
                for block in sorted_blocks:
                    x0, y0, x1, y1, text, block_no, block_type = block
                    if text.strip():
                        page_text_parts.append(text.strip())
                        blocks_data.append({
                            'page_number': page_num + 1,
                            'text': text.strip(),
                            'bbox': [x0, y0, x1, y1],
                            'block_type': 'text'
                        })
                
                page_text = '\n'.join(page_text_parts)
            else:
                # Simple text extraction
                page_text = page.get_text()
            
            # Clean up text
            page_text = page_text.strip()
            char_count = len(page_text)
            total_chars += char_count
            
            # Extract metadata
            emails.update(self.email_pattern.findall(page_text))
            phones.update(self.phone_pattern.findall(page_text))
            urls.update(self.url_pattern.findall(page_text))
            
            pages_data.append({
                'page_number': page_num + 1,
                'text': page_text,
                'char_count': char_count,
                'source': 'pdf_text'
            })
            
            full_text_parts.append(page_text)
        
        doc.close()
        
        full_text = '\n\n'.join(full_text_parts)
        has_text = total_chars > 50  # Threshold to determine if PDF has extractable text
        
        return {
            'pages': pages_data,
            'blocks': blocks_data if return_blocks else None,
            'full_text': full_text,
            'has_text': has_text,
            'stats': {
                'total_chars': total_chars,
                'emails_found': len(emails),
                'phones_found': len(phones),
                'urls_found': len(urls),
                'num_pages': num_pages
            }
        }
    
    def detect_multi_column(self, blocks: List[Dict]) -> bool:
        """
        Detect if the document uses multi-column layout
        Simple heuristic: check if blocks on same vertical level have significant horizontal gaps
        """
        if not blocks or len(blocks) < 4:
            return False
        
        # Group blocks by approximate vertical position
        y_groups = {}
        for block in blocks:
            y_mid = (block['bbox'][1] + block['bbox'][3]) / 2
            y_key = int(y_mid / 20) * 20  # Group by 20px bands
            if y_key not in y_groups:
                y_groups[y_key] = []
            y_groups[y_key].append(block)
        
        # Check if any row has multiple columns
        for blocks_in_row in y_groups.values():
            if len(blocks_in_row) >= 2:
                # Sort by x position
                sorted_row = sorted(blocks_in_row, key=lambda b: b['bbox'][0])
                # Check gap between first two blocks
                gap = sorted_row[1]['bbox'][0] - sorted_row[0]['bbox'][2]
                if gap > 50:  # Significant horizontal gap
                    return True
        
        return False
