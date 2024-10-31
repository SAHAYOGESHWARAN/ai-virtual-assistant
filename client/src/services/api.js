import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const sendMessageToAssistant = async (message) => {
    const response = await axios.post(`${API_URL}/chat`, { message });
    return response.data;
};
