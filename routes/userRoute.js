const express = require('express');
const SupermarketM = require('./models/supermarket');

//const controllers = ;


const router = express.Router();

router.get('/user_home', checkAuthenticated, (req,res) => {


    SupermarketM.find({ 'properties.offers':  { $size: 0 } }).lean(true)
    .then((result) => {
        var gjNoOfferSups = result;
        SupermarketM.find({ 'properties.offers':  { $not: {$size: 0} } }).lean(true)
        .then((result) => {
            var gjOfferSups = result;
            //console.log(gjNoOfferSups[0]);
            //console.log(gjOfferSups[0]);
            res.render('user_home', {gjNoOfferSups,gjOfferSups});
        })
        .catch((err) =>{
            console.log(err);
        })
     })
    .catch((err) =>{
        console.log(err);
    })

});



module.export = router;