var yoddl = angular.module('yoddl', []);
yoddl.controller('app-controller', function ($scope, $http){
  $http.get('/udata').then(function (response){
    $scope.cmn = response.data;
    $scope.messages = [];
    $scope.searches = [];
    var socket = io.connect('https://yoddl.ru/');
    var chat = document.querySelector(".chat");
    var search = document.querySelector(".new-contact-search");
    var msgInput = document.querySelector(".msg-input");
    var active;
    var fShadow = document.querySelector(".form-shadow");
    var elements = document.querySelector(".elements");
    
    socket.on('connected', function(data) {
        console.log(data);
    });
    
    socket.on("msg", function(msg){
        var first = document.querySelector(".sidebar-contact");
        var chatID = String(($scope.cmn.UN == msg.author) ? (msg.destUN) : (msg.author));
        var contact = document.getElementById(chatID);
        contact = contact.parentNode
        first.parentNode.insertBefore(contact, first);
        
        $scope.cmn.chats.findIndex(function(el, i) {
            if (el.itsUN == chatID) {
                $scope.cmn.chats[i].lastmsg = msg.text;
                if (msg.newmsg == true && chatID != msgInput.getAttribute("id")) {
                    $scope.cmn.chats[i].newmsg = 1;
                }
            }
        })
        
        if (msgInput.getAttribute("id") == chatID) {
            $scope.messages.push(msg);
        }
        
        $scope.$apply();
        setTimeout(function(){
            chat.scrollTo(0, chat.scrollHeight);
        }, 150);
    });
    
    //соедини joinnewchat и joinchat так, чтобы была одна функция, которая показывает импут, добавляет новый чат и делает его активным
    $scope.joinNewChat = function(e){
        socket.emit("join", e.target.id)
        console.log(e.target.id);
        chat.setAttribute("id", "");
        elements.classList.remove("blurred");
        fShadow.style.display = "none"; 
        setTimeout(function(){
            chat.scrollTo(0, chat.scrollHeight);
        }, 150);
    }
    
    socket.on("newchat", function(chat){
        $scope.cmn.chats.push(chat);
        $scope.searches = [];
        $scope.$apply();
    });
    
    $scope.joinChat = function(e){
        if (!active || (e.target.id != active.getAttribute("id"))) {
            if (!active) {
                document.querySelector(".chat-fixedbtm").style.display = "flex";
            } else if (active) {
                active.parentNode.removeAttribute("id");
            }
            active = document.getElementById(e.target.id);
            active.parentNode.setAttribute("id", "active");
            document.querySelector("#active").querySelector(".sidebar-contact-status").innerHTML = "";
            socket.emit("join", e.target.id)
            msgInput.setAttribute("id", e.target.id);
            document.querySelector(".status-bar").style.display = "block";
            setTimeout(function(){
                chat.scrollTo(0, chat.scrollHeight);
            }, 150);
        }
    }
    
    socket.on("join", function(data){
        $scope.messages = data;
        $scope.$apply();
        setTimeout(function(){
            chat.scrollTo(0, chat.scrollHeight);
        }, 150);
    });
    
    search.onkeypress = function(e){
        if (e.keyCode == 13) {
            $scope.searches = [];
            $scope.$apply();
            socket.emit("find", search.value);
        }
    }
    
    socket.on("found", function(res){
        $scope.searches = res;
        $scope.$apply();
        //console.log(res);
    });
    
    
    msgInput.onkeypress = function(e){
        if (e.keyCode == 13 && e.target.value){
            data = {
                itsUN: e.target.id,
                msg: e.target.value
            }
            e.target.value = "";
            socket.emit("msg", data)
        }
    }
    
    socket.on("disconnect", function(){
        $scope.searches = [];
        $scope.messages = [];
        $scope.$apply();
        document.body.innerHTML = '<div class="error"><div class="error-smiley">:(</div><div class="error-block">Что-то пошло не так</div></div>'
    });
});
}, function (error) {});