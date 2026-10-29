from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base


# 1. Products Catalog
class Product(Base):
    __tablename__ = "products"

    id = Column(String(32), primary_key=True, index=True)
    brand = Column(String(64), nullable=False)
    model = Column(String(128), nullable=False)
    category = Column(String(64), nullable=False, index=True)  # Laptop | Smartphone
    msrp_inr = Column(Float, nullable=False, default=0.0)
    weight_kg = Column(Float, nullable=False, default=0.2)
    release_year = Column(Integer, default=2024)
    specs = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    returns = relationship("ReturnItem", back_populates="product", cascade="all, delete-orphan")
    market_data = relationship("MarketData", back_populates="product", cascade="all, delete-orphan")


# 2. Returns Ledger
class ReturnItem(Base):
    __tablename__ = "returns"

    id = Column(String(32), primary_key=True, index=True)
    product_id = Column(String(32), ForeignKey("products.id"), nullable=False, index=True)
    purchase_price = Column(Float, nullable=False, default=0.0)
    age_months = Column(Integer, nullable=False, default=6)
    return_reason = Column(String(128), nullable=False)
    warranty_status = Column(String(32), nullable=False, default="Active")  # Active | Expired | Void
    customer_issue = Column(Text, nullable=True)
    received_date = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    status = Column(String(32), nullable=False, default="In progress")  # Recovered | In progress | Needs human review
    needs_human_review = Column(Boolean, default=False, index=True)
    review_reason = Column(String(255), nullable=True)
    required_test = Column(String(255), nullable=True)
    qr_code_data = Column(Text, nullable=True)
    qr_code_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="returns")
    inspections = relationship("Inspection", back_populates="return_item", cascade="all, delete-orphan")
    functional_tests = relationship("FunctionalTest", back_populates="return_item", cascade="all, delete-orphan")
    defects = relationship("Defect", back_populates="return_item", cascade="all, delete-orphan")
    recovery_options = relationship("RecoveryOption", back_populates="return_item", cascade="all, delete-orphan")
    costs = relationship("CostBreakdown", back_populates="return_item", cascade="all, delete-orphan")
    components = relationship("Component", back_populates="return_item", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="return_item", cascade="all, delete-orphan")
    outcomes = relationship("RecoveryOutcome", back_populates="return_item", cascade="all, delete-orphan")
    environmental_records = relationship("EnvironmentalRecord", back_populates="return_item", cascade="all, delete-orphan")


# 3. Visual Inspections
class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    return_id = Column(String(32), ForeignKey("returns.id"), nullable=False, index=True)
    image_url = Column(String(255), nullable=True)
    image_count = Column(Integer, default=1)
    is_blurry = Column(Boolean, default=False)
    blur_score = Column(Float, default=120.0)  # Laplacian variance
    quality_flag = Column(String(32), default="Pass")  # Pass | Low Quality (Blurry)
    model_version = Column(String(64), nullable=True)
    image_paths_json = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    inspected_at = Column(DateTime, default=datetime.utcnow)

    return_item = relationship("ReturnItem", back_populates="inspections")
    defects = relationship("Defect", back_populates="inspection", cascade="all, delete-orphan")


# 4. Detected Defects
class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=True, index=True)
    return_id = Column(String(32), ForeignKey("returns.id"), nullable=False, index=True)
    defect_type = Column(String(64), nullable=False, index=True)  # crack | dent | scratch | missing part | battery fault
    severity = Column(String(32), nullable=False, default="low")  # low | med | high
    confidence = Column(Float, nullable=False, default=90.0)
    bbox_x = Column(Float, default=0.1)
    bbox_y = Column(Float, default=0.1)
    bbox_w = Column(Float, default=0.3)
    bbox_h = Column(Float, default=0.2)
    is_simulated = Column(Boolean, default=True)  # Clearly labeled Demo Mode fallback
    description = Column(String(255), nullable=False)
    detected_by = Column(String(32), default="opencv_yolo_fallback")

    inspection = relationship("Inspection", back_populates="defects")
    return_item = relationship("ReturnItem", back_populates="defects")


# 5. Functional Tests
class FunctionalTest(Base):
    __tablename__ = "functional_tests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    return_id = Column(String(32), ForeignKey("returns.id"), nullable=False, index=True)
    powers_on = Column(String(16), default="pass")  # pass | fail | unknown
    display_ok = Column(String(16), default="pass")  # pass | fail | unknown
    battery_health_pct = Column(Integer, default=85)  # 0-100, or -1 if unknown
    battery_test = Column(String(16), default="pass")  # pass | fail | unknown
    motherboard_ok = Column(String(16), default="pass")  # pass | fail | unknown
    ram_ok = Column(String(16), default="pass")  # pass | fail | unknown
    storage_ok = Column(String(16), default="pass")  # pass | fail | unknown
    ports_ok = Column(String(16), default="pass")  # pass | fail | unknown
    overall_condition_score = Column(Float, default=85.0)
    has_unknown_test = Column(Boolean, default=False)
    tested_at = Column(DateTime, default=datetime.utcnow)

    @property
    def condition_score(self):
        return self.overall_condition_score

    @condition_score.setter
    def condition_score(self, val):
        self.overall_condition_score = val

    return_item = relationship("ReturnItem", back_populates="functional_tests")


