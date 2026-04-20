import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest } from 'next/server'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const HOOKS = [
  `"This tool just made [job role] completely obsolete."`,
  `"I can't believe I paid for [expensive alternative] when this exists."`,
  `"Every [job role] who isn't using this is already behind."`,
  `"Hot take: [popular tool] is overrated. This is what actually works."`,
  `"Stop using [popular tool]. I switched and never looked back."`,
  `"This app just made half of Fiverr useless."`,
  `"I found a tool that does in 5 seconds what used to take me 3 hours."`,
  `"There's a tool almost nobody is talking about that is insane."`,
  `"Wait until you see what this button does."`,
  `"I'm not supposed to share this but here we go."`,
  `"I found a cheat code and it's completely free."`,
  `"Nobody talks about this tool but it's doing heavy lifting for me daily."`,
  `"Let me show you something that broke my brain a little."`,
  `"Three months ago I was spending 6 hours a day on [task]. Now it takes 20 minutes."`,
  `"A freelancer I know doubled her rates after discovering this one tool."`,
  `"I almost quit my job before I found this."`,
  `"Last week a client asked how I delivered so fast. I showed them this."`,
  `"I used to hate [task]. Then someone sent me a link."`,
  `"I was stressed, behind on a deadline, and then I remembered this."`,
  `"Did you know the average [professional] wastes 2 hours a day on [task] that this fixes?"`,
  `"95% of people doing [task] are doing it the hard way. Watch this."`,
  `"This is rated #1 for [category] and it costs less than your Netflix subscription."`,
  `"In under 60 seconds, this does what used to take a full workday."`,
  `"I ran the numbers — this saves me $[X] every single month."`,
  `"If you've ever stared at a blank screen not knowing where to start, this is for you."`,
  `"If [task] takes you forever, you need to see this."`,
  `"Be honest — how much time do you waste on [task] every week?"`,
  `"Every time I had to [tedious task] I wanted to throw my laptop. Not anymore."`,
  `"This is for everyone who's ever thought: there has to be a better way."`,
  `"What if you could [impressive outcome] in under 5 minutes?"`,
  `"What would you do with an extra 10 hours every week?"`,
  `"Can AI actually replace [task]? I tested it so you don't have to."`,
  `"Are you still doing [task] the slow way? Let me fix that."`,
  `"What if I told you this whole thing is completely free?"`,
  `"This is the best [category] tool I have ever used. Full stop."`,
  `"This single tool replaced three subscriptions for me."`,
  `"If you only add one tool to your stack this year, make it this one."`,
  `"I've tested dozens of [category] tools. Nothing comes close to this."`,
  `"This is the tool that professionals keep quiet about."`,
  `"Everyone in [industry] is switching to this right now."`,
  `"If you sleep on this, you'll regret it in 6 months."`,
  `"The early adopters are already winning with this. Don't be late."`,
  `"Jump on this now while it's still free / while pricing is low."`,
  `"POV: you just discovered the tool that changes everything."`,
  `"POV: you finally stop wasting time on [task]."`,
  `"Let me walk you through exactly how I use this every day."`,
  `"Watch me complete a [task] in real time with this."`,
  `"I replaced [expensive/popular tool] with this and here's what happened."`,
  `"This vs [popular tool]: I switched and won't go back."`,
  `"The free version of this beats the paid version of [competitor]."`,
  `"I just finished a full [project type] in 45 minutes using this."`,
  `"I used this for 30 days straight. Here's what changed."`,
  `"My client thought I spent a week on this. It was a lunch break."`,
  `"I ran one prompt and got something I would have paid a freelancer $500 for."`,
  `"Look at what this thing just generated for me."`,
]

function buildHookBank(): string {
  const shuffled = [...HOOKS].sort(() => Math.random() - 0.5)
  return shuffled.map((h, i) => `${i + 1}. ${h}`).join('\n')
}

function buildSystemPrompt(): string {
  return `You are a short-form video scriptwriter for tech UGC content on TikTok, Reels, and YouTube Shorts.

## CRITICAL RULE — READ FIRST
The final script must NEVER contain square brackets [ ] of any kind.
Every hook in the bank below may contain placeholder text like [task], [job role], [category], etc.
You MUST replace every placeholder with a specific, product-relevant phrase drawn from the page content before writing the script.

Good: "If writing meeting notes after every call takes you forever, you need to see this."
Bad:  "If [task] takes you forever, you need to see this."  ← NEVER output this

If you cannot find a natural replacement from the page, pick a different hook entirely.

## Hook Bank
Pick the single best hook from the list below. Replace ALL placeholders with real specifics.

${buildHookBank()}

## Tone & Style
Fragmented spoken-word sentences. Short punchy lines. Natural pauses. Like talking out loud — not like an ad.

Example A:
"This honestly feels illegal…

You can create UGC ads without filming anything.

I'm using iloveugc.ai — it gives you realistic AI creators that talk like real people.

I just write a script, choose an avatar, and boom… video done.

If you're running ads or building a brand, this saves SO much time."

Example B:
"I was literally paying £200 per UGC video… waiting days for creators, revisions, all of that.

Now I just use iloveugc.ai.

I can test different hooks, angles, and scripts in minutes instead of weeks.

It's basically how I'm scaling my ads right now."

## Script Structure

1. HOOK — 1 punchy sentence from the hook bank, all placeholders replaced
2. PROBLEM — 1-2 short lines on what the old way cost them (time, money, stress)
3. PRODUCT — name it, what it does in one plain sentence
4. RESULT — one concrete personal outcome, shown not told
5. OUTRO — end with this exact line, verbatim: Comment "link" and I will send you the link to use this.

## Rules
- 45–65 words, 350 characters max — ruthlessly short (the outro line does not count toward this budget)
- Never open with "I" — start with the hook
- No buzzwords: never say "game-changer", "revolutionary", "cutting-edge", "amazing"
- The final line MUST be the outro exactly as specified — do not paraphrase or reword it
- Output ONLY the script text — no labels, headers, brackets, or formatting marks`
}

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

  const model = genai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(),
  })

  const result = await model.generateContent(userPrompt)
  const text = result.response.text()

  return Response.json({ script: text })
}
