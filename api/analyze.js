module.exports = async (request, response) => {
  // 1. CORS Headers
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (request.method === 'OPTIONS') return response.status(200).end();
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  try {
    // 2. Safety Check for Key
    // We add .trim() to remove accidental spaces if you copy-pasted it wrong
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    
    if (!apiKey) {
      console.error("Error: GEMINI_API_KEY is missing.");
      return response.status(500).json({ feedback: "<p>Teacher Configuration Error: API Key missing.</p>" });
    }

    // 3. Prepare Data
    const { shapeData, totalShapes, currentStatus, mode } = request.body || {};
    const promptText = `
      You are a supportive 6th Grade Graphic Design teacher.
      Analyze this student's "Visual Balance" activity.
      
      Data:
      - Total Shapes: ${totalShapes}
      - Mode: ${mode}
      - Balance Status: "${currentStatus}"
      - Shapes: ${JSON.stringify(shapeData)}

      Task:
      Give 3 sentences of feedback.
      - If "Balanced": Explain why it works using "Visual Weight".
      - If "Tipped": Give a specific hint to move or resize a shape to fix it.
      - Use HTML tags (<p>, <strong>) for formatting.
    `;

    // 4. The "Retry" Logic
    // We define a helper function to try calling Google
    async function tryGenerate(modelName, apiVersion) {
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Model ${modelName} failed: ${res.status} ${txt}`);
      }
      return res.json();
    }

    let data;
    
    try {
      // ATTEMPT 1: Try the standard Flash model on the stable v1 API
      console.log("Attempting Gemini 1.5 Flash (v1)...");
      data = await tryGenerate('gemini-1.5-flash', 'v1');
      
    } catch (flashError) {
      console.error(flashError.message);
      console.log("Flash failed. Attempting fallback to Gemini Pro (v1beta)...");
      
      // ATTEMPT 2: Fallback to Gemini Pro (Older, but very reliable)
      // If Flash is blocked/not found, this one usually works.
      data = await tryGenerate('gemini-pro', 'v1beta');
    }

    // 5. Extract and Send Result
    let feedback = "<p>I'm having trouble thinking of feedback right now. Try again!</p>";
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      feedback = data.candidates[0].content.parts[0].text;
    }

    return response.status(200).json({ feedback });

  } catch (error) {
    console.error("Final Server Error:", error);
    return response.status(500).json({ feedback: `<p>My teacher brain is having a hard time connecting. (Error: ${error.message})</p>` });
  }
};
