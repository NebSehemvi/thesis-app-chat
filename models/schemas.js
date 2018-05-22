let mongoose            = require("mongoose"),
    passportMongoose    = require("passport-local-mongoose");

var user = new mongoose.Schema({
   UN: {type: Number, unique: true, required: true},
   username: {type: String, unique: true, required: true},
   nick: String,
   photo: String,
   role: String,
   city: String,
   chats: [{
       _id : false,
       itsUN: Number,
       name: String,
       photo: String,
       author: Number,
       lastmsg: {type:String, default: ""},
       date: Date,
       newmsg: {type:Number, default: 0}
   }]
});

var chat = new mongoose.Schema({
    chatID: {type: String, unique: true},
    users: [{
        _id : false,
        UN: Number
    }],
    messages: [{
        _id : false,
        time: Date,
        author: Number,
        destUN: Number,
        text: String
    }]
});

user.plugin(passportMongoose);

module.exports = mongoose.model("User", user);
module.exports = mongoose.model("Chat", chat);
//module.exports = mongoose.model("Bucket", bucket);