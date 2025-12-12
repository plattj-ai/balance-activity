module.exports = async (request, response) => {
  // 1. CORS Headers (Allows Google Sites to talk to Vercel)
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle pre-flight requests
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Check for API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Error: GEMINI_API_KEY is missing.");
      return response.status(500).json({ feedback: "<p>Teacher Configuration Error: API Key missing.</p>" });
    }

    // 3. Prepare the Data
    const { shapeData, totalShapes, currentStatus, mode } = request.body || {};
    
    // 4. Construct the Teacher Prompt
    const promptText = `
      You are a supportive 6th Grade Graphic Design teacher.
      Analyze this student's "Visual Balance" activity.
      
      Data:
      - Total Shapes: ${totalShapes}
      - Mode: ${mode}
      - Balance Status: "${currentStatus}"
      - Shapes: ${JSON.stringify(shapeData)}

      Task:
      Give 3 sentences of feedback.
      - If "Balanced": Explain why it works using "Visual Weight".
      - If "Tipped": Give a specific hint to move or resize a shape to fix it.
      - Use HTML tags (<p>, <strong>) for formatting.
    `;

    // 5. Call Google API DIRECTLY (No Library needed!)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: promptText }]
        }]
      })
    });

    // 6. Handle the Result
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("Google API Error:", errorText);
      throw new Error(`Google API refused the request: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    
    // Extract text safely
    let feedback = "<p>I'm having trouble thinking of feedback right now. Try again!</p>";
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      feedback = data.candidates[0].content.parts[0].text;
    }

    return response.status(200).json({ feedback });

  } catch (error) {
    console.error("Server Error:", error);
    return response.status(500).json({ feedback: `<p>My teacher brain is tired. (Error: ${error.message})</p>` });
  }
};
