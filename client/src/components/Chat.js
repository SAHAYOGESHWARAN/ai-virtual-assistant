// client/src/components/Chat.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

// Initialize socket connection
const socket = io('http://localhost:5000');

// Speech function to synthesize speech from text
const speak = (message) => {
    const utterance = new SpeechSynthesisUtterance(message);
    const voices = window.speechSynthesis.getVoices();
    // Selecting a voice, you may want to log voices to see what's available
    utterance.voice = voices.find(voice => voice.name === 'Google US English') || voices[0];
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
};

const Chat = ({ token }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/chat/history', {
                    headers: { Authorization: token },
                });
                setMessages(response.data.flatMap(chat => chat.messages));
            } catch (error) {
                console.error('Error fetching chat history:', error);
            }
        };

        fetchChatHistory();
    }, [token]);

    const sendMessage = async () => {
        const userMessage = input.trim();
        if (!userMessage) return;

        // Update messages state with the user's message
        setMessages((prevMessages) => [...prevMessages, { sender: 'User', text: userMessage }]);
        setInput('');

        try {
            // Send user message to the backend
            const response = await axios.post('http://localhost:5000/api/chat', 
                { message: userMessage }, 
                { headers: { Authorization: token } }
            );
            const assistantMessage = response.data.response;
            // Update messages state with the assistant's response
            setMessages((prevMessages) => [...prevMessages, { sender: 'Assistant', text: assistantMessage }]);
            // Speak out the assistant's response
            speak(assistantMessage);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    // Handle Enter key press to send message
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    // Placeholder for speech recognition (not implemented in this example)
    const startSpeechRecognition = () => {
        // Implement speech recognition logic here
        console.log("Speech recognition started");
    };

    return (
        <div>
            <div className="chat-window">
                {messages.map((msg, index) => (
                    <div key={index} className={msg.sender === 'User' ? 'user-message' : 'assistant-message'}>
                        <strong>{msg.sender}:</strong> {msg.text}
                    </div>
                ))}
            </div>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
            />
            <button onClick={sendMessage}>Send</button>
            <button onClick={startSpeechRecognition}>🎤 Speak</button>
        </div>
    );
};

export default Chat;
