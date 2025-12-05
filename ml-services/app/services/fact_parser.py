"""
fact_parser: Extracts structured numeric facts and evidence snippets from text.
This is a regex-based best-effort parser; in production, you'd use clinically-aware
parsers or NLP models to extract entities more robustly.
"""
from typing import Tuple, Dict, List, Any
import re
import uuid

# Map friendly names to regex patterns and units
FIELD_PATTERNS = {
    'fasting_glucose': r'(?:fasting glucose|fasting plasma glucose|FPG|fasting blood sugar|FBS|glucose|blood glucose)[:\s]*?(\d{1,3}(?:\.\d+)?)\s*(mg/dL|mg/dl|mgdl|mmol/L|mmol/l|mmol)?',
    'hba1c': r'(?:hba1c|hba1c\s*%|hemoglobin a1c|hb a1c|ha1c)[:\s]*(\d{1,2}(?:\.\d+)?)\s*%?',
    'total_cholesterol': r'(?:total cholesterol|cholesterol)[:\s]*(\d{2,3})\s*(mg/dL|mg/dl|mgdl)?',
    'ldl': r'(?:ldl|ldl-c|ldl cholesterol|bad cholesterol)[:\s]*(\d{2,3})\s*(mg/dL|mg/dl|mgdl)?',
    'hdl': r'(?:hdl|hdl-c|hdl cholesterol|good cholesterol)[:\s]*(\d{1,2})\s*(mg/dL|mg/dl|mgdl)?',
    'triglycerides': r'(?:triglyceride[s]?|tg)[:\s]*(\d{2,3})\s*(mg/dL|mg/dl|mgdl)?',
    'systolic_bp': r'(?:systolic|systolic blood pressure|SBP|blood pressure|BP)[:\s]*?(\d{2,3})(?:/(\d{2,3}))?\s*(mmHg)?',
    'diastolic_bp': r'(?:diastolic|diastolic blood pressure|DBP)(?:[:\s]*(\d{2,3}))?\s*(mmHg)?',
    'bmi': r'\bBMI[:\s]*(\d{1,2}\.\d|\d{1,2})\b',
    'hemoglobin': r'hemoglobin[:\s]*(\d{1,2}\.\d|\d{1,2})\s*(g/dL|g/dl|gdl)?',
    'patient_name': r'(?:patient name|patient:|name:)[:\s]+([A-Za-z\s\.]+?)(?:\n|,|\||$|Female|Male|DOB|Date)',
}

REQUIRED_FIELDS = ['fasting_glucose', 'hba1c', 'total_cholesterol', 'ldl', 'hdl', 'triglycerides', 'systolic_bp', 'diastolic_bp']


def extract_facts_and_evidence(text: str) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    facts = {}
    evidence = []

    lower = text.lower()
    for field, pattern in FIELD_PATTERNS.items():
        for m in re.finditer(pattern, text, flags=re.IGNORECASE):
            value = m.group(1)
            # try convert to numeric
            try:
                if '.' in value:
                    value_parsed = float(value)
                else:
                    value_parsed = int(value)
            except Exception:
                value_parsed = value

            # If parsed is a string, trim whitespace
            if isinstance(value_parsed, str):
                value_parsed = value_parsed.strip()

            facts[field] = value_parsed
            snippet = text[max(0, m.start()-60):min(len(text), m.end()+60)]
            evidence.append({
                'id': str(uuid.uuid4()),
                'field': field,
                'text': snippet,
                'start': m.start(),
                'end': m.end()
            })
            print(f'[FactParser] Found {field}={value_parsed} in text')
            break
        # If this is a BP value with pattern 'BP: 140/90', extract both values
        if field == 'systolic_bp' and 'systolic_bp' in facts and 'diastolic_bp' not in facts:
            bp_match = re.search(r'\b(\d{2,3})/(\d{2,3})\b', text)
            if bp_match:
                try:
                    facts['systolic_bp'] = int(bp_match.group(1))
                    facts['diastolic_bp'] = int(bp_match.group(2))
                    snippet = text[max(0, bp_match.start()-60):min(len(text), bp_match.end()+60)]
                    evidence.append({'id': str(uuid.uuid4()), 'field': 'systolic_bp', 'text': snippet, 'start': bp_match.start(), 'end': bp_match.end()})
                except Exception:
                    pass

    # Post-process: scan lines for unit-based values and map them to fields if not already captured
    # Map keywords to fields for heuristic mapping
    FIELD_KEYWORD_MAP = {
        'glucose': 'fasting_glucose',
        'fasting glucose': 'fasting_glucose',
        'fpg': 'fasting_glucose',
        'blood glucose': 'fasting_glucose',
        'a1c': 'hba1c',
        'hba1c': 'hba1c',
        'hemoglobin a1c': 'hba1c',
        'cholesterol': 'total_cholesterol',
        'total cholesterol': 'total_cholesterol',
        'ldl': 'ldl',
        'hdl': 'hdl',
        'triglyceride': 'triglycerides',
        'triglycerides': 'triglycerides',
        'tg': 'triglycerides',
        'systolic': 'systolic_bp',
        'diastolic': 'diastolic_bp',
        'bp': 'systolic_bp',
    }

    # Line-scan to handle values in tables and unlabeled columns
    lines = text.splitlines()
    for i, line in enumerate(lines):
        # Find values with mg/dL, mmol/L, mgdl, or percent
        for m in re.finditer(r"(\d{1,3}(?:\.\d+)?)\s*(mg/dL|mg/dl|mgdl|mmol/L|mmol/l|mmol|%)", line, flags=re.IGNORECASE):
            val = m.group(1)
            unit = m.group(2)
            context = line.lower()
            matched_field = None
            for kw, fld in FIELD_KEYWORD_MAP.items():
                if kw in context and fld not in facts:
                    matched_field = fld
                    break
            # If not found, check previous line as header (table-like layout)
            if not matched_field and i > 0:
                prev = lines[i - 1].lower()
                for kw, fld in FIELD_KEYWORD_MAP.items():
                    if kw in prev and fld not in facts:
                        matched_field = fld
                        break
            if matched_field:
                try:
                    parsed = float(val) if '.' in val else int(val)
                except Exception:
                    parsed = val
                facts[matched_field] = parsed
                snippet = line
                evidence.append({'id': str(uuid.uuid4()), 'field': matched_field, 'text': snippet, 'start': 0, 'end': len(line)})
                print(f'[FactParser] Line-scan mapped {matched_field}={parsed} from line: {line.strip()}')
        # Also handle percent-only matches for HbA1c or other percent values
        for m in re.finditer(r"(\d{1,2}(?:\.\d+)?)\s*%", line, flags=re.IGNORECASE):
            val = m.group(1)
            context = line.lower()
            if ('hba1c' in context or 'a1c' in context or 'hemoglobin a1c' in context) and 'hba1c' not in facts:
                try:
                    facts['hba1c'] = float(val) if '.' in val else int(val)
                    evidence.append({'id': str(uuid.uuid4()), 'field': 'hba1c', 'text': line, 'start': 0, 'end': len(line)})
                    print(f'[FactParser] Line-scan mapped hba1c={val} from line: {line.strip()}')
                except Exception:
                    pass

    return facts, evidence

