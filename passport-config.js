const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

function initialize (passport, getUserByUsername, getUserById) {
    const authenticateUser = async (username, password, done) => {
        const user = (await getUserByUsername(username))[0]
        console.log(user)
        console.log(password)
        if (user == null) {
            return done(null, false, { message: 'No user with that username'})
        }

        try {
            if (await bcrypt.compare(password, user.password)) {
                return done(null, user)
            } else {
                return done(null, false, { message: 'Wrong password'})
            }
        } catch (e) {
            return done(e)
        }
 }
    passport.use(new LocalStrategy({ usernameField: 'username'},   authenticateUser))
    
    passport.serializeUser((user, done) => done(null, user))
    passport.deserializeUser((user, done) => {
        return done(null, user)
    })
}

module.exports = initialize;