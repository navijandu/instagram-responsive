  //
// # SimplestServer
//
// by Rick Kozak

const dbUrl ='mongodb://ashmeet:navi@ds145302.mlab.com:45302/instagram-responsive';

//require statements -- this adds external modules from node_modules or our own defined modules
const http = require('http');
const path = require('path');
//express related
const express = require('express');
const bodyParser = require('body-parser');
//session
const session = require('express-session');  
const mongoSession = require('connect-mongodb-session')(session);
const passport = require('passport');
const userAuth = require('./userAuth.js');
const hash = require('./utils/hash.js');
//database
const mongoose = require('mongoose');
const Post = require('./models/Post.js');
const User = require('./models/User.js');
const Like = require('./models/Like.js');
const PasswordReset = require('./models/PasswordReset.js'); 
//sendmail
const email = require('./utils/sendmail.js');

//email.send('prog8165@gmail.com', 'test', 'this is a test');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);

//establish connection to our mongodb instance
//use your own mongodb instance here
mongoose.connect(dbUrl);
//create a sessions collection as well
var mongoSessionStore = new mongoSession({
    uri: dbUrl,
    collection: 'sessions'
});

//tell the router (ie. express) where to find static files
router.use(express.static(path.resolve(__dirname, 'client')));
//tell the router to parse JSON data for us and put it into req.body
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
//add session support
router.use(session({
  secret: process.env.SESSION_SECRET || 'mySecretKey', 
  store: mongoSessionStore,
  resave: true,
  saveUninitialized: false
}));
//add passport for authentication support
router.use(passport.initialize());
router.use(passport.session());
userAuth.init(passport);

//tell the router how to handle a get request to the root 
router.get('/', function(req, res){
  console.log('client requests root');
  //use sendfile to send our signin.html file
  res.sendfile(path.join(__dirname, 'client/view','signin.html'));
  //res.sendFile(path.join(__dirname, 'client/view','signin.html'));
});

//tell the router how to handle a get request to the signin page
router.get('/signin', function(req, res){
  console.log('client requests signin');
  res.redirect('/');
});

//tell the router how to handle a post request from the signin page
router.post('/signin', function(req, res, next) {
  //tell passport to attempt to authenticate the login
  passport.authenticate('login', function(err, user, info) {
    //callback returns here
    if (err){
      //if error, say error
      res.json({isValid: false, message: 'internal error'});
    } else if (!user) {
      //if no user, say invalid login
      res.json({isValid: false, message: 'try again'});
    } else {
      //log this user in
      req.logIn(user, function(err){
        if (!err)
          //send a message to the client to say so
          res.json({isValid: true, message: 'welcome ' + user.email});
      });
    }
  })(req, res, next);
});

//tell the router how to handle a get request to the join page
router.get('/join', function(req, res){
  console.log('client requests join');
  res.sendfile(path.join(__dirname, 'client/view','join.html'));
  //CN-- res.sendFile(path.join(__dirname, 'client/view', 'join.html'));
});

//tell the router how to handle a post request to the join page
router.post('/join', function(req, res, next) {
  passport.authenticate('signup', function(err, user, info) {
    if (err){
      res.json({isValid: false, message: 'internal error'});    
    } else if (!user) {
      res.json({isValid: false, message: 'try again'});
    } else {
      //log this user in since they've just joined
      req.logIn(user, function(err){
        if (!err)
          //send a message to the client to say so
          res.json({isValid: true, message: 'welcome ' + user.email});
      });
    }
  })(req, res, next);
});

router.get('/passwordreset', (req, res) => {
  console.log('client requests passwordreset');
  res.sendFile(path.join(__dirname, 'client/view', 'passwordreset.html'));
});

router.post('/passwordreset', (req, res) => {
    Promise.resolve()
    .then(function(){
        //see if there's a user with this email
        return User.findOne({'email' : req.body.email});
    })
    .then(function(user){
      if (user){
        var pr = new PasswordReset();
        pr.userId = user.id;
        pr.password = hash.createHash(req.body.password);
        pr.expires = new Date((new Date()).getTime() + (20 * 60 * 1000));
        pr.save()
        .then(function(pr){
          if (pr){
            email.send(req.body.email, 'password reset', 'https://prog8165-rtbsoft.c9users.io/verifypassword?id=' + pr.id);
          }
        });
      }
    })
});

router.get('/verifypassword', function(req, res){
    var password;
    
    Promise.resolve()
    .then(function(){
      return PasswordReset.findOne({id: req.body.id});
    })
    .then(function(pr){
      if (pr){
        if (pr.expires > new Date()){
          password = pr.password;
          //see if there's a user with this email
          return User.findOne({id : pr.userId});
        }
      }
    })
    .then(function(user){
      if (user){
        user.password = password;
        return user.save();
      }
    })
});

//tell the router how to handle a get request to the posts page
//only do this if this is an authenticated user
router.get('/posts', userAuth.isAuthenticated, function(req, res){
  console.log('client requests posts.html');
  //use sendfile to send our posts.html file
  res.sendfile(path.join(__dirname, 'client/view','posts.html'));
  // CN ---res.sendFile(path.join(__dirname, 'client/view','posts.html'));
})

//tell the router how to handle a post request to /posts
//only do this if this is an authenticated user
router.post('/posts', userAuth.isAuthenticated, function(req, res){
  console.log('client requests posts list');
  
  var thesePosts;
  //go find all the posts in the database
  Post.find({})
  .then(function(posts){
    thesePosts = posts;
    var promises = [];
    thesePosts.forEach(function(post){
      promises.push(
        Promise.resolve()
        .then(function(){
          return Like.findOne({userId: req.user.id, postId: post.id})
        })
        .then(function(like){
          post._doc.isLiked = like ? true : false;
      }));
    });
    return Promise.all(promises);
  })
  .then(function(){
    //send them to the client in JSON format
    res.json(thesePosts);
  })
});

//tell the router how to handle a post request to /incrLike
router.post('/incrLike', userAuth.isAuthenticated, function(req, res){
  console.log('increment like for ' + req.body.id + ' by user ' + req.user.email);

  Like.findOne({userId: req.user.id, postId: req.body.id})
  .then(function(like){
    //if (!like){
      //go get the post record
      Post.findById(req.body.id)
      .then(function(post){
        //increment the like count
        post.likeCount++;
        //save the record back to the database
        return post.save(post);
      })
      .then(function(post){
        var like = new Like();
        like.userId = req.user.id;
        like.postId = req.body.id;
        like.save();
        
        //a successful save returns back the updated object
        res.json({id: req.body.id, count: post.likeCount});  
      })
    //} else {
      //  res.json({id: req.body.id, count: -1});  
    //}
  })
  .catch(function(err){
    console.log(err);
  })
});
//set up the HTTP server and start it running
server.listen(process.env.PORT || 3000, process.env.IP || '0.0.0.0', function(){
  var addr = server.address();
  console.log('Server listening at', addr.address + ':' + addr.port);
});