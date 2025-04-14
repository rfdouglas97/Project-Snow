
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
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))
    
    console.log('Image converted to base64 for Gemini API')

    // Call Gemini's image generation API with the flash exp model
    console.log('Using Gemini 2.0 flash exp for avatar generation')
    
    // Gemini API URL for the model gemini-1.5-flash-experimental
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-experimental:generateContent';
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    
    // Gemini API request body with image included
    const geminiRequestBody = {
      contents: [
        {
          parts: [
            {
              text: "Create a professional, standardized avatar image for a profile picture. The image should be a simple, clean headshot with a neutral background, showing just the head and shoulders, with clear facial features and good lighting. The style should be minimalist and appropriate for professional use."
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
    };
    
    // Call Gemini API with the specified model
    const geminiResponse = await fetch(`${geminiUrl}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiRequestBody)
    });
    
    // Enhanced error handling for Gemini API response
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      let errorJson;
      
      try {
        errorJson = JSON.parse(errorText);
        console.error('Gemini API error (parsed):', errorJson);
      } catch (parseError) {
        console.error('Gemini API error (raw text):', errorText);
        console.error('Parse error:', parseError);
      }
      
      console.error('Gemini API HTTP status:', geminiResponse.status);
      console.error('Gemini API status text:', geminiResponse.statusText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Gemini API error', 
          status: geminiResponse.status,
          details: errorJson || errorText
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response received');
    
    // Log the entire response structure for debugging
    console.log('Full Gemini response structure:', JSON.stringify(geminiData));
    
    // Extract the generated image data from the Gemini response
    let generatedImageData;
    try {
      if (geminiData.candidates && geminiData.candidates[0] && 
          geminiData.candidates[0].content && geminiData.candidates[0].content.parts) {
        // Find the part that contains inline data for the image
        for (const part of geminiData.candidates[0].content.parts) {
          if (part.inline_data && part.inline_data.mime_type.startsWith('image/')) {
            generatedImageData = part.inline_data.data; // Base64 encoded image
            break;
          }
        }
      }
      
      if (!generatedImageData) {
        console.error('No image data found in Gemini response');
        throw new Error('No image data found in Gemini response');
      }
      
      console.log('Generated image data extracted from Gemini response');
    } catch (error) {
      console.error('Error extracting image from Gemini response:', error);
      console.error('Gemini response structure:', geminiData);
      throw new Error('Failed to extract image from Gemini response: ' + error.message);
    }

    // Convert base64 string to Uint8Array for storage
    const binaryData = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0));
    
    // Define paths for storing the avatar
    const userFolder = `user-${userId}`;
    const avatarFileName = `${Date.now()}.png`;
    const avatarPath = `${userFolder}/${avatarFileName}`;
    
    // Upload the generated avatar to the avatars bucket
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(avatarPath, binaryData, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      throw uploadError;
    }

    console.log('Generated avatar uploaded successfully');

    // Get the public URL for the uploaded avatar
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(avatarPath);

    // Store metadata in user_avatars table
    const { data: metadataData, error: metadataError } = await supabase
      .from('user_avatars')
      .insert({
        user_id: userId,
        original_image_path: `${bucketName}/${imagePath}`,
        avatar_image_path: `avatars/${avatarPath}`
      })
      .select();

    if (metadataError) {
      console.error('Error storing avatar metadata:', metadataError);
      throw metadataError;
    }

    console.log('Avatar metadata stored successfully');
    console.log('Avatar stored at:', publicUrl);

    return new Response(
      JSON.stringify({ 
        avatarUrl: publicUrl,
        avatarId: metadataData?.[0]?.id
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Avatar generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
