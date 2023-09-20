if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}



const express = require('express');
const flash = require('express-flash');
const session = require('express-session');
//
const multer = require('multer')
const cors = require('cors')
//
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const passport = require('passport')
const methodOverride = require('method-override')
const UserM = require('./models/user');
const SupermarketM = require('./models/supermarket');
const Categ_Sub = require('./models/Categ_Subcateg')
const Product = require('./models/product')
const TokenM = require('./models/tokens')
const fs = require('fs');

const cron = require("node-cron");




const app = express();

const db_url = 'mongodb+srv://xrhsthsthsvashs:ZJgAlDrKedPXkUUZ@cluster0.eixd381.mongodb.net/Data?retryWrites=true&w=majority';
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true} )
.then((result) => console.log('connected to database'))
.catch((err) => console.log(err))

app.set('view engine', 'ejs')

const initializePassport = require('./passport-config');
const { render } = require('ejs');
const { result, fromPairs } = require('lodash');
const path = require('path');
const ProductM = require('./models/product');
initializePassport(
    passport, 
    username => UserM.find({'username':username}),
    id => UserM.findById(id)
);

//"*/15 * * * * *" for every 15 seconds

//"0 0 1 * *" for every month seconds

// 0 0 28-31 * * [ “$(date +\%d -d tomorrow)” = “01” ]

cron.schedule("0 0 1 * *", function () {
    let tokens = 100
    UserM.updateMany({}, {$set: { 'monthpoints': 0}}).then(() =>{
        UserM.count({}).then(count => {
            tokens = tokens * count
            TokenM.updateOne({'id': 0}, {$inc: { 'tokens': tokens}}).then(() =>{
                console.log("Added " + tokens + " tokens to the token bank.")
            }).catch((err) =>{
                console.log(err);
            })
        })
    }).catch((err) =>{
        console.log(err);
    })

});

cron.schedule("0 0 28-31 * *", function () {
    let test_mode = false
    let dateTomorrow = new Date();
    dateTomorrow.setDate(dateTomorrow.getDate() + 1)
    if (dateTomorrow.getDate() == 1 || test_mode) {
        TokenM.find({'id':0}).then((result) =>{
            dist_tokens = Math.round(result[0].tokens * 0.8)
            console.log(dist_tokens + " tokens to be distributed.")
            UserM.find({}).then( (result) => {
                let sum = 0
                for (user of result){
                    sum += user.monthpoints
                }
                if (sum > 0) {
                    for (user of result){
                        let user_percent = (user.monthpoints / sum)
                        let user_tokens = Math.round(dist_tokens * user_percent)
                        UserM.updateOne({'username': user.username}, {$inc: { 'tokens': user_tokens}, $set: { 'monthtokens': user_tokens}}).then(() =>{
                        }).catch((err) =>{
                            console.log(err);
                        })
                    }
                    TokenM.updateOne({'id': 0}, {$inc: { 'tokens': -dist_tokens}}).then(() =>{
                        console.log("Removed " + dist_tokens + " tokens from the token bank.")
                    }).catch((err) =>{
                        console.log(err);
                    })
                } else {
                    console.log("Total month points <= 0, can't distribute tokens")
                }
            })
            .catch((err) => {
                console.log(err);
        })
        
        }).catch((err) =>{
            console.log(err);
        })
    }
});

