import { createSign } from 'node:crypto'

type GoogleServiceAccount = {
  client_email: string
  private_key: string
  token_uri?: string
}

export type SurveySubmission = {
  submittedAt: string
  userId: string
  email: string
  firstName: string
  lastName: string
  heardFrom: string
  ugcType: string
  role: string
  teamSize: string
}

const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
const DEFAULT_SPREADSHEET_ID = '1-mrkX6F9GEh490y39rSjt4b6-RLWnSWhb5yiMyxaN_k'
const DEFAULT_SHEET_TITLE = 'Onboarding Survey'
const SHEET_HEADERS = [
  'Submitted At',
  'User ID',
  'Email',
  'First Name',
  'Last Name',
  'Where did you hear about IloveUGC',
  'What type of UGC videos do you intend to make',
  'Role',
  'Team size',
]

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

async function loadServiceAccount(): Promise<GoogleServiceAccount> {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_MOONRIVER_EMAIL
  if (rawJson) {
    return JSON.parse(rawJson) as GoogleServiceAccount
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL_MOONRIVER_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_MOONRIVER_EMAIL?.replace(/\\n/g, '\n')
  if (email && privateKey) {
    return {
      client_email: email,
      private_key: privateKey,
      token_uri: 'https://oauth2.googleapis.com/token',
    }
  }

  throw new Error(
    'Missing Google Sheets credentials. Set GOOGLE_SERVICE_ACCOUNT_JSON_MOONRIVER_EMAIL or GOOGLE_SERVICE_ACCOUNT_EMAIL_MOONRIVER_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_MOONRIVER_EMAIL.',
  )
}

async function getAccessToken() {
  const account = await loadServiceAccount()
  const now = Math.floor(Date.now() / 1000)
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64UrlEncode(JSON.stringify({
    iss: account.client_email,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: account.token_uri ?? 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }))
  const unsignedToken = `${header}.${payload}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsignedToken)
  signer.end()
  const signature = signer.sign(account.private_key).toString('base64url')
  const assertion = `${unsignedToken}.${signature}`

  const response = await fetch(account.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to obtain Google access token: ${body}`)
  }

  const data = await response.json() as { access_token: string }
  return data.access_token
}

async function googleSheetsRequest(path: string, init: RequestInit = {}) {
  const accessToken = await getAccessToken()
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Google Sheets request failed: ${body}`)
  }

  return response
}

async function ensureSurveySheet(spreadsheetId: string, sheetTitle: string) {
  const metadataResponse = await googleSheetsRequest(
    `${spreadsheetId}?fields=sheets(properties(title))`,
  )
  const metadata = await metadataResponse.json() as {
    sheets?: Array<{ properties?: { title?: string } }>
  }
  const hasSheet = metadata.sheets?.some((sheet) => sheet.properties?.title === sheetTitle)

  if (!hasSheet) {
    await googleSheetsRequest(`${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: sheetTitle } } }],
      }),
    })
  }

  await googleSheetsRequest(
    `${spreadsheetId}/values/${encodeURIComponent(`${sheetTitle}!A1:I1`)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({
        range: `${sheetTitle}!A1:I1`,
        majorDimension: 'ROWS',
        values: [SHEET_HEADERS],
      }),
    },
  )
}

export async function appendSurveySubmission(submission: SurveySubmission) {
  const spreadsheetId: string =
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID_MOONRIVER_EMAIL ?? DEFAULT_SPREADSHEET_ID
  const sheetTitle: string =
    process.env.GOOGLE_SHEETS_SURVEY_SHEET_NAME_MOONRIVER_EMAIL ?? DEFAULT_SHEET_TITLE

  await ensureSurveySheet(spreadsheetId, sheetTitle)

  await googleSheetsRequest(
    `${spreadsheetId}/values/${encodeURIComponent(`${sheetTitle}!A:I`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: [[
          submission.submittedAt,
          submission.userId,
          submission.email,
          submission.firstName,
          submission.lastName,
          submission.heardFrom,
          submission.ugcType,
          submission.role,
          submission.teamSize,
        ]],
      }),
    },
  )
}
