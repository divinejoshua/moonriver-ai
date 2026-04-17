'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserButton } from '@clerk/nextjs'
import Header from '@/app/components/Header'
import { AVATARS } from '@/lib/constants'

type ProjectSummary = {
  id: string
  url: string
  status: 'draft' | 'generating' | 'done' | 'error'
  selected_avatar: number
  final_video_url: string | null
  created_at: string
}

function StatusBadge({ status }: { status: ProjectSummary['status'] }) {
  const styles = {
    done: 'bg-emerald-50 text-emerald-600',
    generating: 'bg-accent text-accent-foreground',
    draft: 'bg-muted text-muted-foreground',
    error: 'bg-destructive/10 text-destructive',
  }
  const labels = {
    done: 'Done',
    generating: 'Generating',
    draft: 'Draft',
    error: 'Failed',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function downloadVideo(url: string) {
  const a = document.createElement('a')
  a.href = `/api/download?url=${encodeURIComponent(url)}&filename=moonriver_ugc.mp4`
  a.click()
}

export default function HistoryPage() {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.replace('/'); return }
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        setProjects(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [isLoaded, isSignedIn, router])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header>
        <UserButton />
      </Header>

      <main className="flex-1 px-6 py-10 max-w-4xl mx-auto w-full">
        <div className="space-y-1 mb-8">
          <h1 className="text-2xl font-semibold text-foreground">History</h1>
          <p className="text-sm text-muted-foreground">All your generated UGC video projects.</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-4 border-border" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.277A1 1 0 0121 8.764v6.472a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">No projects yet</p>
            <p className="text-xs text-muted-foreground">Generate your first UGC video to see it here.</p>
            <button
              onClick={() => router.push('/')}
              className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get started
            </button>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const avatar = AVATARS[project.selected_avatar ?? 0]
              const date = new Date(project.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })

              return (
                <div
                  key={project.id}
                  className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col"
                >
                  {/* Video / placeholder */}
                  {project.status === 'done' && project.final_video_url ? (
                    <video
                      src={project.final_video_url}
                      className="w-full aspect-[9/16] object-cover bg-muted"
                      muted
                      loop
                      playsInline
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
                    />
                  ) : (
                    <div className="w-full aspect-[9/16] bg-muted flex flex-col items-center justify-center gap-2">
                      {project.status === 'generating' && (
                        <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      )}
                      {project.status === 'error' && (
                        <svg className="w-8 h-8 text-destructive/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {project.status === 'draft' && (
                        <svg className="w-8 h-8 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <p className="text-xs text-muted-foreground capitalize">{project.status}</p>
                    </div>
                  )}

                  {/* Card footer */}
                  <div className="px-4 py-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{project.url}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{avatar.name} · {date}</p>
                      </div>
                      <StatusBadge status={project.status} />
                    </div>

                    <div className="flex items-center gap-3 pt-1 border-t border-border">
                      {project.status === 'done' && project.final_video_url && (
                        <button
                          onClick={() => downloadVideo(project.final_video_url!)}
                          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
                        >
                          Download
                        </button>
                      )}
                      <button
                        onClick={() => router.push(
                          project.status === 'done'
                            ? `/projects/${project.id}/generating`
                            : `/projects/${project.id}`
                        )}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto cursor-pointer"
                      >
                        {project.status === 'done' ? 'View' : 'Open'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
