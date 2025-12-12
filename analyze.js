const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Get the data from the game
    const { shapeData, totalShapes, currentStatus, mode } = request.body;

    // 2. Initialize Gemini with the Key from Environment Variables
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 3. Create the prompt for the "Teacher Persona"
    const prompt = `
      You are a supportive, enthusiastic Junior High School Graphic Design teacher (6th Grade). 
      You are analyzing a student's work in an interactive "Visual Balance" activity.
      
      Here is the data about their design:
      - Total Shapes: ${totalShapes}
      - Activity Mode: ${mode}
      - Current Balance Status: "${currentStatus}" (This refers to the physical tilt of the balance beam).
      - Shape Details: ${JSON.stringify(shapeData)}

      Definitions for the student:
      - "Visual Weight": How much a shape attracts the eye. Darker shapes are heavier. Bigger shapes are heavier. Shapes further from the center (fulcrum) apply more leverage/weight.
      
      Your Goal:
      Give specific, constructive feedback in 3-4 short sentences using simple language suitable for an 11-12 year old.
      
      Instructions:
      1. If the status is "Balanced": Congratulate them! Explain *why* it works (e.g., "Great job! The large light circle on the left perfectly balances the small dark squares on the right.").
      2. If the status is "Tipped Left" or "Tipped Right": Give a specific hint on how to fix it without giving the exact answer. (e.g., "The right side is too heavy! Try moving that big dark square closer to the center, or make it lighter.")
      3. If the status is "Add more shapes": Encourage them to add more to make it interesting.
      4. Mention "Visual Weight" in your explanation.
      5. Format your response with HTML tags (<p>, <strong>, etc) so it looks nice in the modal. Do not use Markdown backticks.
    `;

    // 4. Generate the content
    const result = await model.generateContent(prompt);
    const feedback = result.response.text();

    // 5. Send back to the browser
    return response.status(200).json({ feedback });

  } catch (error) {
    console.error("AI Error:", error);
    return response.status(500).json({ feedback: "<p>Sorry, I had a little trouble analyzing that. Can you try pressing the button again?</p>" });
  }
}