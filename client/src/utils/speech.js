
export const speak = (message) => {
    const utterance = new SpeechSynthesisUtterance(message);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => voice.name === 'Google US English'); // Change as needed
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
};
