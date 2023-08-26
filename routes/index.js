const express = require('express');

//const controllers = ;

const router = express.Router();

router.get('/', checkNotAuthenticated, (req,res) => {
    res.render('index');

});

module.export = router;