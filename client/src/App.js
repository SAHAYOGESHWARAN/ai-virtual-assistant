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
    const [chatHistory, setChatHistory] = useState(() => JSON.parse(localStorage.getItem('chatHistory')) || []);
    const [selectedVoice, setSelectedVoice] = useState('Google UK English Male');
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [reminders, setReminders] = useState(() => JSON.parse(localStorage.getItem('reminders')) || []);
    const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem('tasks')) || []);
    const [batteryLevel, setBatteryLevel] = useState(null);
    const [musicPlaying, setMusicPlaying] = useState(false);
    const [autoOffTimer, setAutoOffTimer] = useState(null);

    const audio = new Audio(backgroundMusic);
    audio.loop = true;

    const handlePlayPauseMusic = () => {
        if (musicPlaying) {
            audio.pause();
        } else {
            audio.play().catch((error) => console.error("Audio playback failed:", error));
        }
        setMusicPlaying(!musicPlaying);
    };

    useEffect(() => {
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }, [chatHistory]);

    useEffect(() => {
        localStorage.setItem('reminders', JSON.stringify(reminders));
    }, [reminders]);

    useEffect(() => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
        setGreeting(getGreeting());
        if (greeting) {
            speak(greeting);
        }
    }, [greeting]);

    useEffect(() => {
        const updateBattery = async () => {
            if (navigator.getBattery) {
                const battery = await navigator.getBattery();
                setBatteryLevel((battery.level * 100).toFixed(0));
                battery.onlevelchange = () => setBatteryLevel((battery.level * 100).toFixed(0));
            }
        };
        updateBattery();
    }, []);

    const fetchWeather = async () => {
        const apiKey = process.env.REACT_APP_OPENWEATHER_API_KEY;
        try {
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=Mumbai&appid=${apiKey}&units=metric`);
            setWeatherData(`Temperature in Mumbai: ${response.data.main.temp}°C with ${response.data.weather[0].description}.`);
        } catch (error) {
            console.error("Error fetching weather:", error);
        }
    };

    const fetchNews = async () => {
        const apiKey = process.env.REACT_APP_NEWSAPI_API_KEY;
        try {
            const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=in&apiKey=${apiKey}`);
            return response.data.articles.slice(0, 5).map(article => article.title).join('; ');
        } catch (error) {
            console.error("Error fetching news:", error);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        return hour < 12 ? "Good morning!" : hour < 18 ? "Good afternoon!" : "Good evening!";
    };

    const speak = useCallback((message) => {
        const utterance = new SpeechSynthesisUtterance(message);
        const voices = window.speechSynthesis.getVoices();
        utterance.voice = voices.find(voice => voice.name === selectedVoice) || voices[0];
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    }, [selectedVoice]);

    const startListening = () => {
        setIsListening(true);
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.onresult = async (event) => {
            const transcript = Array.from(event.results).map(result => result[0]).map(result => result.transcript).join('');
            if (event.results[0].isFinal) {
                await handleCommand(transcript);
            }
        };
        recognition.start();

        // Auto stop listening after 15 seconds
        setAutoOffTimer(setTimeout(() => {
            recognition.stop();
            setIsListening(false);
        }, 15000));
    };

    const handleCommand = async (command) => {
        setChatHistory(prev => [...prev, `You: ${command}`]);
        if (command.toLowerCase().includes("weather")) {
            await fetchWeather();
        } else if (command.toLowerCase().includes("news")) {
            const newsResponse = await fetchNews();
            setChatHistory(prev => [...prev, `Assistant: ${newsResponse}`]);
            speak(newsResponse);
        } else if (command.toLowerCase().includes("add task")) {
            const task = command.replace("add task", "").trim();
            setTasks(prev => [...prev, task]);
            setChatHistory(prev => [...prev, `Assistant: Task added - ${task}`]);
            speak(`Task added: ${task}`);
        } else if (command.toLowerCase().includes("show tasks")) {
            const taskList = tasks.join(", ");
            setChatHistory(prev => [...prev, `Assistant: Your tasks are: ${taskList}`]);
            speak(`Your tasks are: ${taskList}`);
        } else {
            setLoading(true);
            const response = `Executing command: ${command}`;
            setChatHistory(prev => [...prev, `Assistant: ${response}`]);
            speak(response);
            setLoading(false);
        }
    };

    const clearChatHistory = () => {
        setChatHistory([]);
        localStorage.removeItem('chatHistory');
    };

    const deleteReminder = (index) => {
        setReminders((prev) => prev.filter((_, i) => i !== index));
    };

    const deleteTask = (index) => {
        setTasks((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="App">
            <Particles options={{
                particles: {
                    number: { value: 100 },
                    color: { value: "#00d9ff" },
                    size: { value: 3 }
                }
            }} />

            <h1>Welcome to Your AI Assistant</h1>
            <div className="battery-status">
                <h4>Battery Level: {batteryLevel ? `${batteryLevel}%` : 'Loading...'}</h4>
            </div>

            <motion.button
                whileHover={{ scale: 1.1, boxShadow: "0 0 25px #00d9ff", transition: { duration: 0.3 } }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading || isListening}
                onClick={startListening}
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

            <div>
                <h3>Reminders</h3>
                <ul>
                    {reminders.map((reminder, index) => (
                        <li key={index}>{reminder} <button onClick={() => deleteReminder(index)}>Delete</button></li>
                    ))}
                </ul>
            </div>

            <div>
                <h3>Tasks</h3>
                <ul>
                    {tasks.map((task, index) => (
                        <li key={index}>{task} <button onClick={() => deleteTask(index)}>Delete</button></li>
                    ))}
                </ul>
            </div>

            <button onClick={handlePlayPauseMusic}>{musicPlaying ? 'Pause' : 'Play'} Background Music</button>

            <div className="social-media">
            <h3>Follow Us</h3>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faTwitter} /></a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faFacebook} /></a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faLinkedin} /></a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faGithub} /></a>
            </div>

            <div className="settings">
                <h3>Settings</h3>
                <div className="voice-selection">
                    <label htmlFor="voice-select">Select Voice: </label>
                    <select
                        id="voice-select"
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        value={selectedVoice}
                    >
                        {window.speechSynthesis.getVoices().map((voice) => (
                            <option key={voice.name} value={voice.name}>
                                {voice.name} - {voice.lang}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="footer">
                <p>Developed by saha</p>
            </div>
        </div>
    );
}

export default App;

