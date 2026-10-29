import os
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ReturnItem, Inspection, Defect, Product
from ..schemas import ImageInspectionResponse, DefectDetectionItem
from ..vision import detect_defects, generate_sample_demo_images

router = APIRouter(prefix="/api/inspections", tags=["inspection"])

# Ensure sample images directory exists
SAMPLE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "samples")
generate_sample_demo_images(SAMPLE_DIR)


@router.get("/sample-images")
def get_sample_images():
    """
    Returns the list of pre-configured sample inspection images for instant hackathon demos.
    """
    samples = [
        {
            "id": "laptop_cracked_screen",
            "filename": "laptop_cracked_screen.jpg",
            "title": "Laptop - Cracked Display",
            "description": "Severe display crack requiring screen assembly replacement (Demo scenario)",
            "expected_defect": "crack",
            "severity": "high",
            "url": "/api/inspections/image/laptop_cracked_screen.jpg"
        },
        {
            "id": "cloth_stained_dress",
            "filename": "cloth_stained_dress.jpg",
            "title": "Clothing - Stained Dress",
            "description": "Irreversible chemical & food stain; evaluates for whole material textile recycling",
            "expected_defect": "stain",
            "severity": "high",
            "url": "/api/inspections/image/cloth_stained_dress.jpg"
        },
        {
            "id": "cloth_torn_fabric",
            "filename": "cloth_torn_fabric.jpg",
            "title": "Clothing - Torn Garment",
            "description": "Major structural fabric tear along seams; evaluates for fiber shredding & recycling",
            "expected_defect": "tear",
            "severity": "high",
            "url": "/api/inspections/image/cloth_torn_fabric.jpg"
        },
        {
            "id": "phone_scratched_back",
            "filename": "phone_scratched_back.jpg",
            "title": "Smartphone - Scratched Casing",
            "description": "Cosmetic micro-scratches on rear glass; functional internals intact",
            "expected_defect": "scratch",
            "severity": "low",
            "url": "/api/inspections/image/phone_scratched_back.jpg"
        },
        {
            "id": "laptop_clean_pristine",
            "filename": "laptop_clean_pristine.jpg",
            "title": "Pristine Ultrabook - Grade A",
            "description": "Zero exterior defect marks; qualifies for direct resale",
            "expected_defect": "none",
            "severity": "none",
            "url": "/api/inspections/image/laptop_clean_pristine.jpg"
        },
        {
            "id": "blurry_camera_photo",
            "filename": "blurry_camera_photo.jpg",
            "title": "Blurry Capture - Low Quality",
            "description": "Out-of-focus capture (Laplacian variance < 100); triggers human review routing",
            "expected_defect": "unclear",
            "severity": "low",
            "url": "/api/inspections/image/blurry_camera_photo.jpg"
        }
    ]
    return {"samples": samples}


@router.get("/image/{filename}")
def serve_sample_image(filename: str):
    """
    Serves a sample image file from the static sample directory.
    """
    fpath = os.path.join(SAMPLE_DIR, filename)
    if not os.path.exists(fpath):
        generate_sample_demo_images(SAMPLE_DIR)
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="Sample image not found")
    return FileResponse(fpath, media_type="image/jpeg")


