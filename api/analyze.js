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
    
    // Construct Prompt
    const promptText = `
      Act as a 6th Grade Teacher. Analyze this balance scale activity.
      Shapes: ${body.totalShapes || 0}. Status: ${body.currentStatus || "Unknown"}.
      Give 2 encouraging sentences. Use HTML.
    `;

    // 2. THE FIX: Brute-force the standard, free models.
    // We explicitly avoid experimental versions that trigger 429 errors.
    const modelsToTry = [
        'gemini-1.5-flash',      // The standard fast model
        'gemini-1.5-flash-001',  // The versioned backup
        'gemini-1.5-pro',        // The smarter standard model
        'gemini-pro'             // The old reliable (v1.0)
    ];

    let lastError = "";

    // Loop through the list. Return the first one that works.
    for (const modelName of modelsToTry) {
        try {
            // We use v1beta because it has the widest compatibility for Personal Keys
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            
            const apiResponse = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });

            if (apiResponse.ok) {
                const data = await apiResponse.json();
                let feedback = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI returned no text.";
                return response.status(200).json({ feedback });
            } else {
                const txt = await apiResponse.text();
                lastError = `${modelName} failed: ${apiResponse.status} ${txt}`;
                // Continue to the next model in the list...
            }
        } catch (e) {
            lastError = e.message;
        }
    }

    // If we get here, every single model failed
    return response.status(200).json({ 
        feedback: `<strong>DEBUG ERROR:</strong> All standard models failed.<br>Last Error: ${lastError}` 
    });

  } catch (error) {
    return response.status(200).json({ 
      feedback: `<strong>SYSTEM CRASH:</strong> ${error.message}` 
    });
  }
};
