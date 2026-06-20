# Radiant AI Setup

Radiant now uses GPT-4o Vision for chest X-ray workflow support. Vercel calls OpenAI, stores structured results in Supabase, renders lung-zone overlays in the frontend, and sends high-risk alerts through Resend.

This is not a medical diagnostic tool. It is an AI-assisted imaging workflow and decision support system.

## 1. OpenAI Vision

Create an OpenAI API key with access to GPT-4o Vision and add it to Vercel:

```env
OPENAI_API_KEY=your_openai_key
OPENAI_VISION_MODEL=gpt-4o
OPENAI_VISION_TIMEOUT_MS=60000
OPENAI_VISION_MAX_TOKENS=800
```

`OPENAI_VISION_MODEL` can be changed later if the app should use a newer compatible vision model. The analysis route keeps temperature at `0.1` and asks for JSON only.

## 2. Supabase Schema

Run the Supabase migrations in order so Radiant can store GPT output:

```text
001_auth_and_orgs.sql
002_imaging.sql
003_gpt_vision_analysis.sql
```

The GPT migration adds:

- `studies.summary`
- `studies.raw_findings`
- `study_findings.zone`

Findings use these zones:

```text
left_upper
left_lower
right_upper
right_lower
center
```

## 3. Supabase Storage

Radiant stores uploaded images in the private `studies` bucket. The app reads the image with the Supabase service role during analysis, then creates signed URLs for frontend display.

Required Vercel variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 4. High-Risk Alerts

Studies with `risk_score >= 70` create an alert and email organization admins.

```env
RISK_HIGH_THRESHOLD=70
RESEND_API_KEY=
RESEND_FROM_EMAIL=Radiant <alerts@yourdomain.com>
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

Make sure `RESEND_FROM_EMAIL` uses a verified sender domain in Resend.

## 5. Analysis Contract

The backend sends uploaded X-rays to GPT-4o Vision and validates this JSON shape:

```json
{
  "risk_score": 82,
  "risk_level": "HIGH",
  "findings": [
    {
      "label": "lung_opacity",
      "zone": "right_lower",
      "confidence": 0.86
    }
  ],
  "summary": "Right lower lung zone opacity with elevated risk score. Radiologist review is recommended."
}
```

Allowed labels:

```text
pneumonia
pleural_effusion
pneumothorax
lung_opacity
cardiomegaly
normal
```

The app stores:

- `risk_score`, `risk_level`, `summary`, and `raw_findings` on `studies`
- zone-aware records in `study_findings`
- a report summary in `reports`
- a high-risk row in `alerts` when threshold is met

## 6. Frontend Output

The dashboard renders:

- PACS Archive from Supabase studies
- Patient Analysis upload and analyze flow
- Reports from GPT summaries
- Alerts from real high-risk rows
- Viewer overlays from fixed lung zones

Heatmap overlays are intentionally frontend-generated rectangles based on GPT zones. Radiant no longer requires HuggingFace, CheXpert, or Grad-CAM services.

## 7. Vercel Checklist

Set these variables in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-4o
OPENAI_VISION_TIMEOUT_MS=60000
OPENAI_VISION_MAX_TOKENS=800

RISK_HIGH_THRESHOLD=70
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=
```

After deploying, upload a chest X-ray from Patient Analysis. A successful run should archive the image, call GPT-4o Vision, store structured findings, show lung-zone overlays, and create alerts for high-risk results.

## 8. Troubleshooting

### Analysis says `OPENAI_API_KEY is not configured`

Add `OPENAI_API_KEY` to the Vercel project and redeploy.

### GPT returns non-JSON content

The route uses JSON mode and strict validation. Check the debug panel in Patient Analysis for the failing step and response details.

### Findings do not show overlays

Confirm the migration adding `study_findings.zone` has run. Existing pre-migration findings may default to `center`; re-run analysis to generate true GPT zones.

### Alerts are missing

Confirm the returned `risk_score` is at or above `RISK_HIGH_THRESHOLD`, then check `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and admin profile emails.
