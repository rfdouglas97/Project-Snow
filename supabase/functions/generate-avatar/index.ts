
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Parse request body
    const { imageUrl, userId } = await req.json()

    if (!imageUrl || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl or userId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate avatar with OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/images/variations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: imageUrl,
        n: 1,
        size: "1024x1024"
      })
    })

    const openAIData = await openAIResponse.json()
    const generatedAvatarUrl = openAIData.data[0].url

    // Download and upload the generated avatar to Supabase storage
    const avatarResponse = await fetch(generatedAvatarUrl)
    const avatarBlob = await avatarResponse.blob()
    const avatarFileName = `avatar-${userId}-${Date.now()}.png`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(avatarFileName, avatarBlob, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) throw uploadError

    // Store avatar metadata in the database
    const { error: dbError } = await supabase
      .from('user_avatars')
      .insert({
        user_id: userId,
        original_image_path: imageUrl,
        avatar_image_path: `avatars/${avatarFileName}`
      })

    if (dbError) throw dbError

    return new Response(
      JSON.stringify({ 
        avatarUrl: supabase.storage.from('avatars').getPublicUrl(avatarFileName).data.publicUrl 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Avatar generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
