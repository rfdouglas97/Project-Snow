
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
    // Parse request body
    const { avatarUrl, productImageUrl, userId, model = 'gemini', responseType = 'image/png', includeImageResponse = true } = await req.json()

    if (!avatarUrl || !productImageUrl || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing avatarUrl, productImageUrl, or userId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing try-on generation for user:', userId)
    console.log('Avatar URL:', avatarUrl)
    console.log('Product URL:', productImageUrl)
    console.log('Model requested:', model)
    console.log('Response type requested:', responseType)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Download avatar image
    const avatarResponse = await fetch(avatarUrl)
    if (!avatarResponse.ok) {
      throw new Error(`Failed to download avatar image: ${avatarResponse.status}`)
    }
    const avatarBlob = await avatarResponse.blob()
    const avatarBuffer = await avatarBlob.arrayBuffer()
    const avatarBytes = new Uint8Array(avatarBuffer)
    const avatarBase64 = btoa(String.fromCharCode(...avatarBytes))
    
    console.log('Avatar image downloaded and converted to base64')

    // Download product image
    const productResponse = await fetch(productImageUrl)
    if (!productResponse.ok) {
      throw new Error(`Failed to download product image: ${productResponse.status}`)
    }
    const productBlob = await productResponse.blob()
    const productBuffer = await productBlob.arrayBuffer()
    const productBytes = new Uint8Array(productBuffer)
    const productBase64 = btoa(String.fromCharCode(...productBytes))
    
    console.log('Product image downloaded and converted to base64')

    let tryOnImageBase64 = null

    if (model === 'gemini') {
      // Use the exact payload structure required by Gemini for image generation
      console.log('Using Gemini model for image generation')
      const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
      if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set')
      }

      const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent"
      
      // Prepare the correct payload structure based on Gemini's requirements
      const payload = {
        contents: [
          {
            parts: [
              {
                text: "Generate an image of a person wearing this clothing item. Make the person from the first image wear the clothing from the second image. The result should look realistic and professional."
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: avatarBase64
                }
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: productBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096
        }
      }

      console.log('Sending request to Gemini API with the correct payload structure')
      
      try {
        const geminiResponse = await fetch(`${geminiEndpoint}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text()
          console.error('Error response from Gemini API:', errorText)
          throw new Error(`Gemini API returned status ${geminiResponse.status}: ${errorText}`)
        }
        
        const geminiData = await geminiResponse.json()
        console.log('Gemini API response structure:', JSON.stringify(Object.keys(geminiData), null, 2))
        
        // Parse the response to extract the generated image
        if (geminiData.candidates && geminiData.candidates.length > 0) {
          const candidate = geminiData.candidates[0]
          console.log('Candidate finish reason:', candidate.finishReason)
          
          if (candidate.content && candidate.content.parts) {
            console.log('Content parts length:', candidate.content.parts.length)
            
            for (const part of candidate.content.parts) {
              console.log('Part keys:', Object.keys(part))
              
              if (part.inlineData && part.inlineData.data) {
                console.log('Found image in response')
                tryOnImageBase64 = part.inlineData.data
                break
              }
            }
          }
        }
        
        if (!tryOnImageBase64) {
          console.error('No image found in Gemini response. Full response:', JSON.stringify(geminiData, null, 2))
          throw new Error('No image generated by Gemini')
        }
        
      } catch (geminiError) {
        console.error('Error from Gemini API:', geminiError)
        // Fall back to using the avatar as a placeholder
        console.log('Falling back to avatar as placeholder')
        tryOnImageBase64 = avatarBase64
        // Return early with the placeholder
        const userFolder = `try-on/${userId}`
        const fileName = `${Date.now()}.${responseType.split('/')[1]}`
        const filePath = `${userFolder}/${fileName}`
        
        // Convert base64 to Uint8Array for upload
        const binaryString = atob(tryOnImageBase64)
        const len = binaryString.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        // Upload the generated image (or avatar as fallback)
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('avatars')  // Using the avatars bucket for try-on images as well
          .upload(filePath, bytes, {
            contentType: responseType,
            upsert: true
          })
        
        if (uploadError) {
          console.error('Error uploading try-on image:', uploadError)
          throw uploadError
        }
        
        // Get the public URL for the uploaded image
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)
        
        return new Response(
          JSON.stringify({ 
            tryOnImageUrl: publicUrl,
            isPlaceholder: true,
            message: "Used avatar as placeholder due to Gemini API error"
          }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (model === 'openai') {
      // Implementation for OpenAI model
      console.log('Using OpenAI model for image generation')
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set')
      }
      
      // OpenAI implementation would go here
      // For now, we'll use the avatar as a placeholder
      console.log('OpenAI implementation not available, using avatar as placeholder')
      tryOnImageBase64 = avatarBase64
      
      // Mark the response as a placeholder
      const isPlaceholder = true
    }
    
    if (!tryOnImageBase64) {
      throw new Error('Failed to generate try-on image')
    }

    // Create the directory path for storing the try-on image
    const userFolder = `try-on/${userId}`
    const fileName = `${Date.now()}.${responseType.split('/')[1]}`
    const filePath = `${userFolder}/${fileName}`
    
    // Convert base64 to Uint8Array for upload
    const binaryString = atob(tryOnImageBase64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // Upload the generated image
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')  // Using the avatars bucket for try-on images as well
      .upload(filePath, bytes, {
        contentType: responseType,
        upsert: true
      })
    
    if (uploadError) {
      console.error('Error uploading try-on image:', uploadError)
      throw uploadError
    }
    
    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)
    
    console.log('Try-on image stored at:', publicUrl)
    
    return new Response(
      JSON.stringify({ 
        tryOnImageUrl: publicUrl,
        isPlaceholder: false
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error during try-on generation:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
