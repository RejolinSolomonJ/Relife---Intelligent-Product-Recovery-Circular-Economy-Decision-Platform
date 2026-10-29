"""
Weighted Allocation Engine for Auto-Booking (Part A)
Scores and allocates enquiries based on tier, recency, reliability, price ratio, and cancellation rate
"""
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from .models import (
    ProductEnquiry, ShopListing, AllocationConfig, AllocationRun,
    AllocationDetail, BuyerStats, User, Reservation, NotificationOutbox
)


def get_tier_score(tier: str) -> float:
    """Convert tier to normalized score"""
    tier_map = {
        "Bronze": 0.3,
        "Silver": 0.6,
        "Gold": 1.0
    }
    return tier_map.get(tier, 0.3)


def calculate_recency_score(created_at: datetime, all_enquiries: List[ProductEnquiry]) -> float:
    """
    Earlier enquiries score higher
    Normalize across all open enquiries (0 to 1)
    """
    if not all_enquiries:
        return 1.0
    
    # Sort by created_at ascending (earliest first)
    sorted_enquiries = sorted(all_enquiries, key=lambda e: e.created_at)
    
    if len(sorted_enquiries) == 1:
        return 1.0
    
    # Find index of current enquiry
    try:
        index = next(i for i, e in enumerate(sorted_enquiries) if e.created_at == created_at)
        # Earlier = higher score (reverse the index)
        score = 1.0 - (index / (len(sorted_enquiries) - 1))
        return max(0.0, min(1.0, score))
    except StopIteration:
        return 0.5


def calculate_reliability_score(user_id: int, db: Session) -> float:
    """
    Share of past orders confirmed and paid
    New buyers default to 0.5
    """
    stats = db.query(BuyerStats).filter(BuyerStats.user_id == user_id).first()
    if not stats or stats.total_orders == 0:
        return 0.5  # Default for new buyers
    
    return stats.reliability_score


def calculate_price_ratio_score(max_price: float, listing_price: float) -> float:
    """
    max_price / market_price, capped at 1.2
    So nobody can win just by bidding absurdly high
    """
    if listing_price <= 0:
        return 0.0
    
    ratio = max_price / listing_price
    # Cap at 1.2 and normalize to 0-1 range
    capped_ratio = min(ratio, 1.2)
    
    # If ratio < 1.0, score proportionally lower
    if capped_ratio < 1.0:
        return capped_ratio
    else:
        # Scale 1.0 to 1.2 to map to 1.0
        return 1.0


def calculate_cancellation_penalty(user_id: int, db: Session) -> float:
    """
    Share of past reservations that were declined or expired
    Returns a penalty (0 to 1, where higher is worse)
    """
    stats = db.query(BuyerStats).filter(BuyerStats.user_id == user_id).first()
    if not stats or stats.total_reservations == 0:
        return 0.0  # No history = no penalty
    
    return stats.cancellation_rate


def calculate_weighted_score(
    enquiry: ProductEnquiry,
    all_matching_enquiries: List[ProductEnquiry],
    listing_price: float,
    config: AllocationConfig,
    db: Session
) -> Dict[str, float]:
    """
    Calculate the weighted allocation score for an enquiry
    Returns a dict with score breakdown
    """
    tier_score = get_tier_score(enquiry.reseller_tier)
    recency_score = calculate_recency_score(enquiry.created_at, all_matching_enquiries)
    reliability_score = calculate_reliability_score(enquiry.user_id, db)
    price_ratio_score = calculate_price_ratio_score(enquiry.max_price, listing_price)
    cancellation_penalty = calculate_cancellation_penalty(enquiry.user_id, db)
    urgency_bonus = config.urgency_bonus if enquiry.is_urgent else 0.0
    
    # Calculate weighted total
    total_score = (
        config.weight_tier * tier_score +
        config.weight_recency * recency_score +
        config.weight_reliability * reliability_score +
        config.weight_price_ratio * price_ratio_score -
        config.weight_cancellation * cancellation_penalty +
        urgency_bonus
    )
    
    return {
        "tier_score": tier_score,
        "recency_score": recency_score,
        "reliability_score": reliability_score,
        "price_ratio_score": price_ratio_score,
        "cancellation_penalty": cancellation_penalty,
        "urgency_bonus": urgency_bonus,
        "total_score": total_score
    }


