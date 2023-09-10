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
const path = require('path');
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
        callback(null, __dirname + "/uploads")
    },
    filename: function(req, file, callback){
        callback(null, file.originalname)
    }
})

const uploads = multer({storage: storage})


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



    let today = "8/14/2023"
    let week = new Date();
    week.setDate(week.getDate() - 7)

    // let likes = 0
    // let dislikes = 0

    // SupermarketM.find({'offers.username': req.user.username}).then(result =>{
        //     result.forEach(element => {
            //         for(x of element.offers){
                //             if(x.username == req.user.username){
                    //                 likes += x.likes
                    //                 dislikes += x.dislikes
                //             }
    //         }
    //  })

    //  let sum_points = 5 * likes + (-1) * dislikes

     //  if(sum_points <= 0){
        //     UserM.updateOne({'username': req.user.username}, {'points': 0}).then(result =>{
            //         console.log(result)  
        //     })
     //  }else{
        //     UserM.updateOne({'username': req.user.username}, {'points': sum_points}).then(result =>{
            //         console.log(result)  
     //  }) 
     //  }
    // })

    

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

//   function CheckReq(f_prod_name, f_offer_value){
//         let req_Day = false
//         let req_Week = false
//         Product.find({'name': f_prod_name}).then(result =>{
//             let sum = 0
            
//             for(x of result[0].prices){
//                 sum += x.price
//             }
//             let avg = sum / 7
//             if(f_offer_value <= 0.8*result[0].prices[0].price){
//                 req_Day = true
//             }
//             if(f_offer_value <= 0.8*avg){
//                 req_Week = true
//             }
//             return [req_Day, req_Week]
//         }).catch((err) =>{
//             console.log(err);
//     })
//     }


    let today = new Date().toLocaleDateString();


    let id_string = req.body.Sup_id.concat(req.user.username,req.body.product_id)

    var offer = []
    SupermarketM.find({'properties.id': req.body.Sup_id}, {'offers':1}).then(result => {
        result.forEach(element => {
            for(x of element.offers){
                if(x.product == req.body.product && x.username == req.user.username){
                    offer.push(x)
                }
            }
        })
        let req_Day = false
        let req_Week = false
        if(offer == ""){

            Product.find({'name': req.body.product}).then(result =>{
                let sum = 0
                
                for(x of result[0].prices){
                    sum += x.price
                }
                let avg = sum / 7
                if(req.body.new_value <= 0.8*result[0].prices[0].price){
                    req_Day = true
                }
                if(req.body.new_value <= 0.8*avg){
                    req_Week = true
                }
                SupermarketM.updateOne({'properties.id': req.body.Sup_id}, {$push: {offers: {id:id_string, username:req.user.username, product:req.body.product, 
                    price:req.body.new_value, date:today,likes:0, dislikes:0, available:true, reqDay: req_Day, reqWeek: req_Week}}}).then(result => {
                        let points = 0
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
                    res.redirect('/user_home')
                    }).catch((err) =>{
                        console.log(err);
                })
            }).catch((err) =>{
                console.log(err);
        })
        }else if(offer[0].price*0.8 >= req.body.new_value){
            
            Product.find({'name': req.body.product}).then(result =>{
                let sum = 0
                
                for(x of result[0].prices){
                    sum += x.price
                }
                let avg = sum / 7
                if(req.body.new_value <= 0.8*result[0].prices[0].price){
                    req_Day = true
                }
                if(req.body.new_value <= 0.8*avg){
                    req_Week = true
                }
                SupermarketM.updateOne({'properties.id': req.body.Sup_id}, {$pull: {offers: {id:offer[0].id_string, username:offer[0].username, product:offer[0].product, 
                    price:offer[0].new_value, date:offer[0].date,likes:offer[0].likes, dislikes:offer[0].dislikes, available:offer[0].available, reqDay: offer[0].reqDay, reqWeek: offer[0].reqDay}}}).then(result => {
                        SupermarketM.updateOne({'properties.id': req.body.Sup_id}, {$push: {offers: {id:id_string, username:req.user.username, product:req.body.product, 
                            price:req.body.new_value, date:today,likes:0, dislikes:0, available:true, reqDay: req_Day, reqWeek: req_Week}}}).then(result => {
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
                                res.redirect('/user_home')
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
            res.redirect('/user_home')
        }
    })
});


app.get('/review_offer/:id', checkAuthenticated, (req,res) => {

    // console.log(req.params.id)
    SupermarketM.find({ 'properties.id': req.params.id }).then((result) =>{
        result1 = result
        // console.log(result[0])
        UserM.find({'username': req.user.username}).then((result) =>{
            // console.log(result[0].likedoffers.id)
            res.render('review_offer', {reviewedsup:result1[0], likedoffers:result[0].likedoffers, dislikedoffers:result[0].dislikedoffers, admin:req.user.admin})
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

app.get('/admin_home', checkAuthenticated, checkAdmin, (req,res) => {

    let today = "8/14/2023"
    let week = new Date();
    week.setDate(week.getDate() - 7)
    

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
    }).catch((err) =>{
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

    SupermarketM.find({})

    res.render('add_product')
});


app.post('/add_product', checkAuthenticated, checkAdmin, uploads.array("files"), (req,res) => {

    fs.readFile('uploads/Data.products.json', 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        data = JSON.parse(data);
        console.log(data)
    })
   
})

app.get('/statistics', checkAuthenticated, checkAdmin, (req,res) => {

    let date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);

    // current month
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

    // current year
    let year = date_ob.getFullYear();

    let startDate = year + "-" + month + "-01";

    let startDateRev = "01-"; + "-" + month + "-" + year;

    let lastday = new Date(year,month,0).getDate()

    let endDate = year + "-" + month + '-' + lastday;

    let endDateRev = lastday + "-" + month + '-' + year;
    
    console.log(startDate)
    console.log(endDate)

    SupermarketM.find({'offers.date': {$gte: startDateRev,  $lte: endDateRev}}).then((result) =>{
        for (superm of result){
            for (offer of superm.offers){
                console.log(superm.properties.name)
                console.log(offer.date)
            }
        }
        console.log(result[0].offers[0].date)
        res.render('statistics', {startDate:startDate,endDate:endDate})
    }).catch((err) =>{
        console.log(err);
    })

});

app.use((req,res) => {

    res.status(404).render('404');

});