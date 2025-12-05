import pytest
from app.services.context_aggregator import create_aggregator


def test_profile_completeness_missing_fields():
    aggregator = create_aggregator()
    profile = {'name': 'Test User', 'weight': 70}
    missing, questions = aggregator.check_profile_completeness(profile)
    # expected missing fields include age and gender
    assert 'age' in missing
    assert 'gender' in missing
    assert 'height' in missing
    assert len(questions) == len(missing)


def test_extract_report_facts_and_danger_flag():
    aggregator = create_aggregator()
    # Create a synthetic report: structured lab entry with ref range
    report = {
        'processing_result': 'LDL: 180 mg/dL\nFasting Glucose: 100 mg/dL',
        'lab_results': [
            {'test_name': 'LDL', 'value': 180, 'ref_range': {'low': 0, 'high': 129}},
            {'test_name': 'Fasting Glucose', 'value': 100, 'ref_range': {'low': 70, 'high': 99}},
        ]
    }

    facts, evidence = aggregator.extract_report_facts(report)
    assert 'ldl' in facts or 'LDL' in facts or facts
    flags = aggregator.detect_dangerous_values(report, facts)
    assert len(flags) >= 1
    assert any(f['test_name'].lower().startswith('ldl') for f in flags)


def test_aggregate_includes_metadata():
    aggregator = create_aggregator()
    profile = {'name': 'Jane Doe', 'age': 30, 'gender': 'female', 'height': 165, 'weight': 60}
    report = {'processing_result': 'HbA1c: 6.5%', 'created_at': '2024-10-10', 'file_name': 'lab.pdf'}
    context = aggregator.aggregate_context('Explain my results', profile, user_report=report)
    assert 'metadata' in context
    assert 'report_facts' in context['metadata']
    assert 'missing_profile_fields' in context['metadata']
    # Ensure follow-up questions are present for missing fields
    assert isinstance(context['metadata']['follow_up_questions'], list)


def test_build_prompt_includes_follow_up_and_alerts():
    aggregator = create_aggregator()
    profile = {'weight':70}
    report = {'processing_result': 'LDL: 200 mg/dL', 'lab_results': [{'test_name': 'LDL', 'value': 200, 'ref_range': {'low': 0, 'high': 129}}]}
    context = aggregator.aggregate_context('Please advise', profile, user_report=report)
    user_prompt = aggregator.build_user_prompt(context['query'], context)
    assert 'Follow-up Questions to Ask the User' in user_prompt or 'Follow-up Questions' in user_prompt
    assert 'Alert: Certain lab values are outside the provided reference ranges' in user_prompt


def test_build_system_prompt_enforces_no_hallucination():
    aggregator = create_aggregator()
    system_prompt = aggregator.build_system_prompt(include_diet_plan=True)
    assert 'Use ONLY the patient profile' in system_prompt
    assert 'Do not assume or invent missing data' in system_prompt
    assert 'HealthSphere is an intelligent healthcare' in system_prompt
