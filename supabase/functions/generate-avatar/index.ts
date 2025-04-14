import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_PIXELS = 1048576;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    const { imageUrl, userId } = await req.json()
    if (!imageUrl || !userId) {
      return new Response(JSON.stringify({ error: 'Missing imageUrl or userId' }), {
        status: 400, headers: corsHeaders
      })
    }

    const [_, path] = imageUrl.split('/storage/v1/object/public/')
    const [bucket, ...rest] = path.split('/')
    const filePath = rest.join('/')

    const { data: fileData, error: downloadError } = await supabase.storage.from(bucket).download(filePath)
    if (downloadError) throw new Error('Failed to download original image')

    const imageBlob = new Blob([fileData], { type: 'image/png' })

    // Resize if too large
    const dimensions = await getImageMetadata(imageBlob)
    const pixelCount = dimensions.width * dimensions.height

    let blobToSend = imageBlob
    if (pixelCount > MAX_PIXELS) {
      blobToSend = await resizeImageViaCDN(imageBlob, dimensions)
    }

    // Send to Stability AI
    const result = await sendToStability(blobToSend)
    if (!result.success) throw new Error(result.error)

    // Upload result to Supabase
    const fileName = `user-${userId}/${Date.now()}.png`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, result.imageBlob, {
      contentType: 'image/png', upsert: true
    })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)

    await supabase.from('user_avatars').insert({
      user_id: userId,
      original_image_path: `${bucket}/${filePath}`,
      avatar_image_path: `avatars/${fileName}`,
      is_ai_generated: true
    })

    return new Response(JSON.stringify({ avatarUrl: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders
    })
  }
})

// --- Utilities ---

async function getImageMetadata(blob: Blob) {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    // PNG
    const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]
    const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]
    return { width, height }
  }

  return { width: 1500, height: 1500 }
}

async function resizeImageViaCDN(blob: Blob, { width, height }) {
  const base64 = await blob.arrayBuffer().then(buf => btoa(String.fromCharCode(...new Uint8Array(buf))))
  const resized = await fetch(`https://wsrv.nl/?url=data:${blob.type};base64,${base64}&w=1024&h=1024&fit=inside&output=png`)
  return await resized.blob()
}

async function sendToStability(imageBlob: Blob) {
  const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY')
  if (!STABILITY_API_KEY) return { success: false, error: "Missing Stability API Key" }

  const form = new FormData()
  const imageFile = new File([await imageBlob.arrayBuffer()], 'input.png', { type: 'image/png' })
  form.append('init_image', imageFile)
  form.append('text_prompts[0][text]', 'Remove the background, preserve facial features, and return a professional avatar on a plain white background.')
  form.append('cfg_scale', '7')
  form.append('clip_guidance_preset', 'FAST_BLUE')
  form.append('samples', '1')
  form.append('steps', '30')
  form.append('style_preset', 'photographic')
  form.append('image_strength', '0.6')

  const res = await fetch('https://api.stability.ai/v1/generation/stable-image-core-1-0-b/image-to-image', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${STABILITY_API_KEY}` },
    body: form
  })

  if (!res.ok) {
    const errorText = await res.text()
    return { success: false, error: errorText }
  }

  const json = await res.json()
  const base64 = json.artifacts?.[0]?.base64
  if (!base64) return { success: false, error: 'No image returned' }

  const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  return { success: true, imageBlob: new Blob([buffer], { type: 'image/png' }) }
}
