// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://swndqwcujyepctncxfhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bmRxd2N1anllcGN0bmN4ZmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzczNDQsImV4cCI6MjEwNTkxMzM0NH0.FcoPIUbbpIfUzxLOxUhMXiTirW2-j5Fw5dnfl9tqx2o'; // Apni working key yahan rakhein

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TOTAL_DAILY_SECONDS = 50400; // 8 AM to 10 PM = 14 Hours = 50,400 Seconds

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

// --- LIVE VISITOR COUNTER LOGIC ---
async function initVisitorCounter() {
    let visitorEl = document.getElementById('totalGlobalCount');
    if (!visitorEl) return;

    let { data, error } = await supabaseClient
        .from('site_analytics')
        .select('count')
        .eq('id', 1)
        .single();

    let currentCount = data ? data.count : 120;
    currentCount += 1;

    await supabaseClient
        .from('site_analytics')
        .upsert({ id: 1, count: currentCount });

    visitorEl.innerText = currentCount;
}

// --- TOTAL SECONDS COUNTER & DYNAMIC MINUS LOGIC ---
async function updateAvailableSecondsCounter() {
    let remainingEl = document.getElementById('remainingSecondsCount');
    if (!remainingEl) return;

    try {
        let { data: records, error } = await supabaseClient
            .from('buysecond_records')
            .select('duration_second');

        let bookedSeconds = 0;
        if (records && records.length > 0) {
            bookedSeconds = records.reduce((total, rec) => total + (parseInt(rec.duration_second) || 0), 0);
        }

        let availableSeconds = TOTAL_DAILY_SECONDS - bookedSeconds;
        if (availableSeconds < 0) availableSeconds = 0;

        remainingEl.innerText = availableSeconds;
    } catch (err) {
        console.error('Error updating available seconds:', err);
    }
}

// --- USER TOKEN & TIMING DISPLAY LOGIC ---
function manageUserTokenDisplay(tokenNo, slotTime) {
    let tokenDisplayEl = document.getElementById('userTokenDisplay');
    if (!tokenDisplayEl) return;

    if (tokenNo && slotTime) {
        tokenDisplayEl.innerHTML = `🎟️ Your Active Token: <b>#${tokenNo}</b> | Scheduled Time: <b>${slotTime}</b> (Ad play hone tak yahan dikhega)`;
        tokenDisplayEl.style.display = 'block';
        localStorage.setItem('buysecond_token', tokenNo);
        localStorage.setItem('buysecond_time', slotTime);
    } else {
        let savedToken = localStorage.getItem('buysecond_token');
        let savedTime = localStorage.getItem('buysecond_time');
        if (savedToken && savedTime) {
            tokenDisplayEl.innerHTML = `🎟️ Your Active Token: <b>#${savedToken}</b> | Scheduled Time: <b>${savedTime}</b>`;
            tokenDisplayEl.style.display = 'block';
        } else {
            tokenDisplayEl.style.display = 'none';
        }
    }
}

