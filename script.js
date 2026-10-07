// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://swndqwcujyepctncxfhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bmRxd2N1anllcGN0bmN4ZmhyIiwicm9sZSI6InF1ZXJ5IiwiaWF0IjoxNzkwMzM3MzQ0LCJleHAiOjIxMDU5MTMzNDR9.PlaceholderKey';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TOTAL_DAILY_SECONDS = 50400; // 14 Hours (8 AM to 10 PM) = 50,400 Seconds

let isPlayingPastRecord = false;
let globalTimerInterval = null;

window.addEventListener('DOMContentLoaded', () => {
    initVisitorCounter();
    updateAvailableSecondsCounter();

    // Isolated Admin Preview Check via sessionStorage
    let adminPreviewAdJson = sessionStorage.getItem('admin_preview_ad');
    if (adminPreviewAdJson) {
        try {
            let previewAd = JSON.parse(adminPreviewAdJson);
            playAdminPreviewOnBillboard(previewAd);
        } catch (e) {
            console.error('Preview parse error:', e);
            initLiveBillboardPlayer();
        }
    } else {
        initLiveBillboardPlayer();
    }

    loadMyActiveCampaign();

    // Set Minimum Date for Calendar to Tomorrow
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

    // Terms Modal
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

    // Active Campaign Modal
    const checkRecordModal = document.getElementById('checkRecordModal');
    const checkRecordBtn = document.getElementById('checkRecordBtn');
    const closeCheckRecordModal = document.getElementById('closeCheckRecordModal');

    if (checkRecordBtn && checkRecordModal) {
        checkRecordBtn.addEventListener('click', () => {
            checkRecordModal.style.display = 'block';
            loadMyActiveCampaign();
        });
    }

    if (closeCheckRecordModal && checkRecordModal) {
        closeCheckRecordModal.addEventListener('click', () => {
            checkRecordModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (slotModal && e.target === slotModal) slotModal.style.display = 'none';
        if (termsModal && e.target === termsModal) termsModal.style.display = 'none';
        if (checkRecordModal && e.target === checkRecordModal) checkRecordModal.style.display = 'none';
    });

    // Dynamic Form Inputs for Frequency & Days
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
        if (durationGroup) {
            durationGroup.insertAdjacentHTML('afterend', campaignFieldsHTML);
        }
    }

    // File Validation & Duration Selector
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
});

// --- ADMIN PREVIEW PLAYER WITH AUTOMATIC JUMP BACK ---
function playAdminPreviewOnBillboard(ad) {
    const billboardBox = document.getElementById('billboardBox');
    let timerEl = getCountdownElement();
    if (!billboardBox) return;

    if (timerEl) timerEl.innerText = 'Admin Preview Mode 📺';

    renderAdOnBillboard(ad, () => {
        // Automatically jump back to admin panel when preview ends
        sessionStorage.removeItem('admin_preview_ad');
        window.location.href = 'admin.html';
    });
}

