const fs = require('fs');
const mongoose = require('mongoose');
const Product = require('./models/product');
const { json } = require('express');

const db_url = 'mongodb+srv://xrhsthsthsvashs:ZJgAlDrKedPXkUUZ@cluster0.eixd381.mongodb.net/Data?retryWrites=true&w=majority';
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true} )
.then((result) => console.log('connected to database'))
.catch((err) => console.log(err))



Product.find({}).then(result => {
    let temp = 0
    let tempArray = []


    result.forEach(element => {
        let temp1 = 0
        let i = 0
        let prices = []
        while(i < 7){
            let week = new Date();
            week.setDate(week.getDate() - i)
             temp1 = {date: week.toLocaleDateString(), 
                        price: (Math.floor((Math.random()*5)* 100)/100) + 1}
              i += 1
             prices.push(temp1)
          }
          
        temp = {
            id: element.id,
            name: element.name,
            category: element.category,
            subcategory: element.subcategory,
            prices: prices
        }
        tempArray.push(temp)
    })

    var jsonData = JSON.stringify(tempArray);

    fs.writeFile("Prices.json", jsonData, function(err) {
        if (err) {
            console.log(err);
        }
    });

})