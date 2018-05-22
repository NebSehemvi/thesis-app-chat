let express             = require("express"),
    app                 = express(),
    server              = require('http').Server(app),
    io                  = require('socket.io')(server),
    bodyParser          = require("body-parser"),
    mongoose            = require("mongoose"),
    schemas             = require("./models/schemas"),
    session             = require("express-session"),
    passport            = require("passport"),
    LocalStrategy       = require("passport-local"),
    passportMongoose    = require("passport-local-mongoose"),
    passportSocketIo    = require('passport.socketio'),
    mongoStore          = require("connect-mongo")(session),
    sessionStore        = new mongoStore({url: "mongodb://localhost/session"}),
    cookieParser        = require('cookie-parser');

mongoose.connect("mongodb://localhost/yoddl");
var User = mongoose.model("User", schemas.user);
var Chat = mongoose.model("Chat", schemas.chat);

passport.use(new LocalStrategy({usernameField : "email", passwordField: "pass" }, User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var sessionMiddleware = session({
    store: sessionStore, 
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      //secure: true,
      httpOnly: true
    }
});

app.use(sessionMiddleware);
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());
app.use(function(req, res, next){
  res.set("Strict-Transport-Security", "max-age=31536000");
  res.set("Content-Security-Policy", "default-src 'none'; script-src 'self'; img-src 'self'; connect-src 'self' wss://yoddl.ru; font-src 'self'; style-src 'self' 'unsafe-inline';");
  res.set("X-Frame-Options", "deny");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Xss-Protection", "1; block");
  res.removeHeader("X-Powered-By");
  return next();
})

app.get("/", function(req, res){
      if(req.user) {
        res.render("index", {user: true});
      } else {
        res.render("index", {user: undefined});
      }
});

app.get("/udata", function(req, res){
  if(req.user) {
    User.findOne({UN: req.user.UN}, function(err, user) {
        /*let data = {
            name: req.user.nick,
            UN: req.user.UN,
            role: req.user.role,
            photo: req.user.photo,
            city: req.user.city,
            chats: user.chats
        };
        res.send(JSON.stringify(data));*/
      res.send(user);
    })
  }
})

app.post("/log", function(req, res){
    req.body.email = String((req.body.email).toLowerCase());
    req.body.pass = String(req.body.pass);
    passport.authenticate("local")(req, res, function(){
            console.log("user " + req.user.nick + " has logged in!");
            res.redirect("/"); 
});
});

app.post("/reg", function(req, res) {
  if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(req.body.email) === true && /^[a-zA-Z0-9]*$/.test(req.body.pass) === true) {
   User.register(new User({UN: Number(req.body.un), nick: String(req.body.nick), username: String((req.body.email).toLowerCase()), role: "User"}), req.body.pass, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/");
            //instead of console.log(err.message); make error message return to client side
        }
        passport.authenticate("local")(req, res, function(){
            console.log("user " + req.body.nick + " has registered!");
            res.redirect("/"); 
        });
   }); 
  } else {
    res.redirect("/");
  }
});
//sockets

io.origins(['yoddl.ru:*']);
io.use(passportSocketIo.authorize({
    secret: process.env.SECRET,
    store: sessionStore,
    passport: passport,
    cookieParser: cookieParser,
    fail: onAuthorizeFail
}));

function onAuthorizeFail(data, message, error, accept){
  accept(null, true);
}

var users = {};
io.on("connection", function (socket) {
    var UN;
    if (socket.request.user.logged_in) {
        UN = String(socket.request.user.UN);
        if (users[UN]){
            return socket.disconnect(true);
        } else {
            users[UN] = {};
            users[UN].id = socket.id;
            socket.emit("connected", "you've been connected to yoddl");
            console.log(Object.keys(users).length);
        }
    } else {
        socket.emit("connected", "you've been connected to yoddl");
    }
    
    socket.on("disconnect", function(reason){
        if (socket.request.user.logged_in) {
            delete users[UN];
            console.log(Object.keys(users).length);
        }
    });
    
    socket.on("getUN", function (data) {
        let newUN = generateUN();
        User.findOne({"UN": newUN}, function(err, user){
            if (err){
                console.log(err);
            } else {
                if(!user){
                    socket.emit("newUN", newUN);
                }
            }
        });
    });
  
    socket.on("formValidate", function(data){
      if (data.mail && data.pass) {
        if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(data.mail) === false && (/^[a-zA-Z0-9]*$/.test(data.pass) === false || data.pass.length < 5)) {
          socket.emit("validation", { emailPass: true });
        } else if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(data.mail) === false) {
          socket.emit("validation", { email: true})
        } else if (/^[a-zA-Z0-9]*$/.test(data.pass) === false || data.pass.length < 5) {
          socket.emit("validation", { pass: true})
        } else { socket.emit("validation", { ok: true}) }
      } else {
      }      
    })
    
