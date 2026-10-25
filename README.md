# HotelPro

A full-stack hotel management web application.

**Stack:** React + Vite · Bootstrap 5 · Node.js · Express · MongoDB + Mongoose

---

## Project Structure

```
HotelPro/
├── client/          # React/Vite frontend
│   ├── .env.example
│   └── vercel.json
├── server/          # Express/Node.js backend
│   ├── .env.example
│   └── src/
├── render.yaml      # Render deployment config
└── .gitignore
```

---

## Local Setup

### Prerequisites
- Node.js ≥ 18
- MongoDB (local) **or** a [MongoDB Atlas](https://cloud.mongodb.com) cluster

### 1. Clone

```bash
git clone https://github.com/your-username/HotelPro.git
cd HotelPro
```

### 2. Server

```bash
cd server
cp .env.example .env        # Edit .env with your values
npm install
npm run dev                  # Starts on http://localhost:5000
```

### 3. Client

```bash
cd client
cp .env.example .env        # Edit VITE_API_URL if needed
npm install
npm run dev                  # Starts on http://localhost:5173
```

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `5000`) |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `CLIENT_URL` | **Yes** | Frontend URL for CORS (no trailing slash) |
| `NODE_ENV` | No | `development` or `production` |
| `JWT_SECRET` | **Yes** | Long random secret for JWT signing |
| `JWT_EXPIRES_IN` | No | Token lifetime (default: `7d`) |

**MongoDB Atlas URI format:**
```
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/hotelpro?retryWrites=true&w=majority
```

**Generating a strong JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Client (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | **Yes** | Backend API base URL (e.g. `https://your-app.onrender.com/api`) |

---

## Demo Payment

The payment flow is a **demo only**. No real money is charged and no card data is collected or stored. The `POST /api/payments/demo/:bookingId` endpoint:
- Creates a `Payment` record with `provider: "demo"`
- Updates `booking.paymentStatus` to `"paid"`
- Returns a fake transaction ID prefixed `HPDEMO-`

This must be replaced with a real payment gateway (Stripe, Razorpay, etc.) before going live.

---

## API Endpoints Summary

| Base | Description |
|---|---|
| `GET /api/health` | Health check |
| `POST /api/auth/register` | Register (always assigns `guest` role) |
| `POST /api/auth/login` | Login |
| `POST /api/auth/logout` | Logout |
| `GET /api/auth/me` | Current user |
| `GET /api/rooms` | List / search rooms |
| `GET /api/rooms/:id` | Room details |
| `POST /api/rooms` | Create room (staff/admin) |
| `PATCH /api/rooms/:id` | Update room (staff/admin) |
| `DELETE /api/rooms/:id` | Delete room (admin) |
| `POST /api/bookings` | Create booking (authenticated) |
| `GET /api/bookings/my-bookings` | Guest's bookings |
| `GET /api/bookings/:id` | Booking detail |
| `PATCH /api/bookings/:id/cancel` | Cancel booking |
| `GET /api/bookings` | All bookings (staff/admin) |
| `PATCH /api/bookings/:id/status` | Check-in / check-out (staff/admin) |
| `POST /api/payments/demo/:bookingId` | Demo payment |
| `GET /api/payments/booking/:bookingId` | Booking payment info |
| `GET /api/dashboard/guest` | Guest dashboard |
| `GET /api/dashboard/staff` | Staff dashboard (staff/admin) |
| `GET /api/dashboard/admin` | Admin metrics (admin) |

---

## Deployment

### Backend → Render

1. Push code to GitHub.
2. Create a **New Web Service** on [Render](https://render.com):
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
3. Add environment variables in the Render dashboard:
   - `MONGODB_URI` → your Atlas connection string
   - `JWT_SECRET` → a long random secret
   - `CLIENT_URL` → your Vercel frontend URL (e.g. `https://hotelpro.vercel.app`)
   - `NODE_ENV` → `production`
4. In MongoDB Atlas → **Network Access** → Allow `0.0.0.0/0` (or Render's static IPs).

Alternatively, `render.yaml` in the repo root will auto-configure the service when linked.

### Frontend → Vercel

1. Import the repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `client`.
3. Add environment variable:
   - `VITE_API_URL` → `https://your-render-backend.onrender.com/api`
4. Deploy. `vercel.json` handles SPA routing fallback automatically.

### MongoDB Atlas Setup

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user with read/write access.
3. In **Network Access**, allow `0.0.0.0/0` for Render (or set Render static outbound IPs).
4. Copy the connection string and set it as `MONGODB_URI` in Render.

---

## Security Notes

- Passwords are hashed with bcrypt (10 rounds).
- JWTs are stored in HTTP-only cookies (`sameSite: 'none'`, `secure: true` in production).
- Public registration always assigns the `guest` role; privileged roles cannot be set via the API.
- Server-side price calculation only — client prices are never trusted.
- No sensitive card data is ever stored.
- CORS is restricted to `CLIENT_URL` only.
