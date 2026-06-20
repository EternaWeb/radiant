# Radiant AI Setup

Follow this guide to configure the AI parts of Radiant on Vercel:

- Hugging Face image classification
- Optional Hugging Face Grad-CAM heatmap endpoint
- OpenAI report generation

Radiant does not host ML models inside Vercel. Vercel calls external AI APIs and stores the results in Supabase.

## 1. Hugging Face Account

1. Go to [Hugging Face](https://huggingface.co/).
2. Create an account or sign in.
3. Open **Settings > Access Tokens**.
4. Create a new token.
5. Choose a token type that can call Inference APIs.
6. Copy the token.

Add this to Vercel:

```env
HUGGINGFACE_API_KEY=your_hugging_face_token
```

## 2. Hugging Face Classification Model

Radiant uses Hugging Face as a probability engine only. It returns labels and probabilities, not diagnoses.

Set the model ID in Vercel:

```env
HUGGINGFACE_MODEL_ID=google/cxr-foundation
```

Expected output shape:

```json
{
  "pneumonia": 0.92,
  "effusion": 0.13,
  "cardiomegaly": 0.41
}
```

Radiant then computes the risk score itself.

## 3. Grad-CAM Heatmap Endpoint

Grad-CAM should run outside Vercel, usually as a Hugging Face Space.

1. In Hugging Face, open **Spaces**.
2. Create a new Space.
3. Choose **Gradio** or **Docker**.
4. Build an endpoint that accepts:

```json
{
  "image": "data:image/png;base64,..."
}
```

5. Return either raw PNG bytes or JSON with one of these fields:

```json
{
  "heatmap": "base64_png_here"
}
```

Also accepted:

```json
{
  "image": "base64_png_here"
}
```

or:

```json
{
  "data": "base64_png_here"
}
```

6. Copy the public Space API URL.
7. Add it to Vercel:

```env
GRADCAM_API_URL=https://your-space.hf.space/predict
```

If this is not configured, Radiant still works, but the heatmap overlay is skipped.

## 4. OpenAI Account

1. Go to [OpenAI Platform](https://platform.openai.com/).
2. Create an account or sign in.
3. Open **API keys**.
4. Create a new secret key.
5. Copy the key.

Add this to Vercel:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_REPORT_MODEL=gpt-4o-mini
```

Radiant uses OpenAI only to draft the structured report from:

- Hugging Face probabilities
- Radiant risk score
- optional clinical context like SpO2, fever, and symptoms

The report is AI-assisted and not a clinical diagnosis.

## 5. Optional Hugging Face Text Model Instead Of OpenAI

If you do not want to use OpenAI, you can use a Hugging Face text model for reports.

Add this to Vercel:

```env
HUGGINGFACE_TEXT_MODEL_ID=mistralai/Mistral-7B-Instruct-v0.3
```

Keep `HUGGINGFACE_API_KEY` configured.

If both OpenAI and Hugging Face text generation are configured, Radiant tries OpenAI first.

## 6. Risk Threshold

Set the high-risk threshold:

```env
RISK_HIGH_THRESHOLD=70
```

When a study reaches this threshold, Radiant:

- marks the study as critical
- creates an alert
- emails workspace admins through Resend

## 7. Demo Seed Images

Radiant includes an admin-only seed endpoint:

```http
POST /api/studies/seed
```

By default it uses public NIH chest X-ray PNG samples.

To use your own public images, add this to Vercel:

```env
SEED_CHEST_XRAY_URLS=https://example.com/xray1.png,https://example.com/xray2.png
```

Use direct PNG, JPEG, or WebP URLs.

## 8. Final Vercel Environment Variables

Add these in **Vercel > Project > Settings > Environment Variables**:

```env
HUGGINGFACE_API_KEY=
HUGGINGFACE_MODEL_ID=google/cxr-foundation
GRADCAM_API_URL=
OPENAI_API_KEY=
OPENAI_REPORT_MODEL=gpt-4o-mini
HUGGINGFACE_TEXT_MODEL_ID=
RISK_HIGH_THRESHOLD=70
SEED_CHEST_XRAY_URLS=
```

After saving the variables, redeploy the Vercel project.

## 9. Smoke Test On Vercel

1. Open `https://radiant.trymindcore.com`.
2. Sign in as an admin.
3. Go to **Imaging**.
4. Upload a chest X-ray PNG/JPEG/WebP.
5. Click **Upload & analyze**.
6. Confirm:
   - PACS Archive shows the study
   - AI Findings show probabilities
   - Risk Score is calculated
   - Report is generated
   - Heatmap appears if `GRADCAM_API_URL` is configured
   - Alerts appear for high-risk studies

## 10. Common Issues

### Hugging Face returns 503

The model is warming up. Try again after a short wait.

### No heatmap appears

Check `GRADCAM_API_URL`. If it is empty or the Space is sleeping, Radiant skips heatmaps and still completes analysis.

### Report is template-like

OpenAI or Hugging Face text generation is not configured, so Radiant used its fallback report.

### High-risk emails do not send

Check these Vercel variables:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=https://radiant.trymindcore.com
```
