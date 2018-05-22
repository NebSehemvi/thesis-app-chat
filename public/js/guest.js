var socket = io.connect('http://yoddl.ru');
var left = document.querySelector(".slide-left");
var right = document.querySelector(".slide-right");
var frstSlide = document.querySelector(".slide-first");
var scndSlide = document.querySelector(".slide-scnd");
var reg = document.querySelector("#register");
var Log = document.querySelector("#login");
var btnUN = document.querySelector(".new-un-btn");
var inputUN = document.querySelector(".new-un");
var lastMail, isValidated, regNick;
var regMsg = document.querySelector(".notification");

right.onmouseover = function(){
    left.style.width = "40%";
}
right.onmouseout = function(){
    left.style.width = ""
}

left.onclick = right.onclick = handlerSl1;

function handlerSl1(e) {
    if (e.target.classList[0] == "slide-left") {
        frstSlide.classList.add("uk-animation-slide-right");
        frstSlide.classList.add("uk-animation-reverse");
        scndSlide.classList.add("login");
        Log.style.display = "block";
        scndSlide.classList.add("uk-animation-slide-left");
    } else if (e.target.classList[0] == "slide-right") {
        frstSlide.classList.add("uk-animation-slide-left");
        frstSlide.classList.add("uk-animation-reverse");
        scndSlide.classList.add("register");
        reg.style.display = "block";
        scndSlide.classList.add("uk-animation-slide-right");
    }
}
        
socket.on('connected', function (data) {
    console.log(data);
});
        
inputUN.onclick = btnUN.onclick = getUN;
        
function getUN(e){
    e.preventDefault();
    inputUN.disabled = !inputUN.disabled;
    socket.emit("getUN")
}
        
socket.on("newUN", function(UN){
    inputUN.value = UN;
    inputUN.disabled = !inputUN.disabled;
});
           
setInterval(function(){
  regNick = document.querySelector(".reg-nick").value;
  let regMail = document.querySelector(".reg-email").value;
  let regPass = document.querySelector(".reg-pass").value;
    if (regMail != lastMail) {
      socket.emit("formValidate", {mail: regMail, pass: regPass});
      lastMail = regMail;
    }
}, 5000);
      
socket.on("validation", function(answer){
    if (answer.emailPass) {
      regMsg.innerHTML = "Неверная почта и пароль!"
      setTimeout(function(){regMsg.innerHTML = ""}, 5000)
      isValidated = false;
    } else if (answer.email) {
      regMsg.innerHTML = "Неверная почта!"
      setTimeout(function(){regMsg.innerHTML = ""}, 5000)
      isValidated = false;
    } else if (answer.pass) {
      regMsg.innerHTML = "Пароль должен быть только из букв латинского алфавита и/или цифр, от 5 символов!"
      setTimeout(function(){regMsg.innerHTML = ""}, 5000)
      isValidated = false;
    } else if (answer.ok) {
      regMsg.innerHTML = "Для продолжения кликните на фон"
      isValidated = true;
    }
});
        
scndSlide.onclick = function(e){
    if (e.target.classList[1] == "login"){
        log.submit()
    } else if (e.target.classList[1] == "register" && regNick && isValidated && inputUN.value) {
        reg.submit()
    }
};
        