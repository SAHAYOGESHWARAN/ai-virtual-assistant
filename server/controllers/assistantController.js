const axios = require('axios');

exports.handleAssistantRequest = async (req, res) => {
    const userMessage = req.body.message;

    // Call to ChatGPT API (replace YOUR_API_KEY with actual key)
    const chatGptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }]
    }, {
        headers: {
            'Authorization': `Bearer YOUR_API_KEY`,
            'Content-Type': 'application/json'
        }
    });

    res.json({ response: chatGptResponse.data.choices[0].message.content });
};
