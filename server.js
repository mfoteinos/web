if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}



const express = require('express');
const flash = require('express-flash');
const session = require('express-session');
//const _ = require('lodash');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const passport = require('passport')
const methodOverride = require('method-override')
const UserM = require('./models/user');
const SupermarketM = require('./models/supermarket');
const Categ_Sub = require('./models/Categ_Subcateg')
const Product = require('./models/product')
const fs = require('fs');




const app = express();

const db_url = 'mongodb+srv://xrhsthsthsvashs:ZJgAlDrKedPXkUUZ@cluster0.eixd381.mongodb.net/Data?retryWrites=true&w=majority';
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true} )
.then((result) => console.log('connected to database'))
.catch((err) => console.log(err))

app.set('view engine', 'ejs')

const initializePassport = require('./passport-config');
initializePassport(
    passport, 
    username => UserM.find({'username':username}),
    id => UserM.findById(id)
);


function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.redirect('/')
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/user_home')
    }

    next()
}

let allSupermarkets;

fs.readFile('export.geojson', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    data = JSON.parse(data)
    data = data.features.filter(feature => feature.properties.name != null && feature.properties.name != "No supermarket" )
    allSupermarkets = JSON.stringify(data)
  });

app.listen(3000);


console.log(__dirname)

app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))


app.get('/', checkNotAuthenticated, (req,res) => {
    res.render('index');

});

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/user_home',
    failureRedirect: '/',
    failureFlash: true
}))

app.post('/register', checkNotAuthenticated, async (req,res) => {
    const new_user = new UserM(req.body);
    new_user.password = await bcrypt.hash(req.body.password, 10)
    new_user.save()
        .then( () => {
            console.log("logged in");
        })
        .catch((err) => {
            console.log(err);
        })
});

app.delete('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
})

app.get('/user_home', checkAuthenticated, (req,res) => {


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


app.get('/add_offer/:id', checkAuthenticated, (req,res) => {

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

app.post('/add_offer', checkAuthenticated, (req,res) => {
    
    console.log(req.body )

});


app.get('/user_profile', checkAuthenticated, (req,res) => {
    res.render('user_profile', {name:req.user.username});

});

app.put('/user_profile_username', checkAuthenticated, (req,res) => {
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

app.put('/user_profile_password', checkAuthenticated, async (req,res) => {
    UserM.findOneAndUpdate({'username':req.user.username}, {'password': await bcrypt.hash(req.body.password, 10)})
    .then( () => {
        req.user.password = bcrypt.hash(req.body.password, 10)
        console.log("changed password");
    })
    .catch((err) => {
        console.log(err);
    })
    res.redirect('/user_profile');
});

app.use((req,res) => {

    res.status(404).render('404');

});