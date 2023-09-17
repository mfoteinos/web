const fs = require('fs');
const mongoose = require('mongoose');
const SupermarketM = require('./models/supermarket');
const Product = require('./models/product')

const db_url = 'mongodb+srv://xrhsthsthsvashs:ZJgAlDrKedPXkUUZ@cluster0.eixd381.mongodb.net/Data?retryWrites=true&w=majority';
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true} )
.then((result) => console.log('connected to database'))
.catch((err) => console.log(err))

SupermarketM.find({}).then((result) => {
    Product.find({}).then((product => {
        product.forEach(element => {
            console.log(element)
        }) 
    }))
})
 .catch((err) =>{
    console.log(err);
})

