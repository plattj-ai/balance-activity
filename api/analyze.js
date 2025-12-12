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

  try {
    // --- SECURE VERSION ---
    // This pulls the key from Vercel's Settings instead of the code file
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    
    if (!apiKey) {
        return response.status(500).json({ feedback: "System Error: API Key is missing from server settings." });
    }
    // ----------------------

    const body = request.body || {};
    
    // 2. ASK GOOGLE: "What models can I use?"
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResponse = await fetch(listUrl);
    
    if (!listResponse.ok) throw new Error(`Failed to list models: ${listResponse.status}`);

    const listData = await listResponse.json();
    const allModels = listData.models || [];

    // Filter for Safe Models
    const safeModels = allModels.filter(m => {
        const name = m.name.toLowerCase();
        return m.supportedGenerationMethods.includes('generateContent') &&
               !name.includes('exp') && !name.includes('2.0') && !name.includes('2.5');
    });

    let chosenModel = safeModels.find(m => m.name.includes('gemini-1.5-flash')) ||
                      safeModels.find(m => m.name.includes('gemini-1.5-pro')) ||
                      safeModels.find(m => m.name.includes('gemini-1.0-pro')) ||
                      safeModels[0];

    if (!chosenModel) return response.status(200).json({ feedback: "DEBUG: No models found." });

    // 3. PROMPT: Short, 6th-grade appropriate feedback
    const promptText = `
      You are a 6th Grade Graphic Design Teacher.
      Analyze this student's work.
      
      Context:
      - Shapes used: ${body.totalShapes || 0}
      - Current Status: "${body.currentStatus || "Unknown"}" (This is the physical tilt of the beam).

      Instructions:
      - Write EXACTLY 2-3 sentences.
      - Do NOT define terms. Do NOT give a lecture.
      - Structure:
        1. Praise: Mention something good (effort, variety).
        2. Critique: Explain why it is balanced or unbalanced.
        3. Action: Give a specific tip (e.g., "Try moving the darker shape closer to the center").
      - Tone: Encouraging and simple.
      - Format: HTML paragraphs (<p>).
    `;

    // 4. RUN IT
    const modelId = chosenModel.name.replace("models/", "");
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return response.status(200).json({ feedback: `Error: ${apiResponse.status} ${errorText}` });
    }

    const data = await apiResponse.json();
    let feedback = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI returned no text.";

    return response.status(200).json({ feedback });

  } catch (error) {
    return response.status(200).json({ feedback: `Error: ${error.message}` });
  }
};
