from app.services.context_aggregator import create_aggregator


def run_quick_tests():
    aggregator = create_aggregator()
    profile = {'name': 'Jane Doe', 'age': 30, 'gender': 'female', 'height': 165, 'weight': 60}
    report = {'processing_result': 'LDL: 180 mg/dL\nFasting Glucose: 100 mg/dL', 'lab_results': [
            {'test_name': 'LDL', 'value': 180, 'ref_range': {'low': 0, 'high': 129}},
            {'test_name': 'Fasting Glucose', 'value': 100, 'ref_range': {'low': 70, 'high': 99}},
        ]}
    context = aggregator.aggregate_context('Explain my results', profile, user_report=report)
    print('Context metadata:', context.get('metadata'))
    missing, questions = aggregator.check_profile_completeness({'weight': 70})
    print('Missing fields for minimal profile:', missing)
    facts, evidence = aggregator.extract_report_facts(report)
    print('Extracted facts:', facts)
    flags = aggregator.detect_dangerous_values(report, facts)
    print('Danger flags:', flags)


if __name__ == '__main__':
    run_quick_tests()
