// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://swndqwcujyepctncxfhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bmRxd2N1anllcGN0bmN4ZmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzczNDQsImV4cCI6MjEwNTkxMzM0NH0.FcoPIUbbpIfUzxLOxUhMXiTirW2-j5Fw5dnfl9tqx2o';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TOTAL_DAILY_SECONDS = 50400; // 14 Hours (8 AM to 10 PM) = 50,400 Seconds

let isPlayingPastRecord = false;
let globalTimerInterval = null;

window.addEventListener('DOMContentLoaded', () => {
    initVisitorCounter();
    updateAvailableSecondsCounter();
    initLiveBillboardPlayer();
    manageUserTokenDisplay();

    // Set Minimum Date for Calendar to Tomorrow (Today disabled)
    const bookingDateInput = document.getElementById('bookingDateInput');
    if (bookingDateInput) {
        let tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        let tYear = tomorrow.getFullYear();
        let tMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
        let tDay = String(tomorrow.getDate()).padStart(2, '0');
        bookingDateInput.min = `${tYear}-${tMonth}-${tDay}`;
        bookingDateInput.value = `${tYear}-${tMonth}-${tDay}`;
    }

    // --- MODAL MANAGEMENT ---
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

    // --- CHECK RECORD MODAL MANAGEMENT ---
    const checkRecordModal = document.getElementById('checkRecordModal');
    const checkRecordBtn = document.getElementById('checkRecordBtn');
    const closeCheckRecordModal = document.getElementById('closeCheckRecordModal');

    if (checkRecordBtn && checkRecordModal) {
        checkRecordBtn.addEventListener('click', () => {
            checkRecordModal.style.display = 'block';
        });
    }

    if (closeCheckRecordModal && checkRecordModal) {
        closeCheckRecordModal.addEventListener('click', () => {
            checkRecordModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === slotModal) slotModal.style.display = 'none';
        if (e.target === termsModal) termsModal.style.display = 'none';
        if (e.target === checkRecordModal) checkRecordModal.style.display = 'none';
    });

    // --- DYNAMIC FORM INPUTS FOR FREQUENCY (Max 10) & DAYS (Max 30) ---
    const slotFormContainer = document.getElementById('slotForm');
    if (slotFormContainer && !document.getElementById('frequencyInput')) {
        const durationGroup = document.getElementById('durationInput')?.parentElement || slotFormContainer.firstElementChild;

        let campaignFieldsHTML = `
            <div style="margin-bottom: 12px;">
                <label style="font-size: 13px; color: #9ca3af; display: block; margin-bottom: 4px;">Times per Day (Max 10):</label>
                <input type="number" id="frequencyInput" value="1" min="1" max="10" style="width: 100%; padding: 8px; background: #121824; border: 1px solid #1f293d; color: #fff; border-radius: 6px;">
            </div>
            <div style="margin-bottom: 12px;">
                <label style="font-size: 13px; color: #9ca3af; display: block; margin-bottom: 4px;">Number of Days (Max 30):</label>
                <input type="number" id="campaignDaysInput" value="1" min="1" max="30" style="width: 100%; padding: 8px; background: #121824; border: 1px solid #1f293d; color: #fff; border-radius: 6px;">
            </div>
        `;
        if (durationGroup) {
            durationGroup.insertAdjacentHTML('afterend', campaignFieldsHTML);
        }
    }

    // --- INSTANT FILE VALIDATION & AUTO DURATION SELECTOR ---
    const adFileInput = document.getElementById('adFile');
    const fileErrorMsg = document.getElementById('fileErrorMsg');
    const submitBtn = document.querySelector('#slotForm button[type="submit"]');
    const durationInput = document.getElementById('durationInput');
    const frequencyInput = document.getElementById('frequencyInput');
    const campaignDaysInput = document.getElementById('campaignDaysInput');
    const totalAmount = document.getElementById('totalAmount');

    function updateCalculatedAmount() {
        if (!durationInput || !totalAmount) return;
        let dur = parseInt(durationInput.value) || 10;
        let freq = frequencyInput ? parseInt(frequencyInput.value) || 1 : 1;
        if (freq > 10) freq = 10;
        if (freq < 1) freq = 1;
        let days = campaignDaysInput ? parseInt(campaignDaysInput.value) || 1 : 1;
        if (days > 30) days = 30;
        if (days < 1) days = 1;

        let ratePerSec = 10;
        let calculatedTotal = dur * freq * days * ratePerSec;
        totalAmount.innerText = '₹' + calculatedTotal;
    }

    if (adFileInput) {
        adFileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (fileErrorMsg) {
                fileErrorMsg.style.display = 'none';
                fileErrorMsg.innerText = '';
            }
            if (submitBtn) submitBtn.disabled = false;

            if (!file) return;

            if (file.type.startsWith('video/')) {
                const videoElement = document.createElement('video');
                videoElement.preload = 'metadata';
                videoElement.onloadedmetadata = function () {
                    window.URL.revokeObjectURL(videoElement.src);
                    let vDuration = Math.round(videoElement.duration);
                    if (vDuration > 30) {
                        if (fileErrorMsg) {
                            fileErrorMsg.innerText = '⚠️ Error: Video duration is ' + vDuration + 's. Maximum 30 seconds allowed!';
                            fileErrorMsg.style.display = 'block';
                        }
                        if (submitBtn) submitBtn.disabled = true;
                        adFileInput.value = '';
                    } else {
                        if (durationInput) {
                            durationInput.value = vDuration < 1 ? 1 : vDuration;
                            updateCalculatedAmount();
                        }
                    }
                }
                videoElement.src = URL.createObjectURL(file);
            } else if (file.type.startsWith('image/')) {
                if (durationInput) {
                    durationInput.value = 10;
                    updateCalculatedAmount();
                }
            }
        });
    }

    if (durationInput) durationInput.addEventListener('input', updateCalculatedAmount);
    if (frequencyInput) frequencyInput.addEventListener('input', updateCalculatedAmount);
    if (campaignDaysInput) campaignDaysInput.addEventListener('input', updateCalculatedAmount);

    // --- EXECUTE SEARCH BUTTON LISTENER ---
    const executeSearchBtn = document.getElementById('executeSearchBtn');
    const searchResultArea = document.getElementById('searchResultArea');

    if (executeSearchBtn) {
        executeSearchBtn.addEventListener('click', async () => {
            let tokenInput = document.getElementById('searchTokenInput').value.trim();
            let searchDay = document.getElementById('searchDay').value;
            let searchMonth = document.getElementById('searchMonth').value;
            let searchYear = document.getElementById('searchYear').value;

            if (!tokenInput) {
                searchResultArea.innerHTML = '<span style="color: #ef4444;">Kripya Token Number zaroor bharein!</span>';
                return;
            }

            if (!searchDay || !searchMonth || !searchYear) {
                searchResultArea.innerHTML = '<span style="color: #ef4444;">⚠️ Kripya Day, Month aur Year teeno select karein!</span>';
                return;
            }

            let cleanToken = parseInt(tokenInput.replace('#', '')) || 1;
            searchResultArea.innerHTML = 'Searching record...';

            try {
                let { data, error } = await supabaseClient
                    .from('buysecond_records')
                    .select('*')
                    .order('id', { ascending: true });

                if (error || !data || data.length === 0) {
                    searchResultArea.innerHTML = `<span style="color: #ef4444;">Database mein koi record nahi mila.</span>`;
                    return;
                }

                let targetDayNum = parseInt(searchDay);
                let dateFilteredRecords = data.filter(rec => {
                    let slotTime = (rec.slot_time || '').toLowerCase();
                    let mMatch = slotTime.includes(searchMonth.toLowerCase());
                    let yMatch = slotTime.includes(searchYear);
                    let dMatch = slotTime.includes(` ${targetDayNum},`) || slotTime.includes(` 0${targetDayNum},`) || slotTime.includes(`${targetDayNum} `);
                    return mMatch && yMatch && dMatch;
                });

                if (dateFilteredRecords.length === 0) {
                    searchResultArea.innerHTML = `<span style="color: #ef4444;">Chuni gayi date (${searchMonth} ${searchDay}, ${searchYear}) par koi record nahi mila.</span>`;
                    return;
                }

                // Match by unified token
                let record = dateFilteredRecords.find(rec => (rec.unified_token || rec.id) === cleanToken);

                if (!record) {
                    searchResultArea.innerHTML = `<span style="color: #ef4444;">Is date par Token #${cleanToken} nahi mila!</span>`;
                    return;
                }

                let statusBadge = '';
                let actionHTML = '';

                if (record.status === 'approved') {
                    statusBadge = '<span style="color: #10B981; font-weight: bold;">Status: Approved ✅</span>';
                    actionHTML = '<button id="playSearchedAdBtn" style="margin-top: 5px; background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%;">Play Video Now</button>';
                } else if (record.status === 'rejected') {
                    statusBadge = '<span style="color: #ef4444; font-weight: bold;">Status: Rejected ❌ (Yah ad reject kar diya gaya hai)</span>';
                    actionHTML = '';
                } else {
                    statusBadge = '<span style="color: #f59e0b; font-weight: bold;">Status: Pending ⏳ (Admin approval ka wait hai)</span>';
                    actionHTML = '';
                }

                searchResultArea.innerHTML =
                    '<div style="background: #121824; padding: 14px; border-radius: 6px; border: 1px solid #1f293d; margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">' +
                    '<p><b>Brand / Ad Name:</b> ' + record.brand_name + '</p>' +
                    '<p><b>Slot Time:</b> ' + record.slot_time + '</p>' +
                    '<p><b>Duration:</b> ' + record.duration_second + ' Seconds</p>' +
                    '<p>' + statusBadge + '</p>' +
                    actionHTML +
                    '</div>';

                if (record.status === 'approved') {
                    document.getElementById('playSearchedAdBtn').addEventListener('click', () => {
                        checkRecordModal.style.display = 'none';
                        isPlayingPastRecord = true;

                        renderAdOnBillboard(record, () => {
                            isPlayingPastRecord = false;
                            initLiveBillboardPlayer();
                        });
                    });
                }

            } catch (err) {
                console.error(err);
                searchResultArea.innerHTML = '<span style="color: #ef4444;">Search karne mein error aayi hai.</span>';
            }
        });
    }

    // --- FORM SUBMISSION WITH UNIFIED CAMPAIGN TOKEN & EQUAL SPACING ---
    const slotForm = document.getElementById('slotForm');
    if (slotForm) {
        slotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const durationInputEl = document.getElementById('durationInput');
            let duration = parseInt(durationInputEl ? durationInputEl.value : 10) || 10;
            let frequency = document.getElementById('frequencyInput') ? parseInt(document.getElementById('frequencyInput').value) || 1 : 1;
            if (frequency > 10) frequency = 10;
            if (frequency < 1) frequency = 1;

            let campaignDays = document.getElementById('campaignDaysInput') ? parseInt(document.getElementById('campaignDaysInput').value) || 1 : 1;
            if (campaignDays > 30) campaignDays = 30;
            if (campaignDays < 1) campaignDays = 1;

            if (duration > 30) {
                alert('Maximum 30 seconds allowed per slot.');
                return;
            }

            const targetUrl = document.getElementById('targetUrl').value;
            const adTitle = document.getElementById('adTitle').value;
            const fileInput = document.getElementById('adFile');
            const selectedDateVal = document.getElementById('bookingDateInput').value;

            const submitBtn = slotForm.querySelector('button[type="submit"]');
            let originalText = submitBtn.innerText;
            submitBtn.innerText = 'Uploading & Booking Campaign...';
            submitBtn.disabled = true;

            try {
                let publicFileUrl = '';

                if (fileInput && fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = Date.now() + '_' + Math.random().toString(36).substring(2) + '.' + fileExt;

                    let { error: uploadError } = await supabaseClient.storage
                        .from('ad-videos')
                        .upload(fileName, file, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: file.type
                        });

                    if (uploadError) throw uploadError;

                    const { data: publicUrlData } = supabaseClient.storage
                        .from('ad-videos')
                        .getPublicUrl(fileName);

                    publicFileUrl = publicUrlData.publicUrl;
                }

                let baseParts = selectedDateVal.split('-');
                let startDate = new Date(baseParts[0], baseParts[1] - 1, baseParts[2]);

                // Calculate exact evenly-spaced intervals across the 14-hour window (50,400 seconds)
                let totalDaySecondsSpan = TOTAL_DAILY_SECONDS;
                let intervalSpace = Math.floor(totalDaySecondsSpan / frequency);

                let dayOffsets = [];
                for (let f = 0; f < frequency; f++) {
                    dayOffsets.push(f * intervalSpace);
                }

                // Fetch existing records to determine unified campaign token number starting from 1 each day/month
                let { data: existingSlots } = await supabaseClient
                    .from('buysecond_records')
                    .select('unified_token, slot_time')
                    .order('id', { ascending: true });

                let optionsCheck = { day: '2-digit', month: 'long', year: 'numeric' };
                let firstDayDateStr = startDate.toLocaleDateString('en-US', optionsCheck);

                let maxExistingToken = 0;
                if (existingSlots && existingSlots.length > 0) {
                    existingSlots.forEach(rec => {
                        if (rec.slot_time && rec.slot_time.includes(firstDayDateStr)) {
                            let t = parseInt(rec.unified_token) || 1;
                            if (t > maxExistingToken) maxExistingToken = t;
                        }
                    });
                }
                let unifiedCampaignToken = maxExistingToken + 1;

                let lastDateStr = '';
                let lastTimeStr = '';

                // Loop through each day of the campaign (up to 30 days)
                for (let d = 0; d < campaignDays; d++) {
                    let currentDayDate = new Date(startDate);
                    currentDayDate.setDate(startDate.getDate() + d);
                    let currentDayStrVal = `${currentDayDate.getFullYear()}-${String(currentDayDate.getMonth() + 1).padStart(2, '0')}-${String(currentDayDate.getDate()).padStart(2, '0')}`;
                    let targetDateStr = currentDayDate.toLocaleDateString('en-US', optionsCheck);

                    for (let f = 0; f < frequency; f++) {
                        let desiredOffset = dayOffsets[f];
                        let slotInfo = await calculateDistributedQueueSlot(duration, currentDayStrVal, desiredOffset, unifiedCampaignToken);

                        if (slotInfo.quota_exceeded) {
                            alert(`⚠️ Date ${targetDateStr} par 50,400 seconds ki seat full ho chuki hai!`);
                            break;
                        }

                        const { error: insertError } = await supabaseClient
                            .from('buysecond_records')
                            .insert([
                                {
                                    unified_token: unifiedCampaignToken,
                                    brand_name: adTitle + (frequency > 1 ? ` (Run ${f + 1}/${frequency})` : ''),
                                    target_url: targetUrl,
                                    file_url: publicFileUrl,
                                    duration_second: duration,
                                    slot_time: slotInfo.formatted_time,
                                    status: 'pending'
                                }
                            ]);

                        if (insertError) throw insertError;

                        lastDateStr = slotInfo.date_str;
                        lastTimeStr = slotInfo.time_str;
                    }
                }
                let successBox = document.getElementById('successMsgBox');
                if (!successBox) {
                    successBox = document.createElement('div');
                    successBox.id = 'successMsgBox';
                    successBox.style.cssText = 'background: #10B981; color: white; padding: 10px; margin-bottom: 10px; border-radius: 6px; text-align: center; font-weight: bold;';
                    slotForm.prepend(successBox);
                }
                successBox.innerHTML = `✅ Campaign Booked Successfully! Token: #${unifiedCampaignToken} (${campaignDays} Days, ${frequency}x/Day)`;

                await updateAvailableSecondsCounter();
                manageUserTokenDisplay(unifiedCampaignToken, lastDateStr, lastTimeStr);

                setTimeout(() => {
                    slotModal.style.display = 'none';
                    slotForm.reset();
                    if (totalAmount) totalAmount.innerText = '₹100';
                    if (successBox) successBox.remove();
                    initLiveBillboardPlayer();
                }, 3000);

            } catch (err) {
                alert('Booking failed: ' + (err.message || err));
                console.error(err);
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

// --- HELPER FUNCTIONS ---

async function initVisitorCounter() {
    let visitorEl = document.getElementById('totalGlobalCount');
    if (!visitorEl) return;

    let { data } = await supabaseClient
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

async function updateAvailableSecondsCounter() {
    let remainingEl = document.getElementById('remainingSecondsCount');
    if (!remainingEl) return;

    try {
        let tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        let options = { day: '2-digit', month: 'long', year: 'numeric' };
        let tomorrowDateStr = tomorrow.toLocaleDateString('en-US', options);

        let { data: records } = await supabaseClient
            .from('buysecond_records')
            .select('duration_second, slot_time');

        let bookedSeconds = 0;
        if (records && records.length > 0) {
            let tomorrowRecords = records.filter(rec => rec.slot_time && rec.slot_time.includes(tomorrowDateStr));
            bookedSeconds = tomorrowRecords.reduce((total, rec) => total + (parseInt(rec.duration_second) || 0), 0);
        }

        let availableSeconds = TOTAL_DAILY_SECONDS - bookedSeconds;
        if (availableSeconds < 0) availableSeconds = 0;

        remainingEl.innerText = availableSeconds;
    } catch (err) {
        console.error('Error updating available seconds:', err);
    }
}

function manageUserTokenDisplay(tokenNo, dateStr, timeStr) {
    let tokenSection = document.getElementById('userTokenSection');
    let displayTokenVal = document.getElementById('displayTokenVal');
    let displayDateVal = document.getElementById('displayDateVal');
    let displayTimeVal = document.getElementById('displayTimeVal');
    let reminderEl = document.getElementById('tokenReminderText');

    if (!tokenSection) return;

    if (tokenNo && dateStr && timeStr) {
        displayTokenVal.innerText = '#' + tokenNo;
        displayDateVal.innerText = dateStr;
        displayTimeVal.innerText = timeStr;
        tokenSection.style.display = 'block';
        if (reminderEl) reminderEl.style.display = 'block';

        localStorage.setItem('bs_token', tokenNo);
        localStorage.setItem('bs_date', dateStr);
        localStorage.setItem('bs_time', timeStr);
    } else {
        tokenSection.style.display = 'none';
        if (reminderEl) reminderEl.style.display = 'none';
    }
}

function getCountdownElement() {
    return document.getElementById('timer-text');
}

// --- INTELLIGENT MEDIA RENDERING ---
function renderAdOnBillboard(ad, onComplete) {
    const billboardBox = document.getElementById('billboardBox');
    if (!billboardBox) return;

    let duration = parseInt(ad.duration_second) || 10;
    let fileUrl = ad.file_url || ad.video_url || '';
    let targetUrl = ad.target_url || '#';

    let lowerUrl = fileUrl.toLowerCase();
    let isVideo = lowerUrl.endsWith('.mp4') || lowerUrl.includes('.mp4') || lowerUrl.includes('video') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm');

    let isCompletedCalled = false;
    function triggerComplete() {
        if (isCompletedCalled) return;
        isCompletedCalled = true;
        if (globalTimerInterval) clearInterval(globalTimerInterval);
        if (typeof onComplete === 'function') onComplete();
    }

    if (isVideo) {
        let tempVid = document.createElement('video');
        tempVid.src = fileUrl;
        tempVid.onloadedmetadata = function () {
            let isVert = tempVid.videoHeight > tempVid.videoWidth;
            buildBillboardMarkup(isVert, true);
        };
        tempVid.onerror = function () {
            buildBillboardMarkup(false, true);
        };
        setTimeout(() => {
            if (!billboardBox.querySelector('video')) {
                buildBillboardMarkup(false, true);
            }
        }, 400);
    } else {
        let tempImg = document.createElement('img');
        tempImg.src = fileUrl;
        tempImg.onload = function () {
            let isVert = tempImg.naturalHeight > tempImg.naturalWidth;
            buildBillboardMarkup(isVert, false);
        };
        tempImg.onerror = function () {
            buildBillboardMarkup(false, false);
        };
        setTimeout(() => {
            if (!billboardBox.querySelector('img')) {
                buildBillboardMarkup(false, false);
            }
        }, 400);
    }

    function buildBillboardMarkup(isVertical, isVid) {
        let mediaTagHTML = '';

        if (isVid) {
            if (isVertical) {
                mediaTagHTML = `
                    <div style="position: absolute; inset: 0; overflow: hidden; z-index: 1;">
                        <video src="${fileUrl}" autoplay muted loop playsinline style="width: 100%; height: 100%; object-fit: cover; filter: blur(15px); opacity: 0.6;"></video>
                    </div>
                    <div style="position: relative; z-index: 2; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                        <video id="activeAdMedia" src="${fileUrl}" autoplay playsinline style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);"></video>
                    </div>
                `;
            } else {
                mediaTagHTML = `
                    <div style="position: relative; z-index: 2; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                        <video id="activeAdMedia" src="${fileUrl}" autoplay playsinline style="width: 100%; height: 100%; object-fit: fill; border-radius: 6px;"></video>
                    </div>
                `;
            }
        } else {
            if (isVertical) {
                mediaTagHTML = `
                    <div style="position: absolute; inset: 0; overflow: hidden; z-index: 1;">
                        <img src="${fileUrl}" style="width: 100%; height: 100%; object-fit: cover; filter: blur(15px); opacity: 0.6;">
                    </div>
                    <div style="position: relative; z-index: 2; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                        <img src="${fileUrl}" alt="Ad" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    </div>
                `;
            } else {
                mediaTagHTML = `
                    <div style="position: relative; z-index: 2; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                        <img src="${fileUrl}" alt="Ad" style="width: 100%; height: 100%; object-fit: fill; border-radius: 6px;">
                    </div>
                `;
            }
        }

        billboardBox.innerHTML = `
            <div onclick="window.open('${targetUrl}', '_blank')" style="background: #0b0f17; color: #fff; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0px; text-align: center; border-radius: 10px; box-sizing: border-box; position: relative; overflow: hidden; cursor: pointer;">
                ${mediaTagHTML}
            </div>
        `;

        if (isVid) {
            let mediaEl = document.getElementById('activeAdMedia');
            if (mediaEl) {
                mediaEl.onended = function () {
                    triggerComplete();
                };
            }
        }
    }

    let timeLeft = duration;
    let timerEl = getCountdownElement();

    if (globalTimerInterval) clearInterval(globalTimerInterval);

    globalTimerInterval = setInterval(() => {
        if (timerEl) timerEl.innerText = `Playing Ad... (${timeLeft}s left)`;
        timeLeft--;
        if (timeLeft < 0) {
            clearInterval(globalTimerInterval);
            triggerComplete();
        }
    }, 1000);
}

// --- LIVE BILLBOARD PLAYER LOOP ---
async function initLiveBillboardPlayer() {
    const billboardBox = document.getElementById('billboardBox');
    if (!billboardBox) return;

    try {
        let { data: queueRecords, error } = await supabaseClient
            .from('buysecond_records')
            .select('*')
            .order('id', { ascending: true });

        let timerEl = getCountdownElement();

        if (error || !queueRecords || queueRecords.length === 0) {
            billboardBox.innerHTML = '';
            billboardBox.style.background = "url('buysecond.png') no-repeat center center";
            billboardBox.style.backgroundSize = "100% 100%";
            if (timerEl) timerEl.innerText = 'Next Slot in: 0s';
            return;
        }

        let now = new Date();
        let optionsCheck = { day: '2-digit', month: 'long', year: 'numeric' };
        let todayDateStr = now.toLocaleDateString('en-US', optionsCheck);

        let todaysApprovedAds = queueRecords.filter(ad => {
            return ad.status === 'approved' && ad.slot_time && ad.slot_time.includes(todayDateStr);
        });

        if (todaysApprovedAds.length === 0) {
            billboardBox.innerHTML = '';
            billboardBox.style.background = "url('buysecond.png') no-repeat center center";
            billboardBox.style.backgroundSize = "100% 100%";
            if (timerEl) timerEl.innerText = 'Next Slot in: 0s';
            return;
        }

        let dayStart = new Date(now);
        dayStart.setHours(8, 0, 0, 0);

        let scheduledAds = [];
        let accumulatedSeconds = 0;

        for (let ad of todaysApprovedAds) {
            let adDuration = parseInt(ad.duration_second) || 10;
            let adStartTime = new Date(dayStart.getTime() + (accumulatedSeconds * 1000));
            let adEndTime = new Date(adStartTime.getTime() + (adDuration * 1000));

            scheduledAds.push({
                adRecord: ad,
                start: adStartTime,
                end: adEndTime,
                duration: adDuration
            });

            accumulatedSeconds += adDuration;
        }

        function checkAndPlaySchedule() {
            if (isPlayingPastRecord) return;

            let currentTime = new Date();
            let currentPlayingAd = null;
            let nextUpcomingAd = null;

            for (let item of scheduledAds) {
                if (currentTime >= item.start && currentTime < item.end) {
                    currentPlayingAd = item;
                    break;
                } else if (currentTime < item.start) {
                    if (!nextUpcomingAd) nextUpcomingAd = item;
                }
            }

            if (currentPlayingAd) {
                let elapsedSecs = Math.floor((currentTime - currentPlayingAd.start) / 1000);
                let remainingSecs = currentPlayingAd.duration - elapsedSecs;
                if (remainingSecs < 1) remainingSecs = 1;

                renderAdOnBillboard(currentPlayingAd.adRecord, () => {
                    setTimeout(checkAndPlaySchedule, 1000);
                });
            } else {
                billboardBox.innerHTML = '';
                billboardBox.style.background = "url('buysecond.png') no-repeat center center";
                billboardBox.style.backgroundSize = "100% 100%";

                if (nextUpcomingAd) {
                    let diffSecs = Math.floor((nextUpcomingAd.start - currentTime) / 1000);
                    if (timerEl) timerEl.innerText = `Next Slot in: ${diffSecs}s`;
                } else {
                    if (timerEl) timerEl.innerText = 'Next Slot in: 0s';
                }

                setTimeout(checkAndPlaySchedule, 2000);
            }
        }

        checkAndPlaySchedule();

    } catch (err) {
        console.error('Billboard Player Error:', err);
        billboardBox.innerHTML = '';
        billboardBox.style.background = "url('buysecond.png') no-repeat center center";
        billboardBox.style.backgroundSize = "100% 100%";
    }
}

// --- DISTRIBUTED QUEUE SLOT CALCULATOR WITH UNIFIED TOKEN MAPPING ---
async function calculateDistributedQueueSlot(durationSeconds, selectedDateStr, targetOffsetSeconds, unifiedTokenId) {
    let parts = selectedDateStr.split('-');
    let targetDate = new Date(parts[0], parts[1] - 1, parts[2]);

    let dayStartHour = 8; // 8 AM Start

    let { data: existingSlots } = await supabaseClient
        .from('buysecond_records')
        .select('duration_second, slot_time')
        .order('id', { ascending: true });

    let optionsCheck = { day: '2-digit', month: 'long', year: 'numeric' };
    let targetDateStr = targetDate.toLocaleDateString('en-US', optionsCheck);

    let targetDateSlots = [];
    if (existingSlots && existingSlots.length > 0) {
        targetDateSlots = existingSlots.filter(rec => rec.slot_time && rec.slot_time.includes(targetDateStr));
    }

    let totalBookedSecondsBeforeThis = targetDateSlots.reduce((sum, rec) => sum + (parseInt(rec.duration_second) || 0), 0);

    if (totalBookedSecondsBeforeThis + durationSeconds > TOTAL_DAILY_SECONDS) {
        return { quota_exceeded: true };
    }

    let startTime = new Date(targetDate);
    startTime.setHours(dayStartHour, 0, 0, 0);
    startTime.setSeconds(startTime.getSeconds() + targetOffsetSeconds);

    let dateStr = startTime.toLocaleDateString('en-US', optionsCheck);
    let timeStr = startTime.toLocaleTimeString();

    return {
        quota_exceeded: false,
        unified_token_id: unifiedTokenId,
        formatted_time: dateStr + ' at ' + timeStr,
        date_str: dateStr,
        time_str: timeStr
    };
}