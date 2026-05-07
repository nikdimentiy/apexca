// @ts-ignore — Deno URL import, resolved at runtime by Supabase Edge Runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Single declaration covers every Deno.* usage in this file
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env:   { get: (key: string) => string | undefined }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYNC_URL = 'https://api.todoist.com/api/v1/sync'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function syncPost(token: string, body: unknown) {
  return fetch(SYNC_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

Deno.serve(async (req: Request) => {
  console.log('[todoist-today] request received', req.method, req.url)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    console.log('[todoist-today] auth header present:', !!authHeader)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr) console.log('[todoist-today] getUser error:', userErr.message)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    console.log('[todoist-today] authenticated as', user.id)

    const todoistToken = Deno.env.get('TODOIST_TOKEN')
    console.log('[todoist-today] token present:', !!todoistToken, 'length:', todoistToken?.length)
    if (!todoistToken) return json({ error: 'TODOIST_TOKEN not configured' }, 500)

    const { action, task_id, content, client_today } = await req.json()
    console.log('[todoist-today] action:', action)

    if (action === 'fetch') {
      const res = await syncPost(todoistToken, {
        sync_token: '*',
        resource_types: ['items'],
      })
      console.log('[todoist-today] todoist response:', res.status)
      if (!res.ok) {
        const body = await res.text()
        console.log('[todoist-today] todoist error body:', body.slice(0, 200))
        return json({ error: `Todoist API error ${res.status}: ${body.slice(0, 100)}` }, 502)
      }

      const { items = [] } = await res.json()
      // Todoist due.date is in the user's local timezone — trust the
      // client-supplied local date, not the server's UTC date.
      const todayStr = (typeof client_today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(client_today))
        ? client_today
        : new Date().toISOString().slice(0, 10)

      const tasks = (items as any[])
        .filter(t => {
          // Must have a due date
          if (!t.due?.date) return false

          const dueDate = t.due.date.slice(0, 10)
          // Validate date format (YYYY-MM-DD) and only show tasks due today or earlier
          const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDate)

          return (
            !t.checked &&
            !t.is_deleted &&
            isValidDate &&
            dueDate <= todayStr
          )
        })
        .map(({ id, content, priority, due, labels }) => ({
          id: String(id),
          content,
          priority,
          due,
          url: `https://app.todoist.com/app/task/${id}`,
          labels: labels ?? [],
        }))

      console.log('[todoist-today] returning tasks:', tasks.length)
      return json({ tasks })
    }

    if (action === 'close' || action === 'reopen') {
      if (!task_id) return json({ error: 'task_id is required' }, 400)

      const commandType = action === 'reopen' ? 'item_uncomplete' : 'item_close'
      const res = await syncPost(todoistToken, {
        commands: [{
          type: commandType,
          uuid: crypto.randomUUID(),
          args: { id: task_id },
        }],
      })
      console.log('[todoist-today]', action, 'response:', res.status)
      if (!res.ok) {
        const body = await res.text()
        console.log('[todoist-today]', action, 'error body:', body.slice(0, 200))
        return json({ error: `Todoist error ${res.status}: ${body.slice(0, 100)}` }, 502)
      }
      return json({ ok: true })
    }

    if (action === 'add') {
      if (!content?.trim()) return json({ error: 'content is required' }, 400)

      const res = await syncPost(todoistToken, {
        commands: [{
          type: 'item_add',
          uuid: crypto.randomUUID(),
          temp_id: crypto.randomUUID(),
          args: { content: content.trim() },
        }],
      })
      console.log('[todoist-today] add response:', res.status)
      if (!res.ok) {
        const body = await res.text()
        console.log('[todoist-today] add error body:', body.slice(0, 200))
        return json({ error: `Todoist error ${res.status}: ${body.slice(0, 100)}` }, 502)
      }
      return json({ ok: true })
    }

    return json({ error: `Unknown action: ${action}` }, 400)

  } catch (err) {
    console.error('[todoist-today] unhandled error:', err)
    return json({ error: String(err) }, 500)
  }
})
