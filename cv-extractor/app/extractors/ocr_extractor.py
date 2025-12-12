"""
OCR extraction using Tesseract
For scanned PDFs or images
"""
import pytesseract
from pdf2image import convert_from_path
from PIL import Image, ImageEnhance, ImageFilter
import os
from typing import List, Dict
import tempfile


class OCRExtractor:
    """Extract text from images or scanned PDFs using Tesseract OCR"""
    
    def __init__(self, language: str = "eng"):
        self.language = language
        # Try to find tesseract executable (Windows common paths)
        possible_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]
        for path in possible_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                break
    
    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for better OCR results
        - Convert to grayscale
        - Enhance contrast
        - Apply slight sharpening
        """
        # Convert to grayscale
        image = image.convert('L')
        
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)
        
        # Slight sharpening
        image = image.filter(ImageFilter.SHARPEN)
        
        return image
    
    def extract_from_image(self, image: Image.Image, preprocess: bool = True) -> Dict:
        """
        Extract text from a single image
        
        Returns:
            {
                'text': str,
                'confidence': float,
                'char_count': int
            }
        """
        if preprocess:
            image = self.preprocess_image(image)
        
        # Get detailed OCR data
        ocr_data = pytesseract.image_to_data(image, lang=self.language, output_type=pytesseract.Output.DICT)
        
        # Extract text
        text = pytesseract.image_to_string(image, lang=self.language)
        
        # Calculate average confidence (filter out -1 values which mean no text detected)
        confidences = [int(conf) for conf in ocr_data['conf'] if int(conf) > 0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        return {
            'text': text.strip(),
            'confidence': avg_confidence / 100.0,  # Normalize to 0-1
            'char_count': len(text.strip())
        }
    
    def extract_from_pdf(self, pdf_path: str, preprocess: bool = True) -> Dict:
        """
        Extract text from PDF by converting to images and OCR
        
        Returns:
            {
                'pages': [{'page_number': int, 'text': str, 'confidence': float, 'char_count': int}],
                'full_text': str,
                'stats': {...}
            }
        """
        # Poppler path for Windows (update if different location)
        poppler_path = r"C:\Users\FranklinOuattara\Downloads\Release-25.12.0-0\poppler-25.12.0\Library\bin"
        
        # Check if poppler exists and log
        if os.path.exists(poppler_path):
            print(f"[OCR] Using Poppler from: {poppler_path}")
        else:
            print(f"[OCR] Warning: Poppler not found at {poppler_path}, using system PATH")
        
        # Convert PDF to images
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                images = convert_from_path(
                    pdf_path, 
                    dpi=300, 
                    output_folder=temp_dir,
                    poppler_path=poppler_path if os.path.exists(poppler_path) else None
                )
                print(f"[OCR] Successfully converted PDF to {len(images)} images")
            except Exception as e:
                print(f"[OCR] Error converting PDF to images: {e}")
                raise
            
            pages_data = []
            full_text_parts = []
            total_chars = 0
            total_confidence = 0.0
            
            for i, image in enumerate(images):
                page_result = self.extract_from_image(image, preprocess=preprocess)
                
                pages_data.append({
                    'page_number': i + 1,
                    'text': page_result['text'],
                    'confidence': page_result['confidence'],
                    'char_count': page_result['char_count'],
                    'source': 'ocr'
                })
                
                full_text_parts.append(page_result['text'])
                total_chars += page_result['char_count']
                total_confidence += page_result['confidence']
            
            full_text = '\n\n'.join(full_text_parts)
            avg_confidence = total_confidence / len(images) if images else 0.0
            
            return {
                'pages': pages_data,
                'full_text': full_text,
                'avg_confidence': avg_confidence,
                'stats': {
                    'total_chars': total_chars,
                    'num_pages': len(images)
                }
            }
    
    def extract_from_image_file(self, image_path: str, preprocess: bool = True) -> Dict:
        """
        Extract text from image file (jpg, png, etc.)
        
        Returns same format as extract_from_image but wrapped in pages structure
        """
        image = Image.open(image_path)
        result = self.extract_from_image(image, preprocess=preprocess)
        
        return {
            'pages': [{
                'page_number': 1,
                'text': result['text'],
                'confidence': result['confidence'],
                'char_count': result['char_count'],
                'source': 'ocr'
            }],
            'full_text': result['text'],
            'avg_confidence': result['confidence'],
            'stats': {
                'total_chars': result['char_count'],
                'num_pages': 1
            }
        }
