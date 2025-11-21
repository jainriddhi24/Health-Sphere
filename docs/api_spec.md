# HealthSphere API Specification

## Base URL
```
Development: http://localhost:3001/api
Production: https://api.healthsphere.com/api
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## 1. Authentication Routes

### 1.1 POST /auth/register

Register a new user account.

**URL:** `/auth/register`

**Method:** `POST`

**Body Parameters:**
```json
{
  "name": "string (required, min: 2, max: 100)",
  "email": "string (required, valid email format)",
  "password": "string (required, min: 8 characters)",
  "age": "number (required, min: 13, max: 120)",
  "gender": "string (required, enum: 'male', 'female', 'other')",
  "height": "number (required, in cm, min: 100, max: 250)",
  "weight": "number (required, in kg, min: 30, max: 300)",
  "chronic_condition": "string (optional, enum: 'diabetes', 'hypertension', 'heart_disease', 'obesity', 'none')"
}
```

**Response Schema:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "age": "number",
      "gender": "string",
      "height": "number",
      "weight": "number",
      "chronic_condition": "string",
      "premium_unlocked": false,
      "created_at": "ISO 8601 timestamp"
    },
    "token": "jwt_access_token",
    "refresh_token": "jwt_refresh_token"
  }
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Validation error
- `409` - Email already exists

**Dependencies:** PostgreSQL (users table), bcryptjs (password hashing), JWT (token generation)

---

### 1.2 POST /auth/login

Authenticate user and return JWT tokens.

**URL:** `/auth/login`

**Method:** `POST`

**Body Parameters:**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```

**Response Schema:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "premium_unlocked": "boolean"
    },
    "token": "jwt_access_token",
    "refresh_token": "jwt_refresh_token"
  }
}
```

**Status Codes:**
- `200` - Login successful
- `401` - Invalid credentials
- `400` - Validation error

**Dependencies:** PostgreSQL (users table), bcryptjs (password verification), JWT (token generation), Redis (refresh token storage)

---

### 1.3 GET /auth/profile

Get authenticated user's profile information.

**URL:** `/auth/profile`

**Method:** `GET`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response Schema:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "age": "number",
    "gender": "string",
    "height": "number",
    "weight": "number",
    "chronic_condition": "string",
    "premium_unlocked": "boolean",
    "created_at": "ISO 8601 timestamp"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (invalid/missing token)

**Dependencies:** PostgreSQL (users table), JWT (token validation)

---

## 2. Workout Engine Routes

### 2.1 GET /workouts/recommend

Get personalized workout recommendations for the authenticated user.

**URL:** `/workouts/recommend`

**Method:** `GET`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?duration=30 (optional, in minutes)
?intensity=medium (optional, enum: 'low', 'medium', 'high')
```

**Response Schema:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "workout_type": "string (e.g., 'cardio', 'strength', 'yoga')",
        "duration_minutes": "number",
        "intensity": "string",
        "estimated_calories": "number",
        "description": "string",
        "instructions": "string[]"
      }
    ]
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

**Dependencies:** PostgreSQL (users, workouts tables), Redis (cache user preferences), Optional: ML Service (personalized recommendations)

---

### 2.2 POST /workouts/log

Log a completed workout.

**URL:** `/workouts/log`

**Method:** `POST`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body Parameters:**
```json
{
  "workout_type": "string (required, e.g., 'cardio', 'strength', 'yoga')",
  "duration_minutes": "number (required, min: 1, max: 480)",
  "intensity": "string (required, enum: 'low', 'medium', 'high')",
  "calories_burned": "number (optional, calculated if not provided)"
}
```

