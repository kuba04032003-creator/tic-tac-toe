export async function POST(req: Request) {
  const { siteUrl, username, appPassword, title, content, status } = await req.json()

  if (!siteUrl || !username || !appPassword || !title) {
    return new Response('siteUrl, username, appPassword, and title are required', { status: 400 })
  }

  const base = siteUrl.replace(/\/$/, '')
  const endpoint = `${base}/wp-json/wp/v2/posts`
  const credentials = Buffer.from(`${username}:${appPassword}`).toString('base64')

  const wpRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      content,
      status: status || 'draft',
    }),
  })

  if (!wpRes.ok) {
    const err = await wpRes.text()
    return new Response(`WordPress error: ${err}`, { status: wpRes.status })
  }

  const post = await wpRes.json()
  return Response.json({ id: post.id, link: post.link })
}
