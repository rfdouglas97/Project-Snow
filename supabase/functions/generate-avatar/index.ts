
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

    // Convert the image to base64 for OpenAI API
    const arrayBuffer = await fileData.arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    
    console.log('Sending image to OpenAI Images API for transformation')
    
    // Call OpenAI Images API correctly with the image as input
    const openAIResponse = await fetch('https://api.openai.com/v1/images/variations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: `data:image/png;base64,${base64Image}`,
        n: 1,
        size: "1024x1024",
        response_format: "url"
      })
    })

    // Enhanced error handling for OpenAI API response
    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      let errorJson;
      
      try {
        errorJson = JSON.parse(errorText);
        console.error('OpenAI API error (parsed):', errorJson);
      } catch (parseError) {
        console.error('OpenAI API error (raw text):', errorText);
        console.error('Parse error:', parseError);
      }
      
      console.error('OpenAI API HTTP status:', openAIResponse.status);
      console.error('OpenAI API status text:', openAIResponse.statusText);
      
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API error', 
          status: openAIResponse.status,
          details: errorJson || errorText
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openAIData = await openAIResponse.json()
    console.log('OpenAI response received')
    
    // Log the entire response structure for debugging
    console.log('Full OpenAI response structure:', JSON.stringify(openAIData))
    
    // Extract the generated image URL from the OpenAI Images API response
    const generatedImageUrl = openAIData.data[0].url
    
    if (!generatedImageUrl) {
      throw new Error('No image URL found in OpenAI response')
    }

    console.log('Generated image URL extracted:', generatedImageUrl)

    // Download the generated avatar from the URL provided by OpenAI
    console.log('Downloading image from URL:', generatedImageUrl)
    const avatarResponse = await fetch(generatedImageUrl)
    
    // Enhanced error handling for image download
    if (!avatarResponse.ok) {
      console.error('Image download error status:', avatarResponse.status);
      console.error('Image download status text:', avatarResponse.statusText);
      
      try {
        const errorText = await avatarResponse.text();
        console.error('Image download error response:', errorText);
      } catch (e) {
        console.error('Could not read image download error response');
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to download generated image', 
          status: avatarResponse.status,
          url: generatedImageUrl
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const avatarBlob = await avatarResponse.blob()
    const avatarArrayBuffer = await avatarBlob.arrayBuffer()
    const avatarBuffer = new Uint8Array(avatarArrayBuffer)

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
