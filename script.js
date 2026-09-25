// Countdown Timer Logic
let timeLeft = 15;
const timerText = document.getElementById('timer-text');

setInterval(() => {
    timeLeft--;
    if (timeLeft < 0) {
        timeLeft = 15;
    }
    timerText.innerHTML = `Next Video in: ${timeLeft} Sec`;
}, 1000);

// Terms & Conditions Modal Popup Script
const modal = document.getElementById('termsModal');
const openBtn = document.getElementById('openTerms');
const closeBtn = document.getElementById('closeTerms');

openBtn.onclick = function (e) {
    e.preventDefault();
    modal.style.display = "block";
}

closeBtn.onclick = function () {
    modal.style.display = "none";
}

window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}