# 6. Recovery Options (5-Pathway Engine Ranks)
class RecoveryOption(Base):
    __tablename__ = "recovery_options"

    id = Column(Integer, primary_key=True, autoincrement=True)
    return_id = Column(String(32), ForeignKey("returns.id"), nullable=False, index=True)
    pathway = Column(String(32), nullable=False, index=True)  # Direct Resale | Repair | Refurbishment | Component Harvesting | Recycling
    rank = Column(Integer, default=1)
    net_recovery_value = Column(Float, default=0.0)
    expected_revenue = Column(Float, default=0.0)
    expected_cost = Column(Float, default=0.0)
    recovery_time_days = Column(Integer, default=2)
    risk_score = Column(Float, default=15.0)  # 0-100 (lower is better)
    environmental_score = Column(Float, default=80.0)  # 0-100
    weighted_score = Column(Float, default=75.0)
    is_safety_override = Column(Boolean, default=False)
    override_reason = Column(String(255), nullable=True)

    return_item = relationship("ReturnItem", back_populates="recovery_options")


# 7. Itemized Costs Breakdown
class CostBreakdown(Base):
    __tablename__ = "costs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    return_id = Column(String(32), ForeignKey("returns.id"), nullable=False, index=True)
    pathway = Column(String(32), nullable=False)
    parts_cost = Column(Float, default=0.0)
    labor_cost = Column(Float, default=0.0)
    testing_cost = Column(Float, default=0.0)
    cleaning_cost = Column(Float, default=0.0)
    handling_cost = Column(Float, default=0.0)
    storage_cost = Column(Float, default=0.0)
    transport_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    is_confirmed = Column(Boolean, default=False)  # Tagged estimated vs confirmed

    return_item = relationship("ReturnItem", back_populates="costs")


# 8. Secondary Market Baseline Data
class MarketData(Base):
    __tablename__ = "market_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(32), ForeignKey("products.id"), nullable=False, index=True)
    pathway = Column(String(32), nullable=False)
    avg_resale_price = Column(Float, default=0.0)
    demand_index = Column(Float, default=1.0)  # 0.5 - 2.0
    price_volatility = Column(Float, default=0.1)
    updated_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="market_data")


# 9. Harvestable Components
class Component(Base):
    __tablename__ = "components"

    id = Column(Integer, primary_key=True, autoincrement=True)
    return_id = Column(String(32), ForeignKey("returns.id"), nullable=False, index=True)
    component_type = Column(String(64), nullable=False)  # display | battery | motherboard | RAM | storage
    condition = Column(String(32), default="Grade A")  # Grade A | Grade B | Grade C | Defective
    estimated_value = Column(Float, default=0.0)
    is_harvested = Column(Boolean, default=False)
    buyer_match_id = Column(Integer, nullable=True)

    return_item = relationship("ReturnItem", back_populates="components")


# 10. Circular B2B Buyers
class Buyer(Base):
    __tablename__ = "buyers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    buyer_type = Column(String(64), nullable=False)  # refurbisher | repair_shop | certified_smelter
    target_components = Column(String(255), nullable=False)  # comma separated: display,RAM,battery
    min_condition = Column(String(32), default="Grade B")
    bid_price_factor = Column(Float, default=0.95)
    demand_rating = Column(String(16), default="High")  # High | Medium | Low
    location = Column(String(64), default="Mumbai, India")


# 11. Final Explainable Recommendations
class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    return_id = Column(String(32), ForeignKey("returns.id"), nullable=False, index=True)
    selected_pathway = Column(String(32), nullable=False, index=True)
    predicted_value_inr = Column(Float, default=0.0)
    estimated_cost_inr = Column(Float, default=0.0)
    reasoning = Column(Text, nullable=True)
    confidence_overall = Column(Float, default=85.0)
    confidence_detection = Column(Float, default=90.0)
    confidence_condition = Column(Float, default=80.0)
    winner_rationale = Column(Text, nullable=True)
    fallback_rationale = Column(Text, nullable=True)
    missing_information = Column(Text, nullable=True)
    safety_override_triggered = Column(Boolean, default=False)
    human_review_required = Column(Boolean, default=False)
    required_tests = Column(String(255), nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)

    @property
    def pathway(self):
        return self.selected_pathway

    return_item = relationship("ReturnItem", back_populates="recommendations")


# 12. Actual Outcomes & Realization
class RecoveryOutcome(Base):
    __tablename__ = "recovery_outcomes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    return_id = Column(String(32), ForeignKey("returns.id"), nullable=False, index=True)
    actual_pathway = Column(String(32), nullable=False, index=True)
    actual_revenue = Column(Float, default=0.0)
    actual_cost = Column(Float, default=0.0)
    actual_value_inr = Column(Float, default=0.0)
    actual_time_days = Column(Integer, default=2)
    waste_diverted_kg = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, default=datetime.utcnow)

    return_item = relationship("ReturnItem", back_populates="outcomes")


# 13. Environmental & ESG Diverted Records
class EnvironmentalRecord(Base):
    __tablename__ = "environmental_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    return_id = Column(String(32), ForeignKey("returns.id"), nullable=False, index=True)
    pathway = Column(String(32), nullable=False)
    waste_diverted_kg = Column(Float, default=0.0)
    co2e_avoided_kg = Column(Float, default=0.0)
    lifetime_extension_months = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    return_item = relationship("ReturnItem", back_populates="environmental_records")
