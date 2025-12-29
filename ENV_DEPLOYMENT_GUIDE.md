# Complete Environment Variables Setup Guide

## 📋 Overview
This project has 3 services that need separate deployments and environments:
- **Frontend** → Netlify
- **Backend** → Render / Railway / Heroku / Your Server
- **ML Services** → Render / Railway / Heroku / Your Server

---

## 🌐 NETLIFY (Frontend Only)

These variables go into **Netlify Dashboard → Site Settings → Build & Deploy → Environment**

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api
NEXT_PUBLIC_ML_SERVICE_URL=https://your-ml-service-url.com
```

**For local development** (in `frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:8000
```

---

## 🔙 BACKEND (Node.js/Express)

Deploy to: Render, Railway, Heroku, or your server

Environment variables to set:

```env
# Environment
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@host:5432/healthsphere

# Authentication
JWT_SECRET=your-very-long-secret-key-minimum-32-characters-long

# External Services
ML_SERVICE_URL=https://your-ml-service-url.com
GOOGLE_API_KEY=your-google-gemini-api-key-here

# CORS (Frontend URL)
CORS_ORIGIN=https://your-netlify-site.netlify.app
```

**For local development** (in `backend/.env`):
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/healthsphere
JWT_SECRET=dev-secret-key-min-32-chars
ML_SERVICE_URL=http://localhost:8000
GOOGLE_API_KEY=your-google-api-key
CORS_ORIGIN=http://localhost:3000
```

---

## 🤖 ML SERVICES (Python/FastAPI)

Deploy to: Render, Railway, Heroku, or your server

Environment variables to set:

```env
# Environment
FLASK_ENV=production
DEBUG=False

# API Keys
GOOGLE_API_KEY=your-google-gemini-api-key-here

# Backend Service
BACKEND_URL=https://your-backend-url.com

# Database (optional)
DATABASE_URL=postgresql://user:password@host:5432/health_sphere

# Vector Database
VECTOR_DB_PATH=./data/vector_db

# Model Configuration
MODEL_NAME=gemini-1.5-flash
MAX_TOKENS=2048
TEMPERATURE=0.7
```

**For local development** (in `ml-services/.env`):
```env
FLASK_ENV=development
DEBUG=False
GOOGLE_API_KEY=your-google-api-key
BACKEND_URL=http://localhost:3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/health_sphere
VECTOR_DB_PATH=./data/vector_db
MODEL_NAME=gemini-1.5-flash
MAX_TOKENS=2048
TEMPERATURE=0.7
```

---

## 🔐 API Keys Needed (Get These First!)

### Google Gemini API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Generative Language API"
4. Go to **Credentials** → Create API Key
5. Copy and paste in `GOOGLE_API_KEY` for both backend and ML services

### Database URL
Format: `postgresql://user:password@host:port/database`
- Get from your PostgreSQL host (e.g., Render, Supabase, ElephantSQL)

### JWT Secret
Generate a strong random string (min 32 characters):
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows PowerShell:
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString()))
```

---

## 📝 Deployment Checklist

### Before Deploying to Production:

- [ ] Get Google Gemini API key
- [ ] Set up PostgreSQL database (Render, Supabase, or ElephantSQL)
- [ ] Generate strong JWT secret
- [ ] Deploy Backend first (get its URL)
- [ ] Deploy ML Services (get its URL)
- [ ] Update Frontend env vars with Backend & ML service URLs
- [ ] Deploy Frontend to Netlify
- [ ] Test all endpoints work together

### Deployment Order:
1. **Backend** (so you get its URL)
2. **ML Services** (so you get its URL)
3. **Frontend to Netlify** (using URLs from steps 1 & 2)

---

## 🚀 Quick Reference: What Goes Where

| Variable | Frontend | Backend | ML Services | Where to Get |
|----------|----------|---------|-------------|-----------|
| `NEXT_PUBLIC_API_URL` | ✅ Netlify | - | - | Backend URL |
| `NEXT_PUBLIC_ML_SERVICE_URL` | ✅ Netlify | - | - | ML Services URL |
| `NODE_ENV` | - | ✅ Production | - | Set as "production" |
| `PORT` | - | ✅ 3001 | - | Default 3001 |
| `DATABASE_URL` | - | ✅ | ✅ Optional | PostgreSQL host |
| `JWT_SECRET` | - | ✅ | - | Generate random |
| `ML_SERVICE_URL` | - | ✅ | - | ML Services URL |
| `GOOGLE_API_KEY` | - | ✅ | ✅ | Google Cloud |
| `FLASK_ENV` | - | - | ✅ | Set as "production" |
| `BACKEND_URL` | - | - | ✅ | Backend URL |

---

## 🔗 Service URLs After Deployment

Once deployed, you'll have:
- **Frontend URL** (Netlify): `https://your-site.netlify.app`
- **Backend URL** (Render/Railway/etc): `https://your-backend.onrender.com`
- **ML Services URL** (Render/Railway/etc): `https://your-ml-service.onrender.com`

Use these URLs to fill in the env variables for each service.

---

## ✅ Final Check

After deployment, test the full flow:
1. Visit frontend URL
2. Try to register/login
3. Upload a medical report
4. Check if backend calls ML services successfully
5. Verify diet recommendations load

If any API calls fail, check:
- CORS settings in backend
- API URLs in frontend
- Environment variables in each service
