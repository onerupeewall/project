// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://swndqwrujyepctncxfhr.supabase.co';     // Yahan apna Supabase URL dalein
const SUPABASE_ANON_KEY = 'sb_publishable_W8ttckZLmLeYTq8CTxTkCg_F3cJ90n4'; // Yahan apni Supabase Anon Key dalein

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Modal Management
const slotModal = document.getElementById('slotModal');
const openSlotModal = document.getElementById('openSlotModal');
const closeSlotModal = document.getElementById('closeSlotModal');

if (openSlotModal && slotModal) {
    openSlotModal.addEventListener('click', () => {
        slotModal.style.display = 'block';
    });
}

if (closeSlotModal && slotModal) {
    closeSlotModal.addEventListener('click', () => {
        slotModal.style.display = 'none';
    });
}

// Terms Modal
const termsModal = document.getElementById('termsModal');
const openTerms = document.getElementById('openTerms');
const closeTerms = document.getElementById('closeTerms');

if (openTerms && termsModal) {
    openTerms.addEventListener('click', (e) => {
        e.preventDefault();
        termsModal.style.display = 'block';
    });
}

if (closeTerms && termsModal) {
    closeTerms.addEventListener('click', () => {
        termsModal.style.display = 'none';
    });
}

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target === slotModal) slotModal.style.display = 'none';
    if (e.target === termsModal) termsModal.style.display = 'none';
});

// Country Dropdown Toggle
function toggleDropdown(id, event) {
    event.stopPropagation();
    const list = document.getElementById(id);
    if (list) {
        list.style.display = list.style.display === 'block' ? 'none' : 'block';
    }
}

function selectCountry(countryName, flag) {
    document.getElementById('slotCountryDisplay').value = flag + ' ' + countryName;
    document.getElementById('slotCountry').value = countryName;
    document.getElementById('countryDropdownList').style.display = 'none';
}

// Duration & Total Amount Calculation
const durationInput = document.getElementById('durationInput');
const totalAmount = document.getElementById('totalAmount');
if (durationInput && totalAmount) {
    durationInput.addEventListener('input', () => {
        let val = parseInt(durationInput.value) || 0;
        totalAmount.innerText = '₹' + (val * 10);
    });
}

// Second Dropdown Open/Close Toggle & Database Fetch Logic
const secondDisplay = document.getElementById('slotSecondDisplay');
const secondDropdown = document.getElementById('secondDropdownList');
const hiddenSecondInput = document.getElementById('slotSecond');

if (secondDisplay && secondDropdown) {
    secondDisplay.addEventListener('click', async (e) => {
        e.stopPropagation();
        const date = document.getElementById('slotDate').value;
        const hour = document.getElementById('slotHour').value;
        const minute = document.getElementById('slotMinute').value;

        if (!date || !hour || !minute) {
            alert('कृपया पहले तारीख (Date), घंटा (Hour), और मिनट (Minute) भरें!');
            return;
        }

        await populateSecondsDropdown(date, hour, minute);
        secondDropdown.style.display = secondDropdown.style.display === 'block' ? 'none' : 'block';
    });
}

// Hide dropdowns when clicking outside
window.addEventListener('click', () => {
    if (secondDropdown) secondDropdown.style.display = 'none';
    const countryList = document.getElementById('countryDropdownList');
    if (countryList) countryList.style.display = 'none';
});

async function populateSecondsDropdown(date, hour, minute) {
    secondDropdown.innerHTML = '<div style="padding: 8px 10px; color: #9ca3af; font-size: 13px;">Loading booked seconds...</div>';

    // Supabase table se booked slots fetch karna
    const { data: bookedSlots, error } = await supabaseClient
        .from('buysecond_records')
        .select('*')
        .eq('slot_date', date)
        .eq('slot_hour', hour)
        .eq('slot_minute', minute);

    if (error) {
        console.error('Error fetching booked slots:', error);
        secondDropdown.innerHTML = '<div style="padding: 8px 10px; color: #ef4444; font-size: 13px;">Error loading slots</div>';
        return;
    }

    secondDropdown.innerHTML = '';
    let bookedSecondsInThisMinute = [];

    if (bookedSlots) {
        bookedSlots.forEach(slot => {
            for (let i = 0; i < slot.duration; i++) {
                let sec = parseInt(slot.start_second) + i;
                if (sec <= 59) bookedSecondsInThisMinute.push(sec);
            }
        });
    }

    for (let i = 0; i < 60; i++) {
        let secStr = i < 10 ? '0' + i : '' + i;
        let item = document.createElement('div');
        item.innerText = secStr;
        item.style.padding = '8px 10px';
        item.style.fontSize = '13px';
        item.style.cursor = 'pointer';

        if (bookedSecondsInThisMinute.includes(i)) {
            item.style.color = '#6b7280'; // Grey / Un-highlighted for booked seconds
            item.style.backgroundColor = '#1e293b';
            item.style.cursor = 'not-allowed';
            item.title = 'This second is already booked!';
        } else {
            item.style.color = '#ffffff'; // Highlighted for available seconds
            item.style.backgroundColor = 'transparent';

            item.onmouseover = () => item.style.backgroundColor = '#334155';
            item.onmouseout = () => item.style.backgroundColor = 'transparent';

            item.onclick = () => {
                secondDisplay.value = secStr;
                hiddenSecondInput.value = secStr;
                secondDropdown.style.display = 'none';
            };
        }

        secondDropdown.appendChild(item);
    }
}

// Form Submit & Saving to Supabase Database
const slotForm = document.getElementById('slotForm');
if (slotForm) {
    slotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('slotDate').value;
        const hour = document.getElementById('slotHour').value;
        const minute = document.getElementById('slotMinute').value;
        const startSecond = hiddenSecondInput.value;
        const duration = parseInt(durationInput.value) || 10;
        const targetUrl = document.getElementById('targetUrl').value;
        const adTitle = document.getElementById('adTitle').value;

        if (!startSecond) {
            alert('कृपया कोई उपलब्ध सेकंड (Second) चुनें!');
            return;
        }

        // Supabase table mein data insert karna
        const { data, error } = await supabaseClient
            .from('booked_slots')
            .insert([
                {
                    slot_date: date,
                    slot_hour: hour,
                    slot_minute: minute,
                    start_second: startSecond,
                    duration: duration,
                    target_url: targetUrl,
                    ad_title: adTitle
                }
            ]);

        if (error) {
            alert('Booking failed: ' + error.message);
            console.error(error);
        } else {
            alert('Slot successfully booked and saved to database! Redirecting to payment...');
            slotModal.style.display = 'none';
            slotForm.reset();
            secondDisplay.value = '';
        }
    });
}

// Enable/disable pay button based on warning checkbox
const warningCheckbox = document.getElementById('warningCheckbox');
const payButton = document.getElementById('payButton');
if (warningCheckbox && payButton) {
    warningCheckbox.addEventListener('change', () => {
        payButton.disabled = !warningCheckbox.checked;
    });
}