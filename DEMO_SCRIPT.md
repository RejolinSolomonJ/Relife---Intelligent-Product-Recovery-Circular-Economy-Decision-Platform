# ReLife AI — Hackathon Live Demo Walkthrough Script

This script walks through the **Canonical Laptop Scenario** demonstrating the complete end-to-end flow from intake to circular disposition in **under 2 minutes**.

---

## 🎬 Demo Scenario: Apple MacBook Pro 14 (Cracked Display)

**Scenario Overview**: A customer returns a premium MacBook Pro 14 (M2 Pro) after dropping it during transit. The glass screen has radiating fractures, but the internal chassis, battery, motherboard, and logic components are functional.

---

### Step 1: Product Registration & Digital Passport (30 Seconds)
1. Open the ReLife AI platform (`http://localhost:3000`).
2. Click **Recovery Wizard** in the left sidebar or click the **(Demo) Laptop - Cracked Screen** quick preset button at the top.
3. Form fields auto-populate:
   - **Brand**: `Apple`
   - **Model**: `MacBook Pro 14 (M2 Pro)`
   - **Category**: `Laptop`
   - **Purchase Price**: `₹1,69,900`
   - **Age**: `7 Months`
   - **Return Reason**: `Cracked screen / cosmetic transit damage`
   - **Reported Issue**: `Display glass fractured on drop; unit boots and chimed ok`
4. Click **Register Product & Generate Digital Passport**.
5. **Outcome**:
   - Unique Return ID generated: `REL-2026-xxxx`
   - Scannable QR code generated in real-time, linking directly to `/passport/REL-2026-xxxx`.

---

### Step 2: Optical Defect Detection via OpenCV (25 Seconds)
1. Wizard transitions to **Step 2: Vision Inspection**.
2. Click the sample photo card: **Laptop - Cracked Display** (`laptop_cracked_screen.jpg`).
3. Click **Run Optical Defect Detection**.
4. **Backend Processing**:
   - OpenCV applies bilateral denoising and Laplacian blur variance calculation (Score: `185.0` > `100.0` threshold = **Pass**).
   - Defect detector classifies the anomaly:
     - **Defect**: `crack`
     - **Severity**: `high`
     - **Confidence**: `94.6%`
     - **Location**: Normalized bounding box `[0.15, 0.18, 0.65, 0.55]`
5. **UI Visualization**:
   - Red dashed bounding box draws directly over the fractured screen glass with tag: `CRACK (94.6%)`.
   - Clear badge: **Demo Mode: OpenCV Preprocessed + Simulated Detections**.
   - Honesty notice displayed: *"Visual inspection cannot confirm battery or internal electrical health; routed to testing."*

---

### Step 3: Bench Functional Test Input (20 Seconds)
1. Wizard transitions to **Step 3: Functional Tests**.
2. Click preset: **Display Damaged, Internals Pass (Demo Scenario)**.
3. Test checklist status:
   - **Power Sequencing**: `Pass`
   - **Display & Backlight**: `Fail` *(matches optical crack)*
   - **Battery Capacity**: `91%` (`Pass`)
   - **Motherboard / Logic**: `Pass`
   - **System RAM**: `Pass`
   - **SSD Storage**: `Pass`
   - **I/O Ports**: `Pass`
4. Click **Save Bench Tests & Calculate Hardware Condition Score**.
5. **Outcome**:
   - Hardware condition score computed: `85.0 / 100`.
   - Zero unknown tests flagged; confidence maintained.

---

### Step 4: Cost & Value Estimation (15 Seconds)
1. Wizard transitions to **Step 4: Cost Estimation**.
2. System computes itemized cost models across all 5 circular pathways:
   - **Parts Cost**: `₹24,000` *(OEM Retina display panel replacement)*
   - **Labor Cost**: `₹2,500` *(technician bench time)*
   - **Diagnostics & Testing**: `₹800`
   - **Cleaning & Packaging**: `₹400`
   - **Freight & Logistics**: `₹600`
   - **Total Repair Cost**: `₹28,300` *(labeled "sample assumption")*
   - **Expected Secondary Resale Revenue**: `₹1,24,685` (73.4% MSRP)
   - **Net Recovery Value (NRV)**: `₹96,385`
3. Click **Proceed to Step 5: Decision Engine**.

---

### Step 5: Five-Pathway Multi-Criteria Decision Engine (15 Seconds)
1. Wizard evaluates all 5 pathways with multi-objective optimization sliders:
   - Profit: `40%` | Environment: `30%` | Speed: `15%` | Risk: `15%`
2. **Hard Safety Override Constraint Triggered**:
   - **Direct Resale**: **DISQUALIFIED / BLOCKED** with badge: `Safety Override: Display glass fracture or failed display test prohibits direct un-repaired resale`.
3. **Rankings Displayed**:
   - **Rank #1 (WINNER)**: **Repair** — Net Recovery Value: `₹96,385` | Score: `88.4 pts`
   - **Rank #2**: **Refurbishment** — Net Recovery Value: `₹72,400` | Score: `74.1 pts`
   - **Rank #3**: **Component Harvesting** — Net Recovery Value: `₹48,200` | Score: `59.2 pts`
   - **Rank #4**: **Recycling** — Net Recovery Value: `₹12,500` | Score: `32.0 pts`
   - **Rank #5**: **Direct Resale** — Disqualified (`0.0 pts`)
4. Adjust the **Max Profit** or **Eco Champion** sliders live to see how rankings adjust dynamically.

---

### Step 6: Human Review Routing & Sign-off (10 Seconds)
1. Because display replacement is required, the system displays the prescribed technician protocol:
   - *Run OEM component authorization & serial pairing validation.*
2. Click **Confirm Tests & Sign Off on Decision**.

---

### Step 7: Explainable Recommendation Report & Passport (15 Seconds)
1. Full certified report is rendered:
   - Horizontal Recharts comparison bar chart of Net Recovery Values.
   - **Why Winner Was Chosen**: Detailed explanation highlighting modular repair economics and 94% carbon salvage.
   - **Why Others Ranked Lower**: Itemized bullet points explaining margin differential and safety overrides.
   - **3 Separate Confidence Metrics**:
     - Optical Defect Confidence: `94.6%`
     - Hardware Condition Confidence: `85.0%`
     - Overall Recommendation Confidence: `88.8%`
   - **Environmental Footprint**: `1.504 kg` e-waste diverted | `57.8 kg` CO₂e emissions avoided.
2. Click **Download Report as PDF** (triggers printable layout) or click **Open Public Passport Page** to view the live Digital Product Passport (`/passport/[id]`).

---

## 🏆 Key Differentiation Highlights for Judges
1. **Honesty by Design**: Clear labeling of sample assumptions, OpenCV blur variance thresholds (< 100), and explicit acknowledgement that optical cameras cannot test internal battery chemistry without bench diagnostics.
2. **Hard Safety Overrides**: Dangerous or damaged units (e.g. cracked display, battery < 70%) are strictly blocked from resale regardless of profit margin.
3. **Multi-Criteria Sliders**: Balances corporate profit with ESG carbon diversion and turnaround velocity.
4. **Digital Product Passport (DPP)**: Real-time generated scannable QR code linking to permanent circular recovery certificate.

