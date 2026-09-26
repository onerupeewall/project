// Toggle Dropdown Function
function toggleDropdown(listId, event) {
    event.stopPropagation();
    const list = document.getElementById(listId);
    document.querySelectorAll('.custom-dropdown-list').forEach(l => {
        if (l !== list) l.style.display = 'none';
    });
    list.style.display = list.style.display === 'block' ? 'none' : 'block';
}

function selectValue(inputId, val, listId) {
    document.getElementById(inputId).value = val;
    document.getElementById(listId).style.display = 'none';
}

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

// Dynamic Price Calculation
const durationInput = document.getElementById('durationInput');
const totalAmount = document.getElementById('totalAmount');

durationInput.addEventListener('input', function () {
    let val = parseInt(this.value) || 0;
    totalAmount.textContent = '₹' + (val * 10);
});

// Shuruat mein global users data bilkul khali (zero) rahega
let globalUsersData = {};

function renderGlobalUsers() {
    const countryListEl = document.getElementById('countryList');
    const totalGlobalCountEl = document.getElementById('totalGlobalCount');

    countryListEl.innerHTML = '';
    let totalUsers = 0;

    let hasData = false;
    for (let country in globalUsersData) {
        hasData = true;
        let data = globalUsersData[country];
        totalUsers += data.count;

        let item = document.createElement('div');
        item.className = 'country-item';
        // Number ke just pehle 'Users' likha hoga aur rang white hoga
        item.innerHTML = `
            <div class="country-name">
                <span>${data.flag}</span> ${country}
            </div>
            <div class="country-count">Users ${data.count.toLocaleString()}</div>
        `;
        countryListEl.appendChild(item);
    }

    // Agar koi data nahi hai toh list mein message ya khali rakhein
    if (!hasData) {
        countryListEl.innerHTML = '<div style="color: #6b7280; font-size: 13px; text-align: center; padding: 6px;">No active country slots yet.</div>';
    }

    totalGlobalCountEl.textContent = totalUsers.toLocaleString();
}

// Initial render (0 total count ke saath)
renderGlobalUsers();

// Form Submission & Live Slot / Counter Update Logic
let countdownInterval = null;
const slotForm = document.getElementById('slotForm');
const timerText = document.getElementById('timer-text');
const modal = document.getElementById('slotModal');

slotForm.addEventListener('submit', function (e) {
    e.preventDefault();

    let duration = parseInt(durationInput.value) || 10;
    let selectedCountrySelect = document.getElementById('slotCountry');
    let chosenCountry = selectedCountrySelect.value;
    let chosenFlag = selectedCountrySelect.options[selectedCountrySelect.selectedIndex].getAttribute('data-flag');

    // Country-wise count update ya add hoga
    if (!globalUsersData[chosenCountry]) {
        globalUsersData[chosenCountry] = { count: 1, flag: chosenFlag };
    } else {
        globalUsersData[chosenCountry].count += 1;
    }

    // Live update render
    renderGlobalUsers();

    // Close modal
    modal.style.display = 'none';

    if (countdownInterval) clearInterval(countdownInterval);

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

    alert(`Slot booked successfully from ${chosenCountry}! Counter updated live.`);
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