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
    // --- SECURE VAULT CONNECTION ---
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    
    if (!apiKey) {
        return response.status(500).json({ feedback: "System Error: API Key is missing from server settings." });
    }
    // -------------------------------

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

    // 3. PROMPT: Added instruction to forbid markdown
    const promptText = `
      You are a 6th Grade Graphic Design Teacher.
      Analyze this student's work.
      
      Context:
      - Shapes used: ${body.totalShapes || 0}
      - Current Status: "${body.currentStatus || "Unknown"}" (This is the physical tilt of the beam).

      Instructions:
      - Write EXACTLY 2-3 sentences.
      - Structure: Praise, Critique, then Actionable Tip.
      - Tone: Encouraging and simple.
      - Format: Raw HTML paragraphs (<p>). 
      - IMPORTANT: Do NOT use markdown code blocks or backticks. Just the raw text.
    `;

    // 4. RUN IT
    const modelId = chosenModel.name.replace("models/", "");
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringif
