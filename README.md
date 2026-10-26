# Skill & Service backend (starter)

Node.js + Express + MongoDB/Mongoose + JWT auth + Gemini 3.8 Flash.

## 1. Requirements
- Node.js 20+
- MongoDB Atlas database (or local MongoDB)
- Google AI Studio API key with Gemini API access

## 2. Install and configure
```bash
cd skill_service_backend
npm install
cp .env.example .env
```
On Windows PowerShell, if `cp` is unavailable use:
```powershell
Copy-Item .env.example .env
```
Edit `.env`: set `MONGODB_URI`, a long random `JWT_SECRET`, and `GEMINI_API_KEY`. Keep `.env` private; never put the Gemini key in Flutter or commit `.env` to Git.

## 3. Start
```bash
npm run dev
```
Test `GET http://localhost:3000/api/health`.

## Routes
- `POST /api/auth/signup` body: `{ "name":"Test Worker", "email":"test@example.com", "password":"Password123!", "role":"worker", "headline":"Flutter Developer", "skills":["Flutter","Dart"], "hourlyRate":500, "city":"Delhi" }`
- `POST /api/auth/login` body: `{ "email":"test@example.com", "password":"Password123!" }`
- `GET /api/auth/me` (Bearer token)
- `PATCH /api/auth/me` (Bearer token; profile fields)
- `GET /api/workers?q=flutter&category=Developer` (Bearer token)
- `GET /api/workers/:id` (Bearer token)
- `POST /api/ai/generate` body: `{ "prompt":"Create a portfolio landing page", "technology":"Flutter / Dart" }` (Bearer token)
- `GET /api/wallet` (Bearer token; returns balance and transactions)
- `GET /api/projects` (Bearer token)
- `POST /api/projects` (client token) body: `{ "title":"Portfolio website", "description":"...", "workerId":"MONGODB_USER_ID", "amountPaise":500000 }`

## Important limitations
- Wallet balance starts at ₹0. The API intentionally does not fake add-money/withdrawal. Real payments need a payment provider (e.g. Razorpay) with server-side signature/webhook verification and ledger-safe updates.
- Project creation/listing is implemented, but chat, reviews, notifications, escrow, and dispute handling are not implemented yet.
- For Flutter Android emulator, API host is usually `http://10.0.2.2:3000`; for Chrome on the same computer use `http://localhost:3000`; for a physical phone use your computer's LAN IP on the same Wi-Fi. Production must use HTTPS.
- This is a development starter, not a production-audited payment or marketplace platform. Add email verification, password reset, monitoring, backups, and deployment configuration before public launch.
