You are working on a medical imaging hackathon project called "Radiant".

We are replacing all ML/HuggingFace logic with GPT-4o Vision.

Your job is to implement a fully working AI analysis pipeline inside the existing Vercel + Next.js + Supabase architecture.

---

# 🎯 CORE GOAL

When a user uploads a chest X-ray image:

1. Send image to GPT-4o Vision
2. Receive structured JSON output
3. Store it in Supabase (PACS system)
4. Render results in frontend
5. Display a fake heatmap overlay using lung zones
6. Trigger alerts if risk is high

---

# ⚙️ GPT-4o ANALYSIS REQUIREMENTS

Create a backend function that calls GPT-4o Vision with the following strict prompt:

SYSTEM / DEVELOPER PROMPT:

You are an AI radiology assistant for a hackathon medical imaging system.

Analyze the provided chest X-ray image.

Return ONLY valid JSON. No explanations, no markdown, no extra text.

---

Allowed findings labels ONLY:

- pneumonia
- pleural_effusion
- pneumothorax
- lung_opacity
- cardiomegaly
- normal

---

Allowed zones:

- left_upper
- left_lower
- right_upper
- right_lower
- center

---

Output JSON schema:

{
  "risk_score": number (0-100),
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "findings": [
    {
      "label": one of allowed labels,
      "zone": one of allowed zones,
      "confidence": number between 0 and 1
    }
  ],
  "summary": string
}

---

Rules:
- Always return valid JSON
- Be consistent between findings and risk_score
- If multiple findings exist, risk_score must increase
- Do not hallucinate outside allowed labels
- Keep output deterministic (temperature = 0.1)

---

# 🧠 BACKEND IMPLEMENTATION

Create or update:

/api/studies/[id]/analyze

Steps:

1. Load image from Supabase storage
2. Convert to base64 if needed
3. Send to GPT-4o Vision
4. Parse JSON response safely
5. Validate schema
6. Store result in Supabase:

TABLE: studies
- risk_score
- risk_level
- summary
- raw_findings
- status = "analyzed"

---

# 🚨 ALERT SYSTEM

If:

risk_score >= 70

Then:
1. Create alert in Supabase alerts table
2. Trigger email via Resend
3. Mark study as "high-risk"

---

# 🎨 FAKE HEATMAP SYSTEM (IMPORTANT)

Implement frontend overlay system:

Define fixed lung zones:

const zones = {
  left_upper: { x: 0.1, y: 0.1, w: 0.4, h: 0.4 },
  left_lower: { x: 0.1, y: 0.5, w: 0.4, h: 0.4 },
  right_upper: { x: 0.5, y: 0.1, w: 0.4, h: 0.4 },
  right_lower: { x: 0.5, y: 0.5, w: 0.4, h: 0.4 },
  center: { x: 0.3, y: 0.3, w: 0.4, h: 0.4 }
};

Rendering rules:

- For each finding:
  - map zone → rectangle overlay
  - color = red
  - opacity = confidence (0.3–0.8)
- Stack multiple overlays
- Hover shows:
  - label
  - confidence

---

# 🏥 PACS SYSTEM BEHAVIOR

Every analyzed study must be stored as:

{
  image_url,
  risk_score,
  risk_level,
  findings,
  summary,
  created_at,
  department_access
}

This acts as a simplified PACS system.

---

# 📊 FRONTEND INTEGRATION

Update dashboard sections:

- PACS Archive → real Supabase data
- Patient Analysis → upload + analyze trigger
- Reports → GPT summary
- Alerts → real-time high-risk cases
- Viewer → image + overlay heatmap

---

# ⚡ PERFORMANCE SETTINGS

- GPT-4o temperature: 0.1
- Max tokens: sufficient for JSON only
- Always enforce JSON parsing with try/catch fallback

---

# 🧠 IMPORTANT DESIGN PRINCIPLE

This system is NOT a medical diagnostic tool.

It is a:
"AI-assisted imaging workflow and decision support system"

---

# ✅ SUCCESS CRITERIA

After implementation:

User uploads X-ray →
→ GPT-4o returns structured findings →
→ system computes risk →
→ heatmap overlays zones →
→ PACS stores record →
→ alerts trigger if high risk →
→ dashboard updates in real time

---

End of instructions.