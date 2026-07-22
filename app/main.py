import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes.pixel import router as pixel_router
from app.routes.email import router as email_router
from app.routes.api_key import router as api_key_router
from app.scheduler import start_scheduler, scheduler
import app.models  # Registers Email and Event models on Base

# Automatically create tables in SQLite on application startup
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions: Start the background scheduler
    start_scheduler()
    yield
    # Shutdown actions: Gracefully stop the scheduler threads
    scheduler.shutdown()

app = FastAPI(
    title="Email Tracker API",
    description="Backend API for tracking email opens and clicks",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS origins
allowed_origins = [
    "https://mail.google.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]

# Add any additional production origins from environment variables
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    allowed_origins.extend([origin.strip() for origin in env_origins.split(",") if origin.strip()])

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the tracking routes
app.include_router(pixel_router)
app.include_router(email_router)
app.include_router(api_key_router)


@app.get("/")
def read_root():
    return {"status": "healthy", "service": "Email Tracker API"}



