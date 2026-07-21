import os
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# HTTPBearer extracts token from 'Authorization: Bearer <token>' header
security = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Extracts and verifies the Supabase JWT Bearer token from the request header.
    Returns the authenticated user's unique Supabase UUID ('sub' claim).
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing Authorization Bearer token header.",
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

def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str | None:
    """
    Optional authentication dependency. Returns user_id if valid Bearer token exists, otherwise returns None.
    """
    if not credentials:
        return None
    try:
        return get_current_user(credentials)
    except HTTPException:
        return None

