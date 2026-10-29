"""
Authentication utilities for role-based access control
"""
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, AuditLog

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "relife_demo_secret_key_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Use SHA256 for demo (simpler, no bcrypt issues on Windows)
import hashlib

security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using SHA256 (demo purposes)"""
    # In production, use bcrypt or argon2
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return hash_password(plain_password) == hashed_password


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def generate_otp() -> str:
    """Generate a 6-digit OTP for demo purposes"""
    return str(secrets.randbelow(1000000)).zfill(6)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user"""
    token = credentials.credentials
    payload = decode_token(token)
    
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user


def require_role(*allowed_roles: str):
    """Dependency to check if user has required role"""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


def log_audit(
    db: Session,
    user: User,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    before_value: Optional[str] = None,
    after_value: Optional[str] = None,
    reason: Optional[str] = None,
    ip_address: Optional[str] = None
):
    """Log an audit trail entry"""
    audit = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else "system",
        role=user.role if user else "system",
        action=action,
        target_type=target_type,
        target_id=target_id,
        before_value=before_value,
        after_value=after_value,
        reason=reason,
        ip_address=ip_address
    )
    db.add(audit)
    db.commit()


# Role constants
ROLE_SUPER_ADMIN = "super_admin"
ROLE_INSPECTOR = "inspector"
ROLE_RESELLER = "reseller"
ROLE_CUSTOMER = "customer"
ROLE_REPAIR_PARTNER = "repair_partner"
ROLE_RECYCLER = "recycler"

ALL_ROLES = [
    ROLE_SUPER_ADMIN,
    ROLE_INSPECTOR,
    ROLE_RESELLER,
    ROLE_CUSTOMER,
    ROLE_REPAIR_PARTNER,
    ROLE_RECYCLER
]
