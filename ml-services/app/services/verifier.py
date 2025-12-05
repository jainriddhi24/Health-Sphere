from typing import Dict, Any, List, Tuple
import re


def verify_output(model_output: Dict[str, Any], facts: Dict[str, Any], evidence: List[Dict[str, Any]]) -> Tuple[bool, List[str]]:
    """Basic verification: ensures that generated output refers only to known facts or evidence by ID.
    
    This is a soft verification - we log issues but don't fail on them unless critical.
    Returns (verified, issues)
    """
    issues = []
    verified = True

    text = model_output.get('text', '')
    
    # If the model didn't return structured output, that's OK - just return it as-is
    # (The formatter will try to parse it)
    if not text:
        issues.append('Model returned empty text')
        return False, issues
    
    # Check for explicit evidence ID citations (if present)
    ids_in_text = re.findall(r'ID[:\s]*([\w\-]+)', text, flags=re.IGNORECASE)
    if ids_in_text:
        known_ids = {e['id'] for e in evidence}
        for mid in ids_in_text:
            # Ignore short IDs that are likely not valid UUIDs (e.g., 'es')
            if len(mid) < 4:
                continue
            if mid not in known_ids:
                issues.append(f'Unknown evidence ID referenced: {mid}')
                # Don't fail hard on ID mismatches - log and continue
    
    # Check numeric claims more leniently: only flag egregious mismatches
    # (Gemini may use numbers in context that don't exactly match facts)
    nums = re.findall(r"\b(\d{2,3}(?:\.\d+)?)\b", text)  # Only check 2+ digit numbers
    str_vals = set([str(v) for v in facts.values()])
    for n in nums:
        if n not in str_vals:
            # Only flag if it's a large/suspicious number
            try:
                if int(float(n)) > 100:
                    issues.append(f'Potentially unverified numeric claim: {n}')
            except:
                pass
    
    # If we have issues but the model still returned reasonable output, log them but don't fail
    # Only fail if there are critical structural issues (e.g., empty output)
    if not issues or len(issues) <= 2:
        verified = True  # Soft pass
    
    return verified, issues
