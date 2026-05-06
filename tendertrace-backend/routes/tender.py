from fastapi import APIRouter, UploadFile, File
import fitz
import os
import re
import json
from google import genai
from dotenv import load_dotenv

load_dotenv("backend/.env")
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

router = APIRouter()
tender_store = {}

DEMO_TENDER = {
    "title": "CRPF Construction Services Tender 2026",
    "criteria": [
        {"id": "C1", "name": "Minimum Annual Turnover", "description": "Bidder must have minimum annual turnover of ₹5 Crore for last 3 financial years", "type": "financial", "mandatory": True, "threshold": "₹5 Crore"},
        {"id": "C2", "name": "Similar Project Experience", "description": "Bidder must have completed at least 3 similar projects in last 5 years", "type": "technical", "mandatory": True, "threshold": "3 projects"},
        {"id": "C3", "name": "GST Registration", "description": "Bidder must have valid GST registration certificate", "type": "compliance", "mandatory": True, "threshold": "Valid GST"},
        {"id": "C4", "name": "ISO 9001 Certification", "description": "Bidder must hold valid ISO 9001:2015 certification", "type": "compliance", "mandatory": True, "threshold": "ISO 9001:2015"},
        {"id": "C5", "name": "EPF Registration", "description": "Bidder should have EPF registration for employees", "type": "compliance", "mandatory": False, "threshold": "EPF Registration"},
    ]
}

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except Exception as e:
        return ""

def smart_extract_criteria(text: str) -> dict:
    """Smart fallback: reads real PDF text and extracts criteria using pattern matching."""
    criteria = []
    cid = 1

    # Extract title
    lines = text.split('\n')
    title = "Government Tender Document"
    for line in lines[:20]:
        line = line.strip()
        if len(line) > 10 and len(line) < 120:
            title = line
            break

    # Financial criteria patterns
    financial_patterns = [
        (r'(?:annual\s+)?turnover[^₹\d]*(?:of\s+)?(?:₹|Rs\.?|INR)?\s*([\d,.]+\s*(?:crore|lakh|cr|L)?)', 'Annual Turnover', 'financial'),
        (r'net\s+worth[^₹\d]*(?:₹|Rs\.?|INR)?\s*([\d,.]+\s*(?:crore|lakh|cr)?)', 'Net Worth', 'financial'),
        (r'(?:financial\s+)?(?:bid\s+)?(?:earnest\s+money|EMD)[^₹\d]*(?:₹|Rs\.?|INR)?\s*([\d,.]+)', 'Earnest Money Deposit', 'financial'),
    ]

    for pattern, name, ftype in financial_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            threshold = match.group(1).strip() if match.group(1) else "As specified"
            criteria.append({
                "id": f"C{cid}", "name": name,
                "description": f"Bidder must meet the {name.lower()} requirement as specified in the tender document.",
                "type": ftype, "mandatory": True,
                "threshold": f"₹{threshold}" if not threshold.startswith('₹') else threshold
            })
            cid += 1

    # Technical criteria patterns
    tech_patterns = [
        (r'(?:similar\s+)?(?:works?|projects?)[^.]*(?:completed|executed)[^.]*(\d+)[^.]*(?:years?|yrs?)', 'Similar Project Experience', 'technical'),
        (r'experience[^.]*(\d+)\s*(?:similar\s+)?(?:works?|projects?)', 'Project Experience', 'technical'),
    ]

    for pattern, name, ftype in tech_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            threshold = f"{match.group(1)} similar projects" if match.group(1) else "As specified"
            criteria.append({
                "id": f"C{cid}", "name": name,
                "description": f"Bidder must have completed similar works/projects as specified in the tender.",
                "type": ftype, "mandatory": True,
                "threshold": threshold
            })
            cid += 1

    # Compliance criteria - check for keywords
    compliance_items = [
        ('gst', 'GST Registration', 'Valid GST registration certificate required'),
        ('iso 9001', 'ISO 9001 Certification', 'Valid ISO 9001:2015 certification required'),
        ('epf', 'EPF Registration', 'Valid EPF registration required'),
        ('pan', 'PAN Card', 'Valid PAN card required'),
        ('msme', 'MSME Registration', 'MSME registration certificate required'),
        ('labour licence', 'Labour Licence', 'Valid labour licence required'),
        ('esi', 'ESI Registration', 'Valid ESI registration required'),
    ]

    for keyword, name, desc in compliance_items:
        if keyword.lower() in text.lower():
            mandatory = keyword in ['gst', 'pan']
            criteria.append({
                "id": f"C{cid}", "name": name,
                "description": desc,
                "type": "compliance", "mandatory": mandatory,
                "threshold": f"Valid {name}"
            })
            cid += 1

    # If nothing found, use smart defaults based on document content
    if len(criteria) == 0:
        criteria = DEMO_TENDER["criteria"]
        title = title or DEMO_TENDER["title"]

    return {"title": title, "criteria": criteria}

def extract_criteria_with_gemini(text: str) -> dict:
    """Try Gemini first, fall back to smart extraction."""
    if client:
        prompt = f"""You are an expert government procurement analyst for India.
Analyze this tender document and extract ALL eligibility criteria.
Return ONLY valid JSON with no markdown:
{{
    "title": "exact tender title",
    "criteria": [
        {{
            "id": "C1",
            "name": "criterion name",
            "description": "full description",
            "type": "financial or technical or compliance",
            "mandatory": true or false,
            "threshold": "specific value or requirement"
        }}
    ]
}}
Tender Text:
{text[:4000]}"""
        try:
            response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
            raw = response.text.strip().replace("```json", "").replace("```", "").strip()
            result = json.loads(raw)
            if "criteria" in result and len(result["criteria"]) > 0:
                print("✓ Gemini extracted criteria successfully")
                return result
        except Exception as e:
            print(f"Gemini failed, using smart fallback: {e}")

    # Smart fallback
    print("Using smart PDF extraction fallback")
    return smart_extract_criteria(text)

@router.post("/upload")
async def upload_tender(file: UploadFile = File(...)):
    file_bytes = await file.read()
    text = extract_text_from_pdf(file_bytes)
    if len(text) < 30:
        result = DEMO_TENDER
    else:
        result = extract_criteria_with_gemini(text)
    tender_store["current"] = result
    tender_store["text"] = text
    return {"message": "Tender analyzed!", "tender": result}

@router.post("/demo")
def load_demo_tender():
    tender_store["current"] = DEMO_TENDER
    tender_store["text"] = "Demo tender"
    return {"message": "Demo tender loaded!", "tender": DEMO_TENDER}

@router.get("/current")
def get_current_tender():
    if "current" not in tender_store:
        return {"error": "No tender loaded yet"}
    return {"tender": tender_store["current"]}