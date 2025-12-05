from typing import Dict, List, Any

REQUIRED_FIELDS = ['fasting_glucose', 'hba1c', 'total_cholesterol', 'ldl', 'hdl', 'triglycerides', 'systolic_bp', 'diastolic_bp']


SYSTEM_MESSAGE = (
    "You are a medical report interpreter. Your task is to analyze a medical report and provide a structured response. "
    "Use ONLY information from the FACTS and EVIDENCE sections provided. "
    "Do not make assumptions or add any medical information not explicitly provided. "
    "All recommendations must be traceable back to specific facts or evidence. "
    "For missing data, clearly state what is insufficient.\n\n"
    "Keep your responses SHORT, CLEAR, and IN SIMPLE LANGUAGE that a patient can understand.\n"
    "Format your response as JSON with these fields:\n"
    "{\n"
    "  \"diagnosis\": \"<brief, simple diagnosis based on facts - 1-2 sentences>\",\n"
    "  \"summary\": \"<short clinical summary in plain language - 2-3 sentences>\",\n"
    "  \"diet_plan\": [\"<simple dietary recommendation 1>\", \"<simple dietary recommendation 2>\", ...],\n"
    "  \"clinical_notes\": \"<any additional patient-friendly observations>\"\n"
    "}"
)


def build_prompt(facts: Dict[str, Any], evidence: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Construct the system and user messages for the LLM in a strict format.

    Args:
        facts: dictionary of extracted numeric facts
        evidence: list of evidence snippet dicts {id, text, start, end}

    Returns:
        A dict with 'system' and 'user' messages.
    """
    # Build FACTS block
    facts_lines = []
    for k, v in facts.items():
        facts_lines.append(f"{k}: {v}")
    facts_block = "\n".join(facts_lines) if facts_lines else "(none)"

    # Build EVIDENCE block
    evidence_lines = []
    for s in evidence:
        evidence_lines.append(f"ID: {s.get('id')}\n{s.get('text')}")
    evidence_block = "\n\n".join(evidence_lines) if evidence_lines else "(none)"

    user_message = (
        "FACTS:\n" + facts_block + "\n\n" +
        "EVIDENCE:\n" + evidence_block + "\n\n" +
        "REQUEST:\n"
        "Analyze this medical report and provide:\n"
        "1. A DIAGNOSIS based on the lab values and findings\n"
        "2. A SUMMARY of the clinical findings\n"
        "3. A DIET_PLAN with specific dietary recommendations linked to the findings\n"
        "4. Any CLINICAL_NOTES about the patient's health status\n\n"
        "Return ONLY valid JSON (no markdown, no explanation). Each diet recommendation should map to a specific fact.\n"
        "If required fields are missing, note this in clinical_notes."
    )

    return {
        'system': SYSTEM_MESSAGE,
        'user': user_message,
        'required_fields': REQUIRED_FIELDS
    }
