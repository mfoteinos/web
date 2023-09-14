const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tokenSchema = new Schema({
    id: {
        type: Number,
        default: 0,
        required: true
    },
    tokens: {
        type: Number,
        default: 0,
        required: true
    }
})

const TokenM = mongoose.model('Tokens', tokenSchema);

module.exports = TokenM;