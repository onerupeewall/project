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

    // Check if Admin requested Billboard Preview
    let adminPreviewAdJson = localStorage.getItem('admin_preview_ad');
    if (adminPreviewAdJson) {
        let previewAd = JSON.parse(adminPreviewAdJson);
        playAdminPreviewOnBillboard(previewAd);
    } else {
        initLiveBillboardPlayer();
    }

    loadMyActiveCampaign();

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

    // --- MY ACTIVE CAMPAIGN MODAL MANAGEMENT ---
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
        if (e.target === slotModal) slotModal.style.display = 'none';
        if (e.target === termsModal) termsModal.style.display = 'none';
        if (e.target === checkRecordModal) checkRecordModal.style.display = 'none';
    });

    // --- DYNAMIC FORM INPUTS FOR FREQUENCY (Max 10) & DAYS (Max 30) ---
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

    // --- FORM SUBMISSION ---
    const slotForm = document.getElementById('slotForm');
    if (slotForm) {
        slotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const durationInputEl = document.getElementById('durationInput');
            let duration = parseInt(durationInputEl ? durationInputEl.value : 10) || 10;
            let frequency = document.getElementById('frequencyInput') ? parseInt(document.getElementById('frequencyInput').value) || 1 : 1;
            if (frequency > 10) frequency = 10;
            let campaignDays = document.getElementById('campaignDaysInput') ? parseInt(document.getElementById('campaignDaysInput').value) || 1 : 1;
            if (campaignDays > 30) campaignDays = 30;

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
            submitBtn.innerText = 'Submitting Campaign...';
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
                let endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + (campaignDays - 1));

                let optionsCheck = { day: '2-digit', month: 'long', year: 'numeric' };
                let startDateStr = startDate.toLocaleDateString('en-US', optionsCheck);
                let endDateStr = endDate.toLocaleDateString('en-US', optionsCheck);

                let { data: insertedData, error: insertError } = await supabaseClient
                    .from('buysecond_records')
                    .insert([
                        {
                            brand_name: adTitle,
                            target_url: targetUrl,
                            file_url: publicFileUrl,
                            duration_second: duration,
                            slot_time: `${startDateStr} to ${endDateStr} (${frequency}x/Day)`,
                            status: 'pending',
                            unified_token: null
                        }
                    ])
                    .select();

                if (insertError) throw insertError;

                if (insertedData && insertedData.length > 0) {
                    localStorage.setItem('my_latest_campaign_id', insertedData[0].id);
                }

                alert('✅ Campaign Submitted Successfully! Check "My Active Campaign" for status.');
                slotForm.reset();
                slotModal.style.display = 'none';
                loadMyActiveCampaign();

            } catch (err) {
                alert('Submission failed: ' + (err.message || err));
                console.error(err);
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

// --- ADMIN PREVIEW PLAYER FUNCTION ---
function playAdminPreviewOnBillboard(ad) {
    const billboardBox = document.getElementById('billboardBox');
    let timerEl = getCountdownElement();
    if (!billboardBox) return;

    if (timerEl) timerEl.innerText = 'Admin Preview Mode 📺';

    renderAdOnBillboard(ad, () => {
        // When preview finishes, show Back to Admin button on billboard
        billboardBox.innerHTML = `
            <div style="background: #0b0f17; color: #fff; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; border-radius: 10px;">
                <p style="color: #10b981; font-weight: bold; font-size: 16px;">Preview Finished ✅</p>
                <button onclick="backToAdminPanel()" style="background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">← Back to Admin Panel</button>
            </div>
        `;
    });
}

function backToAdminPanel() {
    localStorage.removeItem('admin_preview_ad');
    window.location.href = 'admin.html';
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
            .eq('status', 'approved')
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
            return ad.slot_time && ad.slot_time.includes(todayDateStr);
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