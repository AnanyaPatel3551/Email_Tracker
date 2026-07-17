# Antigravity Email Tracker

An end-to-end email tracking application featuring a Chrome Extension to inject tracking pixels in Gmail, a FastAPI backend to receive pixel events and manage databases, and a modern React dashboard to monitor opens and follow-up alerts.

---

## Tech Stack

| Component | Technologies Used | Description |
| :--- | :--- | :--- |
| **Backend API** | FastAPI, SQLAlchemy, Uvicorn, psycopg2-binary | Receives event requests, handles metadata logging, and exposes REST endpoints. |
| **Database** | SQLite (Local Dev) / Supabase PostgreSQL (Prod) | Handles persistent storage of emails, events, and follow-up states. |
| **Background Scheduler**| APScheduler | Runs background threads to flag aged emails requiring follow-ups. |
| **Frontend Dashboard** | React (Vite), TailwindCSS | Visualizes email tracking statistics, states, and filtering. |
| **Chrome Extension** | Manifest V3, Vanilla JS Content Scripts | Detects Gmail compose windows and dynamically injects tracking pixels. |

---

## System Architecture

Below is a conceptual architecture flow showing how components communicate:

```text
+--------------------------------------------------------+
|                     Chrome Extension                   |
|                   (Gmail Compose Tab)                  |
+-----------+--------------------------------+-----------+
            |                                |
  (1) Save Metadata (POST /emails)     (2) Load Pixel (GET /pixel/{id})
            |                                |
            v                                v
+-----------+--------------------------------v-----------+
|                     FastAPI Backend                        |
|             (Render Web Service / Uvicorn)             |
+-----------+--------------------------------+-----------+
            |                                |
      Read / Write                       Read / Write
            |                                |
            v                                v
+-----------+--------------------------------v-----------+
|                        Database                            |
|             (SQLite local / Supabase Postgres)             |
+-----------+--------------------------------+-----------+
            ^                                ^
     Fetch / Read                        Read / Update
            |                                |
+-----------+--------------------+   +-------+-----------+
|        React Dashboard         |   |    APScheduler    |
|      (Vercel Web App)          |   |  (Daily Cron Job) |
+--------------------------------+   +-------------------+
```

1. **Email Compose**: The Chrome Extension listens for new compose windows on Gmail, generates a unique UUID, appends an invisible 1x1 image pixel pointing to `/pixel/{uuid}`, and listens to the "Send" button.
2. **Logging**: On send, the extension POSTs metadata (`id`, `recipient`, `subject`) to `/emails`.
3. **Open Event**: When the recipient opens the email, their client loads the pixel image from `/pixel/{uuid}`. The backend logs the `open` action in the `events` table.
4. **Follow-Up Engine**: A background cron job runs once every 24 hours. Any email older than 3 days (`sent_at < 3 days ago`) that has not been replied to (`replied == False`) gets flagged (`needs_follow_up = True`).
5. **Dashboard Analytics**: The React client fetches data from `/emails` to display stats and alert banners.

---

## Local Setup Instructions

### 1. Backend Setup (FastAPI)
1. Navigate to the root directory.
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Mac/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will be running at `http://localhost:8000`. Database tables will automatically initialize locally in an `email_tracker.db` SQLite file.

### 2. Chrome Extension Setup
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer Mode** (top-right toggle switch).
3. Click **Load unpacked** (top-left button).
4. Select the `extension/` directory from this repository.
5. In [content.js](extension/content.js), ensure the `fetch` and `img.src` domains point to your backend API URL (defaults to `http://localhost:8000` for local testing).

### 3. Dashboard Setup (React + Vite)
1. Navigate to the `dashboard/` directory.
2. Install Node packages:
   ```bash
   npm install
   ```
3. (Optional) Create a `.env` file inside `/dashboard` if you want to override the default local backend URL:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
4. Start the frontend local dev server:
   ```bash
   npm run dev
   ```
   Open the browser at the printed address (usually `http://localhost:5173`).

---

## Production Deployment Guide

### 1. Database Setup (Supabase)
To bypass IPv6 constraints on free hosting platforms (like Render), configure the **Supabase Transaction Pooler**:
1. In Supabase, go to **Project Settings** -> **Database**.
2. Under **Connection strings**, select the **URI** tab and set the **Mode** dropdown to **Transaction**.
3. Copy the URL (which uses port `6543` and handles SNI routing with a `postgres.[project-ref]` username).
4. Example structure:
   ```text
   postgresql://postgres.<project_ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require
   ```
   *(Note: Since `psycopg2` compiles queries client-side, the `prepare_threshold=0` query parameter is not required and will throw an error if passed).*

### 2. Backend Setup (Render)
1. Deploy the repository as a **Web Service** on Render.
2. Select **Python 3** environment.
3. Configure the Start Command:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
4. Add the following **Environment Variables**:
   * `DATABASE_URL`: Your Supabase Transaction Pooler connection string.
   * `ALLOWED_ORIGINS`: Your Vercel frontend URL (e.g. `https://your-app.vercel.app`) to handle CORS safety.

### 3. Frontend Setup (Vercel)
1. Connect your repository on Vercel and import the project.
2. Set the **Root Directory** setting to `dashboard`.
3. Add the following **Environment Variable**:
   * `VITE_API_URL`: Your live Render backend URL (e.g. `https://email-tracker-api.onrender.com` without a trailing slash).

---

## Known Limitations

*   **Image Caching**: Many modern email clients (most notably Gmail) proxy and cache external images. When a recipient opens the email for the first time, Gmail's proxy server fetches the pixel (registering an open). However, subsequent opens might load the cached image from Gmail's CDN rather than requesting it from our server. This can lead to repeat opens being under-reported.
*   **"Images Off" Settings**: If a recipient has configured their email client to block external images by default (e.g. "Ask before displaying external images"), the tracking pixel will not load. Consequently, opens for these recipients cannot be tracked.
*   **Manual Reply Detection**: The database tracks whether a recipient has replied via the `replied` boolean column. However, the system currently does not parse inbound inbox folders via IMAP or monitor Gmail webhooks. Replies are currently simulated in seed data or must be manually updated in the database.
