const UPSTREAM_BASE_URL =
  "https://torappu.prts.wiki/assets/char_spine"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ char_id: string }> }
) {
  const { char_id: charId } = await params
  const upstreamUrl = `${UPSTREAM_BASE_URL}/${encodeURIComponent(charId)}/meta.json`

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
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
        "Content-Type": "application/json; charset=utf-8",
      },
    })
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 })
    }

    console.error(`Failed to fetch Spine metadata for ${charId}.`, error)
    return Response.json(
      { error: "Failed to fetch Spine metadata." },
      { status: 502 }
    )
  }
}
