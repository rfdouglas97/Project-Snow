
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    const { avatarUrl, productImageUrl, userId, responseType = 'image/png', includeImageResponse = true } = await req.json()

    if (!avatarUrl || !productImageUrl || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing try-on generation for user:', userId)
    console.log('Avatar URL:', avatarUrl)
    console.log('Product Image URL:', productImageUrl)
    console.log('Response type requested:', responseType)

    // Get Stability API key
    const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY')
    if (!STABILITY_API_KEY) {
      throw new Error('STABILITY_API_KEY is not set')
    }

    // For demonstration, using a fallback without actual AI generation
    // In a real implementation, this would call an AI model to generate the try-on image
    console.log('Using avatar image as placeholder for try-on')

    // Define paths for storing the try-on image
    const userFolder = `user-${userId}`
    const tryOnFileName = `${Date.now()}.${responseType.split('/')[1]}`
    const tryOnPath = `${userFolder}/${tryOnFileName}`
    
    // For now, we'll use the avatar as the try-on image (placeholder)
    // Extract avatar path from URL
    const avatarUrlParts = avatarUrl.split('/storage/v1/object/public/')
    if (avatarUrlParts.length < 2) {
      throw new Error('Invalid avatar URL format')
    }
    
    const avatarPathParts = avatarUrlParts[1].split('/')
    const avatarBucketName = avatarPathParts[0]
    const avatarPath = avatarPathParts.slice(1).join('/')
    
    // Download the avatar image
    const { data: avatarData, error: avatarError } = await supabase
      .storage
      .from(avatarBucketName)
      .download(avatarPath)
    
    if (avatarError) {
      console.error('Error downloading avatar:', avatarError)
      throw avatarError
    }
    
    // Upload to the try-on bucket
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('try-on-images')
      .upload(tryOnPath, avatarData, {
        contentType: responseType,
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading try-on image:', uploadError)
      throw uploadError
    }

    // Get the public URL for the uploaded try-on image
    const { data: { publicUrl } } = supabase.storage
      .from('try-on-images')
      .getPublicUrl(tryOnPath)

    // Store metadata in try_on_images table
    const { data: metadataData, error: metadataError } = await supabase
      .from('try_on_images')
      .insert({
        user_id: userId,
        avatar_url: avatarUrl,
        product_image_url: productImageUrl,
        try_on_image_path: `try-on-images/${tryOnPath}`
      })
      .select()

    if (metadataError) {
      console.error('Error storing try-on metadata:', metadataError)
      throw metadataError
    }

    return new Response(
      JSON.stringify({ 
        tryOnImageUrl: publicUrl,
        tryOnId: metadataData?.[0]?.id,
        isPlaceholder: true // Indicate this is a placeholder, not an actual AI generation
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Detailed error during try-on generation:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
