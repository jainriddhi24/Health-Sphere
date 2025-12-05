from fastapi.testclient import TestClient
from app.main import app
import json
import os
client = TestClient(app)
path = os.path.abspath('test_data/sample_report.txt')
payload = {'userId':'testuser','filePath': path,'originalName':'sample_report.txt'}
resp = client.post('/process-report', json=payload)
print('STATUS', resp.status_code)
print(json.dumps(resp.json(), indent=2))
