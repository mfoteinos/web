const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: false
    },
    subcategory: {
        type: String,
        required: false
    },
    prices:{
        type:Array,
        required: true,
        date:{
            type: String,
            required: true
        },
        price:{
            type: Number,
            required: true
        },
        avg_price:{
            type: Number,
            required: false,
            default: 0
        }
}})

const ProductM = mongoose.model('Product', productSchema);

module.exports = ProductM;