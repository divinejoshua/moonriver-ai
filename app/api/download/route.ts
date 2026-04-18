export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) return Response.json({ error: 'Missing url' }, { status: 400 })

  const res = await fetch(url)
  if (!res.ok) return Response.json({ error: 'Failed to fetch file' }, { status: 502 })

  const filename = searchParams.get('filename') ?? 'iloveugc_video.mp4'

  return new Response(res.body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
