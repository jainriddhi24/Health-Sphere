# HealthSphere Backend

This backend includes a new `POST /api/report/upload` endpoint that accepts a file upload and forwards the path and user to the ML microservice for processing.

Usage:

- Start backend: `npm run dev`
- Start ML service: `cd ml-services && uvicorn app.main:app --reload`
 - Initialize or create missing tables (development): `npm run db:init`
	- You can run a local PostgreSQL via Docker Compose for development:
		```powershell
		docker compose up -d postgres
		```
		Then set `DATABASE_URL` in `.env`:
		```dotenv
		DATABASE_URL=postgresql://postgres:postgres@localhost:5432/healthsphere
		```
- Upload a report via `/api/report/upload` (multipart form upload with 'file' key)

- Health-check endpoint: `GET /api` will return a JSON object describing backend status and the configured ML service URL. Use this to quickly confirm the backend and environment are up.

Additionally, uploading a `medical_report` via `PUT /api/auth/profile` (field name `medical_report`) will save the file and automatically trigger the ML microservice; the backend will include the processing result in the response under the `processing` field.

The ML microservice will process the report and return a JSON with `summary`, `diet_plan`, `sources`, and `confidence`.

If you encounter errors like `relation "chat_logs" does not exist`, run `npm run db:init` to create the required tables.
