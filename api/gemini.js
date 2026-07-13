export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Get the API key securely from the server environment variables
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: Missing GEMINI_API_KEY' });
  }

  const model = "gemini-3.1-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // Forward the body sent from the frontend directly to Google
      body: JSON.stringify(req.body)
    });

    const data = await googleResponse.json();

    if (!googleResponse.ok) {
      return res.status(googleResponse.status).json({ error: data.error?.message || 'Error from Google API' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Serverless Function Error:", error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
