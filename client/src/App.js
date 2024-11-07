import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import Particles from 'react-tsparticles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter, faFacebook, faLinkedin, faGithub } from '@fortawesome/free-brands-svg-icons';
import './App.css';
import backgroundMusic from './assets/background.mp3';

function App() {
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [greeting, setGreeting] = useState('');
    const [chatHistory, setChatHistory] = useState(() => {
        const savedChatHistory = localStorage.getItem('chatHistory');
        return savedChatHistory ? JSON.parse(savedChatHistory) : [];
    });
    const [selectedVoice, setSelectedVoice] = useState('');
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [reminders, setReminders] = useState(() => {
        const savedReminders = localStorage.getItem('reminders');
        return savedReminders ? JSON.parse(savedReminders) : [];
    });
    const [batteryLevel, setBatteryLevel] = useState(null);

    const listeningTimer = useRef(null);

    const audio = useRef(new Audio(backgroundMusic));
    audio.current.loop = true;

    const handlePlayMusic = () => {
        audio.current.play().catch((error) => {
            console.error("Audio playback failed:", error);
        });
    };

    const stopListening = () => {
        setIsListening(false);
        clearTimeout(listeningTimer.current);
    };

    useEffect(() => {
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }, [chatHistory]);

    useEffect(() => {
        localStorage.setItem('reminders', JSON.stringify(reminders));
    }, [reminders]);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good morning!");
        else if (hour < 18) setGreeting("Good afternoon!");
        else setGreeting("Good evening!");

        // Automatically greet user with a voice message
        if (greeting) speak(greeting);
    }, []);

    useEffect(() => {
        const getBatteryLevel = async () => {
            if (navigator.getBattery) {
                const battery = await navigator.getBattery();
                setBatteryLevel((battery.level * 100).toFixed(0));
            }
        };
        getBatteryLevel();
    }, []);

    const fetchWeather = async () => {
        const apiKey = process.env.REACT_APP_OPENWEATHER_API_KEY;
        const city = 'Mumbai';
        try {
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
            const data = response.data;
            if (data.main) {
                const weatherDescription = `The current temperature in ${city} is ${data.main.temp}°C with ${data.weather[0].description}.`;
                setWeatherData(weatherDescription);
                return weatherDescription;
            }
        } catch (error) {
            console.error("Error fetching weather:", error);
            return "I couldn't fetch the weather data. Please try again later.";
        }
    };

    const fetchNews = async () => {
        const apiKey = process.env.REACT_APP_NEWSAPI_API_KEY;
        try {
            const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=in&apiKey=${apiKey}`);
            const newsData = response.data.articles.slice(0, 5).map(article => article.title);
            const newsMessage = "Here are the top news headlines: " + newsData.join('; ');
            return newsMessage;
        } catch (error) {
            console.error("Error fetching news:", error);
            return "I couldn't fetch the news. Please try again later.";
        }
    };

    const speak = useCallback((message) => {
        const utterance = new SpeechSynthesisUtterance(message);
        const voices = window.speechSynthesis.getVoices();
        utterance.voice = voices.find(voice => voice.name === selectedVoice) || voices[0];
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    }, [selectedVoice]);

    const handleListen = () => {
        setIsListening(true);
        clearTimeout(listeningTimer.current);
        listeningTimer.current = setTimeout(stopListening, 15000); // Auto-stop listening after 15 seconds

        startListening();
    };

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Sorry, your browser does not support speech recognition.");
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = async (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');

            if (event.results[0].isFinal) {
                await handleCommand(transcript);
            }
        };

        recognition.onend = () => {
            if (isListening) {
                console.log('Listening ended. Restarting...');
                startListening();
            }
        };

        recognition.onerror = (event) => {
            console.error('Error in recognition: ' + event.error);
            setIsListening(false);
        };

        recognition.start();
    };

    const handleCommand = async (command) => {
        setChatHistory(prev => [...prev, `You: ${command}`]);

        if (command.toLowerCase().includes("search for")) {
            const query = command.replace("search for", "").trim();
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            window.open(searchUrl, '_blank');
            const response = `Searching for "${query}" on Google.`;
            setChatHistory(prev => [...prev, `Assistant: ${response}`]);
            speak(response);
        } else if (command.toLowerCase().includes("weather")) {
            const response = await fetchWeather();
            setChatHistory(prev => [...prev, `Assistant: ${response}`]);
            speak(response);
        } else if (command.toLowerCase().includes("news")) {
            const newsResponse = await fetchNews();
            setChatHistory(prev => [...prev, `Assistant: ${newsResponse}`]);
            speak(newsResponse);
        } else if (command.toLowerCase().includes("set a reminder")) {
            const reminder = command.replace("set a reminder", "").trim();
            setReminders(prev => [...prev, reminder]);
            const response = `Reminder set: ${reminder}`;
            setChatHistory(prev => [...prev, `Assistant: ${response}`]);
            speak(response);
        } else {
            setLoading(true);
            const gptResponse = await getChatGPTResponse(command);
            setChatHistory(prev => [...prev, `Assistant: ${gptResponse}`]);
            speak(gptResponse);
            setLoading(false);
        }
    };

    const getChatGPTResponse = async (message) => {
        const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

        if (!apiKey) {
            console.error('API Key is missing');
            return "API Key is missing. Please check your environment variables.";
        }

        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'llama-3.1-70b-versatile',
                messages: [{ role: 'user', content: message }],
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.data.choices && response.data.choices.length > 0) {
                return response.data.choices[0].message.content;
            } else {
                console.error('No choices found in the response');
                return "I didn't receive a valid response from ChatGPT.";
            }
        } catch (error) {
            console.error('Error fetching response from ChatGPT:', error.response ? error.response.data : error.message);
            return "I'm having trouble accessing ChatGPT. Please try again later.";
        }
    };

    const clearChatHistory = () => {
        setChatHistory([]);
        localStorage.removeItem('chatHistory');
    };

    const handleVoiceChange = (event) => {
        setSelectedVoice(event.target.value);
    };

    const deleteReminder = (index) => {
        setReminders((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="App">
            <Particles
                options={{
                    particles: {
                        number: {
                            value: 50,
                            density: {
                                enable: true,
                                value_area: 800,
                            },
                        },
                        size: {
                            value: 3,
                        },
                        move: {
                            speed: 1,
                            direction: "none",
                            random: false,
                            straight: false,
                            bounce: false,
                            attract: {
                                enable: false,
                            },
                        },
                        line_linked: {
                            enable: true,
                            distance: 150,
                            color: "#0000FF", // Blue color for theme
                            opacity: 0.4,
                            width: 1,
                        },
                    },
                    retina_detect: true,
                }}
            />

            <header className="header">
                <h1>{greeting}</h1>
                <button onClick={handlePlayMusic} className="music-button">Play Background Music</button>
                <button onClick={handleListen} className={`listen-button ${isListening ? 'active' : ''}`}>
                    {isListening ? 'Listening...' : 'Start Listening'}
                </button>
                <button onClick={clearChatHistory} className="clear-button">Clear Chat History</button>
            </header>

            <main className="chat-container">
                <div className="messages">
                    {chatHistory.map((message, index) => (
                        <motion.div 
                            key={index} 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className={message.startsWith("You:") ? "user-message" : "assistant-message"}
                        >
                            {message}
                        </motion.div>
                    ))}
                </div>
                {loading && <div className="loading">Assistant is typing...</div>}
            </main>

            <aside className="sidebar">
                <h2>Assistant Controls</h2>
                <div>
                    <label>Choose Voice Mode:</label>
                    <select value={selectedVoice} onChange={handleVoiceChange}>
                        <option value="">Default</option>
                        <option value="Google US English Male">Male Voice</option>
                        <option value="Google US English Female">Female Voice</option>
                    </select>
                </div>
                <div className="reminders">
                    <h2>Reminders</h2>
                    {reminders.map((reminder, index) => (
                        <div key={index} className="reminder">
                            <p>{reminder}</p>
                            <button onClick={() => deleteReminder(index)}>Delete</button>
                        </div>
                    ))}
                </div>
                {batteryLevel && <p>Battery Level: {batteryLevel}%</p>}
                {weatherData && <p>{weatherData}</p>}
            </aside>

            <footer className="footer">
                <div className="social-icons">
                    <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer">
                        <FontAwesomeIcon icon={faTwitter} size="2x" />
                    </a>
                    <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer">
                        <FontAwesomeIcon icon={faFacebook} size="2x" />
                    </a>
                    <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer">
                        <FontAwesomeIcon icon={faLinkedin} size="2x" />
                    </a>
                    <a href="https://github.com/" target="_blank" rel="noopener noreferrer">
                        <FontAwesomeIcon icon={faGithub} size="2x" />
                    </a>
                </div>
                <p>AI Assistant © 2024</p>
            </footer>
        </div>
    );
}

export default App;
