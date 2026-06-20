export type GradCamResult = {
  heatmap: Buffer | null
  contentType: string | null
  skipped: boolean
  error?: string
}

function getEndpoint() {
  return process.env.GRADCAM_API_URL?.trim()
}

function imageDataUrl(image: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${image.toString("base64")}`
}

async function readHeatmapResponse(response: Response): Promise<Pick<GradCamResult, "heatmap" | "contentType">> {
  const contentType = response.headers.get("content-type") ?? "image/png"

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { heatmap?: string; image?: string; data?: string }
    const encoded = payload.heatmap ?? payload.image ?? payload.data

    if (!encoded) {
      throw new Error("Grad-CAM endpoint returned JSON without a heatmap field.")
    }

    const base64 = encoded.includes(",") ? encoded.split(",").pop() : encoded
    return { heatmap: Buffer.from(base64 ?? "", "base64"), contentType: "image/png" }
  }

  return { heatmap: Buffer.from(await response.arrayBuffer()), contentType }
}

export async function generateHeatmap(image: Buffer, mimeType: string): Promise<GradCamResult> {
  const endpoint = getEndpoint()

  if (!endpoint) {
    return {
      heatmap: null,
      contentType: null,
      skipped: true,
      error: "GRADCAM_API_URL is not configured.",
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: imageDataUrl(image, mimeType),
      }),
    })

    if (!response.ok) {
      return {
        heatmap: null,
        contentType: null,
        skipped: false,
        error: (await response.text()) || "Grad-CAM endpoint failed.",
      }
    }

    return {
      ...(await readHeatmapResponse(response)),
      skipped: false,
    }
  } catch (error) {
    return {
      heatmap: null,
      contentType: null,
      skipped: false,
      error: error instanceof Error ? error.message : "Grad-CAM endpoint failed.",
    }
  }
}
