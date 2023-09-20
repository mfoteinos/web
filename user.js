const mongoose = require('mongoose');
const UserM = require('./models/user');
const bcrypt = require('bcrypt');
const { concat } = require('lodash');

const db_url = 'mongodb+srv://xrhsthsthsvashs:ZJgAlDrKedPXkUUZ@cluster0.eixd381.mongodb.net/Data?retryWrites=true&w=majority';
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true} )
.then((result) => console.log('connected to database'))
.catch((err) => console.log(err))

var names = ["Liam", "Olivia", "Noah", "Emma",
    	"Oliver", "Charlotte", "James", "Amelia",
    	"Elijah", "Sophia", "William", "Isabella",
    	"Henry", "Ava", "Lucas", "Mia",
    	"Benjamin","Evelyn", "Theodore", "Luna"]

var emails = []
for(x of names){
    let email = '@gmail.com'
    emails.push(x.concat(email))
}


async function Add_User(name, email, password) {
    await bcrypt.hash(password, 10)
        .then(hash => {
            UserM.find({'username': name}).then(result => {
                if(result == ""){
                    const new_user = new UserM({
                        username: name,
                        password: hash,
                        email: email,
                        points: Math.round(Math.random()* 1000) + 1000,
                        monthpoints: Math.round(Math.random()* 1000)
                    })
                    new_user.save()
                            .then( () => {
                                console.log("logged in");
                            })
                            .catch((err) => {
                            console.log(err);
                        })
                }else{
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

for(y in names){
    Add_User(names[y], emails[y], names[y])
}
