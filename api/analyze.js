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
    const apiKey = "AIzaSyDydaUhYtCbRn9Xr17Ah8Cu9AvlSL9y6Wc"; 
    // -------------------------------

    const body = request.body || {};
    
    // Construct Prompt
    const promptText = `
      Act as a 6th Grade Teacher. Analyze this balance scale activity.
      Shapes: ${body.totalShapes || 0}. Status: ${body.currentStatus || "Unknown"}.
      Give 2 sentences of encouraging feedback. Use HTML.
    `;

    // 2. The "Self-Healing" Strategy
    // We define a list of models/versions to try in order.
    // If the first one fails, it automatically tries the next one.
    const attempts = [
      { model: 'gemini-1.5-flash', version: 'v1beta' }, // Try Beta line first (Most likely)
      { model: 'gemini-1.5-flash', version: 'v1' },     // Try Stable line
      { model: 'gemini-pro',       version: 'v1beta' }  // Fallback to older model
    ];

    let lastError = "";
    let successData = null;

    // Loop through attempts until one works
    for (const attempt of attempts) {
      try {
        const url = `https://generativelanguage.googleapis.com/${attempt.version}/models/${attempt.model}:generateContent?key=${apiKey}`;
        
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        if (res.ok) {
          successData = await res.json();
          break; // It worked! Stop trying.
        } else {
          // If it failed, save the error and let the loop continue to the next model
          const txt = await res.text();
          lastError = `${attempt.model} (${attempt.version}) failed: ${res.status} ${txt}`;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    // 3. Handle Result
    if (successData) {
      let feedback = successData.candidates?.[0]?.content?.parts?.[0]?.text || "AI returned no text.";
      return response.status(200).json({ feedback });
    } else {
      // If ALL attempts failed, show the error
      return response.status(200).json({ 
        feedback: `<strong>DEBUG ERROR:</strong> All models failed.<br>Last Error: ${lastError}` 
      });
    }

  } catch (error) {
    return response.status(200).json({ 
      feedback: `<strong>SYSTEM CRASH:</strong> ${error.message}` 
    });
  }
};
