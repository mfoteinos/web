const express = require('express');

//const controllers = ;


const router = express.Router();


router.delete('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
})

module.export = router;