from datetime import datetime, timedelta
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from ..database import get_db
from ..models import ShopListing, WaitlistEnquiry, Reservation, Notification, ReturnItem, Product

logger = logging.getLogger("relife.shop")
router = APIRouter(prefix="/api/shop", tags=["shop_storefront"])

GRADE_RANKS = {
    "Like New": 4,
    "Grade A": 3,
    "Refurbished": 2,
    "Grade B": 1,
    "Grade C": 0
}


def send_email_stub(to_email: str, subject: str, body: str):
    """
    Console-logged stubbed email delivery function for hackathon demonstration.
    """
    safe_subject = subject.encode('ascii', errors='replace').decode('ascii')
    safe_body = body.encode('ascii', errors='replace').decode('ascii')
    print(f"\n[EMAIL DISPATCH STUB] ========================================")
    print(f"TO: {to_email}")
    print(f"SUBJECT: {safe_subject}")
    print(f"BODY:\n{safe_body}")
    print(f"==============================================================\n")
    logger.info(f"Stub email sent to {to_email}")


# Pydantic Schemas
class ShopListingCreate(BaseModel):
    title: str
    category: str
    brand: str
    model: str
    condition_grade: str = "Refurbished"
    price_inr: float
    original_msrp: float = 0.0
    stock_quantity: int = 1
    description: Optional[str] = None
    image_url: Optional[str] = None
    product_id: Optional[str] = None
    return_id: Optional[str] = None
    auto_book_on_publish: bool = True
    listing_type: str = "product"  # product | component
    # Reverse auction options
    is_reverse_auction: bool = False
    auction_start_price: float = 0.0
    auction_floor_price: float = 0.0
    auction_step_interval_min: int = 2
    auction_step_amount: float = 150.0


class WaitlistEnquiryCreate(BaseModel):
    buyer_name: str
    buyer_email: str
    buyer_type: str = "customer"  # customer | reseller
    category: str
    brand: str
    model: str
    min_condition_grade: str = "Refurbished"
    max_budget_inr: float
    quantity_requested: int = 1


