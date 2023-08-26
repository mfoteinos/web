const express = require('express');
const Categ_Sub = require('./models/Categ_Subcateg');
const Product = require('./models/product')
//const controllers = ;


const router = express.Router();



router.get('/add_offer/:id', checkAuthenticated, (req,res) => {

    console.log(req.params.id)
    Categ_Sub.find().then((result) =>{
        var ctg_name = result
        Product.find().then((result) =>{
            var product = result 
            res.render('add_offer', {ctg_name, product})
        }).catch((err) =>{
            console.log(err);
        })
    }).catch((err) =>{
        console.log(err);
    })

});

router.post('/add_offer', checkAuthenticated, (req,res) => {
    
    console.log(req.body )

});

module.export = router;