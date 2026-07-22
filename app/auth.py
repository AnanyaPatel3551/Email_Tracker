import os
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from app.database import SessionLocal

# HTTPBearer extracts token from 'Authorization: Bearer <token>' header
security = HTTPBearer(auto_error=False)

# APIKeyHeader extracts key from 'X-API-Key: et_live_...' header
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    api_key: str | None = Depends(api_key_header),
) -> str:
    """
    Extracts and verifies authentication credentials from either:
    1. X-API-Key custom header (from Chrome Extension / API clients)
    2. Authorization Bearer JWT header (from Dashboard)
    Returns the authenticated user's unique Supabase UUID.
    """
    # 1. Check X-API-Key header if provided
    if api_key:
        from app.models.api_key import ApiKey
        db = SessionLocal()
        try:
            record = db.query(ApiKey).filter(ApiKey.key == api_key).first()
            if record:
                return record.user_id
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid API Key provided in X-API-Key header.",
                )
        finally:
            db.close()

    # 2. Check Bearer token if API Key is not provided
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing Authorization Bearer token or X-API-Key header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET")

    try:
        if jwt_secret:
            # Cryptographically verify token signature using Supabase JWT secret
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
        else:
            # Fallback mode for local dev if SUPABASE_JWT_SECRET is not configured yet
            print("[Auth Warning] SUPABASE_JWT_SECRET not set in environment. Decoding token without signature verification.")
            payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: Missing 'sub' user ID claim.",
            )
        
        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
        )
    except jwt.InvalidTokenError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(err)}",
        )

def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    api_key: str | None = Depends(api_key_header),
) -> str | None:
    """
    Optional authentication dependency. Returns user_id if valid Bearer token or API key exists, otherwise returns None.
    """
    if not credentials and not api_key:
        return None
    try:
        return get_current_user(credentials, api_key)
    except HTTPException:
        return None


