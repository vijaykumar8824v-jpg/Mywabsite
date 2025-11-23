// netlify/functions/generate.js
// Node 18+ runtime assumed (global fetch available)
// If you get fetch not defined, set Node version to 18 in Netlify build settings

exports.handler = async function(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const prompt = body.prompt || '';
    const size = (body.size || '512x512').toLowerCase();

    if (!prompt) {
      return { statusCode: 400, body: 'Missing prompt' };
    }

    // Env var: HUGGINGFACE_API_KEY (set in Netlify Site settings)
    const HF_KEY = process.env.HUGGINGFACE_API_KEY;
    if (!HF_KEY) return { statusCode: 500, body: 'Server misconfigured: missing API key' };

    // Choose model — you can choose any supported text-to-image model
    const model = "stabilityai/stable-diffusion-2-1"; // or stable-diffusion-xl-base-1.0
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;

    const payload = {
      inputs: prompt,
      parameters: {
        width: parseInt(size.split('x')[0]) || 512,
        height: parseInt(size.split('x')[1]) || 512,
        // guidance_scale: 7.5, // optional
        // num_inference_steps: 25
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: response.status, body: `HF error: ${errText}` };
    }

    // HuggingFace typically returns image bytes
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const b64 = buffer.toString('base64');

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ b64 })
    };

  } catch (err) {
    console.error('Function error', err);
    return { statusCode: 500, body: 'Server error: ' + err.message };
  }
};
