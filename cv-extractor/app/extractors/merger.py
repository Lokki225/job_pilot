"""
Intelligent merger for PDF text and OCR results
Combines both sources to maximize text coverage
"""
from typing import Dict, List
import re


class TextMerger:
    """Merge PDF text extraction and OCR results intelligently"""
    
    def __init__(self):
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.phone_pattern = re.compile(r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}')
        self.url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
    
    def merge_page_texts(self, pdf_text: str, ocr_text: str, ocr_confidence: float = 0.0) -> Dict:
        """
        Merge text from PDF extraction and OCR for a single page
        
        Strategy:
        1. If PDF has substantial text (>50 chars), prefer it
        2. If PDF text is sparse but OCR has good confidence, use OCR
        3. If both have content, combine unique parts
        
        Returns:
            {
                'text': str,
                'source': 'pdf_text' | 'ocr' | 'merged',
                'confidence': float | None
            }
        """
        pdf_chars = len(pdf_text.strip())
        ocr_chars = len(ocr_text.strip())
        
        # Case 1: PDF has good text, OCR is empty or low confidence
        if pdf_chars > 50 and (ocr_chars == 0 or ocr_confidence < 0.7):
            return {
                'text': pdf_text,
                'source': 'pdf_text',
                'confidence': None
            }
        
        # Case 2: PDF is sparse, OCR has content with good confidence
        if pdf_chars < 50 and ocr_chars > 50 and ocr_confidence >= 0.7:
            return {
                'text': ocr_text,
                'source': 'ocr',
                'confidence': ocr_confidence
            }
        
        # Case 3: Both have substantial content - merge intelligently
        if pdf_chars > 50 and ocr_chars > 50:
            merged_text = self._intelligent_merge(pdf_text, ocr_text)
            return {
                'text': merged_text,
                'source': 'merged',
                'confidence': ocr_confidence
            }
        
        # Case 4: Use whichever has more content
        if pdf_chars >= ocr_chars:
            return {
                'text': pdf_text,
                'source': 'pdf_text',
                'confidence': None
            }
        else:
            return {
                'text': ocr_text,
                'source': 'ocr',
                'confidence': ocr_confidence
            }
    
    def _intelligent_merge(self, pdf_text: str, ocr_text: str) -> str:
        """
        Intelligently merge two text sources
        
        Strategy:
        - Use PDF text as base (usually more reliable for digital text)
        - Add unique content from OCR (might catch headers/footers/images)
        - Deduplicate similar lines
        """
        # Split into lines
        pdf_lines = [line.strip() for line in pdf_text.split('\n') if line.strip()]
        ocr_lines = [line.strip() for line in ocr_text.split('\n') if line.strip()]
        
        # Start with PDF lines
        merged_lines = pdf_lines.copy()
        
        # Add OCR lines that are significantly different
        for ocr_line in ocr_lines:
            if not self._is_similar_to_any(ocr_line, pdf_lines):
                # This line from OCR is unique, add it
                merged_lines.append(ocr_line)
        
        return '\n'.join(merged_lines)
    
    def _is_similar_to_any(self, line: str, line_list: List[str], threshold: float = 0.8) -> bool:
        """
        Check if a line is similar to any line in the list
        Uses simple character overlap ratio
        """
        line_lower = line.lower()
        line_chars = set(line_lower.replace(' ', ''))
        
        for existing_line in line_list:
            existing_lower = existing_line.lower()
            existing_chars = set(existing_lower.replace(' ', ''))
            
            if not line_chars or not existing_chars:
                continue
            
            # Calculate Jaccard similarity
            intersection = len(line_chars & existing_chars)
            union = len(line_chars | existing_chars)
            similarity = intersection / union if union > 0 else 0
            
            if similarity >= threshold:
                return True
        
        return False
    
    def merge_full_extraction(self, pdf_result: Dict, ocr_result: Dict) -> Dict:
        """
        Merge complete PDF and OCR extraction results
        
        Args:
            pdf_result: Result from PDFTextExtractor
            ocr_result: Result from OCRExtractor
        
        Returns:
            Merged result with combined pages and stats
        """
        merged_pages = []
        warnings = []
        
        # Ensure both have same number of pages
        num_pages = max(len(pdf_result['pages']), len(ocr_result['pages']))
        
        for page_num in range(num_pages):
            pdf_page = pdf_result['pages'][page_num] if page_num < len(pdf_result['pages']) else None
            ocr_page = ocr_result['pages'][page_num] if page_num < len(ocr_result['pages']) else None
            
            if pdf_page and ocr_page:
                # Merge both sources
                merged = self.merge_page_texts(
                    pdf_page['text'],
                    ocr_page['text'],
                    ocr_page.get('confidence', 0.0)
                )
                
                merged_pages.append({
                    'page_number': page_num + 1,
                    'text': merged['text'],
                    'source': merged['source'],
                    'confidence': merged.get('confidence'),
                    'char_count': len(merged['text'])
                })
                
                # Add warnings for low confidence
                if merged.get('confidence') and merged['confidence'] < 0.7:
                    warnings.append(f"Page {page_num + 1}: Low OCR confidence ({merged['confidence']:.2f})")
            
            elif pdf_page:
                # Only PDF available
                merged_pages.append({
                    'page_number': page_num + 1,
                    'text': pdf_page['text'],
                    'source': 'pdf_text',
                    'confidence': None,
                    'char_count': pdf_page['char_count']
                })
            
            elif ocr_page:
                # Only OCR available
                merged_pages.append({
                    'page_number': page_num + 1,
                    'text': ocr_page['text'],
                    'source': 'ocr',
                    'confidence': ocr_page.get('confidence'),
                    'char_count': ocr_page['char_count']
                })
                
                if ocr_page.get('confidence', 0) < 0.7:
                    warnings.append(f"Page {page_num + 1}: Low OCR confidence ({ocr_page['confidence']:.2f})")
        
        # Combine full text
        full_text = '\n\n'.join([page['text'] for page in merged_pages])
        
        # Recalculate stats on merged text
        total_chars = len(full_text)
        emails = set(self.email_pattern.findall(full_text))
        phones = set(self.phone_pattern.findall(full_text))
        urls = set(self.url_pattern.findall(full_text))
        
        # Detect multi-column if blocks available
        if pdf_result.get('blocks'):
            from .pdf_extractor import PDFTextExtractor
            extractor = PDFTextExtractor()
            if extractor.detect_multi_column(pdf_result['blocks']):
                warnings.append("Detected multi-column layout; text order may need verification")
        
        return {
            'pages': merged_pages,
            'blocks': pdf_result.get('blocks'),
            'full_text': full_text,
            'stats': {
                'total_chars': total_chars,
                'emails_found': len(emails),
                'phones_found': len(phones),
                'urls_found': len(urls),
                'num_pages': num_pages
            },
            'warnings': warnings
        }
