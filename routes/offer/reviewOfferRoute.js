const express = require('express');
const SupermarketM = require('./models/supermarket');
//const controllers = ;


const router = express.Router();



router.get('/review_offer/:id', checkAuthenticated, (req,res) => {

    console.log(req.params.id)
    SupermarketM.find({ 'properties.id': req.params.id }).then((result) =>{
        console.log(result[0])
        res.render('review_offer', {reviewedsup:result[0]})
    }).catch((err) =>{
        console.log(err);
    })

});

module.export = router;