def auto_allocate_enquiries_for_listing(listing: ShopListing, db: Session) -> List[Reservation]:
    """
    Core atomic allocation engine:
    Matches open enquiries (First-Come, First-Served) and allocates reservations up to available stock.
    Runs strictly inside the active database transaction to avoid double booking.
    """
    if listing.available_quantity <= 0:
        return []

    # Find active enquiries matching model or category, within max budget, and meeting condition threshold
    # Sort strictly by created_at ASC (FCFS)
    candidates = (
        db.query(WaitlistEnquiry)
        .filter(
            WaitlistEnquiry.status == "active",
            WaitlistEnquiry.max_budget_inr >= listing.price_inr,
        )
        .order_by(WaitlistEnquiry.created_at.asc())
        .all()
    )

    new_reservations = []
    listing_model_clean = listing.model.lower().replace("-", " ").strip()
    listing_brand_clean = listing.brand.lower().strip()
    listing_grade_rank = GRADE_RANKS.get(listing.condition_grade, 2)

    for enquiry in candidates:
        if listing.available_quantity <= 0:
            break

        enq_model_clean = enquiry.model.lower().replace("-", " ").strip()
        enq_brand_clean = enquiry.brand.lower().strip()

        # Check brand match
        brand_match = (enq_brand_clean in listing_brand_clean) or (listing_brand_clean in enq_brand_clean) or (enquiry.brand == "Any")
        
        # Check model match (partial or keyword match)
        model_match = (
            enquiry.model == "Any" 
            or enq_model_clean in listing_model_clean 
            or listing_model_clean in enq_model_clean
            or (enquiry.category.lower() == listing.category.lower() and len(enq_model_clean) < 3)
        )

        # Check condition threshold
        enq_grade_rank = GRADE_RANKS.get(enquiry.min_condition_grade, 0)
        condition_ok = listing_grade_rank >= enq_grade_rank

        if brand_match and model_match and condition_ok:
            alloc_qty = min(enquiry.quantity_requested, listing.available_quantity)
            if alloc_qty <= 0:
                continue

            expires_at = datetime.utcnow() + timedelta(hours=24)
            reservation = Reservation(
                listing_id=listing.id,
                enquiry_id=enquiry.id,
                buyer_name=enquiry.buyer_name,
                buyer_email=enquiry.buyer_email,
                buyer_type=enquiry.buyer_type,
                quantity_reserved=alloc_qty,
                reserved_price_inr=listing.price_inr,
                status="pending",
                expires_at=expires_at,
                created_at=datetime.utcnow()
            )
            db.add(reservation)
            db.flush()

            # Deduct available stock atomically
            listing.available_quantity -= alloc_qty
            enquiry.status = "matched"

            # Create in-app notification for buyer
            notif = Notification(
                user_email=enquiry.buyer_email,
                user_type="buyer",
                title=f"Reserved for you: {listing.title}",
                message=(
                    f"Hi {enquiry.buyer_name}, stock matching your pre-enquiry for '{enquiry.model}' "
                    f"has been auto-allocated! Price: ₹{listing.price_inr:,.0f}. "
                    f"You have a 24-hour hold to confirm your reservation before it is offered to the next waitlist buyer."
                ),
                link_url=f"/shop?reserved_id={reservation.id}",
                created_at=datetime.utcnow()
            )
            db.add(notif)

            # Create retailer notification
            retailer_notif = Notification(
                user_email="retailer@relife.internal",
                user_type="retailer",
                title=f"Auto-Booked: {listing.title}",
                message=(
                    f"Allocated {alloc_qty} unit(s) to {enquiry.buyer_name} ({enquiry.buyer_type.title()}) "
                    f"from waitlist (Enquiry #{enquiry.id}). Hold expires at {expires_at.strftime('%Y-%m-%d %H:%M UTC')}."
                ),
                link_url=f"/shop?tab=waitlist",
                created_at=datetime.utcnow()
            )
            db.add(retailer_notif)

            # Send stub email
            send_email_stub(
                to_email=enquiry.buyer_email,
                subject=f"⚡ Stock Reserved: {listing.title} (24-Hour Hold)",
                body=(
                    f"Dear {enquiry.buyer_name},\n\n"
                    f"Great news! Your pre-enquiry request has matched a newly published item on ReLife Storefront.\n\n"
                    f"Item: {listing.title}\n"
                    f"Condition: {listing.condition_grade}\n"
                    f"Reserved Price: ₹{listing.price_inr:,.0f}\n"
                    f"Quantity: {alloc_qty}\n"
                    f"Hold Duration: 24 Hours (Expires: {expires_at.strftime('%d %b %Y %H:%M')} UTC)\n\n"
                    f"Confirm your purchase now at: http://localhost:3000/shop?reserved_id={reservation.id}\n\n"
                    f"Best regards,\nReLife AI Circular Commerce Team"
                )
            )

            new_reservations.append(reservation)

    return new_reservations


# --- API Routes ---