cron.schedule("0 0 * * * *", function () {
    let date_ob = new Date();
    date_ob.setDate(date_ob.getDate() - 7)
    let day = date_ob.getDate();
    let month = date_ob.getMonth() + 1;
    let week = [date_ob.getFullYear() + '-',(month>9 ? '' : '0') + month + '-',(day>9 ? '' : '0') + day].join('');

    let date = new Date();
    date.setDate(date.getDate() - 14)
    let day1 = date.getDate();
    let month1 = date.getMonth() + 1;
    let second_week = [date.getFullYear() + '-',(month1>9 ? '' : '0') + month1 + '-',(day1>9 ? '' : '0') + day1].join('');


    SupermarketM.find({'offers.date': {$lte: week}}).then((result) =>{

        let offerlist = []

        for (superm of result){
            for (offer of superm.offers){
                if (offer.date <= week){
                    offerlist.push(offer);
                }
            }
        }

        //console.log(offerlist)
        //console.log(week, second_week)

        offerlist.forEach(element => {
            if(element.date <= week && element.secondWeek == false){
                Product.find({'name': element.product}).then(result =>{

                    let req_Day = false
                    let req_Week = false
                   
                    if(element.price <= 0.8*result[0].prices[0].price){
                        req_Day = true
                    }
                    if(element.price <= 0.8*result[0].prices[0].avg_price){
                        req_Week = true
                    }
                    if(req_Day == false && req_Week == false){
                        SupermarketM.updateOne({'offers': {$elemMatch:{id: element.id}}}, {$pull: { offers: {id:element.id} }}).then((result) =>{
                            console.log(result)
                        }).catch((err) =>{
                            console.log(err);
                        })
                    }else{
                        SupermarketM.updateOne({'offers': {$elemMatch:{id: element.id}}}, {$set: {offers:{id:element.id, username:element.username, product:element.product, 
                            price:element.prise, date:element.date,likes:element.likes, dislikes:element.dislikes, available:element.available, reqDay: element.reqDay, reqWeek: element.reqWeek, secondWeek: true}}}).then((result) =>{
                            console.log(result)
                        }).catch((err) =>{
                            console.log(err);
                        })
                    }
                })
            }else if(element.date <= second_week){
                SupermarketM.updateOne({ 'offers':{$elemMatch:{id: element.id}}}, {$pull: { offers: {id:element.id} }}).then((result) =>{
                    console.log(result)
                }).catch((err) =>{
                    console.log(err);
                })
            }
        })


    })
})



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

function checkAdmin(req, res, next) {
    if (req.user.admin == true) {
        return next()

    }

    res.redirect('/user_home')
}

function checkNotAdmin(req, res, next) {
    if (req.user.admin == true) {
        return res.redirect('/admin_home')
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
app.use(express.json());
app.use(cors())



const storage = multer.diskStorage({
    destination: function(req, res, callback){
        callback(null, __dirname + "/products")
    },
    filename: function(req, file, callback){
        callback(null, file.originalname)
    }
})

const categ = multer.diskStorage({
    destination: function(req, res, callback){
        callback(null, __dirname + "/categories")
    },
    filename: function(req, file, callback){
        callback(null, file.originalname)
    }
})

const price = multer.diskStorage({
    destination: function(req, res, callback){
        callback(null, __dirname + "/prices")
    },
    filename: function(req, file, callback){
        callback(null, file.originalname)
    }
})

const supermarket = multer.diskStorage({
    destination: function(req, res, callback){
        callback(null, __dirname + "/supermarket")
    },
    filename: function(req, file, callback){
        callback(null, file.originalname)
    }
})

const products = multer({storage: storage})
const categories = multer({storage: categ})
const prices = multer({storage: price})
const supermarkets = multer({storage: supermarket})


app.get('/', checkNotAuthenticated, (req,res) => {
    res.render('index');

});

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {

    failureRedirect: '/',
    failureFlash: true
}), function(req, res) {
        if (req.user.admin==true) {
                res.redirect("/admin_home");
        }
        else {
            res.redirect("/user_home");
    }
  });

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

app.get('/user_home', checkAuthenticated, checkNotAdmin, (req,res) => {

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

});


app.get('/add_offer/:id', checkAuthenticated, (req,res) => {

    //Get the Supermarket id of the Supermarket you add the offer
    var Sup_id = req.params.id
    //Find Categories/Subcategories from the Database
    Categ_Sub.find().then((result) =>{
        var ctg_name = result
        //Find the Products from the Database
        Product.find().then((result) =>{
            var product = result 
            //Render the add offer and send to the page the categories, subctegories, procucts, and the Supermartket id of which Supermartket you add the offer
            res.render('add_offer', {ctg_name, product, Sup_id})
        }).catch((err) =>{
            console.log(err);
        })
    }).catch((err) =>{
        console.log(err);
    })
});


