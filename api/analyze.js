const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (request, response) => {
  // CORS Headers (Allows Google Sites to talk to Vercel)
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

  try {
    // 1. Check for API Key
    if (!process.env.GEMINI_API_KEY) {
      console.error("Error: GEMINI_API_KEY is missing in Vercel environment variables.");
      return response.status(500).json({ feedback: "<p>Teacher Configuration Error: API Key missing.</p>" });
    }

    // 2. Parse Data
    const { shapeData, totalShapes, currentStatus, mode } = request.body || {};
    
    // 3. Initialize AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 4. Construct Prompt
    const prompt = `
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

    // 5. Generate Content
    const result = await model.generateContent(prompt);
    const responseResult = await result.response;
    
    // 6. Safe Text Extraction (Prevents crashes if AI returns empty/blocked response)
    let feedback = "";
    if (responseResult.candidates && responseResult.candidates.length > 0) {
        feedback = responseResult.text();
    } else {
        feedback = "<p>I see what you are doing, but I'm having trouble analyzing it right now. Try moving a shape slightly and asking again!</p>";
    }

    return response.status(200).json({ feedback });

  } catch (error) {
    console.error("Full AI Error Log:", error); // This shows in Vercel Logs
    
    // Check for specific "Model Not Found" error to verify version
    if (error.message && error.message.includes("404")) {
        return response.status(500).json({ feedback: "<p>System Error: The AI library is out of date. Please verify package.json has version ^0.21.0</p>" });
    }

    return response.status(500).json({ feedback: `<p>My teacher brain is tired. (Error: ${error.message})</p>` });
  }
};
