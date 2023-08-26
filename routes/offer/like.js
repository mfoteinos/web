const express = require('express');
const SupermarketM = require('./models/supermarket');
//const controllers = ;


const router = express.Router();

router.post('/like/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'properties.offers':{$elemMatch:{id:req.params.id}}}, {$inc: { 'properties.offers.$.likes': 1}}).then((result) =>{
        console.log("nice")
        console.log(result)
    }).catch((err) =>{
        console.log(err);
    })

});

module.export = router;