"""
Allocation Engine API endpoints (Part A)
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from ..database import get_db
from ..models import (
    ProductEnquiry, ShopListing, AllocationConfig, AllocationRun,
    AllocationDetail, BuyerStats, User, Reservation, NotificationOutbox
)
from ..auth import get_current_user, require_role, log_audit, ROLE_SUPER_ADMIN
from ..allocation_engine import allocate_stock, check_expired_reservations

router = APIRouter(prefix="/api/allocation", tags=["Allocation Engine"])


class EnquiryCreateRequest(BaseModel):
    listing_id: int
    quantity_needed: int = 1
    max_price: float
    is_urgent: bool = False


class EnquiryResponse(BaseModel):
    id: int
    user_id: int
    model: str
    category: str
    reseller_tier: str
    quantity_needed: int
    max_price: float
    is_urgent: bool
    status: str
    created_at: datetime
    allocation_score: Optional[float]


class AllocationRunResponse(BaseModel):
    id: int
    listing_id: int
    trigger_type: str
    stock_available: int
    enquiries_matched: int
    enquiries_allocated: int
    had_tie_breaker: bool
    status: str
    started_at: datetime
    completed_at: Optional[datetime]


class AllocationDetailResponse(BaseModel):
    id: int
    user_email: str
    tier_score: float
    recency_score: float
    reliability_score: float
    price_ratio_score: float
    cancellation_penalty: float
    urgency_bonus: float
    total_score: float
    rank: int
    was_allocated: bool
    allocation_status: Optional[str]
    notified_at: Optional[datetime]


class AllocationConfigResponse(BaseModel):
    id: int
    weight_tier: float
    weight_recency: float
    weight_reliability: float
    weight_price_ratio: float
    weight_cancellation: float
    reservation_hold_hours: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConfigUpdateRequest(BaseModel):
    weight_tier: float
    weight_recency: float
    weight_reliability: float
    weight_price_ratio: float
    weight_cancellation: float
    urgency_bonus: Optional[float] = 0.05
    tie_threshold: Optional[float] = 0.02
    auction_duration_seconds: Optional[int] = 60
    reservation_window_minutes: Optional[int] = 20


class ReservationResponse(BaseModel):
    id: int
    listing_id: int
    buyer_name: str
    buyer_email: str
    quantity_reserved: int
    reserved_price_inr: float
    status: str
    expires_at: datetime
    created_at: datetime
    time_remaining_seconds: Optional[int]


@router.post("/enquiries", response_model=EnquiryResponse)
def create_enquiry(
    request: EnquiryCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a product enquiry / "Notify Me" request (Part A - Step 1)
    Works for out-of-stock, pending recovery, or available items
    """
    # Get listing
    listing = db.query(ShopListing).filter(ShopListing.id == request.listing_id).first()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    # Check if user already has an active enquiry for this listing
    existing = db.query(ProductEnquiry).filter(
        and_(
            ProductEnquiry.user_id == current_user.id,
            ProductEnquiry.listing_id == request.listing_id,
            ProductEnquiry.status == "active"
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active enquiry for this product"
        )
    
    # Create enquiry
    enquiry = ProductEnquiry(
        user_id=current_user.id,
        product_id=listing.product_id,
        listing_id=listing.id,
        model=listing.model,
        category=listing.category,
        reseller_tier=current_user.reseller_tier or "Bronze",
        quantity_needed=request.quantity_needed,
        max_price=request.max_price,
        is_urgent=request.is_urgent,
        status="active"
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)
    
    # Log audit
    log_audit(
        db=db,
        user=current_user,
        action="create_enquiry",
        target_type="enquiry",
        target_id=str(enquiry.id)
    )
    
    # If stock is available and auto-booking is enabled, trigger allocation
    if listing.available_quantity > 0 and listing.auto_book_on_publish:
        try:
            allocate_stock(listing.id, "auto", db)
        except Exception as e:
            print(f"Auto-allocation failed: {e}")
    
    return EnquiryResponse(
        id=enquiry.id,
        user_id=enquiry.user_id,
        model=enquiry.model,
        category=enquiry.category,
        reseller_tier=enquiry.reseller_tier,
        quantity_needed=enquiry.quantity_needed,
        max_price=enquiry.max_price,
        is_urgent=enquiry.is_urgent,
        status=enquiry.status,
        created_at=enquiry.created_at,
        allocation_score=enquiry.allocation_score
    )


@router.get("/enquiries", response_model=List[EnquiryResponse])
def get_my_enquiries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all enquiries for current user
    """
    enquiries = db.query(ProductEnquiry).filter(
        ProductEnquiry.user_id == current_user.id
    ).order_by(desc(ProductEnquiry.created_at)).all()
    
    return [
        EnquiryResponse(
            id=e.id,
            user_id=e.user_id,
            model=e.model,
            category=e.category,
            reseller_tier=e.reseller_tier,
            quantity_needed=e.quantity_needed,
            max_price=e.max_price,
            is_urgent=e.is_urgent,
            status=e.status,
            created_at=e.created_at,
            allocation_score=e.allocation_score
        )
        for e in enquiries
    ]


@router.delete("/enquiries/{enquiry_id}")
def cancel_enquiry(
    enquiry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel an enquiry
    """
    enquiry = db.query(ProductEnquiry).filter(
        and_(
            ProductEnquiry.id == enquiry_id,
            ProductEnquiry.user_id == current_user.id
        )
    ).first()
    
    if not enquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enquiry not found"
        )
    
    if enquiry.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel enquiry with status: {enquiry.status}"
        )
    
    enquiry.status = "cancelled"
    db.commit()
    
    log_audit(
        db=db,
        user=current_user,
        action="cancel_enquiry",
        target_type="enquiry",
        target_id=str(enquiry_id)
    )
    
    return {"message": "Enquiry cancelled successfully"}


