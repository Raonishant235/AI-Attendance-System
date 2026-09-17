from fastapi import Depends, HTTPException, status
from app.auth.security import get_current_user

def require_admin(current_user = Depends(get_current_user)):
    """Allow access only to authenticated users whose role is admin."""

    role = getattr(current_user, "role", "")

    if str(role).lower() != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator privileges required")

    return current_user