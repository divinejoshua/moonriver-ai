import { GoogleGenAI } from '@google/genai'
import { NextRequest } from 'next/server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const HOOK_BANK = `
### Controversial Take
1. "This tool just made [job role] completely obsolete."
2. "I can't believe I paid for [expensive alternative] when this exists."
3. "Every [job role] who isn't using this is already behind."
4. "Hot take: [popular tool] is overrated. This is what actually works."
5. "Stop using [popular tool]. I switched and never looked back."
6. "This app just made half of Fiverr useless."

### Curiosity Gap
7. "I found a tool that does in 5 seconds what used to take me 3 hours."
8. "There's a tool almost nobody is talking about that is insane."
9. "Wait until you see what this button does."
10. "I'm not supposed to share this but here we go."
11. "I found a cheat code and it's completely free."
12. "Nobody talks about this tool but it's doing heavy lifting for me daily."
13. "Let me show you something that broke my brain a little."

### Story Opener
14. "Three months ago I was spending 6 hours a day on [task]. Now it takes 20 minutes."
15. "A freelancer I know doubled her rates after discovering this one tool."
16. "I almost quit my job before I found this."
17. "Last week a client asked how I delivered so fast. I showed them this."
18. "I used to hate [task]. Then someone sent me a link."
19. "I was stressed, behind on a deadline, and then I remembered this."

### Shocking Stat or Fact
20. "Did you know the average [professional] wastes 2 hours a day on [task] that this fixes?"
21. "95% of people doing [task] are doing it the hard way. Watch this."
22. "This is rated #1 for [category] and it costs less than your Netflix subscription."
23. "In under 60 seconds, this does what used to take a full workday."
24. "I ran the numbers — this saves me $[X] every single month."

### Relatable Pain Point
25. "If you've ever stared at a blank screen not knowing where to start, this is for you."
26. "If [task] takes you forever, you need to see this."
27. "Be honest — how much time do you waste on [task] every week?"
28. "Every time I had to [tedious task] I wanted to throw my laptop. Not anymore."
29. "This is for everyone who's ever thought: there has to be a better way."

### Question Hook
30. "What if you could [impressive outcome] in under 5 minutes?"
31. "What would you do with an extra 10 hours every week?"
32. "Can AI actually replace [task]? I tested it so you don't have to."
33. "Are you still doing [task] the slow way? Let me fix that."
34. "What if I told you this whole thing is completely free?"

### Bold Claim
35. "This is the best [category] tool I have ever used. Full stop."
36. "This single tool replaced three subscriptions for me."
37. "If you only add one tool to your stack this year, make it this one."
38. "I've tested dozens of [category] tools. Nothing comes close to this."
39. "This is the tool that professionals keep quiet about."

### FOMO / Urgency
40. "Everyone in [industry] is switching to this right now."
41. "If you sleep on this, you'll regret it in 6 months."
42. "The early adopters are already winning with this. Don't be late."
43. "Jump on this now while it's still free / while pricing is low."

### POV / Immersive
44. "POV: you just discovered the tool that changes everything."
45. "POV: you finally stop wasting time on [task]."
46. "Let me walk you through exactly how I use this every day."
47. "Watch me complete a [task] in real time with this."

### Comparison / Upgrade
48. "I replaced [expensive/popular tool] with this and here's what happened."
49. "This vs [popular tool]: I switched and won't go back."
50. "The free version of this beats the paid version of [competitor]."

### Result-First
51. "I just finished a full [project type] in 45 minutes using this."
52. "I used this for 30 days straight. Here's what changed."
53. "My client thought I spent a week on this. It was a lunch break."
54. "I ran one prompt and got something I would have paid a freelancer $500 for."
55. "Look at what this thing just generated for me."
`.trim()

const SYSTEM_PROMPT = `You are a short-form video scriptwriter for tech UGC content on TikTok, Reels, and YouTube Shorts.

## Hook Bank
Pick the single best hook from the list below that matches this product's strongest real angle. Fill in any [placeholders] with product-specific details.

${HOOK_BANK}

## Script Structure (follow exactly, every time)

[HOOK — 1-2 punchy sentences from the hook bank above]

[BRIDGE — 1 sentence connecting the hook to the product]

[PRODUCT INTRO — name it, what it does in plain English, 2-3 sentences max]

[KEY BENEFIT — the single most impressive feature or outcome, shown not told]

[SOCIAL PROOF — one stat, user count, personal result, or credible claim from the product page]

[CTA — always use this exact wording:]
"If you want my step-by-step guide on how to use [Product Name], go comment 'hidden' below and I'll send it straight to you."

## Rules
- Total script length: 80–100 words (short and punchy — keep it tight)
- Never open with "I" — start with the hook immediately
- No buzzwords: never say "game-changer", "revolutionary", "cutting-edge", "amazing" — show results instead
- The hook must feel native to social media, not like an ad or press release
- Fill in all [placeholders] with real product-specific details from the page
- If a social proof stat isn't on the page, use a personal result framing instead
- Vary your hook selection — do NOT default to hook #2 or any single hook every time; choose the hook that genuinely fits the product's strongest angle
- Output ONLY the script text — no labels, headers, section names, or formatting marks`

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; UGCBot/1.0)',
      Accept: 'text/html',
    },
    signal: AbortSignal.timeout(10_000),
  })
  const html = await res.text()
  // Strip tags, collapse whitespace, cap at ~6000 chars to stay within token budget
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000)
  return text
}

export async function POST(request: NextRequest) {
  const { url } = await request.json()

  if (!url) {
    return Response.json({ error: 'URL is required' }, { status: 400 })
  }

  let pageText: string
  try {
    pageText = await fetchPageText(url)
  } catch {
    return Response.json({ error: 'Could not fetch the product page. Check the URL and try again.' }, { status: 422 })
  }

  const userPrompt = `Here is the product page content for: ${url}

--- PAGE CONTENT START ---
${pageText}
--- PAGE CONTENT END ---

Now write a UGC reel script for this product following the system instructions exactly.`

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }] },
    ],
  })

  return Response.json({ script: response.text })
}
