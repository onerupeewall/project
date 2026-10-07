const SUPABASE_URL = 'https://swndqwcujyepctncxfhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bmRxd2N1anllcGN0bmN4ZmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzczNDQsImV4cCI6MjEwNTkxMzM0NH0.FcoPIUbbpIfUzxLOxUhMXiTirW2-j5Fw5dnfl9tqx2o';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const TOTAL_DAILY_SECONDS = 50400; // 8 AM to 10 PM

let isPlayingPastRecord = false;
let globalTimerInterval = null;

window.addEventListener('DOMContentLoaded', () => {
    initVisitorCounter();
    updateAvailableSecondsCounter();

    let adminPreviewAdJson = sessionStorage.getItem('admin_preview_ad');
    if (adminPreviewAdJson) {
        try {
            let previewAd = JSON.parse(adminPreviewAdJson);
            playAdminPreviewOnBillboard(previewAd);
        } catch (e) {
            initLiveBillboardPlayer();
        }
    } else {
        initLiveBillboardPlayer();
    }

    loadMyActiveCampaign();

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

    const slotModal = document.getElementById('slotModal');
    const openSlotModal = document.getElementById('openSlotModal');
    const closeSlotModal = document.getElementById('closeSlotModal');

    if (openSlotModal && slotModal) openSlotModal.addEventListener('click', () => slotModal.style.display = 'block');
    if (closeSlotModal && slotModal) closeSlotModal.addEventListener('click', () => slotModal.style.display = 'none');

    const termsModal = document.getElementById('termsModal');
    const openTermsBtn = document.getElementById('openTermsBtn');
    const closeTermsModal = document.getElementById('closeTermsModal');

    if (openTermsBtn && termsModal) openTermsBtn.addEventListener('click', (e) => { e.preventDefault(); termsModal.style.display = 'block'; });
    if (closeTermsModal && termsModal) closeTermsModal.addEventListener('click', () => termsModal.style.display = 'none');

    const checkRecordModal = document.getElementById('checkRecordModal');
    const checkRecordBtn = document.getElementById('checkRecordBtn');
    const closeCheckRecordModal = document.getElementById('closeCheckRecordModal');

    if (checkRecordBtn && checkRecordModal) checkRecordBtn.addEventListener('click', () => { checkRecordModal.style.display = 'block'; loadMyActiveCampaign(); });
    if (closeCheckRecordModal && checkRecordModal) closeCheckRecordModal.addEventListener('click', () => checkRecordModal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (slotModal && e.target === slotModal) slotModal.style.display = 'none';
        if (termsModal && e.target === termsModal) termsModal.style.display = 'none';
        if (checkRecordModal && e.target === checkRecordModal) checkRecordModal.style.display = 'none';
    });

    const slotFormContainer = document.getElementById('slotForm');
    if (slotFormContainer && !document.getElementById('frequencyInput')) {
        const durationGroup = document.getElementById('durationInput')?.parentElement || slotFormContainer.firstElementChild;
        let campaignFieldsHTML = `
            <div class="form-group" style="margin-bottom: 15px;">
                <label>Times per Day (Max 10):</label>
                <input type="number" id="frequencyInput" value="1" min="1" max="10" required>
            </div>
            <div class="form-group" style="margin-bottom: 15px;">
                <label>Number of Days (Max 30):</label>
                <input type="number" id="campaignDaysInput" value="1" min="1" max="30" required>
            </div>
        `;
        if (durationGroup) durationGroup.insertAdjacentHTML('afterend', campaignFieldsHTML);
    }

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
        let days = campaignDaysInput ? parseInt(campaignDaysInput.value) || 1 : 1;
        totalAmount.innerText = '₹' + (dur * freq * days * 10);
    }

    if (adFileInput) {
        adFileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (fileErrorMsg) { fileErrorMsg.style.display = 'none'; fileErrorMsg.innerText = ''; }
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
                            fileErrorMsg.innerText = '⚠️ Error: Max 30 seconds allowed!';
                            fileErrorMsg.style.display = 'block';
                        }
                        if (submitBtn) submitBtn.disabled = true;
                        adFileInput.value = '';
                    } else if (durationInput) {
                        durationInput.value = vDuration < 1 ? 1 : vDuration;
                        updateCalculatedAmount();
                    }
                }
                videoElement.src = URL.createObjectURL(file);
            } else if (file.type.startsWith('image/')) {
                if (durationInput) { durationInput.value = 10; updateCalculatedAmount(); }
            }
        });
    }

    if (durationInput) durationInput.addEventListener('input', updateCalculatedAmount);
    if (frequencyInput) frequencyInput.addEventListener('input', updateCalculatedAmount);
    if (campaignDaysInput) campaignDaysInput.addEventListener('input', updateCalculatedAmount);

    if (slotFormContainer) {
        slotFormContainer.addEventListener('submit', async (e) => {
            e.preventDefault();
            let duration = parseInt(document.getElementById('durationInput')?.value) || 10;
            let frequency = parseInt(document.getElementById('frequencyInput')?.value) || 1;
            let campaignDays = parseInt(document.getElementById('campaignDaysInput')?.value) || 1;
            const targetUrl = document.getElementById('targetUrl').value;
            const adTitle = document.getElementById('adTitle').value;
            const fileInput = document.getElementById('adFile');
            const selectedDateVal = document.getElementById('bookingDateInput').value;

            const submitBtnEl = slotFormContainer.querySelector('button[type="submit"]');
            if (submitBtnEl) { submitBtnEl.innerText = 'Submitting...'; submitBtnEl.disabled = true; }

            try {
                let publicFileUrl = '';
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];
                    const fileName = Date.now() + '_' + Math.random().toString(36).substring(2) + '.' + file.name.split('.').pop();
                    let { error: uploadError } = await supabaseClient.storage.from('ad-videos').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    let { data: publicUrlData } = supabaseClient.storage.from('ad-videos').getPublicUrl(fileName);
                    publicFileUrl = publicUrlData.publicUrl;
                }

                let baseParts = selectedDateVal.split('-');
                let startDate = new Date(baseParts[0], baseParts[1] - 1, baseParts[2]);
                let optionsCheck = { day: '2-digit', month: 'long', year: 'numeric' };

                let { data: existingSlots } = await supabaseClient.from('buysecond_records').select('*').order('id', { ascending: true });

                for (let d = 0; d < campaignDays; d++) {
                    let currentDayDate = new Date(startDate);
                    currentDayDate.setDate(startDate.getDate() + d);
                    let targetDateStr = currentDayDate.toLocaleDateString('en-US', optionsCheck);

                    let dayExisting = existingSlots ? existingSlots.filter(rec => rec.slot_time && rec.slot_time.includes(targetDateStr)) : [];
                    let dayBookedSecs = dayExisting.reduce((sum, rec) => sum + (parseInt(rec.duration_second) || 0), 0);

                    for (let f = 0; f < frequency; f++) {
                        let slotTimeObj = new Date(currentDayDate);
                        slotTimeObj.setHours(8, 0, 0, 0);
                        slotTimeObj.setSeconds(dayBookedSecs);

                        let timeString = slotTimeObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
                        let formattedSlotStr = `${targetDateStr} at ${timeString}`;

                        let { error: insertError } = await supabaseClient.from('buysecond_records').insert([{
                            brand_name: adTitle + (frequency > 1 ? ` (Run ${f + 1}/${frequency})` : ''),
                            target_url: targetUrl,
                            file_url: publicFileUrl,
                            duration_second: duration,
                            slot_time: formattedSlotStr,
                            status: 'pending',
                            unified_token: null
                        }]);
                        if (insertError) throw insertError;
                        dayBookedSecs += duration;
                    }
                }

                // Save latest inserted record ID for tracking active campaign status
                let { data: latestRecord } = await supabaseClient.from('buysecond_records').select('id').order('id', { ascending: false }).limit(1);
                if (latestRecord && latestRecord.length > 0) {
                    localStorage.setItem('my_latest_campaign_id', latestRecord[0].id);
                }

                alert('✅ Campaign Submitted Successfully!');
                slotFormContainer.reset();
                slotModal.style.display = 'none';
                loadMyActiveCampaign();
            } catch (err) {
                alert('Submission failed: ' + err.message);
            } finally {
                if (submitBtnEl) { submitBtnEl.innerText = 'Submit'; submitBtnEl.disabled = false; }
            }
        });
    }
});

