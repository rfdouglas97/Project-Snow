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
            content: "You are an expert in image generation and transformation. Generate realistic images in response to users' requests. Return your response in JSON format with an image_url field."
          },
          {
            role: "user",
            content: [
              {
                type: "text", 
                text: `Please generate a realistic, full-length image based directly on the provided photo, preserving the exact appearance of the person completely. Do NOT alter their facial features, skin color, body shape, or overall identity at all.

Explicitly follow these guidelines:

Clearly place the person against a plain, solid, neutral-colored background (soft white, beige, or very light grey).

Change their clothing explicitly to neutral-colored clothing (white or grey), maintaining realistic textures and natural lighting.

Keep the overall style completely realistic—do NOT cartoonify or stylize.

Ensure a full-body view is clearly visible, showing from head to toe.

Return your response in JSON format with an image_url field containing the URL to the generated image.`
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
    
    // Parse the image URL from the GPT-4o response
    let generatedImageUrl = null
    try {
      // The response should be JSON since we specified response_format as json_object
      const parsedContent = openAIData.choices[0].message.content
      
      // If the content is already parsed as JSON, use it directly
      if (typeof parsedContent === 'object') {
        generatedImageUrl = parsedContent.image_url
      } else {
        // Otherwise parse it as JSON
        const jsonContent = JSON.parse(parsedContent)
        generatedImageUrl = jsonContent.image_url
      }
      
      if (!generatedImageUrl) {
        throw new Error('No image URL found in GPT-4o response')
      }
      
      console.log('Successfully extracted image URL from GPT-4o response')
    } catch (parseError) {
      console.error('Error parsing GPT-4o response:', parseError)
      console.log('Raw GPT-4o response:', openAIData.choices[0].message.content)
      throw new Error('Failed to parse image URL from GPT-4o response')
    }

    // Download the generated avatar from the URL provided by GPT-4o
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
