
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

    console.log('Processing avatar generation for user:', userId)
    console.log('Image URL:', imageUrl)

    // For demonstration purposes, just returning the same image
    // In a real implementation, you would use OpenAI's API to generate the avatar
    const generatedAvatarUrl = imageUrl
    
    // In a real implementation you'd download and process the image here
    // const avatarResponse = await fetch(generatedAvatarUrl)
    // const avatarBlob = await avatarResponse.blob()
    
    // For now, we'll just upload the same image to the avatars bucket
    // Define the path for the avatar in the user's folder
    const userFolder = `user-${userId}`
    const avatarFileName = `${userFolder}/avatar-${Date.now()}.png`
    
    // This is where you would upload the processed avatar
    // In a real implementation, this would be the AI-generated avatar
    // For now, we'll just copy the file from the source bucket to the avatars bucket
    const { data: copyData, error: copyError } = await supabase
      .storage
      .from('user_uploads')
      .copy(
        imageUrl.split('/').slice(-2).join('/'), // Extract path from URL
        avatarFileName,
        {
          sourceKey: undefined,
          destKey: undefined,
          contentType: 'image/png'
        }
      )

    if (copyError) {
      console.error('Error copying file:', copyError)
      throw copyError
    }

    // Get public URL for the copied avatar
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(avatarFileName)

    console.log('Avatar generated and stored at:', publicUrl)

    return new Response(
      JSON.stringify({ 
        avatarUrl: publicUrl 
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
