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
const { render } = require('ejs');
const { result } = require('lodash');
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
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
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
    let today = "8/14/2023"
    let week = new Date();
    week.setDate(week.getDate() - 7)

    let likes = 0
    let dislikes = 0

    SupermarketM.find({'offers.username': req.user.username}).then(result =>{
        result.forEach(element => {
            for(x of element.offers){
                if(x.username == req.user.username){
                    likes += x.likes
                    dislikes += x.dislikes
                }
            }
     })

     let sum_points = 5 * likes + (-1) * dislikes

     if(sum_points <= 0){
        UserM.updateOne({'username': req.user.username}, {'points': 0}).then(result =>{
            console.log(result)  
        })
     }else{
        UserM.updateOne({'username': req.user.username}, {'points': sum_points}).then(result =>{
            console.log(result)  
     }) 
     }
    })

    

   SupermarketM.updateMany({}, {$pull: {offers: {date: week.toLocaleDateString()}}}).then(result => {
    SupermarketM.find({'offers':  { $size: 0 } }).lean(true)
    .then((result) => {
        var gjNoOfferSups = result;
        SupermarketM.find({'offers':  { $not: {$size: 0} } }).lean(true)
        .then((result) => {
            var gjOfferSups = result;
            Categ_Sub.find().then((result) =>{
                var ctg_name = result
                Product.find().then((ressult) => {
                    var prod = ressult
                    res.render('user_home', {gjNoOfferSups, gjOfferSups, ctg_name, prod})
                }).catch((err) =>{
                    console.log(err);
                })
            }).catch((err) =>{
                console.log(err);
            })
        })
        .catch((err) =>{
            console.log(err);
        })
     })
    .catch((err) =>{
        console.log(err);
    })
    }).catch((err) =>{
    console.log(err);
    })

});


app.get('/add_offer/:id', checkAuthenticated, (req,res) => {

    var Sup_id = req.params.id
    Categ_Sub.find().then((result) =>{
        var ctg_name = result
        Product.find().then((result) =>{
            var product = result 
            res.render('add_offer', {ctg_name, product, Sup_id})
        }).catch((err) =>{
            console.log(err);
        })
    }).catch((err) =>{
        console.log(err);
    })

});


app.post('/add_offer', checkAuthenticated, (req,res) => {

    let today = new Date().toLocaleDateString();
    console.log(req.body)




    SupermarketM.updateOne({'properties.id': req.body.Sup_id}, {$push: {offers: {id:(req.body.Sup_id.slice(5)), username:req.user.username, product:req.body.product, 
        price:req.body.new_value, date:today,likes:0, dislikes:0, available:true }}}).then(result => {
        res.redirect('/user_home')
       }).catch((err) =>{
            console.log(err);
    })

    
    

});


app.get('/review_offer/:id', checkAuthenticated, (req,res) => {

    console.log(req.params.id)
    SupermarketM.find({ 'properties.id': req.params.id }).then((result) =>{
        console.log(result[0])
        res.render('review_offer', {reviewedsup:result[0]})
    }).catch((err) =>{
        console.log(err);
    })

});

app.post('/like/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'offers':{$elemMatch:{id:req.params.id}}}, {$inc: { 'offers.$.likes': 1}}).then((result) =>{
        console.log("nice")
        console.log(result)
    }).catch((err) =>{
        console.log(err);
    })

});

app.post('/dislike/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'offers':{$elemMatch:{id:req.params.id}}}, {$inc: { 'offers.$.dislikes': 1}}).then((result) =>{
        console.log("nice")
        console.log(result)
    }).catch((err) =>{
        console.log(err);
    })

});

app.post('/available/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'offers':{$elemMatch:{id:req.params.id}}}, {$set: { 'offers.$.available': false}}).then((result) =>{
        console.log("nice")
        console.log(result)
    }).catch((err) =>{
        console.log(err);
    })

});


app.get('/user_profile', checkAuthenticated, (req,res) => {
    SupermarketM.find({'offers.username': req.user.username}).then(result =>{

        let offers = []
        result.forEach(element =>{
            for(const x of element.offers){
                if(x.username == req.user.username){
                    offers.push(x)
                }
            }
        })
        res.render('user_profile', {name:req.user.username, offers});
    })


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