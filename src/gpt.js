const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getGptResponse(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for finding professional partners.' },
        { role: 'user', content: prompt },
      ],
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error getting GPT response:', error);
    // In a real application, you might want to throw the error
    // or handle it in a more sophisticated way.
    return 'Sorry, I am having trouble connecting to the AI service.';
  }
}

module.exports = { getGptResponse };