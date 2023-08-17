const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const supermarketSchema = new Schema({
    type: {
        type: String,
        enum: ['Feature'],
        required: true
    },
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    properties: {
        id: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        offers: {
            type: Array,
            required: false,
            id:{
                type: String,
                required: true
            },
            product:{
                type: String,
                required: true
            },
            price:{
                type: String,
                required: true
            },
            date:{
                type: String,
                required: true
            },
            likes:{
                type: String,
                required: true
            },
            dislikes:{
                type: String,
                required: true
            },
            available:{
                type: Boolean,
                required: true
            }
        }
    }
})

const SupermarketM= mongoose.model('Supermarket', supermarketSchema);

module.exports = SupermarketM;