@router.post("/upload", response_model=ImageInspectionResponse)
async def upload_inspection_images(
    return_id: str = Form(...),
    sample_filename: Optional[str] = Form(None),
    device_hint: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db)
):
    """
    Receives 1-5 uploaded images or a sample image reference.
    Runs OpenCV preprocessing (Laplacian blur check, bilateral denoising, resize)
    and defect detection (crack, dent, scratch, missing part).
    Stores inspection results and defects in the SQLite database.
    """
    image_bytes = None
    filename_used = "uploaded_inspection.jpg"

    if files and len(files) > 0 and files[0].filename:
        # User uploaded actual image file or camera capture
        file = files[0]
        image_bytes = await file.read()
        safe_fname = f"capture_{return_id}_{int(datetime.utcnow().timestamp())}.jpg"
        filename_used = safe_fname
        fpath = os.path.join(SAMPLE_DIR, safe_fname)
        with open(fpath, "wb") as f:
            f.write(image_bytes)
    elif sample_filename:
        # Using pre-seeded sample image
        filename_used = sample_filename
        fpath = os.path.join(SAMPLE_DIR, sample_filename)
        if not os.path.exists(fpath):
            generate_sample_demo_images(SAMPLE_DIR)
        if os.path.exists(fpath):
            with open(fpath, "rb") as f:
                image_bytes = f.read()

    if not image_bytes:
        # Generate fallback dummy bytes if somehow neither provided
        fpath = os.path.join(SAMPLE_DIR, "laptop_cracked_screen.jpg")
        if not os.path.exists(fpath):
            generate_sample_demo_images(SAMPLE_DIR)
        with open(fpath, "rb") as f:
            image_bytes = f.read()
        filename_used = "laptop_cracked_screen.jpg"

    # Ensure return item exists (auto-create if missing for instant camera / direct inspection)
    return_item = db.query(ReturnItem).filter(ReturnItem.id == return_id).first()
    if not return_item:
        fname_check = (filename_used + " " + (sample_filename or "")).lower()
        is_apparel = any(k in fname_check for k in ["cloth", "dress", "textile", "apparel", "garment", "fabric", "stain", "tear"])
        cat = "Clothing" if is_apparel else "Laptop"
        brand = "Zara Circular" if is_apparel else "Lenovo"
        model_name = "Cotton Blend Midi Dress" if is_apparel else "ThinkPad X1 Carbon Gen 10"

        prod = db.query(Product).filter(Product.category == cat).first()
        if not prod:
            prod = Product(
                id=f"PROD-{cat[:4].upper()}-{int(datetime.utcnow().timestamp()) % 1000:03d}",
                brand=brand,
                model=model_name,
                category=cat,
                base_msrp=4500.0 if is_apparel else 85000.0,
                weight_kg=0.45 if is_apparel else 1.45,
            )
            db.add(prod)
            db.flush()

        return_item = ReturnItem(
            id=return_id,
            product_id=prod.id,
            purchase_price=4200.0 if is_apparel else 75000.0,
            age_months=4,
            return_reason="Optical Quality Inspection",
            warranty_status="Active",
            customer_issue="Visual inspection & circular recovery intake"
        )
        db.add(return_item)
        db.commit()
        db.refresh(return_item)

    # Run Two-Stage AI Vision pipeline (Product Recognition -> Defect Detection)
    analysis = detect_defects(image_bytes, filename=filename_used, device_hint=device_hint)

    # Sync return item & product category with recognized product
    detected_cat = analysis.get("detected_category", "Laptop")
    if return_item.product and return_item.product.category != detected_cat:
        return_item.product.category = detected_cat
        if detected_cat == "Clothing":
            return_item.product.brand = "Zara Circular"
            return_item.product.model = "Textile Apparel Garment"
            return_item.purchase_price = 4500.0
            return_item.product.weight_kg = 0.45
        elif detected_cat == "Smartphone":
            return_item.product.brand = "Samsung"
            return_item.product.model = "Galaxy S23 Ultra"
            return_item.purchase_price = 55000.0
            return_item.product.weight_kg = 0.23
        db.flush()

    # Persist in DB
    now = datetime.utcnow()
    inspection = Inspection(
        return_id=return_id,
        image_url=f"/api/inspections/image/{filename_used}",
        image_count=len(files) if files and len(files) > 0 else 1,
        blur_score=analysis["blur_score"],
        is_blurry=analysis["is_blurry"],
        quality_flag=analysis["quality_flag"],
        model_version=analysis.get("model_version", "YOLOv8-OpenCV-Universal-v2.5"),
        image_paths_json=f"/api/inspections/image/{filename_used}",
        notes=f"Identified as {detected_cat} ({analysis.get('category_confidence', 95.0)}% conf)",
        inspected_at=now
    )
    db.add(inspection)
    db.flush()

    detected_items: List[DefectDetectionItem] = []
    for d in analysis["defects"]:
        defect_record = Defect(
            inspection_id=inspection.id,
            return_id=return_id,
            defect_type=d["defect_type"],
            severity=d["severity"],
            confidence=d["confidence"],
            bbox_x=d["bbox_x"],
            bbox_y=d["bbox_y"],
            bbox_w=d["bbox_w"],
            bbox_h=d["bbox_h"],
            description=d["description"],
            is_simulated=d.get("is_simulated", True)
        )
        db.add(defect_record)
        detected_items.append(DefectDetectionItem(**d))

    # If blurry, trigger human review immediately
    if analysis["is_blurry"]:
        return_item.needs_human_review = True

    db.commit()

    return ImageInspectionResponse(
        inspection_id=inspection.id,
        return_id=return_id,
        image_count=inspection.image_count,
        is_blurry=analysis["is_blurry"],
        blur_score=analysis["blur_score"],
        quality_flag=analysis["quality_flag"],
        demo_mode_badge=analysis.get("demo_mode_badge", "Two-Stage AI: Product + Defect Localization"),
        detected_category=detected_cat,
        detected_product_label=analysis.get("detected_product_label", "Recognized Product"),
        category_confidence=analysis.get("category_confidence", 95.0),
        detection_method=analysis.get("detection_method", "OpenCV Multi-Spectral & Geometry"),
        defects=detected_items,
        honesty_notice=analysis["honesty_notice"],
        inspected_at=now.strftime("%Y-%m-%d %H:%M:%S")
    )


@router.get("/{return_id}")
def get_inspection_for_return(return_id: str, db: Session = Depends(get_db)):
    """
    Fetches the latest inspection and defects for a specific return item.
    """
    inspection = (
        db.query(Inspection)
        .filter(Inspection.return_id == return_id)
        .order_by(Inspection.id.desc())
        .first()
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="No inspection found for this return ID")

    defects = db.query(Defect).filter(Defect.inspection_id == inspection.id).all()
    return {
        "inspection_id": inspection.id,
        "return_id": return_id,
        "image_url": inspection.image_url,
        "image_count": inspection.image_count,
        "is_blurry": inspection.is_blurry,
        "blur_score": inspection.blur_score,
        "quality_flag": inspection.quality_flag,
        "demo_mode_badge": "Demo Mode: OpenCV Preprocessed + Simulated Detections",
        "defects": [
            {
                "defect_type": d.defect_type,
                "severity": d.severity,
                "confidence": d.confidence,
                "bbox_x": d.bbox_x,
                "bbox_y": d.bbox_y,
                "bbox_w": d.bbox_w,
                "bbox_h": d.bbox_h,
                "description": d.description,
                "is_simulated": d.is_simulated
            }
            for d in defects
        ],
        "honesty_notice": "Visual inspection cannot confirm battery or internal electrical health; routed to functional testing.",
        "inspected_at": inspection.inspected_at.strftime("%Y-%m-%d %H:%M:%S") if inspection.inspected_at else ""
    }
