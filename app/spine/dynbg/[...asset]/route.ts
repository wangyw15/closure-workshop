const UPSTREAM_BASE_URL = "https://static.prts.wiki/spine38/dynbg"

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ asset: string[] }> }
) {
  const { asset } = await params

  if (
    asset.length === 0 ||
    asset.some(
      (segment) =>
        segment === ".." || segment.includes("/") || segment.includes("\\")
    )
  ) {
    return Response.json({ error: "Invalid asset path." }, { status: 400 })
  }

  const upstreamUrl = `${UPSTREAM_BASE_URL}/${asset
    .map(encodeURIComponent)
    .join("/")}`
  const extension = upstreamUrl.slice(upstreamUrl.lastIndexOf("."))

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: { Accept: CONTENT_TYPES[extension] ?? "*/*" },
      signal: request.signal,
    })

    if (!upstreamResponse.ok) {
      return Response.json(
        { error: `Upstream request failed with status ${upstreamResponse.status}.` },
        { status: upstreamResponse.status }
      )
    }

    return new Response(upstreamResponse.body, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
      },
    })
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 })
    }

    console.error(`Failed to fetch Spine asset ${upstreamUrl}.`, error)
    return Response.json(
      { error: "Failed to fetch Spine asset." },
      { status: 502 }
    )
  }
}
