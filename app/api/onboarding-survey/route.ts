import { auth, clerkClient } from '@clerk/nextjs/server'
import { appendSurveySubmission } from '@/lib/google-sheets'

const HEARD_FROM_OPTIONS = [
  'Instagram',
  'Tiktok',
  'Reddit',
  'Youtube',
  'X (formerly Twitter)',
  'Search Engine',
  'AI recommendation',
  'A friend',
  'Other',
] as const

const UGC_TYPE_OPTIONS = [
  'Videos for my Software startup',
  'Videos for my ecommerce brand',
  'Generic Lifestyle videos',
  'Others',
] as const

const ROLE_OPTIONS = [
  'CEO',
  'Growth Marketer',
  'Software Engineer',
  'Product / Project Manager',
] as const

const TEAM_SIZE_OPTIONS = [
  'Solo founder',
  '2-10',
  'More than 10',
] as const

type SurveyPayload = {
  heardFrom?: string
  ugcType?: string
  role?: string
  teamSize?: string
}

function isAllowedOption(value: string | undefined, options: readonly string[]) {
  return typeof value === 'string' && options.includes(value)
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>

  return Response.json({
    completed: publicMetadata.onboardingSurveyCompleted === true,
  })
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await request.json() as SurveyPayload

  if (!isAllowedOption(payload.heardFrom, HEARD_FROM_OPTIONS)) {
    return Response.json({ error: 'Please select where you heard about IloveUGC.' }, { status: 400 })
  }

  if (!isAllowedOption(payload.ugcType, UGC_TYPE_OPTIONS)) {
    return Response.json({ error: 'Please select the type of UGC videos you intend to make.' }, { status: 400 })
  }

  if (!isAllowedOption(payload.role, ROLE_OPTIONS)) {
    return Response.json({ error: 'Please select your role.' }, { status: 400 })
  }

  if (!isAllowedOption(payload.teamSize, TEAM_SIZE_OPTIONS)) {
    return Response.json({ error: 'Please select your team size.' }, { status: 400 })
  }

  const heardFrom = payload.heardFrom as string
  const ugcType = payload.ugcType as string
  const role = payload.role as string
  const teamSize = payload.teamSize as string

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>

  if (publicMetadata.onboardingSurveyCompleted === true) {
    return Response.json({ completed: true })
  }

  const primaryEmail = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId,
  )?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? ''

  const submittedAt = new Date().toISOString()

  await appendSurveySubmission({
    submittedAt,
    userId,
    email: primaryEmail,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    heardFrom,
    ugcType,
    role,
    teamSize,
  })

  await clerk.users.updateUser(userId, {
    publicMetadata: {
      ...publicMetadata,
      onboardingSurveyCompleted: true,
      onboardingSurveySubmittedAt: submittedAt,
    },
  })

  return Response.json({ completed: true })
}
