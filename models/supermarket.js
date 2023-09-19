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
    },
    offers:{
        type:Array,
        required:true,
        id:{
            type: String,
            required: true
        },
        username: {
            type: String,
            required: true
            },
        product:{
            type: String,
            required: true
            },
        price:{
            type: Number,
            required: true
            },
        date:{
            type: String,
            required: true
            },
        likes:{
            type: Number,
            required: true
            },
        dislikes:{
            type: Number,
            required: true
            },
        available:{
            type: Boolean,
            required: true
            },
        reqDay:{
            type: Boolean,
            required: false
            },
        reqWeek:{
            type: Boolean,
            required: false
            },
        secondWeek:{
            type: Boolean,
            required: true,
            default: false
                }
        }
    }
)

const SupermarketM= mongoose.model('Supermarket', supermarketSchema);

module.exports = SupermarketM;