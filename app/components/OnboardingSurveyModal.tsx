'use client'

type SurveyFormValues = {
  heardFrom: string
  ugcType: string
  role: string
  teamSize: string
}

type OnboardingSurveyModalProps = {
  error: string | null
  isLoading: boolean
  onSubmit: (values: SurveyFormValues) => Promise<void>
}

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
]

const UGC_TYPE_OPTIONS = [
  'Videos for my software startup',
  'Videos for my ecommerce brand',
  'Generic lifestyle videos',
  'Others',
]

const ROLE_OPTIONS = [
  'CEO',
  'Growth Marketer',
  'Software Engineer',
  'Product / Project Manager',
]

const TEAM_SIZE_OPTIONS = [
  'Solo founder',
  '2-10',
  'More than 10',
]

function OptionGroup({
  legend,
  name,
  options,
}: {
  legend: string
  name: keyof SurveyFormValues
  options: string[]
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-foreground">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground transition-colors hover:border-primary/50"
          >
            <input
              type="radio"
              name={name}
              value={option}
              className="mt-0.5 h-4 w-4 border-border text-primary focus:ring-primary"
              required
            />
            <span className="leading-5">{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function OnboardingSurveyModal({
  error,
  isLoading,
  onSubmit,
}: OnboardingSurveyModalProps) {
  async function handleSubmit(formData: FormData) {
    await onSubmit({
      heardFrom: String(formData.get('heardFrom') ?? ''),
      ugcType: String(formData.get('ugcType') ?? ''),
      role: String(formData.get('role') ?? ''),
      teamSize: String(formData.get('teamSize') ?? ''),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-card">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold text-foreground">Tell us about your team</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete this once to continue into ILoveUGC.
          </p>
        </div>

        <form
          action={handleSubmit}
          className="space-y-6 px-6 py-6"
        >
          <OptionGroup
            legend="Where did you hear about ILoveUGC?"
            name="heardFrom"
            options={HEARD_FROM_OPTIONS}
          />

          <OptionGroup
            legend="What type of UGC videos do you intend to make?"
            name="ugcType"
            options={UGC_TYPE_OPTIONS}
          />

          <OptionGroup
            legend="Role"
            name="role"
            options={ROLE_OPTIONS}
          />

          <OptionGroup
            legend="Team size"
            name="teamSize"
            options={TEAM_SIZE_OPTIONS}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end border-t border-border pt-5">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-w-36 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