// --- ADMIN PREVIEW WITH AUTOMATIC JUMP BACK ---
function playAdminPreviewOnBillboard(ad) {
    const billboardBox = document.getElementById('billboardBox');
    let timerEl = getCountdownElement();
    if (!billboardBox) return;

    if (timerEl) timerEl.innerText = 'Admin Preview Mode 📺';

    renderAdOnBillboard(ad, () => {
        sessionStorage.removeItem('admin_preview_ad');
        window.location.href = 'karan-rai-secret-website-admin-panel.html';
    });
}

// --- LOAD USER'S ACTIVE CAMPAIGN WITH ALL RUNS ---
async function loadMyActiveCampaign() {
    const searchResultArea = document.getElementById('searchResultArea');
    if (!searchResultArea) return;

    let myCampaignId = localStorage.getItem('my_latest_campaign_id');
    if (!myCampaignId) {
        searchResultArea.innerHTML = '<span style="color: #9ca3af;">Aapne is device se abhi tak koi campaign book nahi kiya hai.</span>';
        return;
    }

    try {
        let { data: singleRecord, error } = await supabaseClient.from('buysecond_records').select('*').eq('id', myCampaignId).single();
        if (error || !singleRecord) {
            searchResultArea.innerHTML = '<span style="color: #9ca3af;">Campaign not found.</span>';
            return;
        }

        // Fetch all runs belonging to this campaign cluster (same brand & file_url)
        let cleanBrand = singleRecord.brand_name.replace(/\s*\(Run \d+\/\d+\)/g, '').trim();
        let { data: allRuns } = await supabaseClient
            .from('buysecond_records')
            .select('*')
            .eq('brand_name.ilike', `%${cleanBrand}%`)
            .eq('file_url', singleRecord.file_url);

        let runsList = allRuns && allRuns.length > 0 ? allRuns : [singleRecord];
        let master = runsList[0];

        let statusColor = master.status === 'approved' ? '#10B981' : (master.status === 'rejected' ? '#ef4444' : '#f59e0b');
        let tokenDisplay = master.unified_token ? `#${master.unified_token}` : 'Pending Assignment';

        let html = `
            <div style="background: #121824; padding: 14px; border-radius: 6px; border: 1px solid ${statusColor}; margin-top: 10px; max-height: 250px; overflow-y: auto;">
                <p style="color: ${statusColor}; font-weight: bold; font-size: 15px;">Status: ${master.status.toUpperCase()} ✅</p>
                <p><b>Token Number:</b> ${tokenDisplay}</p>
                <p><b>Brand Name:</b> ${cleanBrand}</p>
                <p><b>Total Runs:</b> ${runsList.length} Runs Total</p>
                <hr style="border: 0; border-top: 1px solid #1f293d; margin: 8px 0;">
                <p style="font-weight: bold; color: #38bdf8; margin-bottom: 4px;">Scheduled Slots:</p>
        `;

        runsList.forEach((run, idx) => {
            html += `<p style="font-size: 12px; color: #9ca3af;">↳ Run ${idx + 1}: ${run.slot_time}</p>`;
        });

        html += `</div>`;
        searchResultArea.innerHTML = html;

    } catch (err) {
        console.error(err);
        searchResultArea.innerHTML = '<span style="color: #ef4444;">Error loading campaign status.</span>';
    }
}

