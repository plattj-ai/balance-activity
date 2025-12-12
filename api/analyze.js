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
    
    // 2. AUTO-DETECT: Ask Google which models are available
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResponse = await fetch(listUrl);
    
    if (!listResponse.ok) {
        throw new Error(`Failed to list models: ${listResponse.status}`);
    }

    const listData = await listResponse.json();
    const models = listData.models || [];

    // Find a model that supports 'generateContent'
    // We prefer Flash, then Pro, then anything else
    let chosenModel = models.find(m => m.name.includes('gemini-1.5-flash')) ||
                      models.find(m => m.name.includes('gemini-pro')) ||
                      models.find(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'));

    if (!chosenModel) {
        // Debugging: Print what WAS found so we can fix it
        const namesFound = models.map(m => m.name).join(", ");
        return response.status(200).json({ 
            feedback: `<strong>DEBUG:</strong> Key is valid, but no generation models found.<br>Models available: ${namesFound}` 
        });
    }

    // 3. Construct Prompt
    const promptText = `
      Act as a 6th Grade Teacher. Analyze this balance scale activity.
      Shapes: ${body.totalShapes || 0}. Status: ${body.currentStatus || "Unknown"}.
      Give 2 encouraging sentences. Use HTML.
    `;

    // 4. Run Analysis using the Auto-Detected Model
    // chosenModel.name looks like "models/gemini-1.5-flash-001"
    // We remove the "models/" prefix if it exists to be safe, though the API handles it
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
