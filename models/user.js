"use strict";

var bcrypt = require("bcrypt");
var salt = bcrypt.genSaltSync(10);
var passport = require("passport");
var passportLocal = require("passport-local");

module.exports = function (sequelize, DataTypes){
   // user model with validation of length defined
   var User = sequelize.define('User', {
     username: {
        type: DataTypes.STRING,
        validate: {
            len: [6, 30]
          }
    },
    password: DataTypes.STRING,
    bio: DataTypes.TEXT
    },
  {
    classMethods: {

      associate: function(db) {
        User.hasMany(db.Post);
      },
      // function that is hashing and salting text password
      encryptPass: function(password) {
        var hash = bcrypt.hashSync(password, salt);
        return hash;
      },
      // funciton that compares plan text password(userpass) with database password (dbpass)
      comparePass: function(userpass, dbpass) {
      // don't salt twice when you compare....watch out for this
        return bcrypt.compareSync(userpass, dbpass);
      },
      // when user signs-up, creating u/n & p/w - called in post for signup
      createNewUser:function(username, password, err, success ) {
        if(password.length < 6) {
          err({message: "Password should be more than six characters"});
        }
        else{
        User.create({
            username: username,
            password: this.encryptPass(password)
          }).done(function(error,user) {
            if(error) {
              console.log(error)
              if(error.name === 'SequelizeValidationError'){
              err({message: 'Your username should be at least 6 characters long', username: username});
            }
              else if(error.name === 'SequelizeUniqueConstraintError') {
              err({message: 'An account with that username already exists', username: username});
              }
            }
            else{
              success({message: 'Account created, please log in now'});
            }
          });
        }
      },
      } // close classMethods
    } //close classMethods outer
  ); // close define user

// PASSPORT setup session

passport.use(new passportLocal.Strategy({
  // need to match up with name froms input field of login.ejs (or wherever login form is)
  usernameField: 'username',
  passwordField: 'password',
  bioField: "bio",
  passReqToCallback: true
},
  // the done parameter here is PASSPORT
  function (req, username, password, done){
    // find a user in the DB
    User.find({
      where: {
        username: username
      }
    }).done(function (error,user){
      if(error) {
        console.log(error);
        return done(err, req.flash('loginMessage', 'Oops! Something went wrong'));
      }
      if (user === null) {
        return done(null,false, req.flash('loginMessage', 'Username does not exist'));
      }
      if (User.comparePass(password, user.password) !== true){
        return done(null, false, req.flash('loginMessage', 'Invalid Password'));
      }
      done(null, user);
    });
  }));


  return User;
}; // close User function