import { supabase } from '@/lib/supabaseClient'
import type { EventLevel, RunStatus } from './types'

export async function createRun(params: {
  city?: string
  tasks?: string[]
  input_source?: string
}): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('runs')
      .insert({
        status: 'queued',
        city: params.city ?? null,
        tasks: params.tasks ?? [],
        input_source: params.input_source ?? null,
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id as string
  } catch (e) {
    console.warn('createRun failed (dev fallback):', e)
    return `local_${Date.now()}`
  }
}

export async function updateRunStatus(runId: string, status: RunStatus) {
  try {
    await supabase
      .from('runs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', runId)
  } catch (e) {
    console.warn('updateRunStatus failed:', e)
  }
}

export async function appendEvent(params: {
  runId: string
  agent: string
  level: EventLevel
  message?: string
  data?: unknown
}) {
  try {
    await supabase.from('run_events').insert({
      run_id: params.runId,
      agent: params.agent,
      level: params.level,
      message: params.message ?? null,
      data: params.data ?? null,
    })
  } catch (_e) {
    // non-fatal for dev
  }
}

export async function addArtifact(params: {
  runId: string
  kind: string
  uri?: string
  meta?: unknown
}) {
  try {
    await supabase.from('artifacts').insert({
      run_id: params.runId,
      kind: params.kind,
      uri: params.uri ?? null,
      meta: params.meta ?? null,
    })
  } catch (_e) {
    // non-fatal in dev
  }
}


