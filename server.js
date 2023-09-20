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


// Scheduled job that runs every first of the month to add new tokens to the token bank based on the number of registered users
cron.schedule("0 0 1 * *", function () {
    let tokens = 100
    UserM.updateMany({}, {$set: { 'monthpoints': 0}}).then(() =>{ // Reset current month points to 0 for every user
        UserM.count({}).then(count => {  // Find and count the number of registered users
            tokens = tokens * count
            TokenM.updateOne({'id': 0}, {$inc: { 'tokens': tokens}}).then(() =>{  // Calculate token number to be added and inc it
                console.log("Added " + tokens + " tokens to the token bank.")
            }).catch((err) =>{
                console.log(err);
            })
        })
    }).catch((err) =>{
        console.log(err);
    })

});

// Scheduled job that runs at last day of every month to add new tokens to the token bank based on the number of registered users
cron.schedule("0 0 28-31 * *", function () {
    let test_mode = false
    let dateTomorrow = new Date();
    dateTomorrow.setDate(dateTomorrow.getDate() + 1)  // Get tomorrow
    if (dateTomorrow.getDate() == 1 || test_mode) {  // If tomorrow is the first of the next month
        TokenM.find({'id':0}).then((result) =>{  // Find the tokens in the token bank
            dist_tokens = Math.round(result[0].tokens * 0.8)  // Take 80% of them
            console.log(dist_tokens + " tokens to be distributed.")
            UserM.find({}).then( (result) => {  // Find all useres
                let sum = 0
                for (user of result){  // Sum theirs points for this month
                    sum += user.monthpoints
                }
                if (sum > 0) {
                    for (user of result){  // Calculate the percentage each users points make up of the total an distribute that many tokens to them
                        let user_percent = (user.monthpoints / sum)
                        let user_tokens = Math.round(dist_tokens * user_percent)
                        UserM.updateOne({'username': user.username}, {$inc: { 'tokens': user_tokens}, $set: { 'monthtokens': user_tokens}}).then(() =>{
                        }).catch((err) =>{
                            console.log(err);
                        })
                    }
                    TokenM.updateOne({'id': 0}, {$inc: { 'tokens': -dist_tokens}}).then(() =>{  // Remove 80% of the tokens from the token bank
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

// Scheduled job that runs every day to check if offers need to be deleted
cron.schedule("0 0 * * * *", function () {
    // Get date of -1 week and -2 weeks from today
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


    SupermarketM.find({'offers.date': {$lte: week}}).then((result) =>{  // Find all offers with date > 1 week

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

        offerlist.forEach(element => { // Check every offer
            if(element.date <= week && element.secondWeek == false){ // If older than a week and not refreshed for a second one yet
                Product.find({'name': element.product}).then(result =>{

                    // Check requirements and if true refresh it for a second week else delete it
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
            }else if(element.date <= second_week){  // If older than 2 weeks, delete the offer
                SupermarketM.updateOne({ 'offers':{$elemMatch:{id: element.id}}}, {$pull: { offers: {id:element.id} }}).then((result) =>{
                    console.log(result)
                }).catch((err) =>{
                    console.log(err);
                })
            }
        })


    })
})


// Used to check if the user is authenticated whenever it's required to access a page
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {

        
        return next()
    }

    res.redirect('/')
}

// Used to check if the user is not authenticated whenever it's required to access a page
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/user_home')
    }

    next()
}
// Used to check if the user is an admin whenever it's required to access a page
function checkAdmin(req, res, next) {
    if (req.user.admin == true) {
        return next()

    }

    res.redirect('/user_home')
}

// Used to check if the user is not an admin whenever it's required to access a page
function checkNotAdmin(req, res, next) {
    if (req.user.admin == true) {
        return res.redirect('/admin_home')
    }

    next()
}

// Lister for requests on port 3000
app.listen(3000);


console.log(__dirname)

app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));
app.use(flash())
app.use(session({
    secret: 'sousou the cat',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))
app.use(express.json());
app.use(cors())


// Where to store the products file
const storage = multer.diskStorage({
    destination: function(req, res, callback){
        callback(null, __dirname + "/products")
    },
    filename: function(req, file, callback){
        callback(null, file.originalname)
    }
})

//Where to store the categories/subcategories file
const categ = multer.diskStorage({
    destination: function(req, res, callback){
        callback(null, __dirname + "/categories")
    },
    filename: function(req, file, callback){
        callback(null, file.originalname)
    }
})

//Where to store the prices file
const price = multer.diskStorage({
    destination: function(req, res, callback){
        callback(null, __dirname + "/prices")
    },
    filename: function(req, file, callback){
        callback(null, file.originalname)
    }
})

//Where to store the supermarket file
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


//Gets more resent fill that is uploaded to a specific directory
const getMostRecentFile = (dir) => {
    const files = orderReccentFiles(dir);
    return files.length ? files[0] : undefined;
  };
  
  const orderReccentFiles = (dir) => {
    return fs.readdirSync(dir)
      .filter((file) => fs.lstatSync(path.join(dir, file)).isFile())
      .map((file) => ({ file, mtime: fs.lstatSync(path.join(dir, file)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  };


// Render index page
app.get('/', checkNotAuthenticated, (req,res) => {
    res.render('index');

});

// Check input of login and if successful, authenticate the user.
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


// Register a new user with the inputs provided
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


// Logout
app.delete('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
})


// Render user home
app.get('/user_home', checkAuthenticated, checkNotAdmin, (req,res) => {

    SupermarketM.find({'offers':  { $size: 0 } }).lean(true) // Find all supermarkets with at least one offer
    .then((result) => {
        var gjNoOfferSups = result;
        SupermarketM.find({'offers':  { $not: {$size: 0} } }).lean(true) // Find all supermarkets with no offers
        .then((result) => {
            var gjOfferSups = result;
            Categ_Sub.find().then((result) =>{  // Find product categories for the filter dropdown menu
                var ctg_name = result
                Product.find().then((ressult) => {
                    var prod = ressult
                    res.render('user_home', {gjNoOfferSups, gjOfferSups, ctg_name, prod})  // Send all the info found above and render page
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


// Render add offer page
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

// Add an offer with the input provided
app.post('/add_offer', checkAuthenticated, (req,res) => {

    //Split product name from product id
    let tempArray = req.body.product.split('|')
    
    let product_name = tempArray[0]

    let product_id = tempArray[1]

    //Finds the current date
    var date_ob = new Date();

    var day = date_ob.getDate();

    var month = date_ob.getMonth() + 1;

    let today = [date_ob.getFullYear() + '-',(month>9 ? '' : '0') + month + '-',(day>9 ? '' : '0') + day].join('');
    
    //Product offer contains the Supermarket id, user name, and product id
    let id_string = req.body.Sup_id.concat(req.user.username, product_id)

    var offer = []
    //Find all offers of the supermarket that we want to add the offer  
    SupermarketM.find({'properties.id': req.body.Sup_id}, {'offers':1}).then(result => {
        result.forEach(element => {
            for(x of element.offers){
                //Find all the offers for the products we want to add
                if(x.product == product_name){
                    offer.push(x)
                }
            }
        })
        let req_Day = false
        let req_Week = false
        let second_week = false
        //If offer doesnt exist 
        if(offer == ""){
            //Check if offer can be added 
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
                //Add Offer to the supermarket
                SupermarketM.updateOne({'properties.id': req.body.Sup_id}, {$push: {offers: {id:id_string, username:req.user.username, product:product_name, 
                    price:req.body.new_value, date:today,likes:0, dislikes:0, available:true, reqDay: req_Day, reqWeek: req_Week}}}).then(result => {
                        //Check if user gets points for the offer
                        var points = 0
                        if(req_Day){
                            points += 50
                        }
                        if(req_Week){
                            points += 20
                        }
                        if(points > 0){
                            //Add points to User 
                            UserM.updateOne({'username':  req.user.username}, {$inc: { 'points': points, 'monthpoints': points}}).then((result) =>{
                            }).catch((err) =>{
                                console.log(err);
                            })
                        }
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
        //If Offer exists 
        }else if(offer[0].price*0.8 >= req.body.new_value){
            
            Product.find({'name': product_name}).then(result =>{
                if(req.body.new_value <= 0.8*result[0].prices[0].price){
                    req_Day = true
                }
                if(req.body.new_value <= 0.8*result[0].prices[0].avg_price){
                    req_Week = true
                }
                //Delete previous offer for the same product
                SupermarketM.updateOne({'properties.id': req.body.Sup_id}, {$pull: {offers: {id:offer[0].id_string, username:offer[0].username, product:offer[0].product, 
                    price:offer[0].new_value, date:offer[0].date,likes:offer[0].likes, dislikes:offer[0].dislikes, available:offer[0].available, reqDay: offer[0].reqDay, reqWeek: offer[0].reqDay, secondWeek: offer[0].second_week}}}).then(result => {
                        //Add New offer
                        SupermarketM.updateOne({'properties.id': req.body.Sup_id}, {$push: {offers: {id:id_string, username:req.user.username, product:product_name, 
                            price:req.body.new_value, date:today,likes:0, dislikes:0, available:true, reqDay: req_Day, reqWeek: req_Week, secondWeek: second_week}}}).then(result => {
                            //Check if user gets points for the offer
                            let points = 0
                            if(req_Day){
                                points += 50
                            }
                            if(req_Week){
                                points += 20
                            }
                            if(points > 0){
                                //Add points to User 
                                UserM.updateOne({'username': req.user.username}, {$inc: { 'points': points, 'monthpoints': points}}).then((result) =>{
                                }).catch((err) =>{
                                    console.log(err);
                                })
                            }
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
        //If offer exists and cant be added
        }else{
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

// Render review offer page
app.get('/review_offer/:id', checkAuthenticated, (req,res) => {

    SupermarketM.find({ 'properties.id': req.params.id }).then((result) =>{ // Find the supermarket you want to review
        let reviewedsup = result
        let userpoints = []
        let offerusernames = []
        for (offer of reviewedsup[0].offers){
            offerusernames.push(offer.username)
        }
        UserM.find({'username': {$in: offerusernames}}).then((result) =>{ // Find all users who have added offers to this supermarket
            console.log(result)
            for (user of result){
                userpoints.push({"id": user.username, "points": user.points}) // Store their points to display
            }
            UserM.find({'username': req.user.username}).then((result) =>{ // Find your own username to filter out liked/disliked offers
                // Render page with all of the info found above
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


// Like an offer
app.post('/like/:supid/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'offers':{$elemMatch:{id:req.params.id}}}, {$inc: { 'offers.$.likes': 1}}).then((result) =>{ // Find offer to like and increase it's likes by 1
        UserM.updateOne({'username': req.user.username}, {$push: {likedoffers: req.params.id}}).then((result) =>{ // Updates users list of liked offers
            res.redirect('/review_offer/' + req.params.supid) // Reload page for user
            UserM.updateOne({'username': req.body.offeruser}, {$inc: { 'points': 5, 'monthpoints': 5}}).then((result) =>{ // Increase offer creator's points
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


// Works exactly as like but reduces points
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

// Finds offer and switches it's availability to unavailable
app.post('/available/:supid/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'offers':{$elemMatch:{id:req.params.id}}}, {$set: { 'offers.$.available': true}}).then((result) =>{
        res.redirect('/review_offer/' + req.params.supid)
        console.log(result)
    }).catch((err) =>{
        console.log(err);
    })

});

// Finds offer and switches it's availability to available
app.post('/unavailable/:supid/:id', checkAuthenticated, (req,res) => {

    SupermarketM.updateOne({ 'offers':{$elemMatch:{id:req.params.id}}}, {$set: { 'offers.$.available': false}}).then((result) =>{
        res.redirect('/review_offer/' + req.params.supid)
        console.log(result)
    }).catch((err) =>{
        console.log(err);
    })

});


// Finds offer and deletes it
app.post('/delete/:supid/:id', checkAuthenticated, checkAdmin, (req,res) => {

    SupermarketM.updateOne({ 'offers':{$elemMatch:{id:req.params.id}}}, {$pull: { offers: {id:req.params.id} }}).then((result) =>{
        res.redirect('/review_offer/' + req.params.supid)
    }).catch((err) =>{
        console.log(err);
    })

});

// Render user profile
app.get('/user_profile', checkAuthenticated, (req,res) => {
    SupermarketM.find({'offers.username': req.user.username}).then(result =>{ // Find all of users offers

        let offers = []
        result.forEach(element =>{
            for(const x of element.offers){
                if(x.username == req.user.username){
                    offers.push(x)
                }
            }
        })
        UserM.find({'username': req.user.username}).then((result) =>{ // Find user's data
            let prof_user = result[0];
            let liked_history = [];
            let disliked_history = [];
            let union = [...new Set([...prof_user.likedoffers, ...prof_user.dislikedoffers])];
            SupermarketM.find({'offers.id': {$in: union}}).then((result) =>{ // Find user's liked and disliked offers
                for (superm of result){
                    for (offer of superm.offers){
                        if (prof_user.likedoffers.includes(offer.id)){
                            liked_history.push(offer); // sosto????
                        }
                        if (prof_user.dislikedoffers.includes(offer.id)){
                            disliked_history.push(offer); // sosto????
                        }
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


// Change username
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


// Change password
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


// Works exactly as user home
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


// Finds users scores and sorts them by biggest total points, then renders the leaderboad page with that info
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

    //Finds the most resent file that is aploaded to products and categories directory
    let temp1 = getMostRecentFile('products')
    temp1 = 'products/'.concat(temp1.file)
    let temp2 = getMostRecentFile('categories')
    temp2 = 'categories/'.concat(temp2.file)

    //Reads the uploaded Products File
    fs.readFile(temp1, 'utf8', (err, product) => {
        if (err) {
          console.error(err);
          return
        }
        //Get all products
        product = JSON.parse(product);

        //Read the uploaded Categories File
        fs.readFile(temp2, 'utf8', (err, cat_subs) => {
            if (err) {
              console.error(err);
              res.jsonp({ error: 'Categories Not Found' })
              return
            }
            //Get all categories 
            cat_subs = JSON.parse(cat_subs);

            let prod = []
            //Find all the products that belong to that categories and subcategories
            for(x of cat_subs){
                for(y of product.products){
                    for(k of x.subcategories){
                            if(x.id == y.category && k.uuid == y.subcategory ){
                                prod.push(y)
                        } 
                    }
                }
            }
            

            //For every prodact that you found 
            prod.forEach(element => {
                //Chech if product already exists 
                Product.find({'name': element.name}).then(result => {
                    //If exists add new product 
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
                    //Else update existed product
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

//Delete all Products
app.post('/delete_products', checkAuthenticated, checkAdmin, (req,res) =>{
    Product.deleteMany({}).then(result => {
        console.log(result)
    }).catch((err) =>{
        console.log(err);
    })

})


app.post('/add_categories_subcat', checkAuthenticated, checkAdmin, categories.array("Categ"), (req,res) => {

    //Finds the most resent file that is aploaded to categories directory
    let temp = getMostRecentFile('categories')
    temp = 'categories/'.concat(temp.file)

    //Reads the uploaded file
    fs.readFile(temp, 'utf8', (err, cat_subs) => {
        if (err) {
          console.error(err);
          return;
        }
        cat_subs = JSON.parse(cat_subs);

        let temp = 0
        let tempArray = [];

        //For each element in the file 
        cat_subs.forEach(element => {
            //Checks If category exists 
            Categ_Sub.find({'name': element.name}).then(result => {
                //If doesnt exist add the new category
                if(result == ""){
                    temp = new Categ_Sub({
                        id: element.id,
                        name: element.name,
                        subcategories: element.subcategories
                    })
                    //Insert to Database 
                    Categ_Sub.collection.insertOne(temp, (err) => {
                        if(err)
                        {
                          return res.jsonp({ error: 'Error' })
                        }
                        else {
                          console.info('successfully stored.')
                      }
                      })
                //Else if exists update the current category
                }else{
                    Categ_Sub.updateOne({'name': element.name}, {id: element.id, name:element.name,  subcategories: element.subcategories}).then(result =>{
                        console.log(result)
                    }).catch((err) =>{
                        res.jsonp({ error: 'Error' })
                        console.log(err);
                    })

                }
            }).catch((err) =>{
                res.jsonp({ error: 'Error' })
                console.log(err);
                 })
        })
    })

})

//Delete all Categories/Subcategories
app.post('/delete_categories', checkAuthenticated, checkAdmin, (req,res) => {
    Categ_Sub.deleteMany({}).then(result => {
        console.log(result)
        res.redirect('admin_home')
    }).catch((err) =>{
        console.log(err);
    })
})

app.post('/add_product_prices', checkAuthenticated, checkAdmin, prices.array("Price"), (req,res) => {

    //Finds the most resent file that is aploaded to prices directory
    let temp = getMostRecentFile('prices')
    temp = 'prices/'.concat(temp.file)

    //Read uploaded file 
    fs.readFile(temp, 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        data = JSON.parse(data);

        //For each element 
        data.forEach(element => {
                //Find the product and update its prices
                Product.updateOne({'name': element.name}, { $set: { prices : element.prices}}).then(result => {
                    console.log(result)
                   }).catch((err) =>{
                        console.log(err);
                })
            
         })
        
    })

})

app.post('/add_supermarket', checkAuthenticated, checkAdmin, supermarkets.array("files"), (req,res) => {

    //Finds the most resent file that is aploaded to supermarket directory
    let temp = getMostRecentFile('supermarket')
    temp = 'supermarket/'.concat(temp.file)

    //Read uploaded file 
    fs.readFile(temp, 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }

        //From data filter only the supermarkets 
        data = JSON.parse(data);
        data = data.features.filter(feature => feature.properties.name != null && feature.properties.name != "No supermarket");
        data = data.filter(feature => feature.geometry.type != undefined && feature.geometry.type != "Polygon" );
        let tempArray = [];
      
      //For every Supermarket 
        data.forEach(element => {
            //Create new Object Supermarket
            temp = new SupermarketM({
              type:element.type,
              properties: {id:(element.id.slice(5)),name:element.properties.name},
              offers: [],
              geometry: {type:element.geometry.type, coordinates:element.geometry.coordinates}
            });
      
          tempArray.push(temp)
        });
        
        //Add supermarkets to DataBase
        SupermarketM.collection.insertMany(tempArray, (err) => {
      
          if(err)
          {
            return console.error(err);
          }
          else {
            console.info('supermarkets were successfully stored.');
        }
        })
        console.log('test');
      });
})

//Delete all Supermarkets
app.post('/delete_supermarket', checkAuthenticated, checkAdmin, (req,res) => {
    SupermarketM.deleteMany({}).then(result => {
        console.log(result)
        res.redirect('admin_home')
    }).catch((err) =>{
        console.log(err);
    })
})

// Render the daily offer count statistics page
app.get('/statistics', checkAuthenticated, checkAdmin, (req,res) => {

    if(req.query.date){ // If user has inputed month data, use it
        var month = req.query.date.substring(5,7);

        var year = req.query.date.substring(0,4);
    } else { // Else use today's month
        var date_ob = new Date();
        // current month
        var month = date_ob.getMonth() + 1;
        month = (month>9 ? '' : '0') + month;

        // current year
        var year = date_ob.getFullYear();
    }


    let startDate = year + "-" + month + "-01";

    let lastday = new Date(year,month,0).getDate()

    // console.log("lastday:" + lastday)

    let endDate = year + "-" + month + '-' + lastday;

    let monthlabels = new Array(lastday).fill('')

    for (var i = 0; i < monthlabels.length; i++) { // Fill an array of labels with the month's dates in string
        if (i<9) {
            monthlabels[i] = year + "-" + month + "-" + "0" + (i+1);
        } else {
            monthlabels[i] = year + "-" + month + "-" + (i+1);
        }

    }

    // console.log(monthlabels)
    // console.log(endDate >= monthlabels[16])
    // console.log(endDate)

    offercount = new Array(lastday).fill(0); // Fill an array the size of the month with 0

    SupermarketM.find({'offers.date': {$gte: startDate,  $lte: endDate}}).then((result) =>{ // Count every offer by incrementing the offecount array by 1 on the date's day position
        for (superm of result){
            for (offer of superm.offers){
                if (startDate <= offer.date && offer.date <= endDate){
                    offercount[offer.date.substring(8,10) - 1] += 1;
                }
        }
        console.log(offercount)
    }
    res.render('statistics', {startDate:startDate,endDate:endDate, offercount:offercount, monthlabels:monthlabels}) // Render the page with the info above
    }).catch((err) =>{
        console.log(err);
    })

});

app.get('/statistics_two', checkAuthenticated, checkAdmin, (req,res) => {



    Categ_Sub.find().then((result) =>{ // Find product categories
        let ctg_name = result
        
        let category_list = []
        let subcategory_list = []

        for (cat of ctg_name) {
            category_list.push(cat.id)
            for (let i = 0; i < cat.subcategories.length; i++) {
                subcategory_list.push(cat.subcategories[i].uuid)
            }
        }


        let today = new Date();

        let endday = new Date();

        let daysBack = 0;

        if(req.query.weeksback){ // If user has inputed weeks to go back, use them
            daysBack = req.query.weeksback * 7;
        }


        if (req.query.category) { // If user has inputed a category, use it
            category_list = req.query.category;
            if (req.query.subcat)  {
                subcategory_list = req.query.subcat;
            }
        }



        let weeklabels = new Array(7).fill('')  // Create an array to store the week's dates in string

        for (let i = 0; i < 7; i++) { // Calculate the week's dates

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

        // Calculate the distance of the first day of the week from today (used to adjust index further down)
        const diffTime = Math.abs(endday - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 


        let offerlist = []; // 2d Array to store offers
        let productlist = [];  // 1d Array to store product names


        SupermarketM.find({'offers.date': {$gte: weeklabels[0],  $lte: weeklabels[6]}}).then((result) =>{ // Find all offers in that week day by day and push them in the 2d array each loop
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

            productlist = [...new Set(productlist)]; // Delete duplicate names by making it a set

            // console.log(offerlist)

            // console.log("Productlist: ")
            // console.log(productlist)

            let discountlist = new Array(weeklabels.length).fill(0) // Array to store the average discount sum
            let countlist = new Array(weeklabels.length).fill(0) // Array to store offer count to divide the discount sum with, creating the average discount

            Product.find({'name': {$in: productlist}, 'category': {$in: category_list}, 'subcategory': {$in: subcategory_list}}).then((result) =>{

                for (let i = 0; i < weeklabels.length; i++) { // Calculate the discount difference from the avg weekly price and then the percent
                        for (let j = 0; j < offerlist[i].length; j++) {
                            if(result.find(({ name }) => name === offerlist[i][j].name)) {
                                let avg_price = result.find(({ name }) => name === offerlist[i][j].name).prices[diffDays - 6].avg_price
                                offerlist[i][j].price = (avg_price - offerlist[i][j].price) / avg_price
                            } else {
                                offerlist[i][j].price = 0
                            }
                        }
                }

                for (let i = 0; i < weeklabels.length; i++) { // Calculcate the average discount sum
                    for (let j = 0; j < offerlist[i].length; j++) {
                        discountlist[i] += offerlist[i][j].price
                        if (offerlist[i][j].price != 0) {
                            countlist[i] += 1
                        }
                    }
                }

                for (let i = 0; i < weeklabels.length; i++) { // Calculate the average discount percent
                    if (countlist[i] != 0) {
                        discountlist[i] = Math.round((discountlist[i] / countlist[i]) * 100)
                    }
                }

                // console.log(discountlist)

                // Render the page with the info calculated and found above
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