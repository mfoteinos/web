const fs = require('fs');
const mongoose = require('mongoose');
const SupermarketM = require('./models/supermarket');
const Product = require('./models/product')
const UserM = require('./models/user');

const db_url = 'mongodb+srv://xrhsthsthsvashs:ZJgAlDrKedPXkUUZ@cluster0.eixd381.mongodb.net/Data?retryWrites=true&w=majority';
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true} )
.then((result) => console.log('connected to database'))
.catch((err) => console.log(err))

SupermarketM.find({}).then((result) => {
    Product.find({}).then((product => {
        UserM.find({}).then((user) => {

            for (let index = 0; index < 2; index++) {

                let rand_product = 0
                let rand_super = 0
                let rand_user = 0
                let prod_id = 0
                let rand_price = 0
                let temp = 0

                rand_user = user[(Math.floor(Math.random() * user.length))].username
                console.log(rand_user);
                temp = (Math.floor(Math.random() * product.length))
                rand_product = product[temp].name
                prod_id = product[temp].id
                rand_super = result[(Math.floor(Math.random() * result.length))].properties.id
                rand_price = (Math.floor((Math.random()*5)* 100)/100) + 3
            
            console.log(rand_super)

                let id_string = rand_super.concat(rand_user, prod_id)

                var date_ob = new Date();

                var day = date_ob.getDate();

                var month = date_ob.getMonth() + 1;

                var today = [date_ob.getFullYear() + '-',(month>9 ? '' : '0') + month + '-',(day>9 ? '' : '0') + day].join('');

                SupermarketM.find({'offers.id':id_string}).then(result => {
                    if(result == ""){
                        SupermarketM.updateOne({'properties.id':rand_super}, {$push: {offers: {
                            id: id_string,
                            username: rand_user,
                            product: rand_product,
                            price: rand_price,
                            date: today, 
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
                        console.log("Error")
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

