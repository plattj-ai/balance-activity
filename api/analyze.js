module.exports = async (request, response) => {
  // --- PASTE YOUR PERSONAL KEY INSIDE THE QUOTES BELOW ---
  const apiKey = "AIzaSyDydaUhYtCbRn9Xr17Ah8Cu9AvlSL9y6Wc"; 
  // -------------------------------------------------------

  // Standard Headers
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (request.method === 'OPTIONS') return response.status(200).end();

  try {
    const { shapeData, totalShapes, currentStatus, mode } = request.body || {};
    
    // Construct Prompt
    const promptText = `
      You are a supportive 6th Grade Graphic Design teacher.
      Analyze this student's "Visual Balance" activity.
      Data: Total Shapes: ${totalShapes}, Mode: ${mode}, Balance Status: "${currentStatus}", Shapes: ${JSON.stringify(shapeData)}
      Task: Give 3 sentences of feedback. If "Balanced", explain why. If "Tipped", give a hint. Use HTML tags.
    `;

    // Direct Call to Gemini 1.5 Flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      // If Flash fails, we throw an error to see it in the logs
      throw new Error(`Google Refused: ${apiResponse.status} - ${errorText}`);
    }

    const data = await apiResponse.json();
    let feedback = data.candidates?.[0]?.content?.parts?.[0]?.text || "No feedback generated.";

    return response.status(200).json({ feedback });

  } catch (error) {
    console.error("HARDCODED TEST ERROR:", error.message);
    return response.status(500).json({ feedback: `<p>Test Failed: ${error.message}</p>` });
  }
};

