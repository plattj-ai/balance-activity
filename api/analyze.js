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
    
    // 2. GET LIST: Ask Google which models are available
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResponse = await fetch(listUrl);
    
    if (!listResponse.ok) {
        throw new Error(`Failed to list models: ${listResponse.status}`);
    }

    const listData = await listResponse.json();
    const models = listData.models || [];

    // 3. SELECT MODEL: Prioritize the known Free Tier models
    // We explicitly avoid '2.5' or experimental models that triggered the 429 error
    let chosenModel = models.find(m => m.name.includes('gemini-1.5-flash')) || 
                      models.find(m => m.name.includes('gemini-1.5-pro')) ||
                      models.find(m => m.name.includes('gemini-1.0-pro'));

    if (!chosenModel) {
        // Fallback: If for some crazy reason Flash isn't there, take anything that isn't 2.5
        chosenModel = models.find(m => m.name.includes('gemini') && !m.name.includes('2.5'));
    }

    if (!chosenModel) {
        return response.status(200).json({ 
            feedback: `<strong>DEBUG:</strong> No suitable Free Tier models found.` 
        });
    }

    // 4. Construct Prompt
    const promptText = `
      Act as a 6th Grade Teacher. Analyze this balance scale activity.
      Shapes: ${body.totalShapes || 0}. Status: ${body.currentStatus || "Unknown"}.
      Give 2 encouraging sentences. Use HTML.
    `;

    // 5. Run Analysis
    const cleanModelName = chosenModel.name.replace("models/", "");
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return response.status(200).json({ 
        feedback: `<strong>DEBUG ERROR:</strong> Connected to ${cleanModelName} but failed.<br>Status: ${apiResponse.status}<br>Details: ${errorText}` 
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
