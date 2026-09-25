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
const termsModal = document.getElementById('termsModal');
const openTermsBtn = document.getElementById('openTerms');
const closeTermsBtn = document.getElementById('closeTerms');

openTermsBtn.onclick = function (e) {
    e.preventDefault();
    termsModal.style.display = "block";
}
closeTermsBtn.onclick = function () {
    termsModal.style.display = "none";
}

// Buy Slot Modal Popup Script
const slotModal = document.getElementById('slotModal');
const openSlotBtn = document.getElementById('openSlotModal');
const closeSlotBtn = document.getElementById('closeSlotModal');

openSlotBtn.onclick = function () {
    slotModal.style.display = "block";
}
closeSlotBtn.onclick = function () {
    slotModal.style.display = "none";
}

// Close modals when clicking outside
window.onclick = function (event) {
    if (event.target == termsModal) {
        termsModal.style.display = "none";
    }
    if (event.target == slotModal) {
        slotModal.style.display = "none";
    }
}

// Dynamic Price Calculation: ₹10 per second without any upper limit restriction
const durationInput = document.getElementById('durationInput');
const totalAmountSpan = document.getElementById('totalAmount');

durationInput.addEventListener('input', function () {
    let seconds = parseInt(this.value);
    if (isNaN(seconds) || seconds < 1) {
        seconds = 0;
    }
    let price = seconds * 10; // ₹10 per second calculation
    totalAmountSpan.innerText = `₹${price.toLocaleString('en-IN')}`;
});

// Warning Checkbox Validation to Enable/Disable Payment Button
const warningCheckbox = document.getElementById('warningCheckbox');
const payButton = document.getElementById('payButton');

warningCheckbox.addEventListener('change', function () {
    if (this.checked) {
        payButton.removeAttribute('disabled');
    } else {
        payButton.setAttribute('disabled', 'true');
    }
});

// Form Submission Handler
const slotForm = document.getElementById('slotForm');
slotForm.addEventListener('submit', function (e) {
    e.preventDefault();
    alert('Redirecting to Secure Payment Gateway...');
    slotModal.style.display = 'none';
    slotForm.reset();
    payButton.setAttribute('disabled', 'true');
    totalAmountSpan.innerText = '₹300';
});