async function initVisitorCounter() {
    let visitorEl = document.getElementById('totalGlobalCount');
    if (!visitorEl) return;
    let { data } = await supabaseClient.from('site_analytics').select('count').eq('id', 1).single();
    let count = (data ? data.count : 120) + 1;
    await supabaseClient.from('site_analytics').upsert({ id: 1, count: count });
    visitorEl.innerText = count;
}

async function updateAvailableSecondsCounter() {
    let remainingEl = document.getElementById('remainingSecondsCount');
    if (!remainingEl) return;
    let { data: records } = await supabaseClient.from('buysecond_records').select('duration_second').eq('status', 'approved');
    let booked = records ? records.reduce((t, r) => t + (parseInt(r.duration_second) || 0), 0) : 0;
    let avail = TOTAL_DAILY_SECONDS - booked;
    remainingEl.innerText = avail < 0 ? 0 : avail;
}

function getCountdownElement() { return document.getElementById('timer-text'); }

// --- INSTANT MEDIA RENDERING (NO LAG) ---
function renderAdOnBillboard(ad, onComplete) {
    const billboardBox = document.getElementById('billboardBox');
    if (!billboardBox) return;

    let duration = parseInt(ad.duration_second) || 10;
    let fileUrl = ad.file_url || ad.video_url || '';
    let targetUrl = ad.target_url || '#';

    let lowerUrl = fileUrl.toLowerCase();
    let isVideo = lowerUrl.endsWith('.mp4') || lowerUrl.includes('.mp4') || lowerUrl.includes('video') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm') || lowerUrl.includes('video/mp4');

    let isCompletedCalled = false;
    function triggerComplete() {
        if (isCompletedCalled) return;
        isCompletedCalled = true;
        if (globalTimerInterval) clearInterval(globalTimerInterval);
        if (typeof onComplete === 'function') onComplete();
    }

    if (isVideo) {
        billboardBox.innerHTML = `
            <div onclick="window.open('${targetUrl}', '_blank')" style="background: #0b0f17; color: #fff; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; cursor: pointer;">
                <video id="activeAdMedia" src="${fileUrl}" autoplay preload="auto" playsinline style="width: 100%; height: 100%; object-fit: fill; border-radius: 6px;"></video>
            </div>
        `;
        let mediaEl = document.getElementById('activeAdMedia');
        if (mediaEl) {
            mediaEl.onended = triggerComplete;
            mediaEl.play().catch(e => console.log("Autoplay prevented:", e));
        }
    } else {
        billboardBox.innerHTML = `
            <div onclick="window.open('${targetUrl}', '_blank')" style="background: #0b0f17; color: #fff; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; cursor: pointer;">
                <img src="${fileUrl}" alt="Ad" style="width: 100%; height: 100%; object-fit: fill; border-radius: 6px;">
            </div>
        `;
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

// --- AUTONOMOUS CHRONOLOGICAL SCHEDULER & DEFAULT BANNER ---
async function initLiveBillboardPlayer() {
    const billboardBox = document.getElementById('billboardBox');
    if (!billboardBox) return;

    function applyDefaultBanner() {
        billboardBox.innerHTML = '';
        billboardBox.style.background = "url('buysecond.png') no-repeat center center";
        billboardBox.style.backgroundSize = "100% 100%";
        let timerEl = getCountdownElement();
        if (timerEl) timerEl.innerText = 'Next Slot in: 0s';
    }

    try {
        let { data: queueRecords } = await supabaseClient.from('buysecond_records').select('*').eq('status', 'approved').order('id', { ascending: true });
        if (!queueRecords || queueRecords.length === 0) {
            applyDefaultBanner();
            setTimeout(initLiveBillboardPlayer, 10000);
            return;
        }

        let now = new Date();
        let optionsCheck = { day: '2-digit', month: 'long', year: 'numeric' };
        let todayDateStr = now.toLocaleDateString('en-US', optionsCheck);
        let todaysApprovedAds = queueRecords.filter(ad => ad.slot_time && ad.slot_time.includes(todayDateStr));

        if (todaysApprovedAds.length === 0) {
            applyDefaultBanner();
            setTimeout(initLiveBillboardPlayer, 15000);
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
            scheduledAds.push({ adRecord: ad, start: adStartTime, end: adEndTime, duration: adDuration });
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

            let timerEl = getCountdownElement();
            if (currentPlayingAd) {
                renderAdOnBillboard(currentPlayingAd.adRecord, () => {
                    setTimeout(checkAndPlaySchedule, 500);
                });
            } else {
                applyDefaultBanner();
                if (nextUpcomingAd) {
                    let diffSecs = Math.floor((nextUpcomingAd.start - currentTime) / 1000);
                    if (timerEl) timerEl.innerText = `Next Slot in: ${diffSecs}s`;
                    setTimeout(checkAndPlaySchedule, diffSecs > 5 ? 5000 : (diffSecs * 1000));
                } else {
                    if (timerEl) timerEl.innerText = 'Queue Finished for Today';
                    setTimeout(initLiveBillboardPlayer, 30000);
                }
            }
        }
        checkAndPlaySchedule();
    } catch (err) {
        applyDefaultBanner();
        setTimeout(initLiveBillboardPlayer, 15000);
    }
}