@router.get("/listings")
def get_shop_listings(
    category: Optional[str] = None,
    condition: Optional[str] = None,
    listing_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Public e-commerce storefront catalog of recovered refurbished devices and components.
    Includes active stock and dynamic reverse-auction current pricing if enabled.
    """
    query = db.query(ShopListing).filter(ShopListing.is_published == True)

    if category and category != "All":
        query = query.filter(ShopListing.category.ilike(f"%{category}%"))
    if condition and condition != "All":
        query = query.filter(ShopListing.condition_grade == condition)
    if listing_type:
        query = query.filter(ShopListing.listing_type == listing_type)
    if search:
        query = query.filter(
            (ShopListing.title.ilike(f"%{search}%")) |
            (ShopListing.brand.ilike(f"%{search}%")) |
            (ShopListing.model.ilike(f"%{search}%"))
        )

    listings = query.order_by(ShopListing.published_at.desc()).all()

    # Calculate dynamic pricing / reverse auction countdown
    now = datetime.utcnow()
    results = []
    for l in listings:
        curr_price = l.price_inr
        seconds_remaining = 0
        auction_active = False

        if l.is_reverse_auction and l.auction_started_at:
            elapsed_minutes = (now - l.auction_started_at).total_seconds() / 60.0
            steps = int(elapsed_minutes // max(1, l.auction_step_interval_min))
            price_drop = steps * l.auction_step_amount
            curr_price = max(l.auction_floor_price, l.auction_start_price - price_drop)
            l.auction_current_price = curr_price
            auction_active = True
            step_duration_sec = l.auction_step_interval_min * 60
            seconds_remaining = max(0, int(step_duration_sec - ((now - l.auction_started_at).total_seconds() % step_duration_sec)))

        reservations_count = (
            db.query(func.count(Reservation.id))
            .filter(Reservation.listing_id == l.id, Reservation.status == "pending")
            .scalar() or 0
        )

        results.append({
            "id": l.id,
            "product_id": l.product_id,
            "return_id": l.return_id,
            "title": l.title,
            "category": l.category,
            "brand": l.brand,
            "model": l.model,
            "condition_grade": l.condition_grade,
            "price_inr": curr_price,
            "original_msrp": l.original_msrp,
            "savings_pct": round(max(0, (l.original_msrp - curr_price) / max(1.0, l.original_msrp) * 100), 1) if l.original_msrp > 0 else 0,
            "stock_quantity": l.stock_quantity,
            "available_quantity": l.available_quantity,
            "reservations_count": reservations_count,
            "image_url": l.image_url or "/api/inspections/image/laptop_clean_pristine.jpg",
            "description": l.description,
            "auto_book_on_publish": l.auto_book_on_publish,
            "listing_type": l.listing_type,
            "published_at": l.published_at.isoformat() if l.published_at else None,
            "is_reverse_auction": l.is_reverse_auction,
            "auction_info": {
                "active": auction_active,
                "start_price": l.auction_start_price,
                "floor_price": l.auction_floor_price,
                "current_price": curr_price,
                "step_interval_min": l.auction_step_interval_min,
                "step_amount": l.auction_step_amount,
                "seconds_to_next_drop": seconds_remaining,
            } if l.is_reverse_auction else None,
        })

    return {"listings": results, "total": len(results)}


@router.post("/listings")
def publish_listing(payload: ShopListingCreate, db: Session = Depends(get_db)):
    """
    Retailer publishes recovered/refurbished unit or component to public storefront.
    If auto_book_on_publish is enabled, immediately runs first-come, first-served waitlist matching.
    """
    now = datetime.utcnow()
    listing = ShopListing(
        title=payload.title,
        category=payload.category,
        brand=payload.brand,
        model=payload.model,
        condition_grade=payload.condition_grade,
        price_inr=payload.price_inr,
        original_msrp=payload.original_msrp,
        stock_quantity=payload.stock_quantity,
        available_quantity=payload.stock_quantity,
        description=payload.description or f"Certified circular refurbished {payload.model} with OEM quality testing pass.",
        image_url=payload.image_url or "/api/inspections/image/laptop_clean_pristine.jpg",
        product_id=payload.product_id,
        return_id=payload.return_id,
        auto_book_on_publish=payload.auto_book_on_publish,
        listing_type=payload.listing_type,
        published_at=now,
        is_reverse_auction=payload.is_reverse_auction,
        auction_start_price=payload.auction_start_price or payload.price_inr,
        auction_floor_price=payload.auction_floor_price or (payload.price_inr * 0.6),
        auction_current_price=payload.auction_start_price or payload.price_inr,
        auction_step_interval_min=payload.auction_step_interval_min,
        auction_step_amount=payload.auction_step_amount,
        auction_started_at=now if payload.is_reverse_auction else None,
    )

    db.add(listing)
    db.flush()

    allocated_reservations = []
    if payload.auto_book_on_publish:
        allocated_reservations = auto_allocate_enquiries_for_listing(listing, db)

    db.commit()
    db.refresh(listing)

    return {
        "success": True,
        "listing_id": listing.id,
        "title": listing.title,
        "available_quantity": listing.available_quantity,
        "auto_booked_count": len(allocated_reservations),
        "message": f"Listing published successfully! {len(allocated_reservations)} waitlist reservation(s) auto-booked."
    }


@router.post("/enquiries")
def create_waitlist_enquiry(payload: WaitlistEnquiryCreate, db: Session = Depends(get_db)):
    """
    Buyer (Customer or Reseller) submits pre-enquiry before stock is listed.
    Stored with strict timestamp for first-come, first-served reservation queue.
    """
    enquiry = WaitlistEnquiry(
        buyer_name=payload.buyer_name,
        buyer_email=payload.buyer_email,
        buyer_type=payload.buyer_type,
        category=payload.category,
        brand=payload.brand,
        model=payload.model,
        min_condition_grade=payload.min_condition_grade,
        max_budget_inr=payload.max_budget_inr,
        quantity_requested=payload.quantity_requested,
        status="active",
        created_at=datetime.utcnow()
    )
    db.add(enquiry)
    db.flush()

    # Attempt immediate matching with existing published inventory if available
    matching_listings = (
        db.query(ShopListing)
        .filter(
            ShopListing.is_published == True,
            ShopListing.available_quantity > 0,
            ShopListing.price_inr <= payload.max_budget_inr,
        )
        .all()
    )

    reserved_listing = None
    for l in matching_listings:
        if (l.brand.lower() in payload.brand.lower() or payload.brand == "Any") and \
           (payload.model.lower() in l.model.lower() or payload.model == "Any"):
            enq_grade_rank = GRADE_RANKS.get(payload.min_condition_grade, 0)
            list_grade_rank = GRADE_RANKS.get(l.condition_grade, 2)
            if list_grade_rank >= enq_grade_rank:
                auto_allocate_enquiries_for_listing(l, db)
                reserved_listing = l
                break

    db.commit()
    db.refresh(enquiry)

    return {
        "success": True,
        "enquiry_id": enquiry.id,
        "status": enquiry.status,
        "message": "Pre-enquiry registered in waitlist. You will be automatically allocated as stock publishes.",
        "auto_matched": enquiry.status == "matched"
    }


@router.get("/enquiries")
def get_waitlist_enquiries(db: Session = Depends(get_db)):
    """
    Retailer view of all buyer waitlist pre-enquiries, with aggregated demand per model.
    """
    enquiries = db.query(WaitlistEnquiry).order_by(WaitlistEnquiry.created_at.desc()).all()

    # Aggregate demand statistics per model
    demand_summary: Dict[str, Dict[str, Any]] = {}
    for e in enquiries:
        if e.status not in ["active", "matched"]:
            continue
        key = f"{e.brand} {e.model}".strip()
        if key not in demand_summary:
            demand_summary[key] = {
                "model": key,
                "category": e.category,
                "total_waiting": 0,
                "resellers_count": 0,
                "customers_count": 0,
                "total_quantity": 0,
                "max_budget_cap": 0.0,
                "avg_budget": 0.0,
                "_budget_sum": 0.0,
            }
        demand_summary[key]["total_waiting"] += 1
        if e.buyer_type == "reseller":
            demand_summary[key]["resellers_count"] += 1
        else:
            demand_summary[key]["customers_count"] += 1
        demand_summary[key]["total_quantity"] += e.quantity_requested
        demand_summary[key]["max_budget_cap"] = max(demand_summary[key]["max_budget_cap"], e.max_budget_inr)
        demand_summary[key]["_budget_sum"] += e.max_budget_inr

    for item in demand_summary.values():
        if item["total_waiting"] > 0:
            item["avg_budget"] = round(item["_budget_sum"] / item["total_waiting"], 0)
            del item["_budget_sum"]

    return {
        "enquiries": [
            {
                "id": e.id,
                "buyer_name": e.buyer_name,
                "buyer_email": e.buyer_email,
                "buyer_type": e.buyer_type,
                "category": e.category,
                "brand": e.brand,
                "model": e.model,
                "min_condition_grade": e.min_condition_grade,
                "max_budget_inr": e.max_budget_inr,
                "quantity_requested": e.quantity_requested,
                "status": e.status,
                "created_at": e.created_at.strftime("%Y-%m-%d %H:%M"),
            }
            for e in enquiries
        ],
        "demand_per_model": list(demand_summary.values()),
        "total_active_enquiries": sum(1 for e in enquiries if e.status == "active")
    }


@router.get("/reservations")
def get_reservations(buyer_email: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Retrieves active holds and reservations. If buyer_email is passed, returns that buyer's reservations.
    """
    query = db.query(Reservation).order_by(Reservation.created_at.desc())
    if buyer_email:
        query = query.filter(Reservation.buyer_email == buyer_email)

    reservations = query.all()
    now = datetime.utcnow()

    res_list = []
    for r in reservations:
        listing = r.listing
        time_left_sec = max(0, int((r.expires_at - now).total_seconds())) if r.status == "pending" else 0
        hours = time_left_sec // 3600
        mins = (time_left_sec % 3600) // 60

        res_list.append({
            "id": r.id,
            "listing_id": r.listing_id,
            "listing_title": listing.title if listing else "Recovered Product",
            "listing_image": listing.image_url if listing else None,
            "enquiry_id": r.enquiry_id,
            "buyer_name": r.buyer_name,
            "buyer_email": r.buyer_email,
            "buyer_type": r.buyer_type,
            "quantity_reserved": r.quantity_reserved,
            "reserved_price_inr": r.reserved_price_inr,
            "status": r.status,
            "expires_at": r.expires_at.strftime("%Y-%m-%d %H:%M UTC"),
            "time_remaining_str": f"{hours}h {mins}m" if r.status == "pending" and time_left_sec > 0 else "Expired",
            "is_expired": r.status == "pending" and time_left_sec <= 0,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M"),
        })

    return {"reservations": res_list, "total": len(res_list)}


@router.post("/reservations/{reservation_id}/confirm")
def confirm_reservation(reservation_id: int, db: Session = Depends(get_db)):
    """
    Buyer confirms their 24-hour hold reservation and locks in purchase.
    """
    res = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if res.status != "pending":
        raise HTTPException(status_code=400, detail=f"Reservation is already {res.status}")

    if res.expires_at < datetime.utcnow():
        # Auto-release if expired
        res.status = "expired"
        listing = res.listing
        if listing:
            listing.available_quantity += res.quantity_reserved
            auto_allocate_enquiries_for_listing(listing, db)
        db.commit()
        raise HTTPException(status_code=400, detail="Reservation has expired and has been offered to the next waitlist buyer.")

    res.status = "confirmed"
    listing = res.listing
    if listing:
        listing.stock_quantity = max(0, listing.stock_quantity - res.quantity_reserved)

    if res.enquiry:
        res.enquiry.status = "fulfilled"

    # Notification
    notif = Notification(
        user_email=res.buyer_email,
        user_type="buyer",
        title="Order Confirmed!",
        message=f"Your reservation for {listing.title if listing else 'Product'} is confirmed. Dispatch invoice generated.",
        link_url="/shop?tab=orders",
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()

    return {
        "success": True,
        "message": "Reservation confirmed! Product booked successfully.",
        "reservation_id": res.id
    }


@router.post("/reservations/{reservation_id}/release")
def release_reservation(reservation_id: int, db: Session = Depends(get_db)):
    """
    Releases a reservation (manual cancellation or expiry simulation), returning stock to pool
    and automatically offering it to the next buyer in the waitlist.
    """
    res = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if res.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot release reservation with status: {res.status}")

    res.status = "released"
    if res.enquiry:
        res.enquiry.status = "cancelled"

    listing = res.listing
    reallocated = []
    if listing:
        listing.available_quantity += res.quantity_reserved
        # Pass immediately to next person in waitlist
        reallocated = auto_allocate_enquiries_for_listing(listing, db)

    db.commit()

    return {
        "success": True,
        "message": f"Reservation released. Re-allocated to {len(reallocated)} next waitlist candidate(s).",
        "next_allocated_count": len(reallocated)
    }


@router.post("/reservations/expire-check")
def trigger_expiry_check(db: Session = Depends(get_db)):
    """
    Scans for expired reservations (>24h or simulated time) and cascades stock to the next waitlist buyers.
    """
    now = datetime.utcnow()
    expired_reservations = (
        db.query(Reservation)
        .filter(Reservation.status == "pending", Reservation.expires_at <= now)
        .all()
    )

    reallocated_total = 0
    for r in expired_reservations:
        r.status = "expired"
        if r.enquiry:
            r.enquiry.status = "active"  # return to waitlist queue or mark expired

        listing = r.listing
        if listing:
            listing.available_quantity += r.quantity_reserved
            new_allocs = auto_allocate_enquiries_for_listing(listing, db)
            reallocated_total += len(new_allocs)

    db.commit()

    return {
        "expired_count": len(expired_reservations),
        "reallocated_to_next_in_line": reallocated_total,
        "message": f"Processed {len(expired_reservations)} expired reservation(s); offered to {reallocated_total} next waitlist buyer(s)."
    }


@router.get("/notifications")
def get_notifications(user_email: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns in-app notifications.
    """
    query = db.query(Notification).order_by(Notification.created_at.desc())
    if user_email:
        query = query.filter((Notification.user_email == user_email) | (Notification.user_type == "retailer"))

    notifs = query.limit(50).all()
    return {
        "notifications": [
            {
                "id": n.id,
                "user_email": n.user_email,
                "user_type": n.user_type,
                "title": n.title,
                "message": n.message,
                "link_url": n.link_url,
                "is_read": n.is_read,
                "created_at": n.created_at.strftime("%Y-%m-%d %H:%M"),
            }
            for n in notifs
        ],
        "unread_count": sum(1 for n in notifs if not n.is_read)
    }


@router.post("/seed")
def seed_storefront_demo(db: Session = Depends(get_db)):
    """
    Seeds 18 realistic sample enquiries from 3 resellers and 8 customers,
    including the exact prompt demo scenario (2 resellers and 3 customers waiting for 'Dell XPS 13 refurbished'),
    plus catalog listings and reverse auction components.
    """
    # 1. Clean existing storefront tables to make seed repeatable
    db.query(Reservation).delete()
    db.query(WaitlistEnquiry).delete()
    db.query(ShopListing).delete()
    db.query(Notification).delete()
    db.flush()

    now = datetime.utcnow()

    # 2. Seed 18 Enquiries (Timestamped progressively)
    # The required Demo Scenario: 2 resellers and 3 customers pre-enquiring for 'Dell XPS 13 refurbished'
    demo_enquiries = [
        # Match 1: Reseller 1 (Earliest timestamp)
        ("Apex Refurb Tech", "contact@apexrefurb.in", "reseller", "Laptop", "Dell", "XPS 13", "Refurbished", 58000.0, 1, 120),
        # Match 2: Reseller 2
        ("Silicon Loop Ltd", "purchasing@siliconloop.com", "reseller", "Laptop", "Dell", "XPS 13", "Refurbished", 55000.0, 1, 100),
        # Match 3: Customer 1
        ("Aarav Sharma", "aarav.sharma@gmail.com", "customer", "Laptop", "Dell", "XPS 13", "Refurbished", 52000.0, 1, 80),
        # Match 4: Customer 2
        ("Priya Nair", "priya.nair@outlook.com", "customer", "Laptop", "Dell", "XPS 13", "Grade A", 54000.0, 1, 60),
        # Match 5: Customer 3
        ("Kavita Iyer", "kavita.iyer@gmail.com", "customer", "Laptop", "Dell", "XPS 13", "Refurbished", 50000.0, 1, 40),
        
        # Other varied product enquiries from resellers and customers:
        ("ElectroSalvage Hub", "ops@electrosalvage.in", "reseller", "Smartphone", "Apple", "iPhone 14 Pro", "Grade A", 65000.0, 2, 95),
        ("Rohan Verma", "rohan.v@techmail.com", "customer", "Smartphone", "Apple", "iPhone 14 Pro", "Refurbished", 60000.0, 1, 85),
        ("Zoya Siddiqui", "zoya.sid@gmail.com", "customer", "Smartphone", "Samsung", "Galaxy S23 Ultra", "Grade A", 58000.0, 1, 75),
        ("GadgetRecycle Pro", "orders@gadgetrecycle.co", "reseller", "Smartphone", "Samsung", "Galaxy S23", "Refurbished", 45000.0, 3, 70),
        ("Vikramaditya Roy", "vikram.roy@iitb.ac.in", "customer", "Laptop", "Apple", "MacBook Pro 14", "Grade A", 110000.0, 1, 65),
        ("Ananya Sen", "ananya.sen@gmail.com", "customer", "Laptop", "ThinkPad", "T14 Gen 3", "Refurbished", 42000.0, 1, 55),
        ("GreenTech Circulary", "supply@greentechcirc.org", "reseller", "Clothing", "Zara", "Textile Apparel Garment", "Grade B", 2200.0, 5, 50),
        ("Deepak Patel", "deepak.p@tcs.com", "customer", "Mouse", "Logitech", "MX Master 3S", "Grade A", 5500.0, 1, 45),
        ("Siddharth Joshi", "sid.joshi@gmail.com", "customer", "Mouse", "Logitech", "G502 Hero", "Refurbished", 2800.0, 1, 35),
        ("CircuitSaver Labs", "parts@circuitsaver.in", "reseller", "Component", "Dell", "OLED Display Assembly", "Grade A", 8500.0, 2, 30),
        ("Bhavna Gupta", "bhavna.gupta@deloitte.com", "customer", "Laptop", "MacBook", "Air M2", "Grade A", 70000.0, 1, 25),
        ("Manish Pillai", "manish.p@gmail.com", "customer", "Clothing", "Levi's", "Denim Jacket", "Refurbished", 1800.0, 1, 20),
        ("TechRebirth India", "b2b@techrebirth.in", "reseller", "Laptop", "HP", "EliteBook 840", "Grade A", 38000.0, 4, 10),
    ]

    for name, email, btype, cat, brand, model, grade, budget, qty, min_ago in demo_enquiries:
        enq = WaitlistEnquiry(
            buyer_name=name,
            buyer_email=email,
            buyer_type=btype,
            category=cat,
            brand=brand,
            model=model,
            min_condition_grade=grade,
            max_budget_inr=budget,
            quantity_requested=qty,
            status="active",
            created_at=now - timedelta(minutes=min_ago)
        )
        db.add(enq)

    # 3. Seed Existing Storefront Listings
    seed_listings = [
        ShopListing(
            title="Apple MacBook Pro 14 (M2 Pro) - Certified Grade A",
            category="Laptop",
            brand="Apple",
            model="MacBook Pro 14",
            condition_grade="Grade A",
            price_inr=108000.0,
            original_msrp=169900.0,
            stock_quantity=2,
            available_quantity=2,
            image_url="/api/inspections/image/laptop_clean_pristine.jpg",
            description="Certified pre-owned Apple MacBook Pro 14 with M2 Pro silicon. Display and logic board 100% verified.",
            is_published=True,
            auto_book_on_publish=True,
            listing_type="product",
            published_at=now - timedelta(hours=6)
        ),
        ShopListing(
            title="Samsung Galaxy S23 Ultra (Phantom Black) - Restored",
            category="Smartphone",
            brand="Samsung",
            model="Galaxy S23 Ultra",
            condition_grade="Grade A",
            price_inr=56000.0,
            original_msrp=124999.0,
            stock_quantity=1,
            available_quantity=1,
            image_url="/api/inspections/image/phone_scratched_back.jpg",
            description="Restored Galaxy S23 Ultra with clean oleophobic glass replacement and 98% battery capacity health.",
            is_published=True,
            auto_book_on_publish=True,
            listing_type="product",
            published_at=now - timedelta(hours=4)
        ),
        ShopListing(
            title="Logitech MX Master 3S Ergonomic Wireless Mouse",
            category="Mouse",
            brand="Logitech",
            model="MX Master 3S",
            condition_grade="Grade A",
            price_inr=5200.0,
            original_msrp=8995.0,
            stock_quantity=3,
            available_quantity=3,
            image_url="/api/inspections/image/mouse_scuffed_body.jpg",
            description="Cleaned, sanitized, and renewed with new PTFE teflon glide skates. MagSpeed scroll wheel verified.",
            is_published=True,
            auto_book_on_publish=True,
            listing_type="product",
            published_at=now - timedelta(hours=3)
        ),
        # Reverse Auction Component (Feature 2 ready)
        ShopListing(
            title="Dell 4K InfinityEdge Display Assembly (Component Reverse Auction)",
            category="Component",
            brand="Dell",
            model="XPS Display Panel",
            condition_grade="Grade A",
            price_inr=9200.0,
            original_msrp=16500.0,
            stock_quantity=1,
            available_quantity=1,
            image_url="/api/inspections/image/laptop_cracked_screen.jpg",
            description="Harvested OEM Sharp IGZO 4K Touch Panel. Zero dead pixels, perfect color gamut calibration.",
            is_published=True,
            auto_book_on_publish=False,
            listing_type="component",
            published_at=now - timedelta(minutes=15),
            is_reverse_auction=True,
            auction_start_price=9500.0,
            auction_floor_price=6000.0,
            auction_current_price=9200.0,
            auction_step_interval_min=2,
            auction_step_amount=250.0,
            auction_started_at=now - timedelta(minutes=15)
        ),
        ShopListing(
            title="Apple M2 Logic Board 16GB RAM + 512GB (Component)",
            category="Component",
            brand="Apple",
            model="M2 Motherboard",
            condition_grade="Grade A",
            price_inr=24500.0,
            original_msrp=42000.0,
            stock_quantity=1,
            available_quantity=1,
            image_url="/api/inspections/image/laptop_clean_pristine.jpg",
            description="Fully tested logic board without iCloud lock or activation lock. High recovery grade.",
            is_published=True,
            auto_book_on_publish=False,
            listing_type="component",
            published_at=now - timedelta(hours=12),
            is_reverse_auction=False
        )
    ]

    for item in seed_listings:
        db.add(item)

    db.commit()

    return {
        "success": True,
        "enquiries_seeded": len(demo_enquiries),
        "listings_seeded": len(seed_listings),
        "message": (
            "Storefront seed data loaded successfully! 18 pre-enquiries created including "
            "2 resellers and 3 customers waiting for 'Dell XPS 13 refurbished'. "
            "Ready for live Demo Scenario."
        )
    }
