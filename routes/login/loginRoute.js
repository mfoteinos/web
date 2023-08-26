const express = require('express');

//const controllers = ;


const router = express.Router();


router.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/user_home',
    failureRedirect: '/',
    failureFlash: true
}))


module.export = router;