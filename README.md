# HealthSphere Monorepo

A comprehensive health management platform built with a modern monorepo architecture.

## 📁 Project Structure

```
healthsphere/
│── frontend/          # Next.js + TailwindCSS frontend application
│── backend/           # Node.js + Express backend API
│── ml-services/       # Python FastAPI machine learning services
│── database/          # SQL schema and seed files
│── docs/              # Project documentation
│── README.md          # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)
- **npm** or **yarn**
- **PostgreSQL** (for database)

### Frontend Setup

The frontend is built with Next.js, TypeScript, and TailwindCSS.

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

**Available Scripts:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Backend Setup

The backend is built with Node.js, Express, and TypeScript.

```bash
cd backend
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The backend will be available at `http://localhost:3001`

**Available Scripts:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server

**Environment Variables:**
- `PORT` - Server port (default: 3001)
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - JWT secret key
- `JWT_EXPIRES_IN` - JWT expiration time

### ML Services Setup

The ML services are built with Python FastAPI.

```bash
cd ml-services

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn app.main:app --reload
```

The ML service will be available at `http://localhost:8000`

**API Documentation:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Database Setup

The database folder contains SQL schema and seed files.

```bash
# Using PostgreSQL
psql -U postgres -d healthsphere -f database/schema.sql
psql -U postgres -d healthsphere -f database/seed.sql
```

## 🛠️ Development

### Running All Services

You'll need to run each service in a separate terminal:

**Terminal 1 - Frontend:**
```bash
cd frontend && npm run dev
```

**Terminal 2 - Backend:**
```bash
cd backend && npm run dev
```

**Terminal 3 - ML Services:**
```bash
cd ml-services && source venv/bin/activate && uvicorn app.main:app --reload
```

## 📦 Technologies

### Frontend
- **Next.js** - React framework
- **TypeScript** - Type safety
- **TailwindCSS** - Utility-first CSS framework

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database (via pg)
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### ML Services
- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **NumPy** - Numerical computing
- **scikit-learn** - Machine learning library

## 📝 Project Status

**Phase 1: Complete ✅**

- [x] Monorepo structure created
- [x] Frontend initialized with Next.js + TailwindCSS
- [x] Backend initialized with Node.js + Express + TypeScript
- [x] ML Services initialized with Python + FastAPI
- [x] Database folder structure created
- [x] Documentation folder created

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## 📄 License

ISC

