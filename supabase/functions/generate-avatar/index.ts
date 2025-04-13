
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
    
    console.log('Sending image to GPT-4o for transformation')
    
    // Call OpenAI API with the image as input to generate avatar directly with GPT-4o
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert in image generation and transformation. Generate a realistic image directly based on the uploaded photo. Return ONLY valid JSON with an 'image_url' field containing the URL to the generated image. Your response must be parseable as JSON."
          },
          {
            role: "user",
            content: [
              {
                type: "text", 
                text: `Please create a realistic, full-length image based on the provided input photo.

Do NOT alter the person's face, skin tone, body proportions, or core appearance at all.

Only change their clothing to neutral-colored, simple attire (e.g., plain grey or white shirt and pants).

Place them clearly against a neutral, solid background (soft white, beige, or very light grey).

Do NOT cartoonify, stylize, or significantly edit their features in any way.

This request explicitly adheres to acceptable usage guidelines and is for the purpose of standardized clothing visualization only.

Your response MUST be valid JSON with an image_url field containing only the URL to the generated image. Example: {"image_url": "https://example.com/image.jpg"}`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 2048,
        response_format: { "type": "json_object" }
      })
    })

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
    }

    const openAIData = await openAIResponse.json()
    console.log('OpenAI response received')
    
    // Log the entire response structure for debugging
    console.log('Full OpenAI response structure:', JSON.stringify(openAIData))
    
    // Parse the image URL from the GPT-4o response
    let generatedImageUrl = null
    try {
      if (!openAIData.choices || !openAIData.choices[0] || !openAIData.choices[0].message) {
        console.error('Unexpected OpenAI response structure:', openAIData)
        throw new Error('Invalid OpenAI response structure')
      }
      
      const messageContent = openAIData.choices[0].message.content
      console.log('Raw message content:', messageContent)
      
      let jsonContent
      if (typeof messageContent === 'string') {
        try {
          jsonContent = JSON.parse(messageContent)
        } catch (parseError) {
          console.error('Failed to parse message content as JSON:', parseError)
          
          // Try to extract URL using regex as fallback
          const urlMatch = messageContent.match(/"image_url"\s*:\s*"([^"]+)"/)
          if (urlMatch && urlMatch[1]) {
            generatedImageUrl = urlMatch[1]
            console.log('Extracted image URL using regex:', generatedImageUrl)
          } else {
            throw new Error('Could not extract image URL from response')
          }
        }
      } else if (typeof messageContent === 'object') {
        jsonContent = messageContent
      }
      
      if (!generatedImageUrl && jsonContent) {
        generatedImageUrl = jsonContent.image_url
        console.log('Extracted image URL from JSON:', generatedImageUrl)
      }
      
      if (!generatedImageUrl) {
        throw new Error('No image URL found in GPT-4o response')
      }
    } catch (parseError) {
      console.error('Error parsing GPT-4o response:', parseError)
      throw new Error('Failed to parse image URL from GPT-4o response')
    }

    // Download the generated avatar from the URL provided by GPT-4o
    console.log('Downloading image from URL:', generatedImageUrl)
    const avatarResponse = await fetch(generatedImageUrl)
    if (!avatarResponse.ok) {
      throw new Error(`Failed to download generated avatar: ${avatarResponse.status}`)
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
