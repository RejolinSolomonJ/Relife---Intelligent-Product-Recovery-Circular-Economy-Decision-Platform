import io
import base64
import uuid
from datetime import datetime
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Product, ReturnItem, FunctionalTest
from ..schemas import RegisterProductRequest, RegisterProductResponse

router = APIRouter(prefix="/api/returns", tags=["registration"])


def generate_qr_code_data_url(passport_url: str) -> str:
    """
    Generates a PNG QR code in-memory and returns as a Base64 data URL.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(passport_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#073E2E", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"


@router.post("/register", response_model=RegisterProductResponse)
def register_product(
    payload: RegisterProductRequest,
    db: Session = Depends(get_db)
):
    """
    Registers a new returned electronic device (laptop or smartphone).
    Generates a unique product ID and a scannable QR code linking to its recovery passport.
    """
    # 1. Match or create Product in catalog
    prod_id = f"PRD-{payload.category[:3].upper()}-{payload.brand[:3].upper()}-{abs(hash(payload.model)) % 1000:03d}"
    product = db.query(Product).filter(Product.id == prod_id).first()
    if not product:
        product = Product(
            id=prod_id,
            brand=payload.brand,
            model=payload.model,
            category=payload.category,
            msrp_inr=payload.purchase_price,
            weight_kg=1.45 if "laptop" in payload.category.lower() else 0.21,
            release_year=2024 - max(0, payload.age_months // 12),
        )
        db.add(product)
        db.flush()

    # 2. Generate unique Return ID (e.g. REL-2026-0042)
    count = db.query(ReturnItem).count()
    return_id = f"REL-2026-{(count + 1):04d}"

    # 3. Generate Digital Product Passport URL & QR Code
    passport_path = f"/passport/{return_id}"
    qr_data_url = generate_qr_code_data_url(f"http://localhost:3000{passport_path}")

    now = datetime.utcnow()
    return_item = ReturnItem(
        id=return_id,
        product_id=product.id,
        purchase_price=payload.purchase_price,
        age_months=payload.age_months,
        return_reason=payload.return_reason,
        warranty_status=payload.warranty_status,
        customer_issue=payload.customer_reported_issue,
        received_date=now,
        status="In progress",
        needs_human_review=False,
        qr_code_data=qr_data_url,
        qr_code_url=passport_path,
        created_at=now,
    )
    db.add(return_item)
    db.commit()

    return RegisterProductResponse(
        return_id=return_id,
        product_id=product.id,
        brand=payload.brand,
        model=payload.model,
        category=payload.category,
        purchase_price=payload.purchase_price,
        age_months=payload.age_months,
        qr_code_data_url=qr_data_url,
        passport_url=passport_path,
        created_at=now.strftime("%Y-%m-%d %H:%M:%S"),
    )


@router.get("/{return_id}")
def get_return_record(return_id: str, db: Session = Depends(get_db)):
    """
    Fetches the full record of a returned product.
    """
    item = db.query(ReturnItem).filter(ReturnItem.id == return_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Return record not found")

    return {
        "id": item.id,
        "product_id": item.product_id,
        "brand": item.product.brand if item.product else "Electronics",
        "model": item.product.model if item.product else "Device",
        "category": item.product.category if item.product else "Laptop",
        "purchase_price": item.purchase_price,
        "age_months": item.age_months,
        "return_reason": item.return_reason,
        "warranty_status": item.warranty_status,
        "customer_issue": item.customer_issue,
        "status": item.status,
        "needs_human_review": item.needs_human_review,
        "qr_code_data_url": item.qr_code_data,
        "created_at": item.created_at.strftime("%Y-%m-%d %H:%M"),
    }

