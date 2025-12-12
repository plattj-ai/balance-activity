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

    // 2. Parse Body (Safe Mode)
    // If parsing fails, we use default empty values to prevent crashing
    const body = request.body || {};
    const totalShapes = body.totalShapes || 0;
    const currentStatus = body.currentStatus || "Unknown";

    // 3. Construct Prompt
    const promptText = `
      Act as a 6th Grade Teacher. Analyze this balance scale activity.
      Status: ${currentStatus}. Shapes count: ${totalShapes}.
      Give 2 sentences of feedback.
    `;

    // 4. Call Google (Using the older 'gemini-pro' model which is more compatible)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    // 5. DEBUGGING: If it fails, send the ACTUAL error to the student screen
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return response.status(200).json({ 
        feedback: `<strong>DEBUG ERROR:</strong> Google refused the connection.<br><br>Status: ${apiResponse.status}<br>Details: ${errorText}` 
      });
    }

    const data = await apiResponse.json();
    let feedback = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI returned no text.";

    // Success!
    return response.status(200).json({ feedback });

  } catch (error) {
    // If the server crashes, send the crash report to the screen
    return response.status(200).json({ 
      feedback: `<strong>SYSTEM CRASH:</strong> ${error.message}` 
    });
  }
};
