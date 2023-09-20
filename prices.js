const fs = require('fs');
const mongoose = require('mongoose');
const Product = require('./models/product');
const { json } = require('express');

const db_url = 'mongodb+srv://xrhsthsthsvashs:ZJgAlDrKedPXkUUZ@cluster0.eixd381.mongodb.net/Data?retryWrites=true&w=majority';
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true} )
.then((result) => console.log('connected to database'))
.catch((err) => console.log(err))


// Find everything in the product table 
Product.find({}).then(result => {
    let temp = 0
    let tempArray = []

    //For every product 
    result.forEach(element => {
        let temp1 = 0
        let i = 0
        let prices = []

        //For 30 days back from today
        while(i < 30){
            //Find the date
            let week = new Date();
            week.setDate(week.getDate() - i)
            //Create a temp Object that has the date, a random price for that date and an average week price equal to zero
             temp1 = {date: week.toLocaleDateString(), 
                        price: (Math.floor((Math.random()*5)* 100)/100) + 5,
                        avg_price: 0}
              i += 1
             prices.push(temp1)
        }
        i = 0
        //Then for 23 days back from today
        while(i < 23){
            let sum = 0
            //Calculate the average product price for the past week 
            for (let index = 1; index < 8; index++) {
                sum += prices[i + index].price
            }
            prices[i].avg_price = sum / 7

            i += 1
        }
        //Create a temp Object that has the procuct id, name, category, subcategory and the price array that has the price and the average week price for each date
        temp = {
            id: element.id,
            name: element.name,
            category: element.category,
            subcategory: element.subcategory,
            prices: prices
        }
        tempArray.push(temp)
    })

    //Convert to Json 
    var jsonData = JSON.stringify(tempArray);

    //Export to Json file 
    fs.writeFile("Prices.json", jsonData, function(err) {
        if (err) {
            console.log(err);
        }
    });

})