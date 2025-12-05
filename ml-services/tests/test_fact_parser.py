import pytest
from app.services.fact_parser import extract_facts_and_evidence


def test_extract_basic_facts():
    text = (
        "Fasting Glucose: 160 mg/dL\n"
        "HbA1c: 7.5%\n"
        "Total Cholesterol: 220 mg/dL\n"
        "LDL: 140 mg/dL\n"
        "HDL: 40 mg/dL\n"
        "Triglycerides: 180 mg/dL\n"
        "Systolic BP: 150 mmHg\n"
        "Diastolic BP: 95 mmHg\n"
    )
    facts, evidence = extract_facts_and_evidence(text)
    assert facts['fasting_glucose'] == 160
    assert float(facts['hba1c']) == 7.5
    assert facts['ldl'] == 140
    assert 'hdl' in facts
    assert evidence and len(evidence) >= 1
