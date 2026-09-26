// Toggle Dropdown Function
function toggleDropdown(listId, event) {
    event.stopPropagation();
    const list = document.getElementById(listId);
    document.querySelectorAll('.custom-dropdown-list').forEach(l => {
        if (l !== list) l.style.display = 'none';
    });
    list.style.display = list.style.display === 'block' ? 'none' : 'block';
}

// Select value from list into input
function selectValue(inputId, val, listId) {
    document.getElementById(inputId).value = val;
    document.getElementById(listId).style.display = 'none';
}

// Close dropdowns on outside click
window.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown-list').forEach(l => l.style.display = 'none');
});

// Checkbox enabling script fix
const warningCheckbox = document.getElementById('warningCheckbox');
const payButton = document.getElementById('payButton');

warningCheckbox.addEventListener('change', function () {
    if (this.checked) {
        payButton.removeAttribute('disabled');
        payButton.style.opacity = '1';
        payButton.style.cursor = 'pointer';
    } else {
        payButton.setAttribute('disabled', 'true');
        payButton.style.opacity = '0.6';
        payButton.style.cursor = 'not-allowed';
    }
});

payButton.style.opacity = '0.6';
payButton.style.cursor = 'not-allowed';

// Dynamic Price Calculation based on duration
const durationInput = document.getElementById('durationInput');
const totalAmount = document.getElementById('totalAmount');

durationInput.addEventListener('input', function () {
    let val = parseInt(this.value) || 0;
    totalAmount.textContent = '₹' + (val * 10);
});

// Form Submission & Live Dynamic Countdown Timer Logic
let countdownInterval = null;
const slotForm = document.getElementById('slotForm');
const timerText = document.getElementById('timer-text');
const modal = document.getElementById('slotModal');

slotForm.addEventListener('submit', function (e) {
    e.preventDefault();

    // Get user selected duration in seconds
    let duration = parseInt(durationInput.value) || 10;

    // Close modal
    modal.style.display = 'none';

    // Clear any existing timer
    if (countdownInterval) clearInterval(countdownInterval);

    // Start live countdown based on user selection
    let timeLeft = duration;
    timerText.textContent = `Next Video in: ${timeLeft} Sec`;

    countdownInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft >= 0) {
            timerText.textContent = `Next Video in: ${timeLeft} Sec`;
        } else {
            clearInterval(countdownInterval);
            timerText.textContent = `Next Video in: 0 Sec`;
        }
    }, 1000);

    alert('Slot booked successfully! Live countdown has started based on your selected duration.');
});

// Modal triggers
const openBtn = document.getElementById('openSlotModal');
const closeBtn = document.getElementById('closeSlotModal');

openBtn.onclick = () => modal.style.display = 'block';
closeBtn.onclick = () => modal.style.display = 'none';

const termsModal = document.getElementById('termsModal');
const openTerms = document.getElementById('openTerms');
const closeTerms = document.getElementById('closeTerms');

openTerms.onclick = (e) => { e.preventDefault(); termsModal.style.display = 'block'; };
closeTerms.onclick = () => termsModal.style.display = 'none';

window.onclick = (event) => {
    if (event.target == modal) modal.style.display = 'none';
    if (event.target == termsModal) termsModal.style.display = 'none';
};