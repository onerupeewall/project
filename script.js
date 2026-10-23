// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://swndqwcujyepctncxfhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bmRxd2N1anllcGN0bmN4ZmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzczNDQsImV4cCI6MjEwNTkxMzM0NH0.FcoPIUbbpIfUzxLOxUhMXiTirW2-j5Fw5dnfl9tqx2o';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const TOTAL_DAILY_SECONDS = 86400;
const DEPART_DURATION = 7200;

let serverTimeOffset = 0; // Sync offset to make countdown identical across all phones
let globalTimerInterval = null;
let activeCountdownInterval = null;
let pendingCampaignData = null;

// --- SMART NETWORK OPTIMIZATION ---
function applySmartNetworkOptimization(mediaElement) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
        if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g' || connection.saveData) {
            mediaElement.preload = 'none';
            mediaElement.muted = true;
        } else {
            mediaElement.preload = 'auto';
        }
    }
}

async function syncServerTime() {
    try {
        let clientSendTime = Date.now();
        let { error } = await supabaseClient.from('site_analytics').select('count').eq('id', 1).single();
        let clientReceiveTime = Date.now();
        if (!error) {
            let estimatedServerTime = clientSendTime + Math.floor((clientReceiveTime - clientSendTime) / 2);
            serverTimeOffset = estimatedServerTime - clientReceiveTime;
        }
    } catch (e) {
        serverTimeOffset = 0;
    }
}

function getSyncedCurrentTime() {
    return new Date(Date.now() + serverTimeOffset);
}

