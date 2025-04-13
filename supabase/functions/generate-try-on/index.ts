
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
    const { avatarUrl, productImageUrl, userId } = await req.json()

    if (!avatarUrl || !productImageUrl || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: avatarUrl, productImageUrl, or userId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log("Received try-on request:", { avatarUrl, productImageUrl })

    // Generate try-on image with OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Create a realistic image of a person wearing the clothing item shown in this product image: ${productImageUrl}. 
                 Use this image of the person: ${avatarUrl} as reference for the person's appearance.
                 The final image should be a natural-looking photo of the person wearing the clothing item, with the same pose and background as the reference image of the person.
                 The clothing should fit naturally and look realistic, as if the person was actually wearing it.
                 Maintain the person's facial features exactly as they appear in the reference image.`,
        n: 1,
        size: "1024x1024",
        quality: "hd"
      })
    })

    const openAIData = await openAIResponse.json()
    
    if (openAIData.error) {
      console.error("OpenAI API error:", openAIData.error)
      throw new Error(`OpenAI API error: ${openAIData.error.message || JSON.stringify(openAIData.error)}`)
    }
    
    const generatedImageUrl = openAIData.data[0].url
    console.log("Generated image URL:", generatedImageUrl)

    // Download and upload the generated try-on image to Supabase storage
    const imageResponse = await fetch(generatedImageUrl)
    const imageBlob = await imageResponse.blob()
    const tryOnFileName = `try-on-${userId}-${Date.now()}.png`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(`try-ons/${tryOnFileName}`, imageBlob, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) throw uploadError

    // Get the public URL for the uploaded try-on image
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(`try-ons/${tryOnFileName}`)

    console.log("Try-on image stored at:", publicUrl)

    return new Response(
      JSON.stringify({ 
        tryOnImageUrl: publicUrl 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Try-on generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
