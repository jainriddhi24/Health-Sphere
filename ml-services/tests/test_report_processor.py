from fastapi.testclient import TestClient
from app.main import app
import json


def test_process_report_endpoint():
    client = TestClient(app)
    # Use the sample text file created earlier, ensure the path is correct
    payload = {
        'userId': 'testuser',
        'filePath': 'ml-services/test_data/sample_report.txt',
        'originalName': 'sample_report.txt'
    }
    response = client.post('/process-report', json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 'summary' in data
    assert 'diet_plan' in data
