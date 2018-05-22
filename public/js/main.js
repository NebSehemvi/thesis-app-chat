var fShadow = document.querySelector(".form-shadow");
var elements = document.querySelector(".elements");
let newChatBtn = document.querySelector(".sidebar-user-newchat");
let ncForm = document.querySelector(".new-chat");
var sideBar = {};
var chat = {};
    sideBar.el = document.querySelector(".sidebar");
    chat.el = document.querySelector(".chat");
    sideBar.scrolled;
    chat.scrolled;
    chat.lastScroll = 0;
    sideBar.lastScroll = 0;
newChatBtn.onclick = function(){
    elements.classList.add("blurred");
    fShadow.style.display = "block";
};
fShadow.onclick = function(){
    elements.classList.remove("blurred");
    fShadow.style.display = "none";  
};
ncForm.onclick = function(e){
    e.stopPropagation();
};
sideBar.el.onscroll = function() {
    sideBar.scrolled = sideBar.el.scrollTop;
    sideBar.el.classList.add("onscroll");
};
chat.el.onscroll = function() {
    chat.scrolled = chat.el.scrollTop;
    chat.el.classList.add("onscroll");
};
function scrollHandler(elArr){
    if(elArr.scrolled == elArr.lastScroll) {
        return elArr.el.classList.remove("onscroll");
    } else {
        return elArr.lastScroll = elArr.scrolled;
    }
}
setInterval(scrollHandler, 750, sideBar);
setInterval(scrollHandler, 750, chat);