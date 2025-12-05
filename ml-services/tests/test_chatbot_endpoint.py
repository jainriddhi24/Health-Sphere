from fastapi.testclient import TestClient
from app.main import app


def test_chatbot_query_returns_metadata():
    client = TestClient(app)
    payload = {
        'query': 'Please interpret my latest lab results',
        'user_id': 'testuser',
        'user_profile': {
            'name': 'Test User',
            'height': 170,
            'weight': 75
        }
    }
    res = client.post('/chatbot/query', json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data['success'] is True
    assert 'data' in data
    d = data['data']
    # Metadata should be included from the aggregator
    assert 'metadata' in d
    assert isinstance(d['metadata'], dict)
    assert 'missing_profile_fields' in d['metadata']
    assert isinstance(d['metadata']['missing_profile_fields'], list)