**Response Schema:**
```json
{
  "success": true,
  "message": "Workout logged successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "workout_type": "string",
    "duration_minutes": "number",
    "intensity": "string",
    "calories_burned": "number",
    "created_at": "ISO 8601 timestamp"
  }
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Validation error
- `401` - Unauthorized

**Dependencies:** PostgreSQL (workouts table), Redis (invalidate cache)

---

## 3. Food Recognition Routes

### 3.1 POST /food/scan

Upload a food image for recognition and nutritional analysis.

**URL:** `/food/scan`

**Method:** `POST`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Body Parameters:**
```
image: File (required, image file: jpg, jpeg, png, max: 10MB)
```

**Response Schema:**
```json
{
  "success": true,
  "message": "Food recognized successfully",
  "data": {
    "id": "uuid",
    "meal_label": "string (e.g., 'Grilled Chicken Salad')",
    "calories": "number",
    "sodium": "number (in mg)",
    "sugar": "number (in g)",
    "unhealthy_score": "number (0-100)",
    "confidence": "number (0-1)",
    "created_at": "ISO 8601 timestamp"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid file or validation error
- `401` - Unauthorized
- `500` - ML service error

**Dependencies:** ML Service (Food Recognition), PostgreSQL (meals table), File storage (temporary)

**Flow:**
1. Backend receives image file
2. Backend validates file (type, size)
3. Backend → POST to ML Food Recognition Service
4. ML Service processes image and returns predictions
5. Backend stores meal record in PostgreSQL
6. Backend returns results to client

---

### 3.2 GET /food/history

Get user's meal history.

**URL:** `/food/history`

**Method:** `GET`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?limit=20 (optional, default: 20, max: 100)
?offset=0 (optional, default: 0)
?start_date=2024-01-01 (optional, ISO date)
?end_date=2024-01-31 (optional, ISO date)
```

**Response Schema:**
```json
{
  "success": true,
  "data": {
    "meals": [
      {
        "id": "uuid",
        "meal_label": "string",
        "calories": "number",
        "sodium": "number",
        "sugar": "number",
        "unhealthy_score": "number",
        "created_at": "ISO 8601 timestamp"
      }
    ],
    "pagination": {
      "total": "number",
      "limit": "number",
      "offset": "number",
      "has_more": "boolean"
    },
    "summary": {
      "total_calories": "number",
      "avg_unhealthy_score": "number"
    }
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

**Dependencies:** PostgreSQL (meals table), Redis (cache recent history)

---

## 4. Health Risk Forecast Routes

### 4.1 GET /risk/forecast

Get health risk forecast for the next 30 days.

**URL:** `/risk/forecast`

**Method:** `GET`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response Schema:**
```json
{
  "success": true,
  "data": {
    "risk_value": "number (0-100)",
    "next_30_days_prediction": {
      "risk_trend": "string (enum: 'increasing', 'decreasing', 'stable')",
      "factors": [
        {
          "factor": "string (e.g., 'diet', 'exercise', 'chronic_condition')",
          "impact": "number (-100 to 100)",
          "description": "string"
        }
      ],
      "recommendations": "string[]"
    },
    "generated_at": "ISO 8601 timestamp",
    "next_update": "ISO 8601 timestamp"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - ML service error

**Dependencies:** ML Service (Risk Forecast), PostgreSQL (users, meals, workouts, risk_scores tables), Redis (cache forecast results)

**Flow:**
1. Backend checks Redis cache for recent forecast
2. If cache miss, fetch user data from PostgreSQL
3. Backend → POST user data to ML Risk Forecast Service
4. ML Service runs prediction model
5. Backend stores result in PostgreSQL and Redis
6. Backend returns forecast to client

---

### 4.2 POST /risk/recalculate

Force recalculation of health risk forecast.

**URL:** `/risk/recalculate`

**Method:** `POST`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response Schema:**
```json
{
  "success": true,
  "message": "Risk forecast recalculated",
  "data": {
    "risk_value": "number (0-100)",
    "next_30_days_prediction": {
      "risk_trend": "string",
      "factors": "array",
      "recommendations": "string[]"
    },
    "generated_at": "ISO 8601 timestamp"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - ML service error

**Dependencies:** ML Service (Risk Forecast), PostgreSQL (users, meals, workouts, risk_scores tables), Redis (invalidate and update cache)

---

## 5. Preventive Assistant Routes

### 5.1 GET /assistant/check-warnings

Get preventive health warnings and recommendations.

**URL:** `/assistant/check-warnings`

**Method:** `GET`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response Schema:**
```json
{
  "success": true,
  "data": {
    "warnings": [
      {
        "type": "string (enum: 'diet', 'exercise', 'health_metric', 'chronic_condition')",
        "severity": "string (enum: 'low', 'medium', 'high', 'critical')",
        "message": "string",
        "recommendation": "string",
        "related_data": "object"
      }
    ],
    "last_checked": "ISO 8601 timestamp"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

**Dependencies:** ML Service (Preventive Assistant), PostgreSQL (users, meals, workouts, risk_scores tables), Redis (cache warnings)

---

## 6. Community Features Routes

### 6.1 GET /community/challenges

Get available community challenges.

**URL:** `/community/challenges`

**Method:** `GET`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?status=active (optional, enum: 'active', 'upcoming', 'completed')
?limit=10 (optional, default: 10)
```

**Response Schema:**
```json
{
  "success": true,
  "data": {
    "challenges": [
      {
        "id": "uuid",
        "title": "string",
        "description": "string",
        "start_date": "ISO 8601 timestamp",
        "end_date": "ISO 8601 timestamp",
        "participant_count": "number",
        "user_participating": "boolean",
        "user_progress": "number (if participating)"
      }
    ]
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

**Dependencies:** PostgreSQL (community_challenges, challenge_participants tables), Redis (cache challenge list)

---

### 6.2 POST /community/join

Join a community challenge.

**URL:** `/community/join`

**Method:** `POST`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body Parameters:**
```json
{
  "challenge_id": "uuid (required)"
}
```

**Response Schema:**
```json
{
  "success": true,
  "message": "Successfully joined challenge",
  "data": {
    "id": "uuid",
    "challenge_id": "uuid",
    "user_id": "uuid",
    "progress_metric": 0,
    "updated_at": "ISO 8601 timestamp"
  }
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Already joined or challenge not found
- `401` - Unauthorized

**Dependencies:** PostgreSQL (community_challenges, challenge_participants tables), Redis (invalidate cache)

---

### 6.3 POST /community/progress

Update user's progress in a challenge.

**URL:** `/community/progress`

**Method:** `POST`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body Parameters:**
```json
{
  "challenge_id": "uuid (required)",
  "progress_metric": "number (required, min: 0)"
}
```

**Response Schema:**
```json
{
  "success": true,
  "message": "Progress updated",
  "data": {
    "id": "uuid",
    "challenge_id": "uuid",
    "user_id": "uuid",
    "progress_metric": "number",
    "updated_at": "ISO 8601 timestamp",
    "rank": "number (user's rank in challenge)"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Not participating in challenge
- `401` - Unauthorized

**Dependencies:** PostgreSQL (challenge_participants table), Redis (update leaderboard cache)

---

## 7. Premium Chatbot Routes

### 7.1 POST /chatbot/query

Submit a query to the premium AI health assistant.

**URL:** `/chatbot/query`

**Method:** `POST`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body Parameters:**
```json
{
  "query": "string (required, min: 1, max: 1000)",
  "context": "string (optional, additional context)"
}
```

**Response Schema:**
```json
{
  "success": true,
  "data": {
    "response": "string (AI-generated response)",
    "sources": [
      {
        "title": "string",
        "url": "string",
        "relevance": "number (0-1)"
      }
    ],
    "query_id": "uuid",
    "timestamp": "ISO 8601 timestamp"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `402` - Premium subscription required
- `429` - Rate limit exceeded
- `500` - ML service error

**Dependencies:** ML Service (Chatbot with RAG), PostgreSQL (users, chatbot_usage tables), Redis (rate limiting, usage tracking)

**Flow:**
1. Backend validates premium status
2. Backend checks rate limits in Redis
3. Backend fetches user health profile from PostgreSQL
4. Backend → POST query + profile to ML Chatbot Service
5. ML Service performs RAG pipeline (vector search + LLM generation)
6. Backend logs usage in PostgreSQL
7. Backend updates usage counter in Redis
8. Backend returns response to client

---

### 7.2 GET /chatbot/status

Get chatbot usage status and limits.

**URL:** `/chatbot/status`

**Method:** `GET`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response Schema:**
```json
{
  "success": true,
  "data": {
    "premium_unlocked": "boolean",
    "queries_count": "number (today's query count)",
    "daily_limit": "number (queries per day)",
    "last_used": "ISO 8601 timestamp (nullable)",
    "remaining_queries": "number"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

**Dependencies:** PostgreSQL (users, chatbot_usage tables), Redis (usage counters)

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "string (error code)",
    "message": "string (human-readable message)",
    "details": "object (optional, additional error details)"
  }
}
```

## Common Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `402` - Payment Required (premium feature)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable (ML service down)

