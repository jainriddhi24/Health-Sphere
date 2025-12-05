# 🔐 Security Guide: Protecting API Keys & Credentials

## ✅ Current Security Status

Your repository is **mostly secure**. Here's what's in place:

- ✅ `.gitignore` includes `.env` files (credentials won't be pushed)
- ✅ Backend uses environment variables for secrets
- ✅ No hardcoded API keys in committed code
- ✅ Database password protected
- ✅ JWT secrets use environment variables

---

## 🔧 Setup Instructions

### 1. Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/health_sphere
JWT_SECRET=your-very-long-secret-key-min-32-chars
ML_SERVICE_URL=http://localhost:8000
GOOGLE_API_KEY=your-google-api-key-here
```

### 2. ML Services Configuration

```bash
cd ml-services
cp .env.example .env
```

Edit `.env`:
```env
FLASK_ENV=production
GOOGLE_API_KEY=your-google-api-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/health_sphere
```

### 3. Frontend Configuration

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:8000
```

---

## 🚫 Never Commit These Files

```
.env                          # Local environment variables
.env.*.local                  # Environment-specific files
.env.production.local         # Production config
credentials/                  # Any credential files
*.pem                         # Private key files
*.key                         # API key files
.aws/                         # AWS credentials
~/.ssh/                       # SSH keys
node_modules/                 # Dependencies
__pycache__/                  # Python cache
.DS_Store                     # OS files
```

**These are already in `.gitignore` ✅**

---

## 📋 Environment Variables List

### Backend Required Variables

| Variable | Example | Purpose |
|----------|---------|---------|
| `NODE_ENV` | production | Environment mode |
| `PORT` | 3001 | Server port |
| `DATABASE_URL` | postgresql://... | Database connection |
| `JWT_SECRET` | abc123... | Token signing key |
| `ML_SERVICE_URL` | http://localhost:8000 | ML service endpoint |
| `GOOGLE_API_KEY` | AIza... | Google Gemini API |

### ML Services Required Variables

| Variable | Example | Purpose |
|----------|---------|---------|
| `FLASK_ENV` | production | Flask environment |
| `GOOGLE_API_KEY` | AIza... | Google Gemini API |
| `DATABASE_URL` | postgresql://... | Database connection |

### Frontend Required Variables

| Variable | Example | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | http://localhost:3001/api | Backend API |
| `NEXT_PUBLIC_ML_SERVICE_URL` | http://localhost:8000 | ML service |

---

## 🔑 How to Get API Keys

### Google Gemini API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Generative Language API"
4. Create API key in "Credentials" section
5. Copy key to `.env` file as `GOOGLE_API_KEY`

**Never commit this key!** ✅ Covered by `.gitignore`

### GitHub Tokens (if needed)

1. Go to Settings → Developer Settings → Personal Access Tokens
2. Create new token with appropriate scopes
3. Copy to `.env` as `GITHUB_TOKEN`
4. Never share publicly

---

## 🔒 Security Best Practices

### ✅ DO:

- ✅ Use strong, random JWT secrets (min 32 characters)
- ✅ Store all secrets in `.env` files (not in code)
- ✅ Use different secrets for dev/staging/production
- ✅ Rotate secrets regularly in production
- ✅ Use environment-specific `.env` files
- ✅ Add `.env` to `.gitignore`
- ✅ Use HTTPS in production
- ✅ Never log sensitive data
- ✅ Use API key restrictions (IP whitelist, scope limits)
- ✅ Monitor API usage for unusual activity

### ❌ DON'T:

- ❌ Commit `.env` files to GitHub
- ❌ Hardcode secrets in code
- ❌ Share API keys via email or chat
- ❌ Use same secrets across dev/prod
- ❌ Push keys in commented code
- ❌ Log API keys or tokens
- ❌ Use weak/simple secrets
- ❌ Commit temporary credentials
- ❌ Leave debugging code with credentials
- ❌ Reuse passwords across systems

---

## 📝 Credential File Checklist

Before every commit, verify:

```bash
# Check for .env files about to be committed
git diff --cached --name-only | grep "\.env"

# Should return nothing if .env is in .gitignore

# Check for common API key patterns
git diff --cached | grep -i "api.key\|password\|secret\|token"

# Should return nothing
```

---

## 🛡️ CI/CD Secrets in GitHub Actions

If using GitHub Actions, store secrets in:

1. Repository Settings → Secrets and Variables → Actions
2. Create secrets for:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `GOOGLE_API_KEY`
   - etc.

3. Use in workflows:
```yaml
- name: Build
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
  run: npm run build
```

---

## 🔍 Scanning for Exposed Secrets

### Git History Scan

```bash
# Check if any secrets were ever committed
git log -p | grep -i "api.key\|password"

# If found, use git-filter-branch or BFG Repo-Cleaner to remove
```

### Pre-commit Hook

Prevent accidental commits:

```bash
npm install --save-dev husky pre-commit
```

Create `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Prevent committing .env files
if git diff --cached --name-only | grep -E "\.env|credentials|\.key|\.pem"
then
  echo "❌ Error: Attempting to commit secret files (.env, keys, etc.)"
  echo "✅ These files are in .gitignore and should not be committed"
  exit 1
fi
```

---

## 🚨 If You Accidentally Committed Secrets

### Immediate Actions:

1. **Revoke the secret immediately**
   - If it's an API key, regenerate it
   - If it's a token, invalidate it
   - Change passwords

2. **Remove from git history**
   ```bash
   # Remove file from history
   git filter-branch --tree-filter 'rm -f .env' HEAD
   
   # Or use BFG (recommended)
   bfg --delete-files .env
   bfg --replace-text secrets.txt
   ```

3. **Force push**
   ```bash
   git push origin HEAD --force-with-lease
   ```

4. **Notify team** about the exposure

5. **Rotate all secrets** that were exposed

---

## 📊 Security Audit Checklist

Before going to production:

- [ ] No `.env` files in git history
- [ ] All secrets use environment variables
- [ ] `.gitignore` includes all secret file types
- [ ] Pre-commit hooks installed
- [ ] API keys have appropriate restrictions
- [ ] Different secrets for dev/prod/staging
- [ ] Secrets rotated in last 3 months
- [ ] Database password is strong (16+ chars)
- [ ] JWT secret is strong (32+ chars)
- [ ] HTTPS enabled in production
- [ ] API rate limiting configured
- [ ] Audit logging enabled
- [ ] Access logs monitored

---

## 🎯 Your Repository Status

✅ **Current Configuration is Secure**

- `.env` properly gitignored
- No hardcoded credentials in code
- Environment variables properly used
- Example `.env` files provided

**Next Steps:**
1. Copy `.env.example` to `.env` files locally
2. Add your actual secrets to local `.env`
3. Never commit the actual `.env` files
4. Rotate secrets after initial setup
5. Use pre-commit hooks to prevent accidents

---

## 📞 Additional Resources

- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/security/#managing-application-secrets)
- [Python dotenv Documentation](https://python-dotenv.readthedocs.io/)

Your Health-Sphere project is now secure! 🔐