// --- LIVE BILLBOARD AUTO-PLAYER & ADMIN APPROVAL LOGIC ---
async function initLiveBillboardPlayer() {
    const billboardBox = document.getElementById('billboardBox');
    if (!billboardBox) return;

    const defaultBannerHTML = billboardBox.innerHTML;

    try {
        let { data: queueRecords, error } = await supabaseClient
            .from('buysecond_records')
            .select('*')
            .order('id', { ascending: true });

        if (error || !queueRecords || queueRecords.length === 0) {
            billboardBox.innerHTML = defaultBannerHTML;
            return;
        }

        // Sirf wahi ads play honge jinko admin ne 'approved' kiya hai
        let approvedAds = queueRecords.filter(ad => ad.status === 'approved');

        if (approvedAds.length === 0) {
            billboardBox.innerHTML = defaultBannerHTML;
            return;
        }

        let currentIndex = 0;

        function playNextApprovedAd() {
            if (currentIndex >= approvedAds.length) {
                currentIndex = 0;
            }

            let currentAd = approvedAds[currentIndex];
            let duration = (currentAd.duration_second || 10) * 1000;

            // Screen par approved ad play karo
            billboardBox.innerHTML = `
                <div style="background: #000; color: #fff; width: 100%; height: 100%; min-height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; border-radius: 8px;">
                    <h2 style="color: #10B981; margin-bottom: 10px;">📢 Live Ad: ${currentAd.brand_name}</h2>
                    <p style="margin-bottom: 15px; color: #ccc;">Visiting: <a href="${currentAd.target_url}" target="_blank" style="color: #38BDF8;">${currentAd.target_url}</a></p>
                    <div style="font-size: 14px; background: rgba(255,255,255,0.1); padding: 5px 15px; border-radius: 20px;">Duration: ${currentAd.duration_second} Seconds</div>
                </div>
            `;

            // Jaise hi ad play shuru ho, user ka token display hata do (kyunki live ho gaya)
            localStorage.removeItem('buysecond_token');
            localStorage.removeItem('buysecond_time');
            manageUserTokenDisplay(null, null);

            currentIndex++;

            setTimeout(() => {
                if (currentIndex < approvedAds.length) {
                    playNextApprovedAd();
                } else {
                    billboardBox.innerHTML = defaultBannerHTML;
                }
            }, duration);
        }

        playNextApprovedAd();

    } catch (err) {
        console.error('Billboard Player Error:', err);
        billboardBox.innerHTML = defaultBannerHTML;
    }
}

// --- QUEUE & TOKEN SCHEDULING LOGIC ---
async function calculateNextQueueSlot(durationSeconds) {
    let targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);

    let dayStartHour = 8;

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

    return {
        queue_number: nextQueueNo,
        formatted_time: `${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}`
    };
}

// --- FORM SUBMISSION & SUCCESS NOTIFICATION ---
const slotForm = document.getElementById('slotForm');
if (slotForm) {
    slotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const duration = parseInt(durationInput.value) || 10;
        const targetUrl = document.getElementById('targetUrl').value;
        const adTitle = document.getElementById('adTitle').value;

        const fileInput = slotForm.querySelector('input[type="file"]');
        const fileName = fileInput && fileInput.files[0] ? fileInput.files[0].name : '';

        const submitBtn = slotForm.querySelector('button[type="submit"]');
        let originalText = submitBtn.innerText;
        submitBtn.innerText = 'Processing...';
        submitBtn.disabled = true;

        try {
            let slotInfo = await calculateNextQueueSlot(duration);

            // Note: status 'pending' rakhi hai taaki bina owner approval ke live na chale
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

            if (error) throw error;

            let successBox = document.getElementById('successMsgBox');
            if (!successBox) {
                successBox = document.createElement('div');
                successBox.id = 'successMsgBox';
                successBox.style.cssText = 'background: #10B981; color: white; padding: 10px; margin-bottom: 10px; border-radius: 6px; text-align: center; font-weight: bold;';
                slotForm.prepend(successBox);
            }
            successBox.innerHTML = `✅ Booking Successful! Token: #${slotInfo.queue_number} | Time: ${slotInfo.formatted_time}`;

            // Turant available seconds counter ko update karo (minus karke)
            await updateAvailableSecondsCounter();
            manageUserTokenDisplay(slotInfo.queue_number, slotInfo.formatted_time);

            setTimeout(() => {
                slotModal.style.display = 'none';
                slotForm.reset();
                totalAmount.innerText = '₹100';
                if (successBox) successBox.remove();
            }, 4000);

        } catch (err) {
            alert('Booking failed: ' + (err.message || err));
            console.error(err);
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Page load par saare systems start karein
window.addEventListener('DOMContentLoaded', () => {
    initVisitorCounter();
    updateAvailableSecondsCounter();
    initLiveBillboardPlayer();
    manageUserTokenDisplay();
});