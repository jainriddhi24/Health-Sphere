from fastapi.testclient import TestClient
from app.main import app
import json, os
client = TestClient(app)
path = r'C:\\Health-Sphere\\backend\\uploads\\2a058674-7a18-4774-9495-07dae9688bc7\\1764539380992-jane_doe_report.pdf'
payload = {'userId':'testuser','filePath': path,'originalName':'1764539380992-jane_doe_report.pdf'}
resp = client.post('/process-report', json=payload)
print('STATUS', resp.status_code)
print(json.dumps(resp.json(), indent=2))
