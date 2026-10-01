// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://swndqwrujyepctncxfhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Apni legacy/working key yahan rakhein

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Modal Management for Slot Form
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

// Terms Modal Management
const termsModal = document.getElementById('termsModal');
const openTermsBtn = document.getElementById('openTermsBtn');
const closeTermsModal = document.getElementById('closeTermsModal');

if (openTermsBtn && termsModal) {
    openTermsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        termsModal.style.display = 'block';
    });
}

if (closeTermsModal && termsModal) {
    closeTermsModal.addEventListener('click', () => {
        termsModal.style.display = 'none';
    });
}

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target === slotModal) slotModal.style.display = 'none';
    if (e.target === termsModal) termsModal.style.display = 'none';
});

// Country Dropdown Toggle & Selection
const countryDropdownToggle = document.getElementById('countryDropdownToggle');
const countryDropdownList = document.getElementById('countryDropdownList');
const slotCountryDisplay = document.getElementById('slotCountryDisplay');
const slotCountry = document.getElementById('slotCountry');

if (countryDropdownToggle && countryDropdownList) {
    countryDropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        countryDropdownList.style.display = countryDropdownList.style.display === 'block' ? 'none' : 'block';
    });
}

if (slotCountryDisplay && countryDropdownList) {
    slotCountryDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
        countryDropdownList.style.display = countryDropdownList.style.display === 'block' ? 'none' : 'block';
    });
}

if (countryDropdownList) {
    countryDropdownList.addEventListener('click', (e) => {
        const item = e.target.closest('.custom-dropdown-item');
        if (item) {
            const countryName = item.getAttribute('data-country');
            const flag = item.getAttribute('data-flag');
            slotCountryDisplay.value = flag + ' ' + countryName;
            slotCountry.value = countryName;
            countryDropdownList.style.display = 'none';
        }
    });
}

// Hide dropdown when clicking outside
window.addEventListener('click', () => {
    if (countryDropdownList) countryDropdownList.style.display = 'none';
});

// Duration & Total Amount Calculation (₹10/sec)
const durationInput = document.getElementById('durationInput');
const totalAmount = document.getElementById('totalAmount');
if (durationInput && totalAmount) {
    durationInput.addEventListener('input', () => {
        let val = parseInt(durationInput.value) || 0;
        totalAmount.innerText = '₹' + (val * 10);
    });
}

// --- LIVE VISITOR COUNTER LOGIC (Using site_analytics table) ---
async function initVisitorCounter() {
    let visitorEl = document.getElementById('totalGlobalCount');
    if (!visitorEl) return;

    let hasVisited = sessionStorage.getItem('buysecond_visited');

    let { data, error } = await supabaseClient
        .from('site_analytics')
        .select('count')
        .eq('id', 1)
        .single();

    let currentCount = data ? data.count : 120;

    if (!hasVisited) {
        currentCount += 1;
        sessionStorage.setItem('buysecond_visited', 'true');

        await supabaseClient
            .from('site_analytics')
            .upsert({ id: 1, count: currentCount });
    }

    visitorEl.innerText = currentCount;
}

// --- QUEUE & TOKEN SCHEDULING LOGIC (8 AM to 10 PM Window, Starts Tomorrow) ---
async function calculateNextQueueSlot(durationSeconds) {
    let targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    let dateStr = targetDate.toISOString().split('T')[0];

    let dayStartHour = 8;
    let dayEndHour = 22;

    let { data: existingSlots, error } = await supabaseClient
        .from('buysecond_records')
        .select('*')
        .order('id', { ascending: false });

    let nextQueueNo = 1;
    let allocatedTimeObj = new Date(targetDate);
    allocatedTimeObj.setHours(dayStartHour, 0, 0, 0);

    if (existingSlots && existingSlots.length > 0) {
        nextQueueNo = existingSlots.length + 1;
    }

    let startTime = new Date(allocatedTimeObj);
    let endTime = new Date(startTime.getTime() + durationSeconds * 1000);

    return {
        queue_number: nextQueueNo,
        formatted_time: `${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}`
    };
}

// --- FORM SUBMISSION & TOKEN GENERATION ---
const slotForm = document.getElementById('slotForm');
if (slotForm) {
    slotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const duration = parseInt(durationInput.value) || 10;
        const targetUrl = document.getElementById('targetUrl').value;
        const adTitle = document.getElementById('adTitle').value;
        const country = slotCountry.value;

        const fileInput = slotForm.querySelector('input[type="file"]');
        const fileName = fileInput && fileInput.files[0] ? fileInput.files[0].name : '';

        const submitBtn = slotForm.querySelector('button[type="submit"]');
        let originalText = submitBtn.innerText;
        submitBtn.innerText = 'Processing Queue & Token...';
        submitBtn.disabled = true;

        try {
            let slotInfo = await calculateNextQueueSlot(duration);

            // Supabase database mein save karo (Aapke exact table columns ke sath)
            const { data, error } = await supabaseClient
                .from('buysecond_records')
                .insert([
                    {
                        brand_name: adTitle,
                        target_url: targetUrl,
                        video_url: fileName,
                        duration_second: duration,
                        slot_time: slotInfo.formatted_time,
                        status: 'pending'
                    }
                ]);

            if (error) {
                throw error;
            }

            alert(`🎉 बधाई हो! आपकी बुकिंग सफल हो गई है।\n\n🎟️ आपका टोकन नंबर: #${slotInfo.queue_number}\n🕒 आपकी विज्ञापन चलने का समय: ${slotInfo.formatted_time}\n\nअब आपको पेमेंट गेटवे पर redirect किया जा रहा है...`);

            slotModal.style.display = 'none';
            slotForm.reset();
            totalAmount.innerText = '₹100';

        } catch (err) {
            alert('Booking failed: ' + (err.message || err));
            console.error(err);
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Page load par visitor counter initialize karein
window.addEventListener('DOMContentLoaded', () => {
    initVisitorCounter();
});