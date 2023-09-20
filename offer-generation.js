const fs = require('fs');
const mongoose = require('mongoose');
const SupermarketM = require('./models/supermarket');
const Product = require('./models/product')
const UserM = require('./models/user');

const db_url = 'mongodb+srv://xrhsthsthsvashs:ZJgAlDrKedPXkUUZ@cluster0.eixd381.mongodb.net/Data?retryWrites=true&w=majority';
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true} )
.then((result) => console.log('connected to database'))
.catch((err) => console.log(err))

//Find everything from Supermarket
SupermarketM.find({}).then((result) => {
    //Find everything from Product
    Product.find({}).then((product => {
        //Find everything from User
        UserM.find({}).then((user) => {

            let daysback = 60;

            let daylabels = new Array(daysback).fill('')
            //Creates an array with 60 random days 
            for (var i = 0; i < daysback; i++) {

                let date_obj = new Date();

                let temp = new Date();
        
                temp.setDate(date_obj.getDate() - i);
            
                let day = temp.getDate();
        
                let month = temp.getMonth() + 1;
        
                daylabels[daysback - i] = [temp.getFullYear() + '-',(month>9 ? '' : '0') + month + '-',(day>9 ? '' : '0') + day].join('');
        
            }

            //Creates 60 random offers 
            for (let index = 0; index < 60; index++) {

                let rand_product = 0
                let rand_super = 0
                let rand_user = 0
                let prod_id = 0
                let rand_price = 0
                let rand_date = ''
                let temp = 0

                rand_user = user[(Math.floor(Math.random() * user.length))].username //Select random username from user 
                temp = (Math.floor(Math.random() * product.length))
                rand_product = product[temp].name //Select random product name and get the id from that product 
                prod_id = product[temp].id
                rand_super = result[(Math.floor(Math.random() * result.length))].properties.id//Select random supermarket id
                rand_price = (Math.floor((Math.random()*5)* 100 + 1)/100) //Create a random price 
                rand_date = daylabels[(Math.floor(Math.random() * daylabels.length))] //Select a random date
            
                console.log(rand_super)

                //Create new offer_id 
                let id_string = rand_super.concat(rand_user, prod_id)

                //Search offers for that offer_id
                SupermarketM.find({'offers.id':id_string}).then(result => {
                    //If it doesnt exist 
                    if(result == ""){
                        //Add the new offer to the Database
                        SupermarketM.updateOne({'properties.id': rand_super}, {$push: {offers: {
                            id: id_string,
                            username: rand_user,
                            product: rand_product,
                            price: rand_price,
                            date: rand_date, 
                            likes: 0,
                            dislikes: 0,
                            available: true,
                            reqDay: false,
                            reqWeek: false,
                            secondWeek: false
                        }}}).then(result => {
                            console.log(result)
                        }).catch((err) =>{
                            console.log(err);
                        })
                    //Else print Error
                    }else{
                        console.log("Error")
                    }
                })
            }

        }).catch((err) =>{
            console.log(err);
        })
    })).catch((err) =>{
        console.log(err);
    })
})
 .catch((err) =>{
    console.log(err);
})

