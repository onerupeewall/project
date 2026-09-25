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

// Global Currency & Pricing State
let isIndianUser = true; // Default INR
const ratePerSecINR = 10;
const ratePerSecUSD = 0.12; // Approx $0.12 USD per second (equivalent to ₹10)

// Detect User Country via IP API (Fallback to INR if offline/blocked)
async function detectUserCurrency() {
    try {
        let response = await fetch('https://ipapi.co/json/');
        let data = await response.json();
        if (data.country_code && data.country_code !== 'IN') {
            isIndianUser = false;
            document.getElementById('currencyIndicator').innerText = "Currency: USD ($)";
            document.getElementById('currencyIndicator').style.color = "#60a5fa";
            document.getElementById('rateLabel').innerText = "$0.12/sec";
        }
    } catch (error) {
        console.log("Location detection using default INR.");
    }
    updatePricingCalculation();
}
detectUserCurrency();

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

// Admin Dashboard Modal Popup Script
const adminModal = document.getElementById('adminModal');
const openAdminBtn = document.getElementById('openAdminDashboard');
const closeAdminBtn = document.getElementById('closeAdmin');

openAdminBtn.onclick = function (e) {
    e.preventDefault();
    adminModal.style.display = "block";
}
closeAdminBtn.onclick = function () {
    adminModal.style.display = "none";
}

// Close modals when clicking outside
window.onclick = function (event) {
    if (event.target == termsModal) {
        termsModal.style.display = "none";
    }
    if (event.target == slotModal) {
        slotModal.style.display = "none";
    }
    if (event.target == adminModal) {
        adminModal.style.display = "none";
    }
}

// Dynamic Price Calculation Logic (INR vs USD)
const durationInput = document.getElementById('durationInput');
const totalAmountSpan = document.getElementById('totalAmount');

function updatePricingCalculation() {
    let seconds = parseInt(durationInput.value);
    if (isNaN(seconds) || seconds < 1) {
        seconds = 0;
    }

    if (isIndianUser) {
        let priceINR = seconds * ratePerSecINR;
        totalAmountSpan.innerText = `₹${priceINR.toLocaleString('en-IN')}`;
    } else {
        let priceUSD = seconds * ratePerSecUSD;
        totalAmountSpan.innerText = `$${priceUSD.toFixed(2)} USD`;
    }
}

durationInput.addEventListener('input', updatePricingCalculation);

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
    let currencyType = isIndianUser ? "INR (Razorpay / UPI)" : "USD (Stripe / International Gateway)";
    alert(`Redirecting to Secure Payment Gateway for ${currencyType}...`);
    slotModal.style.display = 'none';
    slotForm.reset();
    payButton.setAttribute('disabled', 'true');
    updatePricingCalculation();
});