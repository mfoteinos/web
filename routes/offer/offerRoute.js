const express = require('express');
const SupermarketM = require('./models/supermarket');
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

router.get('/review_offer/:id', checkAuthenticated, (req,res) => {

    console.log(req.params.id)
    SupermarketM.find({ 'properties.id': req.params.id }).then((result) =>{
        console.log(result[0])
        res.render('review_offer', {reviewedsup:result[0]})
    }).catch((err) =>{
        console.log(err);
    })

});


router.post('/like/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'properties.offers':{$elemMatch:{id:req.params.id}}}, {$inc: { 'properties.offers.$.likes': 1}}).then((result) =>{
        console.log("nice")
        console.log(result)
    }).catch((err) =>{
        console.log(err);
    })

});

router.post('/dislike/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'properties.offers':{$elemMatch:{id:req.params.id}}}, {$inc: { 'properties.offers.$.dislikes': 1}}).then((result) =>{
        console.log("nice")
        console.log(result)
    }).catch((err) =>{
        console.log(err);
    })

});

router.post('/available/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'properties.offers':{$elemMatch:{id:req.params.id}}}, {$set: { 'properties.offers.$.available': false}}).then((result) =>{
        console.log("nice")
        console.log(result)
    }).catch((err) =>{
        console.log(err);
    })

});




module.export = router;