if (socket.request.user.logged_in) {
    
    socket.on("msg", function(data) {
        let msg;
        if (data.msg && data.itsUN) {
            let chatID = (socket.request.user.UN < data.itsUN) ? (hash(socket.request.user.UN + "+" + data.itsUN)) : (hash(data.itsUN + "+" + socket.request.user.UN));
            msg = {
                    time: new Date(),
                    author: socket.request.user.UN,
                    destUN: data.itsUN,
                    text: data.msg
                };
            //возвращаем сообщение приславшему на сервер, потом проверим, онлайн ли получатель, поставим метку нового сообщения, если чат не активен, пошлем сообщение
            socket.emit("msg", msg);
            if(users[data.itsUN]) {
                if (users[data.itsUN].active != socket.request.user.UN) {msg.newmsg = 1}
                io.to(users[data.itsUN].id).emit("msg", msg);
            }
          
            Chat.findOneAndUpdate({chatID: chatID}, { $push: {messages: msg}}, function(err, chat){});

            User.findOne({UN: Number(msg.destUN)}).update({'chats.itsUN': Number(socket.request.user.UN)},  {'$set': {
                'chats.$.lastmsg': msg.text,
                'chats.$.author': msg.author,
                'chats.$.date': msg.time,
                'chats.$.newmsg': msg.newmsg,
            }}, function(err, user){})
                
            User.findOne({UN: Number(msg.author)}).update({'chats.itsUN': Number(data.itsUN)},  {'$set': {
                'chats.$.lastmsg': msg.text,
                'chats.$.author': msg.author,
                'chats.$.date': msg.time,
            }}, function(err, user){})
        }
    });
    
    socket.on("join", function(thisID){
      if(Number(thisID)) {
        let chatID = (socket.request.user.UN < thisID) ? (hash(socket.request.user.UN + "+" + thisID)) : (hash(thisID + "+" + socket.request.user.UN));

        User.findOne({UN: socket.request.user.UN, "chats.itsUN": {$eq: Number(thisID)}}, function(err, user) {
            if (!user) {             
                User.findOneAndUpdate({UN: thisID}, { $push: { chats: {
                    itsUN: socket.request.user.UN,
                    name: socket.request.user.nick,
                    photo: socket.request.user.photo
                } }},   function(err, user){
                    socket.emit("newchat", {
                        itsUN: thisID,
                        name: user.nick,
                        photo: user.photo,
                    });
                    User.findOneAndUpdate({UN: socket.request.user.UN}, { $push: { chats: {
                            itsUN: thisID,
                            name: user.nick,
                            photo: user.photo,
                    } }},   function(err, user){});
                });
                
                Chat.create({
                    chatID: chatID,
                    users: [{UN: thisID},{UN: socket.request.user.UN}]
                });
                
                if(users[thisID]) {
                    io.to(users[thisID].id).emit("newchat", {
                        itsUN: socket.request.user.UN,
                        name: socket.request.user.nick,
                        photo: socket.request.user.photo
                    });
                }
                
            } else if (user && users[String(socket.request.user.UN)].active != thisID) {
                Chat.findOne({chatID: chatID}, function(err, chat) {
                    if(err){
                        console.log(err);
                    } else if (chat && Object.keys(chat.messages).length > 30) {
                        users[String(socket.request.user.UN)].active = thisID;
                        socket.emit("join", chat.messages.slice(chat.messages.length - 30, chat.messages.length));
                        User.find({UN: socket.request.user.UN}).update({'chats.itsUN': Number(thisID)},  {'$set': {'chats.$.newmsg': 0}}, function(err, user){});
                    } else {
                        users[String(socket.request.user.UN)].active = thisID;
                        //console.log(users[String(socket.request.user.UN)].active);
                        socket.emit("join", chat.messages);
                        User.find({UN: socket.request.user.UN}).update({'chats.itsUN': Number(thisID)},  {'$set': {'chats.$.newmsg': 0}}, function(err, user){});
                    }
                });
            }
        });
      }
    });
    
    socket.on("find", function(thisUN){
      thisUN = Number(thisUN);
        let chatID = (socket.request.user.UN < thisUN) ? (hash(socket.request.user.UN + "+" + thisUN)) : (hash(thisUN + "+" + socket.request.user.UN));
        if(thisUN && thisUN != socket.request.user.UN  && !socket.request.user.chats[chatID]){
            User.findOne({"UN": thisUN}, function(err, user){
                if (err) {
                    console.log(err);
                } else {
                    if(user){
                        socket.emit("found", [{
                            chatID: chatID,
                            name: user.nick,
                            UN: user.UN,
                            photo: user.photo,
                            city: user.city,
                        }]);
                    }
                }
            });
        }
    });
    
}
    
});

//server process

server.listen(3000, "0.0.0.0", function(){
   console.log("Server is on!");
});

server.listen(80, "0.0.0.0", function(){
    console.log("On port 80 too!")
});


//functions

function generateUN(lng = 6) {
    var UN = "";
    for(let i=0;i<lng;i++){
        UN += Math.floor(Math.random()*10);
        if (i === 0 && UN == "0") { UN = "1"}
    }
    return Number(UN);
}

function hash(str) {
     var res = 0,
         len = str.length;
     for (var i = 0; i < len; i++) {
      res = res * 31 + str.charCodeAt(i);
     }
     return res;
}