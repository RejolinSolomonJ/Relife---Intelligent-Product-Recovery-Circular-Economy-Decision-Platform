"""
Seed data for demo scenario (Part A & B)
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import (
    User, BuyerStats, ProductEnquiry, ShopListing, AllocationConfig
)
from .auth import hash_password


def seed_demo_data(db: Session):
    """
    Create seed data for the demo scenario
    """
    print("\n" + "="*80)
    print("SEEDING DEMO DATA")
    print("="*80)
    
    # Check if already seeded
    existing_admin = db.query(User).filter(User.role == "super_admin").first()
    if existing_admin:
        print("[OK] Demo data already seeded. Skipping...")
        return
    
    # 1. Create demo users (one per role)
    demo_users = [
        {
            "email": "admin@relife.demo",
            "password": "admin123",
            "full_name": "Super Admin",
            "role": "super_admin",
            "reseller_tier": None
        },
        {
            "email": "inspector@relife.demo",
            "password": "inspector123",
            "full_name": "Warehouse Inspector",
            "role": "inspector",
            "reseller_tier": None
        },
        {
            "email": "reseller1@relife.demo",
            "password": "reseller123",
            "full_name": "Gold Reseller Co",
            "role": "reseller",
            "reseller_tier": "Gold"
        },
        {
            "email": "reseller2@relife.demo",
            "password": "reseller123",
            "full_name": "Silver Tech Partners",
            "role": "reseller",
            "reseller_tier": "Silver"
        },
        {
            "email": "reseller3@relife.demo",
            "password": "reseller123",
            "full_name": "Bronze Repair Shop",
            "role": "reseller",
            "reseller_tier": "Bronze"
        },
        {
            "email": "customer1@relife.demo",
            "password": "customer123",
            "full_name": "John Customer",
            "role": "customer",
            "reseller_tier": "Bronze"
        },
        {
            "email": "customer2@relife.demo",
            "password": "customer123",
            "full_name": "Sarah Buyer",
            "role": "customer",
            "reseller_tier": "Bronze"
        },
        {
            "email": "repair@relife.demo",
            "password": "repair123",
            "full_name": "Certified Repair Partner",
            "role": "repair_partner",
            "reseller_tier": None
        },
        {
            "email": "recycler@relife.demo",
            "password": "recycler123",
            "full_name": "Green Recycling Ltd",
            "role": "recycler",
            "reseller_tier": None
        }
    ]
    
    created_users = []
    for user_data in demo_users:
        user = User(
            email=user_data["email"],
            hashed_password=hash_password(user_data["password"]),
            full_name=user_data["full_name"],
            role=user_data["role"],
            reseller_tier=user_data["reseller_tier"],
            is_verified=True,
            is_active=True
        )
        db.add(user)
        created_users.append(user)
    
    db.commit()
    print(f"[OK] Created {len(created_users)} demo users")
    
    # 2. Create buyer stats with varied reliability and cancellation rates
    buyer_stats_data = [
        # Gold reseller - excellent history
        {"user": created_users[2], "total_orders": 50, "confirmed_orders": 48, 
         "cancelled_reservations": 1, "total_reservations": 49},
        # Silver reseller - good history
        {"user": created_users[3], "total_orders": 30, "confirmed_orders": 27,
         "cancelled_reservations": 3, "total_reservations": 30},
        # Bronze reseller - moderate history
        {"user": created_users[4], "total_orders": 15, "confirmed_orders": 12,
         "cancelled_reservations": 5, "total_reservations": 17},
        # Customer 1 - new buyer
        {"user": created_users[5], "total_orders": 2, "confirmed_orders": 2,
         "cancelled_reservations": 0, "total_reservations": 2},
        # Customer 2 - unreliable
        {"user": created_users[6], "total_orders": 5, "confirmed_orders": 3,
         "cancelled_reservations": 4, "total_reservations": 7}
    ]
    
    for stats_data in buyer_stats_data:
        user = stats_data["user"]
        stats = BuyerStats(
            user_id=user.id,
            total_orders=stats_data["total_orders"],
            confirmed_orders=stats_data["confirmed_orders"],
            cancelled_reservations=stats_data["cancelled_reservations"],
            total_reservations=stats_data["total_reservations"],
            reliability_score=(
                stats_data["confirmed_orders"] / stats_data["total_orders"]
                if stats_data["total_orders"] > 0 else 0.5
            ),
            cancellation_rate=(
                stats_data["cancelled_reservations"] / stats_data["total_reservations"]
                if stats_data["total_reservations"] > 0 else 0.0
            )
        )
        db.add(stats)
    
    db.commit()
    print(f"[OK] Created buyer stats for 5 users")
    
    # 3. Create shop listings for demo scenario
    # MacBook Air 2019 - Grade B (for main demo)
    macbook_listing = ShopListing(
        product_id="PROD-MBA2019-001",
        title="MacBook Air 2019 - Refurbished Grade B",
        category="Laptop",
        brand="Apple",
        model="MacBook Air 2019",
        condition_grade="Grade B",
        price_inr=42000.0,
        original_msrp=92900.0,
        stock_quantity=2,
        available_quantity=2,
        description="13-inch, Intel Core i5, 8GB RAM, 128GB SSD. Minor cosmetic wear, fully functional. [SIMULATED LISTING - DEMO ONLY]",
        is_published=True,
        auto_book_on_publish=True,
        listing_type="product"
    )
    db.add(macbook_listing)
    
    # iPhone 13 - Like New
    iphone_listing = ShopListing(
        product_id="PROD-IP13-002",
        title="iPhone 13 - Like New",
        category="Smartphone",
        brand="Apple",
        model="iPhone 13",
        condition_grade="Like New",
        price_inr=55000.0,
        original_msrp=79900.0,
        stock_quantity=1,
        available_quantity=1,
        description="128GB, Blue. Barely used, perfect condition. [SIMULATED LISTING - DEMO ONLY]",
        is_published=True,
        auto_book_on_publish=True,
        listing_type="product"
    )
    db.add(iphone_listing)
    
    # Dell Laptop - Grade A
    dell_listing = ShopListing(
        product_id="PROD-DELL-003",
        title="Dell XPS 13 - Grade A",
        category="Laptop",
        brand="Dell",
        model="XPS 13",
        condition_grade="Grade A",
        price_inr=48000.0,
        original_msrp=89990.0,
        stock_quantity=0,
        available_quantity=0,
        description="Intel Core i7, 16GB RAM, 512GB SSD. Excellent condition. [OUT OF STOCK - DEMO]",
        is_published=True,
        auto_book_on_publish=True,
        listing_type="product"
    )
    db.add(dell_listing)
    
    # Component listing
    battery_listing = ShopListing(
        product_id="COMP-BAT-001",
        title="MacBook Pro Battery - Grade A",
        category="Components",
        brand="Apple",
        model="MacBook Pro 15-inch Battery",
        condition_grade="Grade A",
        price_inr=8500.0,
        original_msrp=15000.0,
        stock_quantity=3,
        available_quantity=3,
        description="Original Apple battery, 85% health. [SIMULATED LISTING - DEMO ONLY]",
        is_published=True,
        auto_book_on_publish=True,
        listing_type="component"
    )
    db.add(battery_listing)
    
    db.commit()
    db.refresh(macbook_listing)
    db.refresh(iphone_listing)
    db.refresh(dell_listing)
    print(f"[OK] Created 4 shop listings")
    
    # 4. Create 15-20 open enquiries with varied parameters
    now = datetime.utcnow()
    enquiries = []
    
    # MacBook Air enquiries (for main demo)
    macbook_enquiries = [
        # Gold reseller - early, urgent, good price
        {"user": created_users[2], "max_price": 43000, "is_urgent": True, 
         "quantity": 1, "days_ago": 5},
        # Silver reseller - early, normal
        {"user": created_users[3], "max_price": 42500, "is_urgent": False,
         "quantity": 1, "days_ago": 4},
        # Bronze reseller - recent
        {"user": created_users[4], "max_price": 42000, "is_urgent": False,
         "quantity": 1, "days_ago": 2},
        # Customer 1 - recent, willing to pay more
        {"user": created_users[5], "max_price": 44000, "is_urgent": False,
         "quantity": 1, "days_ago": 1},
        # Customer 2 - early but unreliable history
        {"user": created_users[6], "max_price": 42000, "is_urgent": False,
         "quantity": 1, "days_ago": 3}
    ]
    
    for enq_data in macbook_enquiries:
        enquiry = ProductEnquiry(
            user_id=enq_data["user"].id,
            product_id=macbook_listing.product_id,
            listing_id=macbook_listing.id,
            model=macbook_listing.model,
            category=macbook_listing.category,
            reseller_tier=enq_data["user"].reseller_tier or "Bronze",
            quantity_needed=enq_data["quantity"],
            max_price=enq_data["max_price"],
            is_urgent=enq_data["is_urgent"],
            status="active",
            created_at=now - timedelta(days=enq_data["days_ago"])
        )
        db.add(enquiry)
        enquiries.append(enquiry)
    
    # iPhone enquiries
    iphone_enquiries = [
        {"user": created_users[2], "max_price": 56000, "is_urgent": False,
         "quantity": 1, "days_ago": 3},
        {"user": created_users[3], "max_price": 55000, "is_urgent": True,
         "quantity": 1, "days_ago": 2},
        {"user": created_users[5], "max_price": 57000, "is_urgent": False,
         "quantity": 1, "days_ago": 1}
    ]
    
    for enq_data in iphone_enquiries:
        enquiry = ProductEnquiry(
            user_id=enq_data["user"].id,
            product_id=iphone_listing.product_id,
            listing_id=iphone_listing.id,
            model=iphone_listing.model,
            category=iphone_listing.category,
            reseller_tier=enq_data["user"].reseller_tier or "Bronze",
            quantity_needed=enq_data["quantity"],
            max_price=enq_data["max_price"],
            is_urgent=enq_data["is_urgent"],
            status="active",
            created_at=now - timedelta(days=enq_data["days_ago"])
        )
        db.add(enquiry)
        enquiries.append(enquiry)
    
    # Dell laptop enquiries (out of stock)
    dell_enquiries = [
        {"user": created_users[2], "max_price": 49000, "is_urgent": False,
         "quantity": 1, "days_ago": 6},
        {"user": created_users[3], "max_price": 48000, "is_urgent": True,
         "quantity": 1, "days_ago": 5},
        {"user": created_users[4], "max_price": 48000, "is_urgent": False,
         "quantity": 1, "days_ago": 4},
        {"user": created_users[5], "max_price": 50000, "is_urgent": False,
         "quantity": 1, "days_ago": 3},
        {"user": created_users[6], "max_price": 48000, "is_urgent": False,
         "quantity": 1, "days_ago": 2}
    ]
    
    for enq_data in dell_enquiries:
        enquiry = ProductEnquiry(
            user_id=enq_data["user"].id,
            product_id=dell_listing.product_id,
            listing_id=dell_listing.id,
            model=dell_listing.model,
            category=dell_listing.category,
            reseller_tier=enq_data["user"].reseller_tier or "Bronze",
            quantity_needed=enq_data["quantity"],
            max_price=enq_data["max_price"],
            is_urgent=enq_data["is_urgent"],
            status="active",
            created_at=now - timedelta(days=enq_data["days_ago"])
        )
        db.add(enquiry)
        enquiries.append(enquiry)
    
    # Battery component enquiries
    battery_enquiries = [
        {"user": created_users[7], "max_price": 9000, "is_urgent": False,
         "quantity": 2, "days_ago": 2},
        {"user": created_users[8], "max_price": 8500, "is_urgent": True,
         "quantity": 1, "days_ago": 1}
    ]
    
    for enq_data in battery_enquiries:
        enquiry = ProductEnquiry(
            user_id=enq_data["user"].id,
            product_id=battery_listing.product_id,
            listing_id=battery_listing.id,
            model=battery_listing.model,
            category=battery_listing.category,
            reseller_tier=enq_data["user"].reseller_tier or "Bronze",
            quantity_needed=enq_data["quantity"],
            max_price=enq_data["max_price"],
            is_urgent=enq_data["is_urgent"],
            status="active",
            created_at=now - timedelta(days=enq_data["days_ago"])
        )
        db.add(enquiry)
        enquiries.append(enquiry)
    
    db.commit()
    print(f"[OK] Created {len(enquiries)} product enquiries")
    
    # 5. Create default allocation config
    config = AllocationConfig()
    db.add(config)
    db.commit()
    print(f"[OK] Created default allocation configuration")
    
    print("="*80)
    print("DEMO ACCOUNTS (username/password):")
    print("="*80)
    for user_data in demo_users:
        print(f"{user_data['role']:20s} | {user_data['email']:30s} | {user_data['password']}")
    print("="*80)
    print("[OK] Seed data creation complete!")
    print("="*80 + "\n")
