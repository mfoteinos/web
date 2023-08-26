const express = require('express');

//const controllers = ;


const router = express.Router();


router.get('/user_profile', checkAuthenticated, (req,res) => {
    res.render('user_profile', {name:req.user.username});

});



module.export = router;