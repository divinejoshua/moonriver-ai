'use client'

import { useMemo, useState } from 'react'

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

type Question = {
  key: keyof SurveyFormValues
  title: string
  options: string[]
}

const QUESTIONS: Question[] = [
  {
    key: 'heardFrom',
    title: 'Where did you hear about ILoveUGC?',
    options: [
      'Instagram',
      'Tiktok',
      'Reddit',
      'Youtube',
      'X (formerly Twitter)',
      'Search Engine',
      'AI recommendation',
      'A friend',
      'Other',
    ],
  },
  {
    key: 'ugcType',
    title: 'What type of UGC videos do you intend to make?',
    options: [
      'Videos for my software startup',
      'Videos for my ecommerce brand',
      'Generic lifestyle videos',
      'Others',
    ],
  },
  {
    key: 'role',
    title: 'Role',
    options: [
      'CEO',
      'Growth Marketer',
      'Software Engineer',
      'Product / Project Manager',
      'Other'
    ],
  },
  {
    key: 'teamSize',
    title: 'Team size',
    options: [
      'Solo founder',
      '2-10',
      'More than 10',
    ],
  },
]

const INITIAL_VALUES: SurveyFormValues = {
  heardFrom: '',
  ugcType: '',
  role: '',
  teamSize: '',
}

export default function OnboardingSurveyModal({
  error,
  isLoading,
  onSubmit,
}: OnboardingSurveyModalProps) {
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<SurveyFormValues>(INITIAL_VALUES)

  const question = QUESTIONS[step]
  const selectedValue = values[question.key]
  const isLastStep = step === QUESTIONS.length - 1
  const canContinue = selectedValue.length > 0
  const progressWidth = useMemo(
    () => `${((step + 1) / QUESTIONS.length) * 100}%`,
    [step],
  )

  async function handleContinue() {
    if (!canContinue || isLoading) return

    if (!isLastStep) {
      setStep((currentStep) => currentStep + 1)
      return
    }

    await onSubmit(values)
  }

  function handleBack() {
    if (step === 0 || isLoading) return
    setStep((currentStep) => currentStep - 1)
  }

  function handleSelect(option: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [question.key]: option,
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-card shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Step {step + 1} / {QUESTIONS.length}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Tell us about your team</h2>
            </div>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: progressWidth }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">{question.title}</h3>
            <p className="text-sm text-muted-foreground">
              Complete this once to continue into ILoveUGC.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {question.options.map((option) => {
              const isSelected = selectedValue === option

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`flex items-start rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${isSelected
                    ? 'border-primary bg-primary/8 text-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50'
                    }`}
                >
                  <span className="leading-5">{option}</span>
                </button>
              )
            })}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0 || isLoading}
              className="inline-flex min-w-24 items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue || isLoading}
              className="inline-flex min-w-36 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Saving...' : isLastStep ? 'Submit' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
