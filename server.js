//
// # SimplestServer
//
// by Rick Kozak

//require statements -- this adds external modules from node_modules or our own defined modules
var http = require('http');
var path = require('path');
var express = require('express');
var mongoose = require('mongoose');
var Post = require('./models/Post.js');


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
//mongoose.connect('mongodb://user8165:pswd8165@ds161021.mlab.com:61021/prog8165');

mongoose.connect('mongodb://ashmeet:navi@ds129402.mlab.com:29402/instagram-responsive'); 


//tell the router (ie. express) where to find static files
router.use(express.static(path.resolve(__dirname, 'client')));
//tell the router to parse JSON data for us and put it into req.body
router.use(express.bodyParser());

//tell the router how to handle a get request to the root 
router.get('/', function(req, res){
  console.log('client requests posts.html');
  //use sendfile to send our posts.html file
  res.sendfile(path.join(__dirname, 'client/view','posts.html'));
});

//tell the router how to handle a post request to /posts
router.post('/posts', function(req, res){
  console.log('client requests posts list');
  
  //go find all the posts in the database
  Post.find({})
  .then(function(paths){
    //send them to the client in JSON format
    res.json(paths);
  })
  
});

//tell the router how to handle a post request to /incrLike
router.post('/incrLike', function(req, res){
  console.log('increment like for ' + req.body.id);

  Post.findById(req.body.id)
  .then(function(post){
    //increment the like count
    post.likeCount++;
    //save the record back to the database
    return post.save(post);
  })
  .then(function(post){
    //a successful save returns back the updated object
    res.json({id: req.body.id, count: post.likeCount});  
  })
  .catch(function(err){
    console.log(err);
  })
});

router.post('/decrLike', function(req, res){
  console.log('decrement like for ' + req.body.id);

  Post.findById(req.body.id)
  .then(function(post){
    //increment the like count
    post.likeCount--;
    //save the record back to the database
    return post.save(post);
  })
  .then(function(post){
    //a successful save returns back the updated object
    res.json({id: req.body.id, count: post.likeCount});  
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