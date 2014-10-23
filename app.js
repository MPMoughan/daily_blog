"use strict"

var express = require("express"),
bodyParser = require("body-parser"),
app = express(),
db = require("./models/index"),
passport = require("passport"),
passportLocal = require("passport-local"),
cookieParser = require("cookie-parser"),
session = require("cookie-session"),
flash = require("connect-flash"),
methodOverride = require('method-override');


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride('_method'));
app.use(express.static(__dirname + "/public"));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));


// setup our session
app.use(session( {
  secret: 'thisismysecretkey',
  name: 'chocolate chip',
  //maxage is in milliseconds
  maxage: 3600000
  })
);

// get passport started
app.use(passport.initialize());
app.use(passport.session());


// include flash message
app.use(flash());

// Serialize user when they are authenticated
// storing user id on the cookie
// "stamping the hand"
passport.serializeUser(function (user, done){
  console.log("SERIALIZED JUST RAN!");
  done(null, user.id);
});

// De-serialize user
// "just checking the stamp"
// id is the unique ID created from the table
passport.deserializeUser(function (id, done){
  console.log("DESERIALIZED JUST RAN!");
  db.User.find({
      where: {
        id: id
      }
    })
    .done(function(error,user){
      done(error, user);
    });
});

// setup so you can't log in again (if you're logged in) or serialize again if you refresh
app.get('/', function (req,res){
  // check if the user is logged in
  if(!req.user) {
    res.render("land");
  }
  else{
    res.redirect('/home');
  }
});

app.get('/signup', function (req,res){
  if(!req.user) {
    res.render("signup", { username: ""});
  }
  else{
    res.redirect('/home');
  }
});

app.get('/login', function (req,res){
  // check if the user is logged in
  if(!req.user) {
    res.render("login", {message: req.flash('loginMessage'), username: ""});
  }
  else{
    res.redirect('/home');
  }
});

app.get('/home', function(req,res){
  res.render("home", {
    //runs a function to see if the user is authenticated - returns true or false
    isAuthenticated: req.isAuthenticated(),
    //this is our data from the DB which we get from deserializing
    user: req.user
  });
});

// on submit, create a new users using form values
app.post('/submit', function(req,res){

  db.User.createNewUser(req.body.username, req.body.password,
  // err
  function(err){
    res.render("signup", {message: err.message, username: req.body.username});
  },
  // success
  function(success){
    res.render("home", {message: success.message});
  });
});

// authenticate users when logging in - no need for req,res passport does this for us
app.post('/login', passport.authenticate('local', {
  successRedirect: '/home',
  failureRedirect: '/login',
  failureFlash: true
}));

app.get('/logout', function(req,res){
  //req.logout added by passport - delete the user id/session
  req.logout();
  res.redirect('/');
});


            /////////// USER ///////////

// INDEX for USER - Shows list of users
app.get('/users', function (req, res){
  db.User.findAll().done(function(err, user) {
    res.render('User/index', {allUsers: user});
  });
});

// COMMENTED OUT NEW for author - has to be done at login
// // NEW
// // form field for new user
// app.get('/users/new', function (req, res){
//   res.render("user/new", {username:"", password:"", bio:""});
// });

// // issue of precedence (specific to general)
// // post new "user" and redirect
// app.post('/users', function (req, res) {
//   var name = req.body.user.username;
//   var pass = req.body.user.password;
//   var bio = req.body.user.bio;
//   db.User.create({username:name, password:pass, bio:bio})
//     .done(function(err, success){
//       if (err){
//         var errMsg = "Name must be at least 6 characters";
//         res.render('user/new', {errMsg:errMsg, username:name, password:pass, bio:bio});
//       }
//       else {
//     res.redirect('/users');
//     }
//   });
// });

// SHOW individual user page with all "Posts"
app.get('/users/:id',function (req,res){
  db.User.find(req.params.id).done(function(err, user){
    user.getPosts().done(function(err,posts){
      res.render('user/show', {posts:posts, user:user});
    });
  });
});


// EDIT user - direct to edit forms
app.get('/users/:id/edit', function (req, res) {
  //find our book
  var id = req.params.id;
  db.User.find(id).success(function(user){
      res.render('user/edit', {user: user});
  });
});

// UPDATE user info
app.put('/users/:id', function (req, res) {
  var id = req.params.id;
  db.User.find(id).success(function(user){
      user.updateAttributes
      ({username: req.body.user.username, bio: req.body.user.bio
      }).done(function(err, success){
      if (err){
        var errMsg = "Title must be at least 6 characters";
        res.render('user/edit', {errMsg:errMsg, user:user});
        // why did you need to go through this
      }
      else {
    res.redirect('/users');
      }
    });
  });
});

//DELETE user and all associated posts
app.delete('/users/:id', function (req, res) {
  var id = req.params.id;
  console.log("Deleting .. :" + id);

  db.User.find(id).success(function(user){
      // console.log("Found .. :" + user);
      db.Post.destroy({
        where: {
          UserId: user.id
          }
        }).done(function(){
      user.destroy().done(function(){
      res.redirect('/users');
      });
    });
  });
});




            /////////// POST ///////////

// INDEX for POST
app.get('/posts', function (req, res){
  db.Post.findAll({include: [db.User]}).done(function (err, posts) {
    res.render("post/index", {posts: posts});
  });
});

// NEW
// New Post Form - starts from link on user's page
app.get('/posts/:id/New', function (req, res){
  db.User.find(req.params.id).done(function(err,user){
    res.render("post/new", {user:user, title:"", body:""});
  });
});

// actual method of post which starts from link on user's page
app.post('/posts/:id', function (req, res) {
  var title = req.body.post.title;
  var body = req.body.post.body;
  db.Post.create({
    title: title,
    body: body,
    UserId: req.params.id
  })
    .done(function(err, success){
      if (err){
        var errMsg = "Title must be at least 6 characters";
        res.render('/posts/new', {errMsg: errMsg, title: title, body: body});
        // why is it render here? why not redirect?
      }
      else {
    res.redirect('/posts');
    }
  });
});


// SHOW the full post
app.get('/posts/:id', function (req, res){
  // console.log("ARTICLE IS HERE..");

  db.Post.findAll({
    where: {
      UserId: req.params.id
    }
  }).done(function(err, posts) {
    console.log("HERE ARE OUR POSTS",posts)
    res.render('post/show', {posts: posts});
  });
});


// EDIT POST
app.get('/posts/:id/edit', function (req, res) {
  //find our Post
  var id = req.params.id;
  db.Post.find(id).success(function(post){
      res.render('post/edit', {post: post});
  });
});

// UPDATE user info
app.put('/posts/:id', function (req, res) {
  var id = req.params.id;
  db.Post.find(id).success(function(post){
      post.updateAttributes
      ({title: req.body.post.title, body: req.body.post.body
      }).done(function(err, success){
      if (err){
        var errMsg = "Title must be at least 6 characters";
        res.render('/posts/:id/edit', {errMsg:errMsg, post: post});
        // why did you need to go through this
      }
      else {
    res.redirect('/posts');
      }
    });
  });
});

// DELETE
app.delete('/posts/:id', function (req, res) {
  var id = req.params.id;
  db.Post.find(id).success(function(post){
      post.destroy().success(function(){
      res.redirect('/Posts');
    });
  });
});

app.get('*', function(req,res){
  res.status(404);
  res.render('404');
});

var server = app.listen(3000, function() {
    console.log('Listening on port %d', server.address().port);
});