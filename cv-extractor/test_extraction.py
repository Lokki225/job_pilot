"""
Quick test script to diagnose CV extraction issues
"""
import sys
import os

print("=" * 60)
print("CV Extractor Diagnostic Test")
print("=" * 60)

# Test 1: Check imports
print("\n1. Testing imports...")
try:
    import fitz
    print("   ✓ PyMuPDF (fitz) imported successfully")
except ImportError as e:
    print(f"   ✗ PyMuPDF import failed: {e}")
    sys.exit(1)

try:
    import pytesseract
    print("   ✓ pytesseract imported successfully")
except ImportError as e:
    print(f"   ✗ pytesseract import failed: {e}")
    sys.exit(1)

try:
    from pdf2image import convert_from_path
    print("   ✓ pdf2image imported successfully")
except ImportError as e:
    print(f"   ✗ pdf2image import failed: {e}")
    sys.exit(1)

try:
    from PIL import Image
    print("   ✓ Pillow (PIL) imported successfully")
except ImportError as e:
    print(f"   ✗ Pillow import failed: {e}")
    sys.exit(1)

# Test 2: Check Tesseract
print("\n2. Testing Tesseract...")
try:
    version = pytesseract.get_tesseract_version()
    print(f"   ✓ Tesseract version: {version}")
except Exception as e:
    print(f"   ✗ Tesseract not accessible: {e}")
    print("   Trying to find tesseract...")
    
    # Try common Windows paths
    possible_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            print(f"   Found tesseract at: {path}")
            pytesseract.pytesseract.tesseract_cmd = path
            try:
                version = pytesseract.get_tesseract_version()
                print(f"   ✓ Tesseract version: {version}")
                break
            except:
                continue
    else:
        print("   ✗ Could not find or access Tesseract")

# Test 3: Check Poppler
print("\n3. Testing Poppler...")
poppler_path = r"C:\Users\FranklinOuattara\Downloads\Release-25.12.0-0\poppler-25.12.0\Library\bin"

if os.path.exists(poppler_path):
    print(f"   ✓ Poppler directory exists: {poppler_path}")
    
    # Check for pdftoppm.exe
    pdftoppm = os.path.join(poppler_path, "pdftoppm.exe")
    if os.path.exists(pdftoppm):
        print(f"   ✓ pdftoppm.exe found")
    else:
        print(f"   ✗ pdftoppm.exe not found at {pdftoppm}")
else:
    print(f"   ✗ Poppler directory not found: {poppler_path}")

# Test 4: Test PDF text extraction
print("\n4. Testing PDF text extraction...")
try:
    from app.extractors.pdf_extractor import PDFTextExtractor
    print("   ✓ PDFTextExtractor imported")
except Exception as e:
    print(f"   ✗ Failed to import PDFTextExtractor: {e}")

# Test 5: Test OCR extractor
print("\n5. Testing OCR extractor...")
try:
    from app.extractors.ocr_extractor import OCRExtractor
    print("   ✓ OCRExtractor imported")
except Exception as e:
    print(f"   ✗ Failed to import OCRExtractor: {e}")

# Test 6: Test merger
print("\n6. Testing text merger...")
try:
    from app.extractors.merger import TextMerger
    print("   ✓ TextMerger imported")
except Exception as e:
    print(f"   ✗ Failed to import TextMerger: {e}")

print("\n" + "=" * 60)
print("Diagnostic test complete!")
print("=" * 60)
print("\nIf all tests passed, the CV extractor should work.")
print("If any tests failed, check the error messages above.")
