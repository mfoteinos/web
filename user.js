const mongoose = require('mongoose');
const UserM = require('./models/user');
const bcrypt = require('bcrypt');
const { concat } = require('lodash');

const db_url = 'mongodb+srv://xrhsthsthsvashs:ZJgAlDrKedPXkUUZ@cluster0.eixd381.mongodb.net/Data?retryWrites=true&w=majority';
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true} )
.then((result) => console.log('connected to database'))
.catch((err) => console.log(err))

//Names for the users we create 
var names = ["Liam", "Olivia", "Noah", "Emma",
    	"Oliver", "Charlotte", "James", "Amelia",
    	"Elijah", "Sophia", "William", "Isabella",
    	"Henry", "Ava", "Lucas", "Mia",
    	"Benjamin","Evelyn", "Theodore", "Luna"]

//The emails are of the form 'names' + '@gmail.com'
var emails = []
for(x of names){
    let email = '@gmail.com'
    emails.push(x.concat(email))
}

// Function that adds users 
async function Add_User(name, email, password) {
    // hash every password 
    await bcrypt.hash(password, 10)
        .then(hash => {
            //then when the hasing is done check the DataBase
            //if the created user exists 
            UserM.find({'username': name}).then(result => {
                //If it doesnt exist create a new user
                if(result == ""){
                    const new_user = new UserM({
                        username: name,
                        password: hash,
                        email: email
                    })
                    //Add the new user top the database
                    new_user.save()
                            .then( () => {
                                console.log("User Added");
                            })
                            .catch((err) => {
                            console.log(err);
                        })
                }else{
                    //Else if exists just update the existed user
                    UserM.updateOne({'username': name}, {username: name,  password: hash, email: email}).then(result => {
                        console.log(result)
                    }).catch((err) => {
                        console.log(err);
                    })
                }
            })
            })
        .catch(err => {
            console.log(err)
        })
}

// For every name add that user name, enamil, and name as his password
for(y in names){
    Add_User(names[y], emails[y], names[y])
}
