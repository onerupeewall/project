// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://swndqwcujyepctncxfhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bmRxd2N1anllcGN0bmN4ZmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzczNDQsImV4cCI6MjEwNTkxMzM0NH0.FcoPIUbbpIfUzxLOxUhMXiTirW2-j5Fw5dnfl9tqx2o';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const TOTAL_DAILY_SECONDS = 86400; // 24 Hours = 86,400 Seconds
const NUM_DEPARTS = 12;            // Exactly 12 departs of 2 hours each
const DEPART_DURATION = 7200;

let isPlayingPastRecord = false;
let globalTimerInterval = null;
let isAudioUnmuted = false; // Muted by default

window.addEventListener('DOMContentLoaded', () => {
    initVisitorCounter();
    updateAvailableSecondsCounter();

    let adminPreviewAdJson = sessionStorage.getItem('admin_preview_ad');
    if (adminPreviewAdJson) {
        try {
            let previewAd = JSON.parse(adminPreviewAdJson);
            playAdminPreviewOnBillboard(previewAd, true);
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
                <label>Times per Day (Max 12 Departs):</label>
                <input type="number" id="frequencyInput" value="1" min="1" max="12" required>
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

    if (frequencyInput) {
        frequencyInput.addEventListener('input', function () {
            let val = parseInt(this.value) || 1;
            if (val > 12) {
                this.style.borderColor = '#ef4444';
                this.style.color = '#ef4444';
            } else {
                this.style.borderColor = '#1f293d';
                this.style.color = '#fff';
            }
        });
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

            if (frequency > 12) {
                alert('⚠️ Frequency cannot be more than 12 per day!');
                if (frequencyInput) {
                    frequencyInput.style.borderColor = '#ef4444';
                    frequencyInput.style.color = '#ef4444';
                }
                return;
            }

            const targetUrl = document.getElementById('targetUrl').value;
            const adTitle = document.getElementById('adTitle').value;
            const fileInput = document.getElementById('adFile');
            const selectedDateVal = document.getElementById('bookingDateInput').value;

            const submitBtnEl = slotFormContainer.querySelector('button[type="submit"]');
            if (submitBtnEl) { submitBtnEl.innerText = 'Submitting...'; submitBtnEl.disabled = true; }

            try {
                let publicFileUrl = 'https://swndqwcujyepctncxfhr.supabase.co/storage/v1/object/public/ad-videos/default.mp4';

                if (fileInput && fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];
                    const fileName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');

                    const { data: uploadData, error: uploadError } = await supabaseClient.storage
                        .from('ad-videos')
                        .upload(fileName, file, { upsert: true });

                    if (!uploadError) {
                        let { data: publicUrlData } = supabaseClient.storage.from('ad-videos').getPublicUrl(fileName);
                        if (publicUrlData && publicUrlData.publicUrl) {
                            publicFileUrl = publicUrlData.publicUrl;
                        }
                    } else {
                        publicFileUrl = URL.createObjectURL(file);
                    }
                }

                let baseParts = selectedDateVal.split('-');
                let startDate = new Date(baseParts[0], baseParts[1] - 1, baseParts[2]);
                let optionsCheck = { day: '2-digit', month: 'long', year: 'numeric' };

                let { data: existingSlots } = await supabaseClient.from('buysecond_records').select('*').order('id', { ascending: true });
                let recordsToInsert = [];

                for (let d = 0; d < campaignDays; d++) {
                    let currentDayDate = new Date(startDate);
                    currentDayDate.setDate(startDate.getDate() + d);
                    let targetDateStr = currentDayDate.toLocaleDateString('en-US', optionsCheck);

                    let dayExisting = existingSlots ? existingSlots.filter(rec => rec.slot_time && rec.slot_time.includes(targetDateStr)) : [];

                    for (let f = 0; f < frequency; f++) {
                        let departStartSec = f * DEPART_DURATION;
                        let departEndSec = departStartSec + DEPART_DURATION;

                        let slotsInThisDepart = dayExisting.filter(rec => {
                            let timePart = rec.slot_time.split(' at ')[1];
                            if (!timePart) return false;
                            let [timeStr, modifier] = timePart.split(' ');
                            let [hrs, mins, secs] = timeStr.split(':').map(Number);
                            if (modifier === 'PM' && hrs < 12) hrs += 12;
                            if (modifier === 'AM' && hrs === 12) hrs = 0;
                            let totalSecsFromMidnight = (hrs * 3600) + (mins * 60) + secs;
                            return totalSecsFromMidnight >= departStartSec && totalSecsFromMidnight < departEndSec;
                        });

                        let targetOffset = departStartSec;
                        if (slotsInThisDepart.length > 0) {
                            let lastSlot = slotsInThisDepart[slotsInThisDepart.length - 1];
                            let timePart = lastSlot.slot_time.split(' at ')[1];
                            let [timeStr, modifier] = timePart.split(' ');
                            let [hrs, mins, secs] = timeStr.split(':').map(Number);
                            if (modifier === 'PM' && hrs < 12) hrs += 12;
                            if (modifier === 'AM' && hrs === 12) hrs = 0;
                            let lastStartSec = (hrs * 3600) + (mins * 60) + secs;
                            let lastDur = parseInt(lastSlot.duration_second) || 10;
                            targetOffset = lastStartSec + lastDur;
                        }

                        if (targetOffset >= departEndSec) {
                            targetOffset = departEndSec - duration;
                            if (targetOffset < departStartSec) targetOffset = departStartSec;
                        }

                        let slotTimeObj = new Date(currentDayDate);
                        slotTimeObj.setHours(0, 0, 0, 0);
                        slotTimeObj.setSeconds(targetOffset);

                        let timeString = slotTimeObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                        let finalSlotTimeFormatted = `${targetDateStr} at ${timeString} (IST)`;

                        let newRecordObj = {
                            brand_name: adTitle + (frequency > 1 ? ` (Run ${f + 1}/${frequency})` : ''),
                            target_url: targetUrl,
                            file_url: publicFileUrl,
                            duration_second: duration,
                            slot_time: finalSlotTimeFormatted,
                            status: 'pending',
                            unified_token: null
                        };

                        recordsToInsert.push(newRecordObj);
                        dayExisting.push(newRecordObj);
                    }
                }

                if (recordsToInsert.length > 0) {
                    let { error: insertError } = await supabaseClient.from('buysecond_records').insert(recordsToInsert);
                    if (insertError) throw insertError;
                }

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
// --- ADMIN PREVIEW WITH SAFE RETURN ---
function playAdminPreviewOnBillboard(ad, fromAdmin = false) {
    const billboardBox = document.getElementById('billboardBox');
    let timerEl = getCountdownElement();
    if (!billboardBox) return;

    if (timerEl) timerEl.innerText = 'Admin Preview Mode 📺';

    renderAdOnBillboard(ad, () => {
        sessionStorage.removeItem('admin_preview_ad');
        if (fromAdmin) {
            window.location.href = 'admin.html';
        }
    });
}

// --- PARSE IST STRING TO DATE OBJECT ---
function parseIstSlotTimeToDate(slotTimeStr) {
    try {
        let cleanStr = slotTimeStr.replace(' (IST)', '');
        let parts = cleanStr.split(' at ');
        if (parts.length < 2) return new Date(NaN);
        let datePart = parts[0];
        let timePart = parts[1];
        let dateObj = new Date(datePart);
        let [timeStr, modifier] = timePart.split(' ');
        let [hrs, mins, secs] = timeStr.split(':').map(Number);
        if (modifier === 'PM' && hrs < 12) hrs += 12;
        if (modifier === 'AM' && hrs === 12) hrs = 0;
        dateObj.setHours(hrs, mins, secs, 0);
        return dateObj;
    } catch (e) {
        return new Date(NaN);
    }
}

// --- LOAD USER'S ACTIVE CAMPAIGN & UPDATE BILLBOARD STATUS BOX ---
async function loadMyActiveCampaign() {
    const searchResultArea = document.getElementById('searchResultArea');
    const statusBox = document.getElementById('billboardStatusBox');
    const statusText = document.getElementById('billboardStatusText');
    const countdownText = document.getElementById('billboardCountdownText');

    let myCampaignId = localStorage.getItem('my_latest_campaign_id');
    if (!myCampaignId) {
        if (statusBox) statusBox.style.display = 'none';
        if (searchResultArea) searchResultArea.innerHTML = '<span style="color: #9ca3af;">You have not booked any campaign from this device yet.</span>';
        return;
    }

    try {
        let { data: singleRecord, error } = await supabaseClient.from('buysecond_records').select('*').eq('id', myCampaignId).single();
        if (error || !singleRecord) {
            if (statusBox) statusBox.style.display = 'none';
            return;
        }

        let cleanBrand = singleRecord.brand_name.replace(/\s*\(Run \d+\/\d+\)/g, '').trim();
        let { data: allRuns } = await supabaseClient
            .from('buysecond_records')
            .select('*')
            .ilike('brand_name', `%${cleanBrand}%`)
            .eq('file_url', singleRecord.file_url);

        let runsList = allRuns && allRuns.length > 0 ? allRuns : [singleRecord];
        let master = runsList[0];

        if (statusBox) statusBox.style.display = 'block';

        if (master.status === 'pending') {
            if (statusText) statusText.innerText = `⏳ Waiting for Owner's Approval (${cleanBrand})`;
            if (countdownText) countdownText.innerText = 'Your ad is under review. Live countdown will start after approval.';

            if (searchResultArea) {
                searchResultArea.innerHTML = `
                    <div style="background: #121824; padding: 16px; border-radius: 6px; border: 1px solid #f59e0b; margin-top: 10px; text-align: center;">
                        <p style="color: #f59e0b; font-weight: bold; font-size: 15px; margin-bottom: 6px;">⏳ Pending Approval</p>
                        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">Once approved by the owner, your live countdown and schedule will appear here.</p>
                    </div>
                `;
            }
            return;
        }

        if (master.status === 'rejected') {
            if (statusText) statusText.innerText = `❌ Campaign Rejected (${cleanBrand})`;
            if (countdownText) countdownText.innerText = 'This campaign has been rejected by the admin.';
            return;
        }

        let tokenDisplay = master.unified_token ? `#${master.unified_token}` : 'Approved';

        let now = new Date();
        let optionsCheck = { day: '2-digit', month: 'long', year: 'numeric' };

        let firstDateOnly = runsList[0].slot_time.split(' at ')[0];
        let singleDayCount = runsList.filter(run => run.slot_time.includes(firstDateOnly)).length;
        let totalDays = Math.round(runsList.length / singleDayCount);

        let upcomingTodayRuns = runsList.filter(run => {
            let runDateObj = parseIstSlotTimeToDate(run.slot_time);
            return runDateObj >= now;
        });

        let nextRunItem = upcomingTodayRuns.length > 0 ? upcomingTodayRuns[0] : runsList.find(run => parseIstSlotTimeToDate(run.slot_time) > now);

        if (nextRunItem) {
            let targetTime = parseIstSlotTimeToDate(nextRunItem.slot_time);
            let diffSecs = Math.floor((targetTime - now) / 1000);
            if (diffSecs > 0) {
                let hrs = Math.floor(diffSecs / 3600);
                let mins = Math.floor((diffSecs % 3600) / 60);
                let secs = diffSecs % 60;
                if (statusText) statusText.innerText = `🟢 Approved Campaign: ${cleanBrand} (Token #${tokenDisplay})`;
                if (countdownText) countdownText.innerText = `⏳ Next Ad Live in: ${hrs} Hours : ${mins} Minutes : ${secs} Seconds`;
            } else {
                if (statusText) statusText.innerText = `📺 Your Ad is Playing or Completed for Today!`;
                if (countdownText) countdownText.innerText = `Token: #${tokenDisplay} | Total Runs: ${singleDayCount}/day`;
            }
        } else {
            if (statusText) statusText.innerText = `✅ Campaign Approved (${cleanBrand})`;
            if (countdownText) countdownText.innerText = `All today's runs completed. Next session tomorrow.`;
        }

        if (searchResultArea) {
            let html = `
                <div style="background: #121824; padding: 14px; border-radius: 6px; border: 1px solid #10B981; margin-top: 10px; max-height: 280px; overflow-y: auto;">
                    <p style="color: #10B981; font-weight: bold; font-size: 15px;">Status: APPROVED ✅</p>
                    <p><b>Token Number:</b> ${tokenDisplay}</p>
                    <p><b>Brand Name:</b> ${cleanBrand}</p>
                    <p><b>Total Runs:</b> ${singleDayCount} Runs per Day (${singleDayCount * totalDays} Total Runs)</p>
                    <p><b>Total Duration:</b> ${totalDays} Days (${firstDateOnly} onwards)</p>
                    <hr style="border: 0; border-top: 1px solid #1f293d; margin: 8px 0;">
                    <p style="font-weight: bold; color: #38bdf8; margin-bottom: 4px;">Today's Exact Slot Timings (IST):</p>
            `;

            if (upcomingTodayRuns.length === 0) {
                html += `<p style="font-size: 12px; color: #f59e0b;"> Today's schedule runs are completed. Fresh slots refresh tomorrow.</p>`;
            } else {
                upcomingTodayRuns.forEach((run, idx) => {
                    let timeOnlyStr = run.slot_time.split(' at ')[1] || run.slot_time;
                    html += `<p style="font-size: 13px; color: #9ca3af;">↳ Slot ${idx + 1}: ${timeOnlyStr}</p>`;
                });
            }

            html += `</div>`;
            searchResultArea.innerHTML = html;
        }

    } catch (err) {
        console.error(err);
        if (searchResultArea) searchResultArea.innerHTML = '<span style="color: #ef4444;">Error loading campaign status.</span>';
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

// --- MEDIA RENDERING (MUTED BY DEFAULT WITH UNMUTE BUTTON) ---
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

    let audioButtonHtml = isVideo ? `
        <button id="unmuteBtn" onclick="toggleAudio(event)" style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; border: 1px solid #38bdf8; padding: 6px 12px; border-radius: 20px; font-size: 12px; cursor: pointer; z-index: 20;">
            🔇 Unmute
        </button>
    ` : '';

    if (isVideo) {
        billboardBox.innerHTML = `
            <div style="background: #0b0f17; color: #fff; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                <video id="activeAdMedia" src="${fileUrl}" autoplay muted preload="auto" playsinline style="width: 100%; height: 100%; object-fit: fill; border-radius: 6px; cursor: pointer;" onclick="window.open('${targetUrl}', '_blank')"></video>
                ${audioButtonHtml}
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
                <img src="${fileUrl}" alt="Ad Image" style="width: 100%; height: 100%; object-fit: fill; border-radius: 6px;">
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

// --- TOGGLE AUDIO UNMUTE FUNCTION ---
function toggleAudio(event) {
    event.stopPropagation();
    let videoEl = document.getElementById('activeAdMedia');
    let btn = document.getElementById('unmuteBtn');
    if (!videoEl) return;

    isAudioUnmuted = !isAudioUnmuted;
    videoEl.muted = !isAudioUnmuted;

    if (isAudioUnmuted) {
        if (btn) btn.innerText = '🔊 Mute Audio';
    } else {
        if (btn) btn.innerText = '🔇 Unmute';
    }
}

// --- 24-HOUR AUTONOMOUS SCHEDULER ---
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

        let scheduledAds = [];
        todaysApprovedAds.forEach(ad => {
            let adStart = parseIstSlotTimeToDate(ad.slot_time);
            let dur = parseInt(ad.duration_second) || 10;
            let adEnd = new Date(adStart.getTime() + (dur * 1000));
            scheduledAds.push({ adRecord: ad, start: adStart, end: adEnd, duration: dur });
        });

        function checkAndPlaySchedule() {
            if (isPlayingPastRecord) return;
            let currentTime = new Date();
            let newDateStr = currentTime.toLocaleDateString('en-US', optionsCheck);
            if (newDateStr !== todayDateStr) {
                initLiveBillboardPlayer();
                return;
            }

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
                    if (timerEl) timerEl.innerText = `Next Slot in: ${diffSecs > 0 ? diffSecs : 0}s`;
                    setTimeout(checkAndPlaySchedule, diffSecs > 5 ? 5000 : (diffSecs > 0 ? diffSecs * 1000 : 1000));
                } else {
                    if (timerEl) timerEl.innerText = 'Queue Finished for Today';
                    setTimeout(initLiveBillboardPlayer, 30000);
                }
            }
        }
        checkAndPlaySchedule();
    } catch (err) {
        console.error(err);
        applyDefaultBanner();
        setTimeout(initLiveBillboardPlayer, 15000);
    }
}