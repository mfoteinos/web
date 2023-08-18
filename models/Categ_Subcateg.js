const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categ_subScema = new Schema({
    id:{
        type: String,
        required: true
    },
    name:{
        type: String,
        required: true
    },
    subcategories:{
        type: Array,
        required: true,
        name:{
            type: String,
            required: true
        },
        uuid:{
            type: String,
            required: true
        }
    }
})

const Categ_SubC = mongoose.model('Categ_SubC', categ_subScema);

module.exports = Categ_SubC;

