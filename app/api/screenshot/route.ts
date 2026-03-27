import puppeteer from 'puppeteer'
import { uploadToS3 } from '@/lib/s3'

export const maxDuration = 30

export async function POST(req: Request) {
  const { url } = await req.json()
  if (!url) return Response.json({ error: 'Missing url' }, { status: 400 })

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 720 })

    // Block ads/trackers to speed up load
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const type = req.resourceType()
      if (['font', 'media'].includes(type)) {
        req.abort()
      } else {
        req.continue()
      }
    })

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })

    // Brief pause to let above-the-fold images render
    await new Promise((r) => setTimeout(r, 1500))

    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 85,
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    })

    const filename = `hero_${Date.now()}.jpg`
    const s3Url = await uploadToS3(
      Buffer.from(screenshot),
      'product-images',
      filename,
      'image/jpeg',
    )

    return Response.json({ url: s3Url })
  } catch {
    return Response.json({ error: 'Screenshot failed' }, { status: 500 })
  } finally {
    await browser.close()
  }
}
