import requests

BACKEND_URL = 'http://localhost:5050'
ML_HOST = 'http://localhost:8000'

# If running this as a simple test to call the ml service directly

r = requests.post(ML_HOST + '/process-report', json={
    'userId': 'testuser',
    'filePath': 'ml-services/test_data/sample_report.txt',
    'originalName': 'sample_report.txt'
})

print('Status:', r.status_code)
print('Response:', r.json())