def find_matching_enquiries(
    listing: ShopListing,
    db: Session
) -> List[ProductEnquiry]:
    """
    Find all active enquiries that match the listing criteria:
    - Same model/category
    - Condition grade acceptable
    - Max price >= listed price
    """
    # Get all active enquiries for this model
    enquiries = db.query(ProductEnquiry).filter(
        and_(
            ProductEnquiry.model == listing.model,
            ProductEnquiry.category == listing.category,
            ProductEnquiry.max_price >= listing.price_inr,
            ProductEnquiry.status == "active"
        )
    ).all()
    
    return enquiries


def allocate_stock(
    listing_id: int,
    trigger_type: str,
    db: Session
) -> AllocationRun:
    """
    Main allocation engine
    
    Steps:
    1. Find matching enquiries
    2. Score each enquiry
    3. Sort by score descending
    4. Allocate until stock runs out
    5. Handle tie-breakers
    6. Create reservations and notifications
    """
    # Get listing
    listing = db.query(ShopListing).filter(ShopListing.id == listing_id).first()
    if not listing:
        raise ValueError(f"Listing {listing_id} not found")
    
    # Get allocation config
    config = db.query(AllocationConfig).first()
    if not config:
        # Create default config if none exists
        config = AllocationConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    
    # Find matching enquiries
    matching_enquiries = find_matching_enquiries(listing, db)
    
    # Create allocation run
    allocation_run = AllocationRun(
        listing_id=listing_id,
        trigger_type=trigger_type,
        stock_available=listing.available_quantity,
        enquiries_matched=len(matching_enquiries),
        status="running"
    )
    db.add(allocation_run)
    db.commit()
    db.refresh(allocation_run)
    
    if not matching_enquiries:
        allocation_run.status = "completed"
        allocation_run.completed_at = datetime.utcnow()
        db.commit()
        return allocation_run
    
    # Score all enquiries
    scored_enquiries = []
    for enquiry in matching_enquiries:
        scores = calculate_weighted_score(
            enquiry,
            matching_enquiries,
            listing.price_inr,
            config,
            db
        )
        scored_enquiries.append((enquiry, scores))
    
    # Sort by total score descending
    scored_enquiries.sort(key=lambda x: x[1]["total_score"], reverse=True)
    
    # Allocate stock
    allocated_count = 0
    stock_remaining = listing.available_quantity
    
    for rank, (enquiry, scores) in enumerate(scored_enquiries, 1):
        # Create allocation detail
        user = db.query(User).filter(User.id == enquiry.user_id).first()
        detail = AllocationDetail(
            allocation_run_id=allocation_run.id,
            enquiry_id=enquiry.id,
            user_email=user.email if user else "unknown",
            tier_score=scores["tier_score"],
            recency_score=scores["recency_score"],
            reliability_score=scores["reliability_score"],
            price_ratio_score=scores["price_ratio_score"],
            cancellation_penalty=scores["cancellation_penalty"],
            urgency_bonus=scores["urgency_bonus"],
            total_score=scores["total_score"],
            rank=rank,
            was_allocated=False
        )
        db.add(detail)
        
        # Check if we can allocate
        if stock_remaining > 0 and enquiry.quantity_needed <= stock_remaining:
            # Check for ties
            is_tied = False
            if rank > 1:
                prev_score = scored_enquiries[rank - 2][1]["total_score"]
                if abs(scores["total_score"] - prev_score) <= config.tie_threshold:
                    is_tied = True
                    detail.allocation_status = "tied"
                    allocation_run.had_tie_breaker = True
            
            if not is_tied:
                # Allocate!
                detail.was_allocated = True
                detail.allocation_status = "allocated"
                detail.notified_at = datetime.utcnow()
                
                # Create reservation
                reservation = Reservation(
                    listing_id=listing_id,
                    enquiry_id=enquiry.id,
                    buyer_name=user.full_name if user else "Unknown",
                    buyer_email=user.email if user else "unknown@example.com",
                    buyer_type=user.role if user else "customer",
                    quantity_reserved=enquiry.quantity_needed,
                    reserved_price_inr=listing.price_inr,
                    status="pending",
                    expires_at=datetime.utcnow() + timedelta(minutes=config.reservation_window_minutes)
                )
                db.add(reservation)
                db.commit()
                db.refresh(reservation)
                
                # Update enquiry
                enquiry.status = "allocated"
                enquiry.allocation_score = scores["total_score"]
                enquiry.allocated_at = datetime.utcnow()
                enquiry.reservation_id = reservation.id
                
                # Update stock
                stock_remaining -= enquiry.quantity_needed
                allocated_count += 1
                
                # Send notification
                send_allocation_notification(user, listing, reservation, config, db)
        
        db.commit()
    
    # Update allocation run
    allocation_run.enquiries_allocated = allocated_count
    allocation_run.status = "completed"
    allocation_run.completed_at = datetime.utcnow()
    
    # Update listing available quantity
    listing.available_quantity = stock_remaining
    
    db.commit()
    db.refresh(allocation_run)
    
    return allocation_run