@router.post("/run/{listing_id}", response_model=AllocationRunResponse)
def run_allocation(
    listing_id: int,
    current_user: User = Depends(require_role(ROLE_SUPER_ADMIN, "inspector")),
    db: Session = Depends(get_db)
):
    """
    Manually trigger allocation for a listing (Part A - Step 2)
    Demo button to show the allocation engine in action
    """
    listing = db.query(ShopListing).filter(ShopListing.id == listing_id).first()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    if listing.available_quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No stock available to allocate"
        )
    
    # Run allocation
    allocation_run = allocate_stock(listing_id, "manual", db)
    
    # Log audit
    log_audit(
        db=db,
        user=current_user,
        action="run_allocation",
        target_type="listing",
        target_id=str(listing_id),
        after_value=f"Allocated {allocation_run.enquiries_allocated} of {allocation_run.enquiries_matched} enquiries"
    )
    
    return AllocationRunResponse(
        id=allocation_run.id,
        listing_id=allocation_run.listing_id,
        trigger_type=allocation_run.trigger_type,
        stock_available=allocation_run.stock_available,
        enquiries_matched=allocation_run.enquiries_matched,
        enquiries_allocated=allocation_run.enquiries_allocated,
        had_tie_breaker=allocation_run.had_tie_breaker,
        status=allocation_run.status,
        started_at=allocation_run.started_at,
        completed_at=allocation_run.completed_at
    )


