
const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    messages: [
        {
            sender: { type: String, required: true },  // 'User' or 'Assistant'
            text: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
        },
    ],
});

module.exports = mongoose.model('Chat', ChatSchema);