app.post('/add_offer', checkAuthenticated, (req,res) => {


    let tempArray = req.body.product.split('|')
    
    let product_name = tempArray[0]

    let product_id = tempArray[1]

    var date_ob = new Date();

    var day = date_ob.getDate();

    var month = date_ob.getMonth() + 1;

    let today = [date_ob.getFullYear() + '-',(month>9 ? '' : '0') + month + '-',(day>9 ? '' : '0') + day].join('');
    



    let id_string = req.body.Sup_id.concat(req.user.username, product_id)

    var offer = []
    SupermarketM.find({'properties.id': req.body.Sup_id}, {'offers':1}).then(result => {
        result.forEach(element => {
            for(x of element.offers){
                if(x.product == product_name){
                    offer.push(x)
                }
            }
        })
        let req_Day = false
        let req_Week = false
        let second_week = false
        if(offer == ""){

            Product.find({'name': product_name}).then(result =>{
               
                if(req.body.new_value <= 0.8*result[0].prices[0].price){
                    req_Day = true
                }
                if(req.body.new_value <= 0.8*result[0].prices[0].avg_price){
                    req_Week = true
                }
                if(!(req.body.new_value <= result[0].prices[0].price) && !(req.body.new_value <= result[0].prices[0].avg_price)){
                    res.send(`<div> 
                    <form action="/user_home" method="get">
                    <label for="Add">Η προσφόρα που προτείνατε έχει τιμή μεγαλύτερη των σημερινών και εβδομαδιαίων τιμών, οπότε δεν εγκρίθηκε</label>
                    <button>Return Home</button>
                    </form>
                    <div>
                    `)
                    return
                }
                SupermarketM.updateOne({'properties.id': req.body.Sup_id}, {$push: {offers: {id:id_string, username:req.user.username, product:product_name, 
                    price:req.body.new_value, date:today,likes:0, dislikes:0, available:true, reqDay: req_Day, reqWeek: req_Week}}}).then(result => {
                        var points = 0
                        if(req_Day){
                            points += 50
                        }
                        if(req_Week){
                            points += 20
                        }
                        if(points > 0){
                            UserM.updateOne({'username':  req.user.username}, {$inc: { 'points': points, 'monthpoints': points}}).then((result) =>{
                            }).catch((err) =>{
                                console.log(err);
                            })
                        }
                    //res.redirect('/user_home')
                    res.send(`<div> 
                    <form action="/user_home" method="get">
                    <label for="Add">Η προσφορά προστέθηκε</label>
                    <p>Λάβατε ${points} Πόντους</p>
                    <button>Return Home</button>
                    </form>
                    <div>
                    `)
                    }).catch((err) =>{
                        console.log(err);
                })
            }).catch((err) =>{
                console.log(err);
        })
        }else if(offer[0].price*0.8 >= req.body.new_value){
            
            Product.find({'name': product_name}).then(result =>{
                if(req.body.new_value <= 0.8*result[0].prices[0].price){
                    req_Day = true
                }
                if(req.body.new_value <= 0.8*result[0].prices[0].avg_price){
                    req_Week = true
                }
                SupermarketM.updateOne({'properties.id': req.body.Sup_id}, {$pull: {offers: {id:offer[0].id_string, username:offer[0].username, product:offer[0].product, 
                    price:offer[0].new_value, date:offer[0].date,likes:offer[0].likes, dislikes:offer[0].dislikes, available:offer[0].available, reqDay: offer[0].reqDay, reqWeek: offer[0].reqDay, secondWeek: offer[0].second_week}}}).then(result => {
                        SupermarketM.updateOne({'properties.id': req.body.Sup_id}, {$push: {offers: {id:id_string, username:req.user.username, product:product_name, 
                            price:req.body.new_value, date:today,likes:0, dislikes:0, available:true, reqDay: req_Day, reqWeek: req_Week, secondWeek: second_week}}}).then(result => {
                            let points = 0
                            if(req_Day){
                                points += 50
                            }
                            if(req_Week){
                                points += 20
                            }
                            if(points > 0){
                                UserM.updateOne({'username': req.user.username}, {$inc: { 'points': points, 'monthpoints': points}}).then((result) =>{
                                }).catch((err) =>{
                                    console.log(err);
                                })
                            }
                                //res.redirect('/user_home')
                                res.send(`<div> 
                                <form action="/user_home" method="get">
                                <label for="Add">Η προσφορά προστέθηκε</label>
                                <p>Λάβατε ${points} πόντους</p>
                                <button>Return Home</button>
                                </form>
                                <div>
                                `)
                                }).catch((err) =>{
                                    console.log(err);
                            })
                    }).catch((err) =>{
                        console.log(err);
                })
            }).catch((err) =>{
                console.log(err);
        })
        }else{
            //res.redirect('/user_home')
            res.send(`<div> 
            <form action="/user_home" method="get">
            <label for="Add">Η προσφόρα που προτείνατε δεν είναι 20% μικρότερη από την τρέχουσα προσφόρα για αυτό το προϊόν, οπότε δεν εγκρίθηκε</label>
            <button>Return Home</button>
            </form>
            <div>
            `)
        }
    })
});


