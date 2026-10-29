import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .api.dashboard import router as dashboard_router
from .api.registration import router as registration_router
from .api.inspection import router as inspection_router
from .api.tests import router as tests_router
from .api.decision import router as decision_router
from .api.marketplace import router as marketplace_router
from .api.outcomes import router as outcomes_router
from .api.shop import router as shop_router
from .api.supply_chain import router as supply_chain_router
from .vision import generate_sample_demo_images
from .seed_data import seed_demo_data

# Create database tables
Base.metadata.create_all(bind=engine)

# Seed demo data for Part A & B
from .database import SessionLocal
seed_db = SessionLocal()
try:
    seed_demo_data(seed_db)
finally:
    seed_db.close()

# Prepare sample images directory
SAMPLE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "samples")
generate_sample_demo_images(SAMPLE_DIR)

app = FastAPI(
    title="ReLife AI API",
    description="Intelligent Product Recovery Decision Platform for Returned Electronics",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount sample images as static
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Include Core API Routers
app.include_router(dashboard_router)
app.include_router(registration_router)
app.include_router(inspection_router)
app.include_router(tests_router)
app.include_router(decision_router)
app.include_router(marketplace_router)
app.include_router(outcomes_router)
app.include_router(shop_router)
app.include_router(supply_chain_router)

# Include New API Routers (Part A & B)
from .api.auth import router as auth_router
from .api.allocation import router as allocation_router
from .api.admin import router as admin_router

app.include_router(auth_router)
app.include_router(allocation_router)
app.include_router(admin_router)


@app.get("/")
def root():
    return {
        "status": "online",
        "platform": "ReLife AI - Returned Electronics Recovery",
        "version": "1.0.0",
        "docs_url": "/docs",
        "modules": [
            "1. Product Registration & QR Passport (/api/returns/register)",
            "2. Image Preprocessing & Defect Detection (/api/inspections/upload)",
            "3. Functional Test Checklist (/api/returns/{id}/tests)",
            "4. Pathway Cost & Value Estimation (/api/returns/{id}/economics)",
            "5. Five-Pathway Decision Engine (/api/returns/{id}/evaluate)",
            "6. Human Review Routing (/api/returns/{id}/resolve-review)",
            "7. Explainable Report (/api/returns/{id}/report)",
            "8. B2B Component Marketplace (/api/marketplace/components)",
            "9. Closed-Loop Outcome Tracking (/api/outcomes)",
            "10. Circular Operations Dashboard (/api/dashboard)"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
