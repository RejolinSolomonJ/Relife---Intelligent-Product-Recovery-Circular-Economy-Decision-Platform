"""
Authentication API endpoints (Part B)
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, BuyerStats
from ..auth import (
    hash_password, verify_password, create_access_token,
    generate_otp, get_current_user, log_audit
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str  # customer | reseller | repair_partner | recycler
    reseller_tier: Optional[str] = "Bronze"  # Bronze | Silver | Gold (for resellers/customers)


class LoginRequest(BaseModel):
    email: str
    password: str


class VerifyOTPRequest(BaseModel):
    email: str
    otp_code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    reseller_tier: Optional[str]
    is_verified: bool
    is_active: bool
    created_at: datetime


@router.post("/signup", response_model=dict)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """
    Sign up a new user
    Creates user account and sends simulated OTP for verification
    """
    # Check if user already exists
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate role
    allowed_signup_roles = ["customer", "reseller", "repair_partner", "recycler"]
    if request.role not in allowed_signup_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Allowed: {', '.join(allowed_signup_roles)}"
        )
    
    # Create user
    otp = generate_otp()
    user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
        role=request.role,
        reseller_tier=request.reseller_tier if request.role in ["reseller", "customer"] else None,
        is_verified=False,
        is_active=True,
        otp_code=otp,
        otp_expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create buyer stats if reseller or customer
    if user.role in ["reseller", "customer"]:
        stats = BuyerStats(user_id=user.id)
        db.add(stats)
        db.commit()
    
    # Simulated OTP notification
    print(f"\n{'='*80}")
    print(f"📧 SIMULATED OTP EMAIL (DEMO MODE)")
    print(f"{'='*80}")
    print(f"To: {request.email}")
    print(f"Subject: Verify your ReLife AI account")
    print(f"")
    print(f"Your verification code is: {otp}")
    print(f"This code expires in 10 minutes.")
    print(f"")
    print(f"[This is a simulated notification for demo purposes]")
    print(f"{'='*80}\n")
    
    return {
        "message": "User created successfully. Please verify your email.",
        "user_id": user.id,
        "email": user.email,
        "otp_code_demo": otp,  # Only for demo!
        "note": "In production, OTP would be sent via email/SMS"
    }


@router.post("/verify-otp", response_model=dict)
def verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    Verify OTP code (simulated)
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_verified:
        return {"message": "User already verified", "verified": True}
    
    # Check OTP
    if not user.otp_code or user.otp_code != request.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code"
        )
    
    # Check expiration
    if user.otp_expires_at and user.otp_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP code expired"
        )
    
    # Verify user
    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()
    
    return {"message": "Email verified successfully", "verified": True}


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login and get JWT token
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Create access token
    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role,
            "user_id": user.id
        }
    )
    
    # Log audit
    log_audit(
        db=db,
        user=user,
        action="login",
        target_type="auth",
        target_id=str(user.id)
    )
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "reseller_tier": user.reseller_tier,
            "is_verified": user.is_verified
        }
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        reseller_tier=current_user.reseller_tier,
        is_verified=current_user.is_verified,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )


@router.post("/resend-otp", response_model=dict)
def resend_otp(email: str, db: Session = Depends(get_db)):
    """
    Resend OTP code
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_verified:
        return {"message": "User already verified"}
    
    # Generate new OTP
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    # Simulated notification
    print(f"\n{'='*80}")
    print(f"📧 SIMULATED OTP EMAIL (DEMO MODE)")
    print(f"{'='*80}")
    print(f"To: {email}")
    print(f"Your new verification code is: {otp}")
    print(f"{'='*80}\n")
    
    return {
        "message": "OTP resent successfully",
        "otp_code_demo": otp  # Only for demo!
    }
