"""
Admin API endpoints (Part B)
Super Admin functionality: user management, audit logs, overrides
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from ..database import get_db
from ..models import User, AuditLog, BuyerStats, Recommendation, ReturnItem
from ..auth import (
    get_current_user, require_role, log_audit, hash_password,
    ROLE_SUPER_ADMIN, ALL_ROLES
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class CreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str
    reseller_tier: Optional[str] = None
    is_verified: bool = True


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    reseller_tier: Optional[str] = None
    is_active: Optional[bool] = None


class UserListResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    reseller_tier: Optional[str]
    is_verified: bool
    is_active: bool
    created_at: datetime


class AuditLogResponse(BaseModel):
    id: int
    user_email: str
    role: str
    action: str
    target_type: Optional[str]
    target_id: Optional[str]
    before_value: Optional[str]
    after_value: Optional[str]
    reason: Optional[str]
    created_at: datetime


class OverrideDecisionRequest(BaseModel):
    new_pathway: str
    reason: str


@router.get("/users", response_model=List[UserListResponse])
def list_users(
    role: Optional[str] = Query(None),
    current_user: User = Depends(require_role(ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    """
    List all users (Super Admin only)
    """
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    
    users = query.order_by(desc(User.created_at)).all()
    
    return [
        UserListResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            reseller_tier=u.reseller_tier,
            is_verified=u.is_verified,
            is_active=u.is_active,
            created_at=u.created_at
        )
        for u in users
    ]


@router.post("/users", response_model=UserListResponse)
def create_user(
    request: CreateUserRequest,
    current_user: User = Depends(require_role(ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Create a new user (Super Admin only)
    """
    # Check if user already exists
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate role
    if request.role not in ALL_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Allowed: {', '.join(ALL_ROLES)}"
        )
    
    # Create user
    user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
        role=request.role,
        reseller_tier=request.reseller_tier,
        is_verified=request.is_verified,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create buyer stats if applicable
    if user.role in ["reseller", "customer"]:
        stats = BuyerStats(user_id=user.id)
        db.add(stats)
        db.commit()
    
    # Log audit
    log_audit(
        db=db,
        user=current_user,
        action="create_user",
        target_type="user",
        target_id=str(user.id),
        after_value=f"Created user {user.email} with role {user.role}"
    )
    
    return UserListResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        reseller_tier=user.reseller_tier,
        is_verified=user.is_verified,
        is_active=user.is_active,
        created_at=user.created_at
    )


@router.put("/users/{user_id}", response_model=UserListResponse)
def update_user(
    user_id: int,
    request: UpdateUserRequest,
    current_user: User = Depends(require_role(ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Update a user (Super Admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Store old values for audit
    old_values = {
        "full_name": user.full_name,
        "role": user.role,
        "reseller_tier": user.reseller_tier,
        "is_active": user.is_active
    }
    
    # Update fields
    if request.full_name is not None:
        user.full_name = request.full_name
    if request.role is not None:
        if request.role not in ALL_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Allowed: {', '.join(ALL_ROLES)}"
            )
        user.role = request.role
    if request.reseller_tier is not None:
        user.reseller_tier = request.reseller_tier
    if request.is_active is not None:
        user.is_active = request.is_active
    
    db.commit()
    db.refresh(user)
    
    # Log audit
    log_audit(
        db=db,
        user=current_user,
        action="update_user",
        target_type="user",
        target_id=str(user_id),
        before_value=str(old_values),
        after_value=str(request.dict(exclude_none=True))
    )
    
    return UserListResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        reseller_tier=user.reseller_tier,
        is_verified=user.is_verified,
        is_active=user.is_active,
        created_at=user.created_at
    )


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    current_user: User = Depends(require_role(ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Get audit logs with filters (Super Admin only)
    """
    query = db.query(AuditLog)
    
    if action:
        query = query.filter(AuditLog.action == action)
    if role:
        query = query.filter(AuditLog.role == role)
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)
    
    logs = query.order_by(desc(AuditLog.created_at)).limit(limit).all()
    
    return [
        AuditLogResponse(
            id=log.id,
            user_email=log.user_email,
            role=log.role,
            action=log.action,
            target_type=log.target_type,
            target_id=log.target_id,
            before_value=log.before_value,
            after_value=log.after_value,
            reason=log.reason,
            created_at=log.created_at
        )
        for log in logs
    ]


@router.post("/returns/{return_id}/override", response_model=dict)
def override_ai_decision(
    return_id: str,
    request: OverrideDecisionRequest,
    current_user: User = Depends(require_role(ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Override AI recommendation (Super Admin only)
    Requires a reason for audit trail
    """
    # Get return item
    return_item = db.query(ReturnItem).filter(ReturnItem.id == return_id).first()
    if not return_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Return item not found"
        )
    
    # Get current recommendation
    recommendation = db.query(Recommendation).filter(
        Recommendation.return_id == return_id
    ).first()
    
    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No recommendation found for this return"
        )
    
    # Validate new pathway
    valid_pathways = [
        "Direct Resale", "Repair", "Refurbishment",
        "Component Harvesting", "Recycling"
    ]
    if request.new_pathway not in valid_pathways:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid pathway. Allowed: {', '.join(valid_pathways)}"
        )
    
    # Store old values
    old_pathway = recommendation.selected_pathway
    
    # Update recommendation
    recommendation.selected_pathway = request.new_pathway
    recommendation.safety_override_triggered = True
    recommendation.human_review_required = False
    
    # Update return status
    return_item.status = "Recovered"
    return_item.needs_human_review = False
    
    db.commit()
    
    # Log audit with reason
    log_audit(
        db=db,
        user=current_user,
        action="override_ai_decision",
        target_type="return",
        target_id=return_id,
        before_value=f"AI recommended: {old_pathway}",
        after_value=f"Overridden to: {request.new_pathway}",
        reason=request.reason
    )
    
    return {
        "message": "AI decision overridden successfully",
        "return_id": return_id,
        "old_pathway": old_pathway,
        "new_pathway": request.new_pathway,
        "reason": request.reason,
        "overridden_by": current_user.email,
        "overridden_at": datetime.utcnow()
    }


@router.get("/stats", response_model=dict)
def get_admin_stats(
    current_user: User = Depends(require_role(ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Get platform statistics (Super Admin only)
    """
    total_users = db.query(User).count()
    total_returns = db.query(ReturnItem).count()
    pending_reviews = db.query(ReturnItem).filter(
        ReturnItem.needs_human_review == True
    ).count()
    recent_overrides = db.query(AuditLog).filter(
        AuditLog.action == "override_ai_decision"
    ).count()
    
    # User breakdown by role
    role_counts = {}
    for role in ALL_ROLES:
        count = db.query(User).filter(User.role == role).count()
        role_counts[role] = count
    
    return {
        "total_users": total_users,
        "total_returns": total_returns,
        "pending_reviews": pending_reviews,
        "total_overrides": recent_overrides,
        "users_by_role": role_counts
    }
