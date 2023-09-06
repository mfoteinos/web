const fs = require('fs');
const mongoose = require('mongoose');
const Product = require('./models/product');

const db_url = 'mongodb+srv://xrhsthsthsvashs:ZJgAlDrKedPXkUUZ@cluster0.eixd381.mongodb.net/Data?retryWrites=true&w=majority';
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true} )
.then((result) => console.log('connected to database'))
.catch((err) => console.log(err))

fs.readFile('Data.Prices.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    data = JSON.parse(data);
    console.log(data)
    let today = new Date().toLocaleDateString();
    data.forEach(element => {
        for(x of element.prices){
            Product.updateOne({'name': element.name}, {$push: {prices: {date: today, price: x.price}}}).then(result => {
                console.log(result)
               }).catch((err) =>{
                    console.log(err);
            })
        }
})

})

