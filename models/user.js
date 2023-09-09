const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    points:{
        type: Number,
        default: 0,
        required: true
    },
    monthpoints:{
        type: Number,
        default: 0,
        required: true
    },
    tokens:{
        type: Number,
        default: 0,
        required: true
    },
    month_tokens:{
        type: Number,
        default: 0,
        required: true
    },
    admin: {
        type: Boolean,
        required: true
    },
    likedoffers: {
        type:Array,
        required: false,
    },
    dislikedoffers: {
        type:Array,
        required: false,
    }
})

const UserM = mongoose.model('User', userSchema);

module.exports = UserM;