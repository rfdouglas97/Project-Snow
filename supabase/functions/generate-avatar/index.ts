
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

    // Extract path from the imageUrl
    const urlParts = imageUrl.split('/storage/v1/object/public/')
    if (urlParts.length < 2) {
      throw new Error('Invalid image URL format')
    }
    
    const pathParts = urlParts[1].split('/')
    const bucketName = pathParts[0]
    const imagePath = pathParts.slice(1).join('/')
    
    console.log('Extracted bucket name:', bucketName)
    console.log('Extracted image path:', imagePath)

    // Download the original image
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from(bucketName)
      .download(imagePath)
    
    if (downloadError) {
      console.error('Error downloading file:', downloadError)
      throw downloadError
    }
    
    console.log('Original file downloaded successfully')

    // Instead of using variations, let's use the dall-e-3 generations endpoint
    // which can take a text prompt and is more reliable
console.log('Using Stability AI for avatar generation')

// Get API key
const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY');
if (!STABILITY_API_KEY) {
  throw new Error("Stability API key is not set");
}

// Convert Supabase fileData to a File object
const imageFile = new File([await fileData.arrayBuffer()], 'input.png', { type: 'image/png' });

// Prepare FormData
const form = new FormData();
form.append('init_image', imageFile);
form.append('text_prompts[0][text]', 'Remove the background from this image and replace it with a clean white background. Do not alter the face or body structure. Return a realistic, professional avatar image with natural lighting.');
form.append('cfg_scale', '7');
form.append('clip_guidance_preset', 'FAST_BLUE');
form.append('samples', '1');
form.append('steps', '30');
form.append('style_preset', 'photographic');
form.append('image_strength', '0.6');

// Send request to Stability
const stabilityResponse = await fetch('https://api.stability.ai/v1/generation/stable-image-core-1-0-b/image-to-image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${STABILITY_API_KEY}`
  },
  body: form
});

// Handle response
if (!stabilityResponse.ok) {
  const errorText = await stabilityResponse.text();
  console.error('Stability API error:', errorText);
  throw new Error('Stability AI generation failed');
}

const stabilityData = await stabilityResponse.json();
const base64 = stabilityData.artifacts?.[0]?.base64;
if (!base64) {
  throw new Error('No image returned by Stability AI');
}

// Convert base64 → Uint8Array → Blob
const binaryData = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
const resultBlob = new Blob([binaryData], { type: 'image/png' });


    // Define paths for storing the avatar
    const userFolder = `user-${userId}`
    const avatarFileName = `${Date.now()}.png`
    const avatarPath = `${userFolder}/${avatarFileName}`
    
    // Upload the generated avatar to the avatars bucket
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(avatarPath, avatarBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      throw uploadError
    }

    console.log('Generated avatar uploaded successfully')

    // Get the public URL for the uploaded avatar
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(avatarPath)

    // Store metadata in user_avatars table
    const { data: metadataData, error: metadataError } = await supabase
      .from('user_avatars')
      .insert({
        user_id: userId,
        original_image_path: `${bucketName}/${imagePath}`,
        avatar_image_path: `avatars/${avatarPath}`
      })
      .select()

    if (metadataError) {
      console.error('Error storing avatar metadata:', metadataError)
      throw metadataError
    }

    console.log('Avatar metadata stored successfully')
    console.log('Avatar stored at:', publicUrl)

    return new Response(
      JSON.stringify({ 
        avatarUrl: publicUrl,
        avatarId: metadataData?.[0]?.id
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