app.get('/review_offer/:id', checkAuthenticated, (req,res) => {

    // console.log(req.params.id)
    SupermarketM.find({ 'properties.id': req.params.id }).then((result) =>{
        let reviewedsup = result
        let userpoints = []
        let offerusernames = []
        for (offer of reviewedsup[0].offers){
            offerusernames.push(offer.username)
        }
        UserM.find({'username': {$in: offerusernames}}).then((result) =>{
            console.log(result)
            for (user of result){
                userpoints.push({"id": user.username, "points": user.points})
            }
            UserM.find({'username': req.user.username}).then((result) =>{
                res.render('review_offer', {reviewedsup:reviewedsup[0], userpoints, likedoffers:result[0].likedoffers, dislikedoffers:result[0].dislikedoffers, admin:req.user.admin})
            }).catch((err) =>{
                console.log(err);
            })
            }).catch((err) =>{
                console.log(err);
            })
    }).catch((err) =>{
        console.log(err);
    })

});

app.post('/like/:supid/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'offers':{$elemMatch:{id:req.params.id}}}, {$inc: { 'offers.$.likes': 1}}).then((result) =>{
console.log(req.body.offeruser)
        UserM.updateOne({'username': req.user.username}, {$push: {likedoffers: req.params.id}}).then((result) =>{
            res.redirect('/review_offer/' + req.params.supid)
            UserM.updateOne({'username': req.body.offeruser}, {$inc: { 'points': 5, 'monthpoints': 5}}).then((result) =>{
            }).catch((err) =>{
                console.log(err);
            })
        }).catch((err) =>{
            console.log(err);
        })
            }).catch((err) =>{
        console.log(err);
    })

});

app.post('/dislike/:supid/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'offers':{$elemMatch:{id:req.params.id}}}, {$inc: { 'offers.$.dislikes': 1}}).then((result) =>{
        UserM.updateOne({'username': req.user.username}, {$push: {dislikedoffers: req.params.id}}).then((result) =>{
            res.redirect('/review_offer/' + req.params.supid)
            UserM.updateOne({'username': req.body.offeruser, "monthpoints": { $gt: 0 }}, {$inc: { 'points': -1, 'monthpoints': -1}}).then((result) =>{
            }).catch((err) =>{
                console.log(err);
            })
        }).catch((err) =>{
            console.log(err);
        })
    }).catch((err) =>{
        console.log(err);
    })

});

app.post('/available/:supid/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'offers':{$elemMatch:{id:req.params.id}}}, {$set: { 'offers.$.available': true}}).then((result) =>{
        res.redirect('/review_offer/' + req.params.supid)
        console.log(result)
    }).catch((err) =>{
        console.log(err);
    })

});

app.post('/unavailable/:supid/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'offers':{$elemMatch:{id:req.params.id}}}, {$set: { 'offers.$.available': false}}).then((result) =>{
        res.redirect('/review_offer/' + req.params.supid)
        console.log(result)
    }).catch((err) =>{
        console.log(err);
    })

});

