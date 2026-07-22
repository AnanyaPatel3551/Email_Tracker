# Antigravity Email Tracker

An end-to-end email tracking application featuring a Chrome Extension to inject tracking pixels in Gmail, a FastAPI backend to receive pixel events and manage databases, and a modern React dashboard to monitor opens and follow-up alerts.

---

## Tech Stack

| Component | Technologies Used | Description |
| :--- | :--- | :--- |
| **Backend API** | FastAPI, SQLAlchemy, PyJWT, psycopg2-binary | Receives tracking events, verifies JWT & API Key auth, and exposes REST endpoints. |
| **Database** | SQLite (Local Dev) / Supabase PostgreSQL (Prod) | Multi-tenant schema with `user_id` scoping and `api_keys` persistence. |
| **Authentication** | Supabase Auth (JWT), PyJWT | User Sign In, Sign Up, Session management, and Bearer JWT signature verification. |
| **Extension Options**| Chrome Storage API (`chrome.storage.local`) | Options UI page for persisting static `X-API-Key` headers securely. |
| **Background Scheduler**| APScheduler | Runs background threads to flag aged emails requiring follow-ups. |
| **Frontend Dashboard** | React (Vite), TailwindCSS, Supabase JS SDK | Visualizes open stats, settings UI for API key management, and session control. |
| **Chrome Extension** | Manifest V3, Vanilla JS Content Scripts | Detects Gmail compose windows, injects live Render pixels, and attaches `X-API-Key`. |

---

## System Architecture

Below is a conceptual architecture flow showing how components communicate:

```text
+------------------------------------+        +------------------------------------+
|          Dashboard App             |        |      Chrome Extension (Gmail)      |
|  (https://email-tracker.vercel.app)|        |     (https://mail.google.com)      |
+-----------------+------------------+        +-----------------+------------------+
                  |                                             |
     Uses Short-Lived Session JWT                   Uses Long-Lived API Key
  (Authorization: Bearer <JWT>)                   (X-API-Key: et_live_...)
                  |                                             |
                  +---------------------+-----------------------+
                                        |
                                        v
                    +---------------------------------------+
                    |            FastAPI Backend            |
                    |   (require_api_key_or_jwt dependency) |
                    |       Enforces 401 Unauthorized       |
                    +-------------------+-------------------+
                                        |
                                        v
                    +---------------------------------------+
                    |          Supabase PostgreSQL          |
                    |  (Scoped Queries: WHERE user_id = :id)|
                    +---------------------------------------+
```

1. **User Auth & Key Generation**: Users sign up or log into the React dashboard via Supabase Auth. In Dashboard **Settings**, users generate long-lived API keys (`et_live_...`).
2. **Extension Setup**: The user pastes their API key into the Chrome Extension options page (`options.html`). The key is saved permanently in `chrome.storage.local`.
3. **Email Compose & Header Injection**: When sending an email in Gmail, the Chrome Extension injects a live tracking pixel (`https://email-tracker-api-s7y7.onrender.com/pixel/{uuid}`) and posts metadata to `/emails` attaching header `X-API-Key: et_live_...`.
4. **Backend Security**: FastAPI verifies incoming requests using `require_api_key_or_jwt` (rejecting unauthenticated requests with `401 Unauthorized`).
5. **Open Event**: When the recipient opens the email, Google Image Proxy loads `/pixel/{uuid}`. The public route logs the `open` event in the `events` table.
6. **Isolated Dashboard**: When a user views their dashboard, `GET /emails` filters data strictly by `WHERE user_id = :current_user_id` preventing cross-tenant data leakage.

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
5. Right-click the extension icon $\rightarrow$ select **Options**, paste your API key generated from the dashboard, and click **Save Settings**.

### 3. Dashboard Setup (React + Vite)
1. Navigate to the `dashboard/` directory.
2. Install Node packages:
   ```bash
   npm install
   ```
3. Create a `.env` file inside `/dashboard`:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
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

### 2. Backend Setup (Render)
1. Deploy the repository as a **Web Service** on Render.
2. Select **Python 3** environment.
3. Configure the Start Command:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
4. Add the following **Environment Variables**:
   * `DATABASE_URL`: Your Supabase Transaction Pooler connection string.
   * `ALLOWED_ORIGINS`: Your Vercel frontend URL (e.g. `https://your-app.vercel.app`).
   * `SUPABASE_JWT_SECRET`: Your Supabase JWT secret string (found in Supabase Settings -> JWT Keys -> Legacy JWT Secret).

### 3. Frontend Setup (Vercel)
1. Connect your repository on Vercel and import the project.
2. Set the **Root Directory** setting to `dashboard`.
3. Add the following **Environment Variables**:
   * `VITE_API_URL`: Your live Render backend URL (e.g. `https://email-tracker-api-s7y7.onrender.com`).
   * `VITE_SUPABASE_URL`: Your Supabase base project URL.
   * `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key.

---

## Known Limitations

*   **Image Caching**: Many modern email clients (most notably Gmail) proxy and cache external images. When a recipient opens the email for the first time, Gmail's proxy server fetches the pixel (registering an open). However, subsequent opens might load the cached image from Gmail's CDN rather than requesting it from our server. This can lead to repeat opens being under-reported.
*   **"Images Off" Settings**: If a recipient has configured their email client to block external images by default (e.g. "Ask before displaying external images"), the tracking pixel will not load. Consequently, opens for these recipients cannot be tracked.
*   **Manual Reply Detection**: The database tracks whether a recipient has replied via the `replied` boolean column. However, the system currently does not parse inbound inbox folders via IMAP or monitor Gmail webhooks. Replies are currently simulated in seed data or must be manually updated in the database.
