import React, { useState, useEffect, useCallback } from 'react';
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

    const audio = new Audio(backgroundMusic);
    audio.loop = true;

    const handlePlayMusic = () => {
        audio.play().catch((error) => {
            console.error("Audio playback failed:", error);
        });
    };

    useEffect(() => {
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }, [chatHistory]);

    useEffect(() => {
        localStorage.setItem('reminders', JSON.stringify(reminders));
    }, [reminders]);

    useEffect(() => {
        if (greeting) {
            speak(greeting);
        }
    }, [greeting]);

    useEffect(() => {
        // Get battery level on component mount
        const getBatteryLevel = async () => {
            if (navigator.getBattery) {
                const battery = await navigator.getBattery();
                setBatteryLevel((battery.level * 100).toFixed(0)); // Get battery percentage
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

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning!";
        if (hour < 18) return "Good afternoon!";
        return "Good evening!";
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
        setGreeting(getGreeting());
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
        console.log("print", process.env.REACT_APP_OPENAI_API_KEY)
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
                            color: "#00d9ff",
                            opacity: 0.4,
                            width: 1,
                        },
                    },
                    interactivity: {
                        events: {
                            onhover: {
                                enable: true,
                                mode: "repulse",
                            },
                            onclick: {
                                enable: true,
                                mode: "push",
                            },
                            resize: true,
                        },
                        modes: {
                            grab: {
                                distance: 400,
                                line_linked: {
                                    opacity: 1,
                                },
                            },
                            repulse: {
                                distance: 200,
                                duration: 0.4,
                            },
                            push: {
                                particles_nb: 4,
                            },
                            remove: {
                                particles_nb: 2,
                            },
                        },
                    },
                    retina_detect: true,
                }}
            />

            <h1>Welcome to Your AI Assistant</h1>
            <div className="battery-status">
                <h4>Battery Level: {batteryLevel !== null ? `${batteryLevel}%` : 'Loading...'}</h4>
            </div>

            <motion.button
                whileHover={{ scale: 1.1, boxShadow: "0 0 25px #00d9ff", transition: { duration: 0.3 } }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading || isListening} // Disable when loading or listening
                onClick={handleListen} // Call the listening function when clicked
            >
                {isListening ? 'Listening...' : 'Talk to Me!'}
            </motion.button>

            <div className="chat-box">
                <h2>Chat History</h2>
                <ul>
                    {chatHistory.map((msg, index) => (
                        <li key={index}>{msg}</li>
                    ))}
                    {loading && <li>Assistant is typing...</li>}
                </ul>
                <button onClick={clearChatHistory}>Clear Chat History</button>
            </div>

            <div className="robot">
                <div className="antenna"></div>
                <div className="mouth"></div>
            </div>

            <div>
                <h3>Reminders</h3>
                <ul>
                    {reminders.map((reminder, index) => (
                        <li key={index}>
                            {reminder} 
                            <button onClick={() => deleteReminder(index)}>Delete</button>
                        </li>
                    ))}
                </ul>
            </div>
            <button onClick={handlePlayMusic}>Play Background Music</button> {/* Add button to play music */}

            <div className="social-media">
                <h3>Follow Us</h3>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faTwitter} />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faFacebook} />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faLinkedin} />
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faGithub} />
                </a>
            </div>
        </div>
    );
}

export default App;