// --- LOAD USER'S SPECIFIC ACTIVE CAMPAIGN ---
async function loadMyActiveCampaign() {
    const searchResultArea = document.getElementById('searchResultArea');
    if (!searchResultArea) return;

    let myCampaignId = localStorage.getItem('my_latest_campaign_id');

    if (!myCampaignId) {
        searchResultArea.innerHTML = '<span style="color: #9ca3af;">Aapne is device se abhi tak koi campaign book nahi kiya hai. Kripya naya slot book karein.</span>';
        return;
    }

    searchResultArea.innerHTML = 'Loading your active campaign status...';

    try {
        let { data, error } = await supabaseClient
            .from('buysecond_records')
            .select('*')
            .eq('id', myCampaignId)
            .single();

        if (error || !data) {
            searchResultArea.innerHTML = '<span style="color: #9ca3af;">Aapka active campaign nahi mila ya admin dwara delete kar diya gaya hai.</span>';
            return;
        }

        let record = data;
        let statusHtml = '';

        if (record.status === 'approved') {
            statusHtml = `
                <div style="background: #121824; padding: 14px; border-radius: 6px; border: 1px solid #10b981; margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
                    <p style="color: #10B981; font-weight: bold;">Status: Approved ✅</p>
                    <p><b>Token Number:</b> #${record.unified_token || record.id}</p>
                    <p><b>Brand Name:</b> ${record.brand_name}</p>
                    <p><b>Schedule / Timing:</b> ${record.slot_time}</p>
                </div>
            `;
        } else if (record.status === 'rejected') {
            statusHtml = `
                <div style="background: #121824; padding: 14px; border-radius: 6px; border: 1px solid #ef4444; margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
                    <p style="color: #ef4444; font-weight: bold;">Status: Rejected ❌</p>
                    <p><b>Brand Name:</b> ${record.brand_name}</p>
                    <p style="color: #9ca3af; font-size: 12px;">Niyamion ke ullanghan ke karan yah campaign reject kar diya gaya hai.</p>
                </div>
            `;
        } else {
            statusHtml = `
                <div style="background: #121824; padding: 14px; border-radius: 6px; border: 1px solid #f59e0b; margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
                    <p style="color: #f59e0b; font-weight: bold;">Status: Pending ⏳</p>
                    <p><b>Brand Name:</b> ${record.brand_name}</p>
                    <p style="color: #9ca3af; font-size: 13px;">Admin dwara review kiya ja raha hai. Approval ke baad Token aur Timing yahin show hogi.</p>
                </div>
            `;
        }

        searchResultArea.innerHTML = statusHtml;

    } catch (err) {
        console.error(err);
        searchResultArea.innerHTML = '<span style="color: #ef4444;">Campaign load karne mein error aayi hai.</span>';
    }
}
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
        let { data: records } = await supabaseClient
            .from('buysecond_records')
            .select('duration_second, status')
            .eq('status', 'approved');

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

function getCountdownElement() {
    return document.getElementById('timer-text');
}

// --- MEDIA RENDERING ---
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
        buildBillboardMarkup(true);
    } else {
        let tempImg = new Image();
        tempImg.src = fileUrl;
        tempImg.onload = function () {
            buildBillboardMarkup(false);
        };
        tempImg.onerror = function () {
            buildBillboardMarkup(false);
        };
        setTimeout(() => {
            if (!billboardBox.querySelector('img') && !billboardBox.querySelector('video')) {
                buildBillboardMarkup(false);
            }
        }, 400);
    }

    function buildBillboardMarkup(isVid) {
        let mediaTagHTML = '';

        if (isVid) {
            mediaTagHTML = `
                <div style="position: relative; z-index: 2; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <video id="activeAdMedia" src="${fileUrl}" autoplay playsinline style="width: 100%; height: 100%; object-fit: fill; border-radius: 6px;"></video>
                </div>
            `;
        } else {
            mediaTagHTML = `
                <div style="position: relative; z-index: 2; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <img src="${fileUrl}" alt="Ad Image" style="width: 100%; height: 100%; object-fit: fill; border-radius: 6px;">
                </div>
            `;
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

    function applyDefaultBanner() {
        billboardBox.innerHTML = '';
        billboardBox.style.background = "url('buysecond.png') no-repeat center center";
        billboardBox.style.backgroundSize = "100% 100%";
        let timerEl = getCountdownElement();
        if (timerEl) timerEl.innerText = 'Next Slot in: 0s';
    }

    try {
        let { data: queueRecords, error } = await supabaseClient
            .from('buysecond_records')
            .select('*')
            .eq('status', 'approved')
            .order('id', { ascending: true });

        if (error || !queueRecords || queueRecords.length === 0) {
            applyDefaultBanner();
            setTimeout(initLiveBillboardPlayer, 10000);
            return;
        }

        let now = new Date();
        let optionsCheck = { day: '2-digit', month: 'long', year: 'numeric' };
        let todayDateStr = now.toLocaleDateString('en-US', optionsCheck);

        let todaysApprovedAds = queueRecords.filter(ad => {
            return ad.slot_time && ad.slot_time.includes(todayDateStr);
        });

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
                    let timeoutMs = diffSecs > 5 ? 5000 : (diffSecs * 1000);
                    setTimeout(checkAndPlaySchedule, timeoutMs);
                } else {
                    if (timerEl) timerEl.innerText = 'Queue Finished for Today';
                    setTimeout(initLiveBillboardPlayer, 30000);
                }
            }
        }

        checkAndPlaySchedule();

    } catch (err) {
        console.error('Billboard Player Error:', err);
        applyDefaultBanner();
        setTimeout(initLiveBillboardPlayer, 15000);
    }
}