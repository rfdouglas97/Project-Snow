import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.0"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to fetch image and convert to base64
async function imageUrlToBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return blobToBase64(blob);
}

// Helper function to convert Blob to base64
async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:' + blob.type + ';base64,' + btoa(binary);
}

// Helper function to convert base64 to Uint8Array
function base64ToUint8Array(base64) {
  // Remove data URL prefix if present
  const base64String = base64.split(',')[1] || base64;
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
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

    // Initialize Google Generative AI with API key
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');

    // Parse request body
    const { avatarUrl, productImageUrl, userId } = await req.json()

    if (!avatarUrl || !productImageUrl || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: avatarUrl, productImageUrl, or userId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log("Received try-on request:", { avatarUrl, productImageUrl })

    try {
      // Convert both images to base64
      const avatarBase64 = await imageUrlToBase64(avatarUrl);
      const productBase64 = await imageUrlToBase64(productImageUrl);
      
      // Get the experimental Gemini model for image generation
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp-image-generation" 
      });
      
      // Craft a precise prompt that ensures no modification of facial features
      const prompt = `
        IMPORTANT: DO NOT ALTER THE PERSON'S BODY SHAPE, PROPORTIONS, FACIAL FEATURES, HAIR, OR FACE IN ANY WAY.
        
        Task: Take the clothing item from the product image and render it on the person in the avatar image.
        
        Specific requirements:
        1. PRESERVE EXACTLY: Keep the person's exact face, head, hair, and body proportions from the avatar image completely unchanged
        2. DO NOT: Change any facial features, expressions, hairstyle, body type, or add any accessories
        3. DO NOT: Make the person thinner, taller, or modify any physical attributes at all
        4. DO NOT: Change the pose of the person
        5. DO NOT: Change the background
        6. ONLY: Add the clothing item over the person's existing attire in a realistic way
        7. ONLY: Make minimal adjustments needed to make the clothing item fit naturally on the person
        8. Create a photorealistic image with the clothing item properly overlaid on the person
        
        The final result should look like the original person wearing the new clothing item, with no other changes.
      `;

      console.log('Using Gemini 2.0 Flash (Image Generation) for try-on with prompt:', prompt);

      // Process the images
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: {
                mimeType: "image/jpeg",
                data: avatarBase64.split(',')[1] // Avatar image (person)
              }
            },
            { inlineData: {
                mimeType: "image/jpeg",
                data: productBase64.split(',')[1] // Product image (clothing)
              }
            }
          ]
        }],
        // Enable image generation in the response
        generationConfig: {
          responseModalities: ["Text", "Image"]
        }
      });
      
      console.log('Gemini response received');
      
      // Extract the generated image from the response
      const response = await result.response;
      
      // Find the image part in the response
      const imageData = response.candidates[0]?.content?.parts?.find(
        part => part.inlineData && part.inlineData.mimeType.startsWith('image/')
      )?.inlineData?.data;
      
      if (!imageData) {
        throw new Error('No image data found in Gemini response');
      }
      
      console.log('Generated try-on image data extracted');
      
      // Convert base64 to Uint8Array for storage
      const tryOnBuffer = base64ToUint8Array(imageData);

      // Define path for storing the try-on image
      const tryOnFileName = `try-on-${userId}-${Date.now()}.png`;
      const tryOnPath = `try-ons/${tryOnFileName}`;
      
      // Upload the generated try-on image to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(tryOnPath, tryOnBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading try-on image:', uploadError);
        throw uploadError;
      }

      console.log('Try-on image uploaded successfully');

      // Get the public URL for the uploaded try-on image
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(tryOnPath);

      console.log("Try-on image stored at:", publicUrl);

      return new Response(
        JSON.stringify({ 
          tryOnImageUrl: publicUrl 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (genAIError) {
      console.error('Gemini API error:', genAIError);
      return new Response(
        JSON.stringify({ 
          error: 'Gemini API error', 
          details: genAIError.message || String(genAIError)
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Try-on generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});