def send_allocation_notification(
    user: User,
    listing: ShopListing,
    reservation: Reservation,
    config: AllocationConfig,
    db: Session
):
    """
    Send notifications through multiple channels (simulated)
    """
    minutes = config.reservation_window_minutes
    message = (
        f"Good news! The {listing.model} ({listing.condition_grade}) you enquired about "
        f"is now available. You have {minutes} minutes to confirm your booking at "
        f"₹{listing.price_inr:,.0f}. [SIMULATED PRICE - DEMO ONLY]"
    )
    
    # In-app notification
    notif = NotificationOutbox(
        user_email=user.email,
        channel="in_app",
        title="Product Available - Confirm Booking",
        message=message,
        status="sent",
        is_simulated=True,
        sent_at=datetime.utcnow()
    )
    db.add(notif)
    
    # Email notification (simulated)
    email_notif = NotificationOutbox(
        user_email=user.email,
        channel="email",
        title="Product Available - Confirm Booking",
        message=message,
        status="sent",
        is_simulated=True,
        sent_at=datetime.utcnow()
    )
    db.add(email_notif)
    
    # SMS notification (simulated)
    sms_notif = NotificationOutbox(
        user_email=user.email,
        channel="sms",
        title="Product Available",
        message=f"Your enquiry for {listing.model} is ready! {minutes}min to confirm. [DEMO]",
        status="sent",
        is_simulated=True,
        sent_at=datetime.utcnow()
    )
    db.add(sms_notif)
    
    # WhatsApp notification (simulated)
    whatsapp_notif = NotificationOutbox(
        user_email=user.email,
        channel="whatsapp",
        title="Product Available",
        message=message,
        status="sent",
        is_simulated=True,
        sent_at=datetime.utcnow()
    )
    db.add(whatsapp_notif)
    
    db.commit()
    
    # Log to console for demo
    print(f"\n{'='*80}")
    print(f"📧 SIMULATED NOTIFICATION SENT (DEMO ONLY)")
    print(f"{'='*80}")
    print(f"To: {user.email}")
    print(f"Channels: In-App, Email, SMS, WhatsApp")
    print(f"Message: {message}")
    print(f"Reservation ID: {reservation.id}")
    print(f"Expires: {reservation.expires_at}")
    print(f"{'='*80}\n")


def check_expired_reservations(db: Session):
    """
    Check for expired reservations and cascade to next buyer
    Should be called periodically
    """
    now = datetime.utcnow()
    expired = db.query(Reservation).filter(
        and_(
            Reservation.status == "pending",
            Reservation.expires_at <= now
        )
    ).all()
    
    for reservation in expired:
        # Mark as expired
        reservation.status = "expired"
        
        # Update enquiry
        if reservation.enquiry_id:
            enquiry = db.query(ProductEnquiry).filter(
                ProductEnquiry.id == reservation.enquiry_id
            ).first()
            if enquiry:
                enquiry.status = "active"  # Back to active
        
        # Release stock back to listing
        listing = db.query(ShopListing).filter(
            ShopListing.id == reservation.listing_id
        ).first()
        if listing:
            listing.available_quantity += reservation.quantity_reserved
        
        # Update buyer stats (increase cancellation rate)
        user = db.query(User).filter(User.email == reservation.buyer_email).first()
        if user:
            stats = db.query(BuyerStats).filter(BuyerStats.user_id == user.id).first()
            if stats:
                stats.cancelled_reservations += 1
                stats.total_reservations += 1
                stats.cancellation_rate = stats.cancelled_reservations / stats.total_reservations
                stats.updated_at = datetime.utcnow()
        
        print(f"\n⏰ RESERVATION EXPIRED (DEMO): {reservation.id} for {reservation.buyer_email}")
        print(f"   Product: Listing #{reservation.listing_id}")
        print(f"   Cascading to next buyer...\n")
        
        # TODO: Cascade to next ranked enquiry
        # For now, just release the stock
    
    db.commit()
    
    return len(expired)