app.post('/delete/:supid/:id', checkAuthenticated, checkAdmin, (req,res) => {

    SupermarketM.updateOne({ 'offers':{$elemMatch:{id:req.params.id}}}, {$pull: { offers: {id:req.params.id} }}).then((result) =>{
        res.redirect('/review_offer/' + req.params.supid)
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
        UserM.find({'username': req.user.username}).then((result) =>{
            let prof_user = result[0];
            let liked_history = [];
            let disliked_history = [];
            let union = [...new Set([...prof_user.likedoffers, ...prof_user.dislikedoffers])];
            SupermarketM.find({'offers.id': {$in: union}}).then((result) =>{
                for (superm of result){
                    for (offer of superm.offers){
                        if (prof_user.likedoffers.includes(offer.id)){
                            liked_history.push(offer); // sosto????
                        }
                        if (prof_user.dislikedoffers.includes(offer.id)){
                            disliked_history.push(offer); // sosto????
                        }
                        // liked_history.sort((a, b) => (a.color > b.color) ? 1 : -1) // otan prostethoun alles hmeromhnies review (+ ola ta offers panw)
                        // disliked_history.sort((a, b) => (a.color > b.color) ? 1 : -1)
                }
                }
                res.render('user_profile', {name:req.user.username, offers, user:prof_user, liked_history, disliked_history});
            }).catch((err) =>{
                console.log(err);
            })
        }).catch((err) =>{
            console.log(err);
        })
    }).catch((err) =>{
        console.log(err);
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

app.get('/admin_home', checkAuthenticated, checkAdmin, (req,res) => {

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
                    res.render('admin_home', {gjNoOfferSups, gjOfferSups, ctg_name, prod})
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

});

app.get('/leaderboard', checkAuthenticated, checkAdmin, (req,res) => {
    
    UserM.find({}).sort({points:-1})
    .then( (result) => {
        res.render('leaderboard', {userscores:result})
    })
    .catch((err) => {
        console.log(err);
    })


});

app.get('/add_product', checkAuthenticated, checkAdmin, (req,res) => {

    res.render('add_product')
});

app.get('/add_categories', checkAuthenticated, checkAdmin, (req,res) => {

    res.render('add_categories')
});

app.get('/add_prices', checkAuthenticated, checkAdmin, (req,res) => {

    res.render('add_prices')
});

app.get('/add_supermarket', checkAuthenticated, checkAdmin, (req,res) => {

    res.render('add_supermarket')
});


app.post('/add_product', checkAuthenticated, checkAdmin, products.array("files"), (req,res) => {

    fs.readFile('products/Data.products.json', 'utf8', (err, product) => {
        if (err) {
          console.error(err);
          return
        }
        product = JSON.parse(product);

        fs.readFile('categories/Data.categ_subcs.json', 'utf8', (err, cat_subs) => {
            if (err) {
              console.error(err);
              res.jsonp({ error: 'Categories Not Found' })
              return
            }
            cat_subs = JSON.parse(cat_subs);

            let prod = []
        
            for(x of cat_subs){
                for(y of product.products){
                    for(k of x.subcategories){
                            if(x.id == y.category && k.uuid == y.subcategory ){
                                prod.push(y)
                        } 
                }
            }
         }
            

         
               prod.forEach(element => {
                Product.find({'name': element.name}).then(result => {
                    if(result == ""){
                        temp = new Product({id: element.id, name:element.name, category: element.category, subcategory: element.subcategory})
                        Product.collection.insertOne(temp, (err) => {
                            if(err)
                            {
                            return res.jsonp({ error: 'Error' })
                            }else {
                            console.info('successfully stored.');
                            }
                        })
                    }else{
                        Product.updateOne({'name': element.name}, {id: element.id, name:element.name, category: element.category, subcategory: element.subcategory}).then(result =>{
                            console.log(result)
                        }).catch((err) =>{
                            res.jsonp({ error: 'Error' })
                            console.log(err);
                        })
                    }
                })
            })







         })
    })
})

app.post('/delete_products', checkAuthenticated, checkAdmin, (req,res) =>{
    Product.deleteMany({}).then(result => {
        console.log(result)
    }).catch((err) =>{
        console.log(err);
    })

})


app.post('/add_categories_subcat', checkAuthenticated, checkAdmin, categories.array("Categ"), (req,res) => {

    fs.readFile('categories/Data.categ_subcs.json', 'utf8', (err, cat_subs) => {
        if (err) {
          console.error(err);
          return;
        }
        cat_subs = JSON.parse(cat_subs);

        let temp = 0
        let tempArray = [];

        cat_subs.forEach(element => {
            Categ_Sub.find({'name': element.name}).then(result => {
                if(result == ""){
                    temp = new Categ_Sub({
                        id: element.id,
                        name: element.name,
                        subcategories: element.subcategories
                    })

                    Categ_Sub.collection.insertOne(temp, (err) => {
                        if(err)
                        {
                          return res.jsonp({ error: 'Error' })
                        }
                        else {
                          console.info('successfully stored.')
                      }
                      })
                }else{
                    Categ_Sub.updateOne({'name': element.name}, {id: element.id, name:element.name,  subcategories: element.subcategories}).then(result =>{
                        console.log(result)
                    }).catch((err) =>{
                        res.jsonp({ error: 'Error' })
                        console.log(err);
                    })

                }
            })
        })
    })

    return  res.jsonp({ error: 'Done' })
})

app.post('/delete_categories', checkAuthenticated, checkAdmin, (req,res) => {
    Categ_Sub.deleteMany({}).then(result => {
        console.log(result)
        res.redirect('admin_home')
    }).catch((err) =>{
        console.log(err);
    })
})

app.post('/add_product_prices', checkAuthenticated, checkAdmin, prices.array("Price"), (req,res) => {
    fs.readFile('prices/Prices.json', 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        data = JSON.parse(data);
        console.log(data)

        data.forEach(element => {
            let i = 0
                Product.updateOne({'name': element.name}, { $set: { prices : element.prices}}).then(result => {
                    console.log(result)
                   }).catch((err) =>{
                        console.log(err);
                })
            
         })
        
    })

})

app.post('/add_supermarket', checkAuthenticated, checkAdmin, supermarkets.array("files"), (req,res) => {
    fs.readFile('supermarket/export.geojson', 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
      
        data = JSON.parse(data);
        data = data.features.filter(feature => feature.properties.name != null && feature.properties.name != "No supermarket");
        data = data.filter(feature => feature.geometry.type != undefined && feature.geometry.type != "Polygon" );
        let tempArray = [];
        let i = 0
        let temp = 0
        let today = new Date();
        today = today.toLocaleDateString()
        data.forEach(element => {
          // console.log(element)
      
          i = Math.floor(Math.random() * 2)
          if (i % 2 == 0){
            temp = new SupermarketM({
              type:element.type,
              properties: {id:(element.id.slice(5)),name:element.properties.name},
              offers: [{id: (element.id.slice(5)),username:"Dusk",product: "Μπάμιες",price: 1000,date: today,likes: 100, dislikes: 0,available: true, reqDay: true, reqWeek: true}],
              geometry: {type:element.geometry.type, coordinates:element.geometry.coordinates}
            });
          }
          else {
            temp = new SupermarketM({
              type:element.type,
              properties: {id:(element.id.slice(5)),name:element.properties.name},
              offers: [],
              geometry: {type:element.geometry.type, coordinates:element.geometry.coordinates}
            });
          }
      
          tempArray.push(temp)
        });
        
      SupermarketM.collection.insertMany(tempArray, (err) => {
      
          if(err)
          {
            return res.jsonp({ error: 'Error' })
          }
          else {
            console.info('supermarkets were successfully stored.')
            res.jsonp({ error: 'Done' })
        }
        })
      });
})

app.post('/delete_supermarket', checkAuthenticated, checkAdmin, (req,res) => {
    SupermarketM.deleteMany({}).then(result => {
        console.log(result)
        res.redirect('admin_home')
    }).catch((err) =>{
        console.log(err);
    })
})

app.get('/statistics', checkAuthenticated, checkAdmin, (req,res) => {

    if(req.query.date){
        var month = req.query.date.substring(5,7);

        var year = req.query.date.substring(0,4);
    } else {
        var date_ob = new Date();
        // current month
        var month = date_ob.getMonth() + 1;
        month = (month>9 ? '' : '0') + month;

        // current year
        var year = date_ob.getFullYear();
    }

    // console.log(month)

    // console.log(year)


    let startDate = year + "-" + month + "-01";

    let lastday = new Date(year,month,0).getDate()

    // console.log("lastday:" + lastday)

    let endDate = year + "-" + month + '-' + lastday;

    let monthlabels = new Array(lastday).fill('')

    for (var i = 0; i < monthlabels.length; i++) {
        if (i<9) {
            monthlabels[i] = year + "-" + month + "-" + "0" + (i+1);
        } else {
            monthlabels[i] = year + "-" + month + "-" + (i+1);
        }

    }

    // console.log(monthlabels)
    // console.log(endDate >= monthlabels[16])
    // console.log(endDate)

    offercount = new Array(lastday).fill(0);

    SupermarketM.find({'offers.date': {$gte: startDate,  $lte: endDate}}).then((result) =>{
        for (superm of result){
            for (offer of superm.offers){
                if (startDate <= offer.date && offer.date <= endDate){
                    offercount[offer.date.substring(8,10) - 1] += 1;
                }
        }
        console.log(offercount)
    }
    res.render('statistics', {startDate:startDate,endDate:endDate, offercount:offercount, monthlabels:monthlabels})
    }).catch((err) =>{
        console.log(err);
    })

});

app.get('/statistics_two', checkAuthenticated, checkAdmin, (req,res) => {



    Categ_Sub.find().then((result) =>{
        let ctg_name = result
        
        let category_list = []
        let subcategory_list = []

        for (cat of ctg_name) {
            category_list.push(cat.id)
            for (let i = 0; i < cat.subcategories.length; i++) {
                subcategory_list.push(cat.subcategories[i].uuid)
            }
        }

        console.log(subcategory_list)


        let today = new Date();

        let endday = new Date();

        let daysBack = 0;

        if(req.query.weeksback){
            daysBack = req.query.weeksback * 7;
        }


        if (req.query.category) {
            category_list = req.query.category;
            if (req.query.subcat)  {
                subcategory_list = req.query.subcat;
            }
        }



        let weeklabels = new Array(7).fill('')

        for (let i = 0; i < 7; i++) {

            let date_ob = new Date();

            let temp = new Date();
            
            temp.setDate(date_ob.getDate() - i - daysBack);
        
            let day = temp.getDate();

            let month = temp.getMonth() + 1;

            if (i==6) {
                endday = temp;
            }

            weeklabels[6 - i] = [temp.getFullYear() + '-',(month>9 ? '' : '0') + month + '-',(day>9 ? '' : '0') + day].join('');


        }

        console.log(weeklabels)
        

        const diffTime = Math.abs(endday - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        console.log(diffDays)


        let offerlist = [];
        let productlist = [];

        

        SupermarketM.find({'offers.date': {$gte: weeklabels[0],  $lte: weeklabels[6]}}).then((result) =>{
            for (let i = 0; i < weeklabels.length; i++) {
                let tempofferlist = []
                for (superm of result){
                    for (offer of superm.offers){
                        if (weeklabels[i] == offer.date ){
                            tempofferlist.push({"name": offer.product, "price": offer.price, "count": 1});
                            productlist.push(offer.product);
                            
                        }
                    }
                }
                offerlist.push(tempofferlist)
            }

            productlist = [...new Set(productlist)];

            // console.log(offerlist)

            // console.log("Productlist: ")
            // console.log(productlist)

            let discountlist = new Array(weeklabels.length).fill(0)
            let countlist = new Array(weeklabels.length).fill(0)

            Product.find({'name': {$in: productlist}, 'category': {$in: category_list}, 'subcategory': {$in: subcategory_list}}).then((result) =>{

                console.log("Voitheia")
                for (let i = 0; i < weeklabels.length; i++) {
                        for (let j = 0; j < offerlist[i].length; j++) {
                            if(result.find(({ name }) => name === offerlist[i][j].name)) {
                                let avg_price = result.find(({ name }) => name === offerlist[i][j].name).prices[diffDays - 6].avg_price
                                offerlist[i][j].price = (avg_price - offerlist[i][j].price) / avg_price
                            } else {
                                offerlist[i][j].price = 0
                            }
                        }
                }

                for (let i = 0; i < weeklabels.length; i++) {
                    for (let j = 0; j < offerlist[i].length; j++) {
                        discountlist[i] += offerlist[i][j].price
                        if (offerlist[i][j].price != 0) {
                            countlist[i] += 1
                        }
                    }
                }

                for (let i = 0; i < weeklabels.length; i++) {
                    if (countlist[i] != 0) {
                        discountlist[i] = Math.round((discountlist[i] / countlist[i]) * 100)
                    }
                }

                // console.log(discountlist)
                res.render('statistics_two', {startDate:weeklabels[0],endDate:weeklabels[6], discountlist:discountlist, weeklabels:weeklabels, ctg_name})
        
            
            }).catch((err) =>{
                console.log(err);
            })

            }).catch((err) =>{
                console.log(err);
            });
    }).catch((err) =>{
        console.log(err);
    })
    

});


app.use((req,res) => {

    res.status(404).render('404');

});