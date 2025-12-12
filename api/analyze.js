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
    // The .trim() function removes invisible spaces that cause 404 errors!
    const apiKey = "AIzaSyDydaUhYtCbRn9Xr17Ah8Cu9AvlSL9y6Wc".trim(); 
    // -------------------------------

    const body = request.body || {};
    
    // Construct Prompt
    const promptText = `
      Act as a 6th Grade Teacher. Analyze this balance scale activity.
      Shapes: ${body.totalShapes || 0}. Status: ${body.currentStatus || "Unknown"}.
      Give 2 sentences of encouraging feedback. Use HTML.
    `;

    // 2. Call Google (Using the latest model)
    // We use 'v1beta' which is where Personal Keys usually look for Flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    // 3. Handle Errors
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return response.status(200).json({ 
        feedback: `<strong>DEBUG ERROR:</strong> Google refused the connection.<br>Status: ${apiResponse.status}<br>Details: ${errorText}` 
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
