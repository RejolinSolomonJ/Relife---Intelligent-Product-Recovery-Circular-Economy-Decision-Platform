"""
ReLife AI - Seeded Pricing & Market Assumptions
All numbers in this file represent illustrative sample assumptions for the hackathon prototype.
Every figure presented to the user is labeled 'sample assumption' or 'estimated'.
"""

# Base baseline component value factors (percentage of MSRP)
COMPONENT_VALUE_RATIOS = {
    "Laptop": {
        "display": 0.28,
        "motherboard": 0.32,
        "ram": 0.08,
        "storage": 0.09,
        "battery": 0.07,
    },
    "Smartphone": {
        "display": 0.35,
        "motherboard": 0.30,
        "battery": 0.08,
        "storage": 0.10,
        "camera_module": 0.12,
    },
    "Clothing": {
        "zipper_hardware": 0.05,
        "buttons_fasteners": 0.03,
        "lining_fabric": 0.06,
        "main_textile": 0.20,
    },
    "Mouse": {
        "optical_sensor": 0.32,
        "microswitches": 0.24,
        "scroll_encoder": 0.16,
        "chassis_housing": 0.14,
        "cable_dongle": 0.14,
    }
}

# Pathway Operational Cost Estimates in INR (Labor, testing, cleaning, handling, transport)
PATHWAY_OPERATIONAL_COSTS = {
    "Direct Resale": {
        "labor_cost": 450.0,
        "testing_cost": 300.0,
        "cleaning_cost": 250.0,
        "handling_cost": 150.0,
        "storage_cost": 100.0,
        "transport_cost": 250.0,
    },
    "Repair": {
        "labor_cost": 1800.0,
        "testing_cost": 600.0,
        "cleaning_cost": 300.0,
        "handling_cost": 200.0,
        "storage_cost": 150.0,
        "transport_cost": 300.0,
    },
    "Refurbishment": {
        "labor_cost": 2400.0,
        "testing_cost": 800.0,
        "cleaning_cost": 500.0,
        "handling_cost": 250.0,
        "storage_cost": 200.0,
        "transport_cost": 350.0,
    },
    "Component Harvesting": {
        "labor_cost": 900.0,
        "testing_cost": 450.0,
        "cleaning_cost": 150.0,
        "handling_cost": 200.0,
        "storage_cost": 150.0,
        "transport_cost": 200.0,
    },
    "Recycling": {
        "labor_cost": 300.0,
        "testing_cost": 100.0,
        "cleaning_cost": 0.0,
        "handling_cost": 150.0,
        "storage_cost": 100.0,
        "transport_cost": 350.0,
    }
}

# Typical part replacement costs (by defect type and category) in INR
DEFECT_PART_COSTS = {
    "Laptop": {
        "crack": 9500.0,         # Screen / bezel replacement
        "dent": 4500.0,          # Top cover or palmrest casing
        "scratch": 1200.0,       # Casing touch-up or skin
        "missing part": 2200.0,  # Power adapter, rubber feet, keycap
        "battery fault": 4800.0, # OEM battery pack
    },
    "Smartphone": {
        "crack": 6800.0,         # OLED / Glass digitizer
        "dent": 2500.0,          # Mid-frame enclosure
        "scratch": 800.0,        # Hydrogel buffing / back cover
        "missing part": 600.0,   # SIM tray / speaker mesh
        "battery fault": 2800.0, # High-capacity cell replacement
    },
    "Clothing": {
        "stain": 1400.0,         # Specialized chemical stain removal
        "tear": 1600.0,          # Precision re-weaving / seam tailoring
        "scratch": 400.0,        # Surface fabric de-pilling
        "missing part": 300.0,   # Button / zipper pull replacement
    },
    "Mouse": {
        "scratch": 220.0,        # Chassis buffing / new teflon skates
        "dent": 380.0,           # Top palm shell replacement
        "crack": 550.0,          # Click plate / microswitch assembly
        "missing part": 320.0,   # 2.4GHz wireless receiver / battery door
        "stain": 180.0,          # Ultrasonic degrease bath
    }
}

# Environmental factors (illustrative factors per kg device)
ENVIRONMENTAL_FACTORS = {
    "waste_diverted_ratio": {
        "Direct Resale": 0.98,
        "Repair": 0.94,
        "Refurbishment": 0.90,
        "Component Harvesting": 0.75,
        "Recycling": 0.85,
    },
    "co2e_saved_per_kg": 38.5,       # kg CO2e avoided per kg preserved
    "lifetime_extension_months": {
        "Direct Resale": 24,
        "Repair": 18,
        "Refurbishment": 20,
        "Component Harvesting": 12,
        "Recycling": 0,
    }
}

# Seeded B2B Component Buyers
SEED_BUYERS = [
    {
        "id": 1,
        "name": "Apex Electronics Refurbishers",
        "buyer_type": "refurbisher",
        "target_components": "display,motherboard,RAM",
        "min_condition": "Grade B",
        "bid_price_factor": 0.94,
        "demand_rating": "High",
        "location": "Bengaluru, India"
    },
    {
        "id": 2,
        "name": "iFixit Certified Network Partner",
        "buyer_type": "repair_shop",
        "target_components": "display,battery,camera_module",
        "min_condition": "Grade A",
        "bid_price_factor": 0.98,
        "demand_rating": "High",
        "location": "Mumbai, India"
    },
    {
        "id": 3,
        "name": "EcoSmelt Secondary Metals Corp",
        "buyer_type": "certified_smelter",
        "target_components": "motherboard,battery,chassis",
        "min_condition": "Defective",
        "bid_price_factor": 0.85,
        "demand_rating": "Medium",
        "location": "Pune, India"
    },
    {
        "id": 4,
        "name": "QuickFix Mobile Hub",
        "buyer_type": "repair_shop",
        "target_components": "display,storage,battery",
        "min_condition": "Grade B",
        "bid_price_factor": 0.91,
        "demand_rating": "High",
        "location": "Delhi NCR, India"
    }
]

