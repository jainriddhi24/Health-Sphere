import requests

BACKEND_URL = 'http://localhost:5050'

files = {'file': open('ml-services/test_data/sample_report.txt','rb')}

r = requests.post(BACKEND_URL + '/api/report/upload', files=files)
print('Status:', r.status_code)
print('Response:', r.text)
