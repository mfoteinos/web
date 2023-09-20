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

    let today = new Date();
    today.setDate(today.getDate())

    today.toLocaleDateString()
    data.forEach(element => {
        Product.updateOne({'name': element.name}, { $pull: { prices : {price: {$gt:-1}} } }).then(result => {
                          console.log(result)
                         }).catch((err) =>{
                              console.log(err);
                      })
    })

    data.forEach(element => {
            let i = 0
            while(i < 7){
              let week = new Date();
              week.setDate(week.getDate() - i)
                Product.updateOne({'name': element.name}, {$push: {prices: {date: week.toLocaleDateString(), price: (Math.round((Math.random()*5)* 100)/100) + 1}}}).then(result => {
                    console.log(result)
                   }).catch((err) =>{
                        console.log(err);
                })
                i += 1
            }
    })

})

