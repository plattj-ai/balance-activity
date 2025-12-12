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
    // --- PASTE PERSONAL KEY HERE ---
    const apiKey = "AIzaSyDydaUhYtCbRn9Xr17Ah8Cu9AvlSL9y6Wc".trim(); 
    // -------------------------------

    const body = request.body || {};
    
    // 2. ASK GOOGLE: "What models can I use?"
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResponse = await fetch(listUrl);
    
    if (!listResponse.ok) {
        throw new Error(`Failed to list models: ${listResponse.status}`);
    }

    const listData = await listResponse.json();
    const allModels = listData.models || [];

    // 3. INTELLIGENT FILTERING
    // We filter out the "Experimental" and "2.0/2.5" models that cause Quota (429) errors.
    const safeModels = allModels.filter(m => {
        const name = m.name.toLowerCase();
        // Must support content generation
        if (!m.supportedGenerationMethods.includes('generateContent')) return false;
        // MUST NOT be experimental or 2.0 (Avoids 429 Quota errors)
        if (name.includes('exp') || name.includes('2.0') || name.includes('2.5')) return false;
        return true;
    });

    // Pick the best remaining one
    // We prefer Flash, then Pro.
    let chosenModel = safeModels.find(m => m.name.includes('gemini-1.5-flash')) ||
                      safeModels.find(m => m.name.includes('gemini-1.5-pro')) ||
                      safeModels.find(m => m.name.includes('gemini-1.0-pro')) ||
                      safeModels[0];

    // 4. EMERGENCY DEBUG: If no safe models found, Show the user what IS available
    if (!chosenModel) {
        const names = allModels.map(m => m.name).join(", ");
        return response.status(200).json({ 
            feedback: `<strong>DEBUG:</strong> Key valid, but no 'Safe' models found.<br>Available Models: ${names}` 
        });
    }

    // 5. Construct Prompt
    const promptText = `
      Act as a 6th Grade Teacher. Analyze this balance scale activity.
      Shapes: ${body.totalShapes || 0}. Status: ${body.currentStatus || "Unknown"}.
      Give 2 encouraging sentences. Use HTML.
    `;

    // 6. RUN IT
    // Ensure we use the exact name from the list (e.g., "models/gemini-1.5-flash-001")
    const modelId = chosenModel.name.replace("models/", "");
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return response.status(200).json({ 
        feedback: `<strong>DEBUG ERROR:</strong> Connected to ${modelId} but failed.<br>Status: ${apiResponse.status}<br>Details: ${errorText}` 
      });
    }

    const data = await apiResponse.json();
    let feedback = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI returned no text.";

    return response.status(200).json({ feedback });

  } catch (error) {
    return response.status(200).json({ 
      feedback: `<strong>SYSTEM CRASH:</strong> ${error.message}` 
    });
  }
};