window.addEventListener('DOMContentLoaded', async () => {
    await syncServerTime();
    setInterval(syncServerTime, 60000); // re-sync every minute

    initVisitorCounter();
    updateAvailableSecondsCounter();
    initLiveBillboardPlayer();
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

    if (openSlotModal && slotModal) {
        openSlotModal.addEventListener('click', () => { slotModal.style.display = 'flex'; });
    }
    if (closeSlotModal && slotModal) closeSlotModal.addEventListener('click', () => slotModal.style.display = 'none');

    const termsModal = document.getElementById('termsModal');
    const openTermsBtn = document.getElementById('openTermsBtn');
    const closeTermsModal = document.getElementById('closeTermsModal');

    if (openTermsBtn && termsModal) openTermsBtn.addEventListener('click', (e) => { e.preventDefault(); termsModal.style.display = 'flex'; });
    if (closeTermsModal && termsModal) closeTermsModal.addEventListener('click', () => termsModal.style.display = 'none');

    const privacyModal = document.getElementById('privacyModal');
    const openPrivacyBtn = document.getElementById('openPrivacyBtn');
    const closePrivacyModal = document.getElementById('closePrivacyModal');

    if (openPrivacyBtn && privacyModal) openPrivacyBtn.addEventListener('click', (e) => { e.preventDefault(); privacyModal.style.display = 'flex'; });
    if (closePrivacyModal && privacyModal) closePrivacyModal.addEventListener('click', () => privacyModal.style.display = 'none');

    const checkRecordModal = document.getElementById('checkRecordModal');
    const checkRecordBtn = document.getElementById('checkRecordBtn');
    const closeCheckRecordModal = document.getElementById('closeCheckRecordModal');

    if (checkRecordBtn && checkRecordModal) {
        checkRecordBtn.addEventListener('click', () => {
            checkRecordModal.style.display = 'flex';
            loadMyActiveCampaign();
        });
    }
    if (closeCheckRecordModal && checkRecordModal) closeCheckRecordModal.addEventListener('click', () => checkRecordModal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (slotModal && e.target === slotModal) slotModal.style.display = 'none';
        if (termsModal && e.target === termsModal) termsModal.style.display = 'none';
        if (privacyModal && e.target === privacyModal) privacyModal.style.display = 'none';
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

    if (adFileInput) {
        adFileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (fileErrorMsg) { fileErrorMsg.style.display = 'none'; fileErrorMsg.innerText = ''; }
            if (submitBtn) submitBtn.disabled = false;
            if (!file) return;

            if (file.type.startsWith('video/')) {
                const videoElement = document.createElement('video');
                videoElement.preload = 'metadata';
                applySmartNetworkOptimization(videoElement);
                videoElement.onloadedmetadata = function () {
                    window.URL.revokeObjectURL(videoElement.src);
                    let vDuration = Math.round(videoElement.duration);
                    if (vDuration > 30) {
                        if (fileErrorMsg) {
                            fileErrorMsg.innerText = '⚠️ Max 30 seconds allowed!';
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
                alert('Frequency cannot exceed 12 per day.');
                return;
            }

            const targetUrl = document.getElementById('targetUrl').value;
            const adTitle = document.getElementById('adTitle').value;
            const fileInput = document.getElementById('adFile');
            const selectedDateVal = document.getElementById('bookingDateInput').value;

            pendingCampaignData = {
                duration, frequency, campaignDays, targetUrl, adTitle, fileInputFile: fileInput?.files[0], selectedDateVal
            };

            slotModal.style.display = 'none';
            openOtpLoginModal();
        });
    }
});

async function openOtpLoginModal() {
    let existingModal = document.getElementById('otpLoginModal');
    if (existingModal) existingModal.remove();

    let modalHTML = `
        <div id="otpLoginModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:9999;">
            <div style="background:#121824; padding:24px; border-radius:10px; border:1px solid #1f293d; width:90%; max-width:400px; color:#fff; text-align:center;">
                <h3>🔐 Mobile Verification</h3>
                <p style="font-size:13px; color:#9ca3af; margin-bottom:15px;">Enter your phone number to complete booking.</p>
                <div id="phoneStep">
                    <input type="tel" id="loginPhone" placeholder="10-digit Mobile Number" style="width:100%; padding:12px; background:#0b0f17; border:1px solid #1f293d; color:#fff; border-radius:6px; margin-bottom:15px; text-align:center; font-size:16px;" required>
                    <button id="sendOtpBtn" style="width:100%; padding:12px; background:#2563eb; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">Get OTP from Server</button>
                </div>
                <div id="otpStep" style="display:none;">
                    <p id="otpSentMsg" style="font-size:14px; color:#38bdf8; font-weight:bold; margin-bottom:12px;"></p>
                    <input type="text" id="loginOtp" placeholder="Enter OTP" style="width:100%; padding:12px; background:#0b0f17; border:1px solid #1f293d; color:#fff; border-radius:6px; margin-bottom:15px; text-align:center; font-size:16px;" maxlength="6">
                    <button id="verifyOtpBtn" style="width:100%; padding:12px; background:#10B981; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">Verify & Submit</button>
                </div>
                <button onclick="document.getElementById('otpLoginModal').remove()" style="background:transparent; border:none; color:#9ca3af; margin-top:15px; cursor:pointer; font-size:13px;">Cancel</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    let serverGeneratedOtp = '';

    document.getElementById('sendOtpBtn').addEventListener('click', async () => {
        let phone = document.getElementById('loginPhone').value.trim();
        if (phone.length < 10) {
            alert('Enter a valid mobile number.');
            return;
        }

        let { data, error } = await supabaseClient.rpc('request_user_otp', { p_phone: phone });

        if (error || !data.success) {
            alert('Failed to generate OTP on server.');
            return;
        }

        serverGeneratedOtp = data.otp;

        document.getElementById('phoneStep').style.display = 'none';
        document.getElementById('otpStep').style.display = 'block';
        document.getElementById('otpSentMsg').innerText = `Server Generated OTP: ${serverGeneratedOtp}`;
    });

    document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
        let otp = document.getElementById('loginOtp').value.trim();
        let phone = document.getElementById('loginPhone').value.trim();

        if (otp !== serverGeneratedOtp) {
            alert('Invalid OTP.');
            return;
        }

        document.getElementById('otpLoginModal').remove();
        localStorage.setItem('user_phone', phone);
        if (pendingCampaignData) {
            await finalizeCampaignSubmission(phone, serverGeneratedOtp, pendingCampaignData);
        }
    });
}
async function finalizeCampaignSubmission(userPhone, userOtp, data) {
    try {
        let publicFileUrl = 'https://swndqwcujyepctncxfhr.supabase.co/storage/v1/object/public/ad-videos/default.mp4';

        if (data.fileInputFile) {
            const file = data.fileInputFile;
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

        let baseParts = data.selectedDateVal.split('-');
        let startDate = new Date(baseParts[0], baseParts[1] - 1, baseParts[2]);
        let optionsCheck = { day: '2-digit', month: 'long', year: 'numeric' };

        let { data: existingSlots } = await supabaseClient.from('buysecond_records').select('*').order('id', { ascending: true });
        let recordsToInsert = [];

        for (let d = 0; d < data.campaignDays; d++) {
            let currentDayDate = new Date(startDate);
            currentDayDate.setDate(startDate.getDate() + d);
            let targetDateStr = currentDayDate.toLocaleDateString('en-US', optionsCheck);

            let dayExisting = existingSlots ? existingSlots.filter(rec => rec.slot_time && rec.slot_time.includes(targetDateStr)) : [];

            for (let f = 0; f < data.frequency; f++) {
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
                    targetOffset = departEndSec - data.duration;
                    if (targetOffset < departStartSec) targetOffset = departStartSec;
                }

                let slotTimeObj = new Date(currentDayDate);
                slotTimeObj.setHours(0, 0, 0, 0);
                slotTimeObj.setSeconds(targetOffset);

                let timeString = slotTimeObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                let finalSlotTimeFormatted = `${targetDateStr} at ${timeString} (IST)`;

                let newRecordObj = {
                    brand_name: data.adTitle + (data.frequency > 1 ? ` (Run ${f + 1}/${data.frequency})` : ''),
                    target_url: data.targetUrl,
                    file_url: publicFileUrl,
                    duration_second: data.duration,
                    slot_time: finalSlotTimeFormatted,
                    status: 'pending',
                    unified_token: null,
                    user_phone: userPhone,
                    user_otp: userOtp
                };

                recordsToInsert.push(newRecordObj);
                dayExisting.push(newRecordObj);
            }
        }

        if (recordsToInsert.length > 0) {
            let { error: insertError } = await supabaseClient.from('buysecond_records').insert(recordsToInsert);
            if (insertError) throw insertError;
        }

        let { data: latestRecord } = await supabaseClient.from('buysecond_records').select('id').eq('user_phone', userPhone).order('id', { ascending: false }).limit(1);
        if (latestRecord && latestRecord.length > 0) {
            localStorage.setItem('my_latest_campaign_id', latestRecord[0].id);
        }

        alert('Campaign Submitted Successfully.');
        loadMyActiveCampaign();
    } catch (err) {
        alert('Submission failed: ' + err.message);
    }
}

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

function formatDateTimeToLocalUserTime(istDateObj) {
    if (isNaN(istDateObj)) return '';
    return istDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) +
        ' (' + istDateObj.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) + ' Local Time)';
}

async function loadMyActiveCampaign() {
    const searchResultArea = document.getElementById('searchResultArea');
    const statusBox = document.getElementById('billboardStatusBox');
    const statusText = document.getElementById('billboardStatusText');
    const countdownText = document.getElementById('billboardCountdownText');

    let myCampaignId = localStorage.getItem('my_latest_campaign_id');
    let savedPhone = localStorage.getItem('user_phone');

    if (!myCampaignId && !savedPhone) {
        if (statusBox) statusBox.style.display = 'none';
        if (searchResultArea) {
            searchResultArea.innerHTML = `
                <div style="background: #121824; padding: 16px; border-radius: 8px; border: 1px solid #1f293d; text-align: center;">
                    <p style="color: #38bdf8; font-weight: bold; font-size: 14px; margin-bottom: 8px;">Retrieve Campaign Status</p>
                    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 12px;">Enter registered mobile number and OTP.</p>
                    <input type="tel" id="checkPhoneInput" placeholder="Mobile Number" style="width: 100%; padding: 10px; background: #0b0f17; border: 1px solid #1f293d; color: #fff; border-radius: 6px; margin-bottom: 10px; text-align: center; font-size: 14px;">
                    <input type="text" id="checkOtpInput" placeholder="OTP" style="width: 100%; padding: 10px; background: #0b0f17; border: 1px solid #1f293d; color: #fff; border-radius: 6px; margin-bottom: 12px; text-align: center; font-size: 14px;" maxlength="6">
                    <button onclick="verifyAndLoadUserCampaign()" style="width: 100%; padding: 10px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">View Details</button>
                </div>
            `;
        }
        if (activeCountdownInterval) clearInterval(activeCountdownInterval);
        return;
    }

    try {
        let query = supabaseClient.from('buysecond_records').select('*');
        if (myCampaignId) {
            query = query.eq('id', myCampaignId);
        } else if (savedPhone) {
            query = query.eq('user_phone', savedPhone).order('id', { ascending: false }).limit(1);
        }

        let { data: singleRecord, error } = await query.single();
        if (error || !singleRecord) {
            if (statusBox) statusBox.style.display = 'none';
            localStorage.removeItem('my_latest_campaign_id');
            localStorage.removeItem('user_phone');
            loadMyActiveCampaign();
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
        let now = getSyncedCurrentTime();

        let allCompleted = runsList.every(run => parseIstSlotTimeToDate(run.slot_time) < now);
        if (allCompleted) {
            if (statusBox) statusBox.style.display = 'none';
            localStorage.removeItem('my_latest_campaign_id');
            if (searchResultArea) searchResultArea.innerHTML = '<span style="color: #10B981;">Campaign completed all scheduled runs.</span>';
            if (activeCountdownInterval) clearInterval(activeCountdownInterval);
            return;
        }

        if (statusBox) statusBox.style.display = 'block';

        if (master.status === 'pending') {
            if (statusText) statusText.innerText = `⏳ Waiting for Owner's Approval (${cleanBrand})`;
            if (countdownText) countdownText.innerText = 'Campaign under review.';
            if (searchResultArea) {
                searchResultArea.innerHTML = `
                    <div style="background: #121824; padding: 16px; border-radius: 6px; border: 1px solid #f59e0b; text-align: center;">
                        <p style="color: #f59e0b; font-weight: bold; font-size: 15px; margin-bottom: 6px;">Waiting for Owner's Approval</p>
                        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">Your campaign is under review. Live countdown will start immediately after approval.</p>
                        <button onclick="localStorage.removeItem('my_latest_campaign_id'); localStorage.removeItem('user_phone'); loadMyActiveCampaign();" style="background: transparent; border: none; color: #38bdf8; text-decoration: underline; margin-top: 10px; cursor: pointer; font-size: 12px;">Switch Number</button>
                    </div>
                `;
            }
            return;
        }
        if (master.status === 'rejected') {
            if (statusText) statusText.innerText = `❌ Campaign Rejected (${cleanBrand})`;
            if (countdownText) countdownText.innerText = 'Campaign rejected by admin.';
            return;
        }

        let tokenDisplay = master.unified_token ? `#${master.unified_token}` : 'Approved';
        if (activeCountdownInterval) clearInterval(activeCountdownInterval);

        function updateLiveCountdownUI() {
            let currentTime = getSyncedCurrentTime();
            let upcomingRuns = runsList.filter(run => parseIstSlotTimeToDate(run.slot_time) >= currentTime);
            let nextItem = upcomingRuns.length > 0 ? upcomingRuns[0] : null;

            if (nextItem) {
                let targetTime = parseIstSlotTimeToDate(nextItem.slot_time);
                let diffSecs = Math.floor((targetTime - currentTime) / 1000);
                if (diffSecs > 0) {
                    let hrs = Math.floor(diffSecs / 3600);
                    let mins = Math.floor((diffSecs % 3600) / 60);
                    let secs = diffSecs % 60;
                    if (statusText) statusText.innerText = `🟢 Approved: ${cleanBrand} (#${tokenDisplay})`;
                    if (countdownText) countdownText.innerText = `Next Ad Live in: ${hrs}h : ${mins}m : ${secs}s`;
                } else {
                    if (statusText) statusText.innerText = `📺 Ad Playing Now`;
                    if (countdownText) countdownText.innerText = `Token: #${tokenDisplay}`;
                }
            } else {
                if (statusBox) statusBox.style.display = 'none';
            }
        }

        updateLiveCountdownUI();
        activeCountdownInterval = setInterval(updateLiveCountdownUI, 1000);

        if (searchResultArea) {
            let html = `
                <div style="background: #121824; padding: 14px; border-radius: 6px; border: 1px solid #10B981; max-height: 280px; overflow-y: auto;">
                    <p style="color: #10B981; font-weight: bold; font-size: 15px;">Status: APPROVED</p>
                    <p><b>Token:</b> #${tokenDisplay}</p>
                    <p><b>Brand:</b> ${cleanBrand}</p>
                    <p style="font-weight: bold; color: #38bdf8; margin-top: 8px; margin-bottom: 4px;">Active Slots:</p>
            `;

            runsList.forEach((run, idx) => {
                let runTimeObj = parseIstSlotTimeToDate(run.slot_time);
                let localFormattedTime = formatDateTimeToLocalUserTime(runTimeObj);
                let isCompleted = runTimeObj < now;
                let runStatusStyle = isCompleted ? 'color: #6b7280; text-decoration: line-through;' : 'color: #10B981; font-weight: bold;';
                let runLabel = isCompleted ? 'Completed' : 'Upcoming';
                html += `<p style="font-size: 13px; ${runStatusStyle}">Slot ${idx + 1}: ${localFormattedTime} [${runLabel}]</p>`;
            });

            html += `
                <div style="text-align: center; margin-top: 12px;">
                    <button onclick="localStorage.removeItem('my_latest_campaign_id'); localStorage.removeItem('user_phone'); loadMyActiveCampaign();" style="background: transparent; border: none; color: #ef4444; text-decoration: underline; cursor: pointer; font-size: 12px;">Switch Number</button>
                </div>
                </div>
            `;
            searchResultArea.innerHTML = html;
        }
    } catch (err) {
        console.error(err);
    }
}
async function verifyAndLoadUserCampaign() {
    let phoneInput = document.getElementById('checkPhoneInput')?.value.trim();
    let otpInput = document.getElementById('checkOtpInput')?.value.trim();

    if (!phoneInput || !otpInput) {
        alert('Enter phone number and OTP.');
        return;
    }

    let { data, error } = await supabaseClient
        .from('buysecond_records')
        .select('*')
        .eq('user_phone', phoneInput)
        .eq('user_otp', otpInput)
        .order('id', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) {
        alert('Invalid mobile number or OTP.');
        return;
    }

    localStorage.setItem('user_phone', phoneInput);
    localStorage.setItem('my_latest_campaign_id', data[0].id);
    loadMyActiveCampaign();
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

// --- MEDIA RENDERER WITH NETWORK OPTIMIZATION ---
function renderAdOnBillboard(ad, onComplete) {
    const billboardBox = document.getElementById('billboardBox');
    if (!billboardBox) return;

    let duration = parseInt(ad.duration_second) || 10;
    let fileUrl = ad.file_url || ad.video_url || '';
    let targetUrl = ad.target_url || '#';

    let lowerUrl = fileUrl.toLowerCase();
    let isVideo = lowerUrl.endsWith('.mp4') || lowerUrl.includes('.mp4') || lowerUrl.includes('video') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm') || lowerUrl.includes('video/mp4') || lowerUrl.includes('object/public/ad-videos');
    let isImage = lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.png') || lowerUrl.endsWith('.webp') || lowerUrl.endsWith('.gif');
    if (isImage) isVideo = false;

    let isCompletedCalled = false;
    function triggerComplete() {
        if (isCompletedCalled) return;
        isCompletedCalled = true;
        if (globalTimerInterval) clearInterval(globalTimerInterval);
        if (typeof onComplete === 'function') onComplete();
    }

    if (isVideo) {
        const tempVideo = document.createElement('video');
        tempVideo.src = fileUrl;
        applySmartNetworkOptimization(tempVideo);
        tempVideo.onloadedmetadata = function () {
            let isVertical = tempVideo.videoHeight > tempVideo.videoWidth;
            if (isVertical) {
                billboardBox.innerHTML = `
                    <div style="background: #000; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                        <video src="${fileUrl}" autoplay muted playsinline loop style="position: absolute; width: 100%; height: 100%; object-fit: cover; filter: blur(25px); opacity: 0.6; pointer-events: none;"></video>
                        <video id="activeAdMedia" src="${fileUrl}" autoplay playsinline style="position: relative; max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; cursor: pointer; z-index: 2;" onclick="window.open('${targetUrl}', '_blank')"></video>
                    </div>
                `;
            } else {
                billboardBox.innerHTML = `
                    <div style="background: #000; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                        <video id="activeAdMedia" src="${fileUrl}" autoplay playsinline style="width: 100%; height: 100%; object-fit: fill; border-radius: 6px; cursor: pointer; z-index: 2;" onclick="window.open('${targetUrl}', '_blank')"></video>
                    </div>
                `;
            }
            let mediaEl = document.getElementById('activeAdMedia');
            if (mediaEl) {
                applySmartNetworkOptimization(mediaEl);
                mediaEl.onended = triggerComplete;
                mediaEl.play().catch(e => {
                    mediaEl.muted = true;
                    mediaEl.play();
                });
            }
        };
        tempVideo.onerror = function () {
            billboardBox.innerHTML = `
                <div style="background: #000; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                    <video id="activeAdMedia" src="${fileUrl}" autoplay playsinline style="width: 100%; height: 100%; object-fit: fill; border-radius: 6px; cursor: pointer;" onclick="window.open('${targetUrl}', '_blank')"></video>
                </div>
            `;
            let mediaEl = document.getElementById('activeAdMedia');
            if (mediaEl) {
                applySmartNetworkOptimization(mediaEl);
                mediaEl.onended = triggerComplete;
                mediaEl.play().catch(e => { mediaEl.muted = true; mediaEl.play(); });
            }
        };
    } else {
        const tempImg = new Image();
        tempImg.src = fileUrl;
        tempImg.onload = function () {
            let isVertical = tempImg.naturalHeight > tempImg.naturalWidth;
            if (isVertical) {
                billboardBox.innerHTML = `
                    <div style="background: #000; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                        <img src="${fileUrl}" style="position: absolute; width: 100%; height: 100%; object-fit: cover; filter: blur(25px); opacity: 0.6; pointer-events: none;" alt="Blur BG">
                        <img src="${fileUrl}" style="position: relative; max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; z-index: 2; cursor: pointer;" onclick="window.open('${targetUrl}', '_blank')" alt="Ad Image">
                    </div>
                `;
            } else {
                billboardBox.innerHTML = `
                    <div onclick="window.open('${targetUrl}', '_blank')" style="background: #0b0f17; color: #fff; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; cursor: pointer;">
                        <img src="${fileUrl}" alt="Ad Image" style="width: 100%; height: 100%; object-fit: fill; border-radius: 6px;">
                    </div>
                `;
            }
        };
        tempImg.onerror = function () {
            billboardBox.innerHTML = `
                <div onclick="window.open('${targetUrl}', '_blank')" style="background: #0b0f17; color: #fff; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; cursor: pointer;">
                    <img src="${fileUrl}" alt="Ad Image" style="width: 100%; height: 100%; object-fit: fill; border-radius: 6px;">
                </div>
            `;
        };
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

// --- EXACT SCHEDULED TIME-BASED AUTONOMOUS PLAYER ---
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

        let scheduledAds = [];
        queueRecords.forEach(ad => {
            let adStart = parseIstSlotTimeToDate(ad.slot_time);
            let dur = parseInt(ad.duration_second) || 10;
            let adEnd = new Date(adStart.getTime() + (dur * 1000));
            scheduledAds.push({ adRecord: ad, start: adStart, end: adEnd, duration: dur });
        });

        function checkAndPlaySchedule() {
            if (typeof isPlayingPastRecord !== 'undefined' && isPlayingPastRecord) return;
            let currentTime = getSyncedCurrentTime();

            let currentPlayingAd = null;
            let nextUpcomingAd = null;

            for (let i = 0; i < scheduledAds.length; i++) {
                let item = scheduledAds[i];
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
                    if (timerEl) timerEl.innerText = 'No Active Slots';
                    setTimeout(initLiveBillboardPlayer, 15000);
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