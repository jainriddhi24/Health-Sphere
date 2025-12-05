from app.services.context_aggregator import create_aggregator

def main():
    agg = create_aggregator()
    print('System Prompt:\n', agg.build_system_prompt(include_diet_plan=True))
    print('\nUser Prompt sample:\n')
    profile={'weight':70}
    report={'processing_result': 'LDL: 200 mg/dL', 'lab_results':[{'test_name':'LDL', 'value':200, 'ref_range':{'low':0,'high':129}}]}
    ctx=agg.aggregate_context('Please advise', profile, user_report=report)
    print(agg.build_user_prompt(ctx['query'], ctx))

if __name__ == '__main__':
    main()
