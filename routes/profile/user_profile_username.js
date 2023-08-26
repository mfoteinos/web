const express = require('express');
const UserM = require('./models/user');
//const controllers = ;


const router = express.Router();




router.put('/user_profile_username', checkAuthenticated, (req,res) => {
    UserM.findOneAndUpdate({'username':req.user.username}, {'username':req.body.username})
    .then( () => {
        req.user.username = req.body.username
        console.log("changed username");
    })
    .catch((err) => {
        console.log(err);
    })
    res.redirect('/user_profile');
});






module.export = router;