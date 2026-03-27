import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export type Project = {
  id: string
  user_id: string
  url: string
  script: string | null
  selected_avatar: number
  music_url: string | null
  product_media_url: string | null
  product_media_type: 'image' | 'video' | null
  audio_url: string | null
  lipsync_video_url: string | null
  merged_video_url: string | null
  captioned_video_url: string | null
  final_video_url: string | null
  status: 'draft' | 'generating' | 'done' | 'error'
  created_at: string
  updated_at: string
}
