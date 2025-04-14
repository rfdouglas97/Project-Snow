
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
    
    // Convert the file to base64 for sending to Gemini
    const imageBuffer = await fileData.arrayBuffer()
    const base64Encoder = new TextEncoder()
    
    // Use safer base64 encoding approach
    let imageBase64 = ''
    {
      const bytes = new Uint8Array(imageBuffer)
      const binary = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('')
      imageBase64 = btoa(binary)
    }
    
    console.log('Image converted to base64 for Gemini API')

    // Using Gemini 2.0 flash for avatar generation
    console.log('Using Gemini 2.0 flash for avatar generation')
    
    // Gemini API URL for the model gemini-2.0-flash
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables')
    }
    
    // Gemini API request body with image included and specific instructions
    const geminiRequestBody = {
      contents: [
        {
          parts: [
            {
              text: "Please do not edit the face of this photo in any way. Do not edit the facial features. Do not edit the eyes. Do not edit the hair. I need you to remove the background, change the color to a light white/grey, and place the figure in the original image front and center with a full frontal view of the figure in question. The final image should be a standardized professional avatar suitable for a profile picture."
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048
      }
    }
    
    console.log('Sending request to Gemini API...')
    
    // Call Gemini API with the specified model
    const geminiResponse = await fetch(`${geminiUrl}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiRequestBody)
    })
    
    // Enhanced error handling for Gemini API response
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API HTTP status:', geminiResponse.status)
      console.error('Gemini API status text:', geminiResponse.statusText)
      console.error('Gemini API error response:', errorText)
      
      let errorDetails = "Unknown error"
      try {
        const errorJson = JSON.parse(errorText)
        console.error('Gemini API error (parsed):', JSON.stringify(errorJson, null, 2))
        errorDetails = errorJson.error?.message || JSON.stringify(errorJson)
      } catch (parseError) {
        console.error('Error parsing error response:', parseError)
        errorDetails = errorText
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Gemini API error', 
          status: geminiResponse.status,
          details: errorDetails
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiResponse.json()
    console.log('Gemini response received')
    
    // Extract the generated image data from the Gemini response
    let generatedImageData = null
    
    if (geminiData.candidates && 
        geminiData.candidates.length > 0 && 
        geminiData.candidates[0].content && 
        geminiData.candidates[0].content.parts) {
      
      for (const part of geminiData.candidates[0].content.parts) {
        if (part.inline_data && part.inline_data.mime_type.startsWith('image/')) {
          generatedImageData = part.inline_data.data
          break
        }
      }
    }
    
    if (!generatedImageData) {
      console.error('No image data found in Gemini response')
      console.error('Gemini response structure:', JSON.stringify(geminiData, null, 2))
      throw new Error('No image data found in Gemini response')
    }
    
    console.log('Generated image data extracted from Gemini response')

    // Convert base64 string to Uint8Array for storage
    const binaryData = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0))
    
    // Define paths for storing the avatar
    const userFolder = `user-${userId}`
    const avatarFileName = `${Date.now()}.png`
    const avatarPath = `${userFolder}/${avatarFileName}`
    
    // Upload the generated avatar to the avatars bucket
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(avatarPath, binaryData, {
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