@router.get("/runs/{run_id}", response_model=dict)
def get_allocation_run(
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get allocation run details with score breakdown (Part A - Step 5)
    Shows explainability: why each buyer was scored and allocated
    """
    allocation_run = db.query(AllocationRun).filter(AllocationRun.id == run_id).first()
    if not allocation_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Allocation run not found"
        )
    
    # Get all details
    details = db.query(AllocationDetail).filter(
        AllocationDetail.allocation_run_id == run_id
    ).order_by(AllocationDetail.rank).all()
    
    # Get listing info
    listing = db.query(ShopListing).filter(
        ShopListing.id == allocation_run.listing_id
    ).first()
    
    return {
        "allocation_run": AllocationRunResponse(
            id=allocation_run.id,
            listing_id=allocation_run.listing_id,
            trigger_type=allocation_run.trigger_type,
            stock_available=allocation_run.stock_available,
            enquiries_matched=allocation_run.enquiries_matched,
            enquiries_allocated=allocation_run.enquiries_allocated,
            had_tie_breaker=allocation_run.had_tie_breaker,
            status=allocation_run.status,
            started_at=allocation_run.started_at,
            completed_at=allocation_run.completed_at
        ),
        "listing": {
            "id": listing.id if listing else None,
            "model": listing.model if listing else None,
            "price_inr": listing.price_inr if listing else None,
            "condition_grade": listing.condition_grade if listing else None
        },
        "details": [
            AllocationDetailResponse(
                id=d.id,
                user_email=d.user_email,
                tier_score=d.tier_score,
                recency_score=d.recency_score,
                reliability_score=d.reliability_score,
                price_ratio_score=d.price_ratio_score,
                cancellation_penalty=d.cancellation_penalty,
                urgency_bonus=d.urgency_bonus,
                total_score=d.total_score,
                rank=d.rank,
                was_allocated=d.was_allocated,
                allocation_status=d.allocation_status,
                notified_at=d.notified_at
            )
            for d in details
        ]
    }


@router.get("/config", response_model=AllocationConfigResponse)
def get_allocation_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get allocation configuration
    """
    config = db.query(AllocationConfig).first()
    if not config:
        config = AllocationConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.put("/config", response_model=AllocationConfigResponse)
def update_allocation_config(
    request: ConfigUpdateRequest,
    current_user: User = Depends(require_role(ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Update allocation weights (Part A - Step 3)
    Super Admin only - adjust the allocation algorithm
    """
    # Validate weights sum to 1.0
    total = (
        request.weight_tier +
        request.weight_recency +
        request.weight_reliability +
        request.weight_price_ratio +
        request.weight_cancellation
    )
    
    if not (0.99 <= total <= 1.01):  # Allow small floating point errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Weights must sum to 1.0 (got {total:.3f})"
        )
    
    config = db.query(AllocationConfig).first()
    if not config:
        config = AllocationConfig()
        db.add(config)
    
    # Store old values for audit
    old_values = {
        "weight_tier": config.weight_tier,
        "weight_recency": config.weight_recency,
        "weight_reliability": config.weight_reliability,
        "weight_price_ratio": config.weight_price_ratio,
        "weight_cancellation": config.weight_cancellation
    }
    
    # Update
    config.weight_tier = request.weight_tier
    config.weight_recency = request.weight_recency
    config.weight_reliability = request.weight_reliability
    config.weight_price_ratio = request.weight_price_ratio
    config.weight_cancellation = request.weight_cancellation
    config.urgency_bonus = request.urgency_bonus
    config.tie_threshold = request.tie_threshold
    config.auction_duration_seconds = request.auction_duration_seconds
    config.reservation_window_minutes = request.reservation_window_minutes
    config.updated_at = datetime.utcnow()
    config.updated_by = current_user.email
    
    db.commit()
    db.refresh(config)
    
    # Log audit
    log_audit(
        db=db,
        user=current_user,
        action="update_allocation_config",
        target_type="config",
        target_id="allocation_weights",
        before_value=str(old_values),
        after_value=str(request.dict()),
        reason="Manual configuration update"
    )
    
    return {
        "id": config.id,
        "weight_tier": config.weight_tier,
        "weight_recency": config.weight_recency,
        "weight_reliability": config.weight_reliability,
        "weight_price_ratio": config.weight_price_ratio,
        "weight_cancellation": config.weight_cancellation,
        "urgency_bonus": config.urgency_bonus,
        "tie_threshold": config.tie_threshold,
        "auction_duration_seconds": config.auction_duration_seconds,
        "reservation_window_minutes": config.reservation_window_minutes,
        "updated_at": config.updated_at,
        "updated_by": config.updated_by
    }


@router.get("/reservations", response_model=List[ReservationResponse])
def get_my_reservations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all reservations for current user (Part A - Step 4)
    """
    reservations = db.query(Reservation).filter(
        Reservation.buyer_email == current_user.email
    ).order_by(desc(Reservation.created_at)).all()
    
    now = datetime.utcnow()
    
    return [
        ReservationResponse(
            id=r.id,
            listing_id=r.listing_id,
            buyer_name=r.buyer_name,
            buyer_email=r.buyer_email,
            quantity_reserved=r.quantity_reserved,
            reserved_price_inr=r.reserved_price_inr,
            status=r.status,
            expires_at=r.expires_at,
            created_at=r.created_at,
            time_remaining_seconds=max(0, int((r.expires_at - now).total_seconds())) if r.status == "pending" else 0
        )
        for r in reservations
    ]


@router.post("/reservations/{reservation_id}/confirm")
def confirm_reservation(
    reservation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirm a reservation (simulates payment confirmation)
    """
    reservation = db.query(Reservation).filter(
        and_(
            Reservation.id == reservation_id,
            Reservation.buyer_email == current_user.email
        )
    ).first()
    
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    if reservation.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot confirm reservation with status: {reservation.status}"
        )
    
    # Check if expired
    if reservation.expires_at < datetime.utcnow():
        reservation.status = "expired"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservation has expired"
        )
    
    # Confirm
    reservation.status = "confirmed"
    db.commit()
    
    # Update enquiry
    if reservation.enquiry_id:
        enquiry = db.query(ProductEnquiry).filter(
            ProductEnquiry.id == reservation.enquiry_id
        ).first()
        if enquiry:
            enquiry.status = "fulfilled"
            db.commit()
    
    # Update buyer stats
    stats = db.query(BuyerStats).filter(BuyerStats.user_id == current_user.id).first()
    if stats:
        stats.total_orders += 1
        stats.confirmed_orders += 1
        stats.total_reservations += 1
        stats.reliability_score = stats.confirmed_orders / stats.total_orders
        stats.updated_at = datetime.utcnow()
        db.commit()
    
    # Log audit
    log_audit(
        db=db,
        user=current_user,
        action="confirm_reservation",
        target_type="reservation",
        target_id=str(reservation_id)
    )
    
    return {
        "message": "Reservation confirmed successfully! [SIMULATED - DEMO ONLY]",
        "reservation_id": reservation_id,
        "note": "In production, this would process real payment"
    }


@router.post("/reservations/{reservation_id}/decline")
def decline_reservation(
    reservation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Decline a reservation (buyer doesn't want it)
    """
    reservation = db.query(Reservation).filter(
        and_(
            Reservation.id == reservation_id,
            Reservation.buyer_email == current_user.email
        )
    ).first()
    
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    if reservation.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot decline reservation with status: {reservation.status}"
        )
    
    # Decline and release stock
    reservation.status = "released"
    
    # Release stock back to listing
    listing = db.query(ShopListing).filter(ShopListing.id == reservation.listing_id).first()
    if listing:
        listing.available_quantity += reservation.quantity_reserved
    
    # Update enquiry
    if reservation.enquiry_id:
        enquiry = db.query(ProductEnquiry).filter(
            ProductEnquiry.id == reservation.enquiry_id
        ).first()
        if enquiry:
            enquiry.status = "active"  # Back to active
    
    # Update buyer stats (penalize)
    stats = db.query(BuyerStats).filter(BuyerStats.user_id == current_user.id).first()
    if stats:
        stats.cancelled_reservations += 1
        stats.total_reservations += 1
        stats.cancellation_rate = stats.cancelled_reservations / stats.total_reservations
        stats.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Log audit
    log_audit(
        db=db,
        user=current_user,
        action="decline_reservation",
        target_type="reservation",
        target_id=str(reservation_id)
    )
    
    # TODO: Cascade to next buyer
    
    return {"message": "Reservation declined. Stock released for next buyer."}


@router.post("/check-expired")
def check_expired_reservations_endpoint(
    current_user: User = Depends(require_role(ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Manually check for expired reservations
    In production, this would run as a background job
    """
    expired_count = check_expired_reservations(db)
    return {
        "message": f"Checked and processed {expired_count} expired reservations",
        "expired_count": expired_count
    }


@router.get("/notifications", response_model=List[dict])
def get_notification_outbox(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get notification outbox (Part A - Step 5)
    Shows all simulated notifications sent to the user
    """
    notifications = db.query(NotificationOutbox).filter(
        NotificationOutbox.user_email == current_user.email
    ).order_by(desc(NotificationOutbox.created_at)).limit(50).all()
    
    return [
        {
            "id": n.id,
            "channel": n.channel,
            "title": n.title,
            "message": n.message,
            "status": n.status,
            "is_simulated": n.is_simulated,
            "sent_at": n.sent_at,
            "created_at": n.created_at
        }
        for n in notifications
    ]
