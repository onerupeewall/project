// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://swndqwcujyepctncxfhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bmRxd2N1anllcGN0bmN4ZmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzczNDQsImV4cCI6MjEwNTkxMzM0NH0.FcoPIUbbpIfUzxLOxUhMXiTirW2-j5Fw5dnfl9tqx2o';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const TOTAL_DAILY_SECONDS = 86400;
const DEPART_DURATION = 7200;

let serverTimeOffset = 0;
let globalTimerInterval = null;
let activeCountdownInterval = null;

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

// --- INSTANT DOM INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
    syncServerTime();
    checkWebsiteMaintenance();

    // 1. Increment visitor count on every visit/refresh & fetch counters
    await registerVisitAndLoadCounters();

    // 2. Check and sync user follow state (Guest localStorage -> Google account sync)
    await handleUserFollowSyncAndUI();

    updateAvailableSecondsCounter();
    initLiveBillboardPlayer();
    loadMyActiveCampaign();

    // Date Input Setup
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

    // --- MODAL EVENT LISTENERS ---
    const slotModal = document.getElementById('slotModal');
    const openSlotModal = document.getElementById('openSlotModal');
    const closeSlotModal = document.getElementById('closeSlotModal');

    if (openSlotModal && slotModal) {
        openSlotModal.addEventListener('click', async (e) => {
            e.preventDefault();

            if (supabaseClient) {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (!session) {
                    openGoogleLoginModal();
                    return;
                }

                let hasFollowed = await checkIfUserFollowed(session.user.id);
                if (!hasFollowed && localStorage.getItem('has_followed_buysecond') !== 'true') {
                    openMandatoryFollowModal(() => {
                        slotModal.style.display = 'flex';
                    });
                    return;
                }
            }

            slotModal.style.display = 'flex';
        });
    }

    if (closeSlotModal && slotModal) {
        closeSlotModal.addEventListener('click', () => { slotModal.style.display = 'none'; });
    }

    // Terms Modal
    const termsModal = document.getElementById('termsModal');
    const openTermsBtn = document.getElementById('openTermsBtn');
    const closeTermsModal = document.getElementById('closeTermsModal');

    if (openTermsBtn && termsModal) {
        openTermsBtn.addEventListener('click', (e) => { e.preventDefault(); termsModal.style.display = 'flex'; });
    }
    if (closeTermsModal && termsModal) {
        closeTermsModal.addEventListener('click', () => { termsModal.style.display = 'none'; });
    }

    // Privacy Modal
    const privacyModal = document.getElementById('privacyModal');
    const openPrivacyBtn = document.getElementById('openPrivacyBtn');
    const closePrivacyModal = document.getElementById('closePrivacyModal');

    if (openPrivacyBtn && privacyModal) {
        openPrivacyBtn.addEventListener('click', (e) => { e.preventDefault(); privacyModal.style.display = 'flex'; });
    }
    if (closePrivacyModal && privacyModal) {
        closePrivacyModal.addEventListener('click', () => { privacyModal.style.display = 'none'; });
    }

    // Check Record Modal
    const checkRecordModal = document.getElementById('checkRecordModal');
    const checkRecordBtn = document.getElementById('checkRecordBtn');
    const closeCheckRecordModal = document.getElementById('closeCheckRecordModal');

    if (checkRecordBtn && checkRecordModal) {
        checkRecordBtn.addEventListener('click', async () => {
            if (supabaseClient) {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (!session) {
                    openGoogleLoginModal();
                    return;
                }
            }
            checkRecordModal.style.display = 'flex';
            loadMyActiveCampaign();
        });
    }
    if (closeCheckRecordModal && checkRecordModal) {
        closeCheckRecordModal.addEventListener('click', () => { checkRecordModal.style.display = 'none'; });
    }

    // Window Click to Close Modals
    window.addEventListener('click', (e) => {
        if (slotModal && e.target === slotModal) slotModal.style.display = 'none';
        if (termsModal && e.target === termsModal) termsModal.style.display = 'none';
        if (privacyModal && e.target === privacyModal) privacyModal.style.display = 'none';
        if (checkRecordModal && e.target === checkRecordModal) checkRecordModal.style.display = 'none';
    });

    // Center Billboard Follow Button Handler
    const centerFollowBtn = document.getElementById('centerFollowBtn');
    if (centerFollowBtn) {
        centerFollowBtn.addEventListener('click', async () => {
            await recordUserFollowAction();
            document.getElementById('billboardFollowOverlay').style.display = 'none';
            alert('🎉 Thank you for following @buysecond!');
        });
    }

    // Dynamic Campaign Fields Injection
    const slotFormContainer = document.getElementById('slotForm');
    if (slotFormContainer && !document.getElementById('frequencyInput')) {
        const durationGroup = document.getElementById('durationInput')?.parentElement || slotFormContainer.firstElementChild;
        let campaignFieldsHTML = `
            <div class="form-group">
                <label>Times per Day (Max 12 Departs):</label>
                <input type="number" id="frequencyInput" value="1" min="1" max="12" required>
            </div>
            <div class="form-group">
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

    async function updateCalculatedAmount() {
        if (!durationInput || !totalAmount || !supabaseClient) return;
        let dur = parseInt(durationInput.value) || 10;
        let freq = frequencyInput ? parseInt(frequencyInput.value) || 1 : 1;
        let days = campaignDaysInput ? parseInt(campaignDaysInput.value) || 1 : 1;

        let { data: verifiedPrice, error } = await supabaseClient.rpc('calculate_campaign_amount', {
            p_duration: dur,
            p_frequency: freq,
            p_days: days
        });

        let finalPrice = error || verifiedPrice === null ? (dur * freq * days * 10) : verifiedPrice;
        totalAmount.innerText = '₹' + finalPrice;
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

    updateCalculatedAmount();

    // Form Submit Handler
    if (slotFormContainer) {
        slotFormContainer.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!supabaseClient) {
                alert('Supabase client failed to initialize.');
                return;
            }

            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) {
                alert('Please sign in with Google to submit campaigns.');
                openGoogleLoginModal();
                return;
            }

            let duration = parseInt(document.getElementById('durationInput')?.value) || 10;
            let frequency = parseInt(document.getElementById('frequencyInput')?.value) || 1;
            let campaignDays = parseInt(document.getElementById('campaignDaysInput')?.value) || 1;

            if (frequency > 12) {
                alert('Frequency cannot exceed 12 per day.');
                return;
            }

            const targetUrl = document.getElementById('targetUrl')?.value || '';
            const adTitle = document.getElementById('adTitle')?.value || '';
            const fileInput = document.getElementById('adFile');
            const selectedDateVal = document.getElementById('bookingDateInput')?.value || '';

            if (!targetUrl || !adTitle) {
                alert('Please fill out all required fields.');
                return;
            }

            let campaignData = {
                duration, frequency, campaignDays, targetUrl, adTitle, fileInputFile: fileInput?.files[0], selectedDateVal
            };

            if (slotModal) slotModal.style.display = 'none';
            await finalizeCampaignSubmission(session.user, campaignData);
        });
    }
});
// --- COUNTERS & VISITOR REGISTRATION ---
async function registerVisitAndLoadCounters() {
    if (!supabaseClient) return;
    let visitorEl = document.getElementById('totalGlobalCount');
    let followerEl = document.getElementById('totalFollowersCount');

    try {
        // Increment visitor count by 1 on every page load/refresh securely via RPC
        await supabaseClient.rpc('increment_site_visitors');
    } catch (err) { }

    try {
        let { data, error } = await supabaseClient.from('site_analytics').select('count, followers_count').eq('id', 1).single();
        if (!error && data) {
            if (visitorEl) visitorEl.innerText = data.count || 0;
            if (followerEl) followerEl.innerText = data.followers_count || 0;
        }
    } catch (err) { }
}

async function updateFollowersDisplay() {
    let followerEl = document.getElementById('totalFollowersCount');
    if (!followerEl || !supabaseClient) return;
    try {
        let { data } = await supabaseClient.from('site_analytics').select('followers_count').eq('id', 1).single();
        if (data) {
            followerEl.innerText = data.followers_count || 0;
        }
    } catch (e) { }
}

// --- FOLLOW STATE & GUEST-TO-GOOGLE SYNC ---
async function checkIfUserFollowed(userId) {
    try {
        let { data } = await supabaseClient.from('user_follows').select('*').eq('user_id', userId).single();
        return !!data;
    } catch (e) {
        return false;
    }
}

async function handleUserFollowSyncAndUI() {
    if (!supabaseClient) return;

    const overlay = document.getElementById('billboardFollowOverlay');
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        // User is logged in via Google
        let isFollowedInDB = await checkIfUserFollowed(session.user.id);

        if (!isFollowedInDB && localStorage.getItem('has_followed_buysecond') === 'true') {
            // Guest follow found in localStorage -> Auto-sync to database!
            await supabaseClient.from('user_follows').insert([{ user_id: session.user.id, user_email: session.user.email }]);
            localStorage.removeItem('has_followed_buysecond'); // Clean guest token
            isFollowedInDB = true;
        }

        if (isFollowedInDB) {
            // User has already followed, hide center billboard follow overlay
            if (overlay) overlay.style.display = 'none';
        } else {
            // Logged in but not followed yet, show billboard follow overlay
            if (overlay) overlay.style.display = 'flex';
        }
    } else {
        // Guest user
        if (localStorage.getItem('has_followed_buysecond') === 'true') {
            // Guest already followed in this browser
            if (overlay) overlay.style.display = 'none';
        } else {
            // Guest has not followed yet, show billboard follow overlay
            if (overlay) overlay.style.display = 'flex';
        }
    }
}

async function recordUserFollowAction() {
    if (!supabaseClient) return;
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        let already = await checkIfUserFollowed(session.user.id);
        if (!already) {
            await supabaseClient.from('user_follows').insert([{ user_id: session.user.id, user_email: session.user.email }]);
        }
    } else {
        // Save guest state in localStorage
        localStorage.setItem('has_followed_buysecond', 'true');
    }

    try {
        // Increment follower count securely via server RPC
        await supabaseClient.rpc('increment_site_followers');
    } catch (e) { }

    await updateFollowersDisplay();

    // Hide billboard overlay immediately
    const overlay = document.getElementById('billboardFollowOverlay');
    if (overlay) overlay.style.display = 'none';

    return true;
}

function openMandatoryFollowModal(onSuccessCallback) {
    let existing = document.getElementById('mandatoryFollowModal');
    if (existing) existing.remove();

    let modalHTML = `
        <div id="mandatoryFollowModal" class="modal" style="display: flex; z-index: 99999;">
            <div class="modal-content text-center" style="max-width: 350px;">
                <h3>📢 Follow @buysecond</h3>
                <p class="text-muted-sm" style="margin: 15px 0;">You must follow <b>@buysecond</b> to proceed with your campaign booking.</p>
                <button id="performFollowBtn" class="google-login-btn" style="background: #10B981; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%;">
                    Follow @buysecond
                </button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('performFollowBtn')?.addEventListener('click', async () => {
        await recordUserFollowAction();
        document.getElementById('mandatoryFollowModal')?.remove();
        alert('🎉 Thanks for following!');
        if (typeof onSuccessCallback === 'function') {
            onSuccessCallback();
        }
    });
}

async function openGoogleLoginModal() {
    let existingModal = document.getElementById('googleLoginModal');
    if (existingModal) existingModal.remove();

    let modalHTML = `
        <div id="googleLoginModal" class="modal" style="display: flex;">
            <div class="modal-content text-center">
                <button id="googleSignInBtn" class="google-login-btn">
                    <svg class="google-icon" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.14C3.15 21.37 7.22 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.62H1.18C.43 8.14 0 9.87 0 12s.43 3.86 1.18 5.38l4.09-3.14z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.63 1.18 6.62l4.09 3.14c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
                    Continue with Google
                </button>
                <button onclick="document.getElementById('googleLoginModal')?.remove()" class="btn-cancel-sm" style="margin-top: 15px;">Cancel</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('googleSignInBtn')?.addEventListener('click', async () => {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
        if (error) alert('Google login failed: ' + error.message);
    });
}

// --- MAINTENANCE CHECK ---
async function checkWebsiteMaintenance() {
    try {
        let { data, error } = await supabaseClient.from('site_maintenance').select('*').eq('id', 1).single();
        if (error || !data || !data.is_active) return;
        let now = getSyncedCurrentTime();
        let expiry = new Date(data.expires_at);
        if (now >= expiry) return;
        if (data.scope === 'all') {
            const mFull = document.querySelector('.maintenance-screen-full');
            if (mFull) mFull.style.display = 'flex';
        }
    } catch (e) { }
}

// --- CAMPAIGN SUBMISSION & BILLBOARD PLAYER ---
async function finalizeCampaignSubmission(user, data) {
    try {
        if (!data.adTitle || !data.targetUrl) {
            alert('Campaign title and target URL are required.');
            return;
        }

        let publicFileUrl = 'default.mp4';
        if (data.fileInputFile) {
            const file = data.fileInputFile;
            const fileName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const { error: uploadError } = await supabaseClient.storage.from('ad-videos').upload(fileName, file, { upsert: true });
            if (!uploadError) publicFileUrl = fileName;
            else { alert('File upload failed: ' + uploadError.message); return; }
        }

        let baseParts = data.selectedDateVal ? data.selectedDateVal.split('-') : [];
        let startDate = baseParts.length === 3 ? new Date(baseParts[0], baseParts[1] - 1, baseParts[2]) : new Date();
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
                let brandNameFormatted = data.adTitle + (data.frequency > 1 ? ` (Run ${f + 1}/${data.frequency})` : '');

                let newRecordObj = {
                    brand_name: brandNameFormatted,
                    target_url: data.targetUrl,
                    file_url: publicFileUrl,
                    duration_second: data.duration,
                    slot_time: finalSlotTimeFormatted,
                    status: 'pending',
                    unified_token: null,
                    user_id: user.id,
                    user_email: user.email
                };

                recordsToInsert.push(newRecordObj);
                dayExisting.push(newRecordObj);
            }
        }

        if (recordsToInsert.length > 0) {
            let { error: insertError } = await supabaseClient.from('buysecond_records').insert(recordsToInsert);
            if (insertError) throw insertError;
        }

        let { data: latestRecord } = await supabaseClient.from('buysecond_records').select('id').eq('user_id', user.id).order('id', { ascending: false }).limit(1);
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
        let dateObj = new Date(parts[0]);
        let [timeStr, modifier] = parts[1].split(' ');
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

    if (!supabaseClient) return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        if (statusBox) statusBox.style.display = 'none';
        if (searchResultArea) {
            searchResultArea.innerHTML = `
                <div class="campaign-retrieve-box text-center">
                    <p class="retrieve-title">Retrieve Campaign Status</p>
                    <p class="retrieve-subtitle">Please sign in with Google to view your campaigns.</p>
                    <button onclick="openGoogleLoginModal()" class="google-login-btn">
                        <svg class="google-icon" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.14C3.15 21.37 7.22 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.62H1.18C.43 8.14 0 9.87 0 12s.43 3.86 1.18 5.38l4.09-3.14z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.63 1.18 6.62l4.09 3.14c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
                        Continue with Google
                    </button>
                </div>
            `;
        }
        if (activeCountdownInterval) clearInterval(activeCountdownInterval);
        return;
    }

    try {
        let { data: singleRecord, error } = await supabaseClient
            .from('buysecond_records')
            .select('*')
            .eq('user_id', session.user.id)
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (error || !singleRecord) {
            if (statusBox) statusBox.style.display = 'none';
            if (searchResultArea) searchResultArea.innerHTML = '<span class="text-muted-sm">No campaigns found for this account.</span>';
            return;
        }

        let cleanBrand = singleRecord.brand_name.replace(/\s*\(Run \d+\/\d+\)/g, '').trim();
        let { data: allRuns } = await supabaseClient.from('buysecond_records').select('*').ilike('brand_name', `%${cleanBrand}%`).eq('file_url', singleRecord.file_url);

        let runsList = allRuns && allRuns.length > 0 ? allRuns : [singleRecord];
        let master = runsList[0];
        let now = getSyncedCurrentTime();

        let allCompleted = runsList.every(run => parseIstSlotTimeToDate(run.slot_time) < now);
        if (allCompleted) {
            if (statusBox) statusBox.style.display = 'none';
            if (searchResultArea) searchResultArea.innerHTML = '<span class="text-success">Campaign completed all scheduled runs.</span>';
            if (activeCountdownInterval) clearInterval(activeCountdownInterval);
            return;
        }

        if (statusBox) statusBox.style.display = 'block';

        if (master.status === 'rejected') {
            if (statusText) statusText.innerText = `❌ Campaign Rejected (${cleanBrand})`;
            if (countdownText) countdownText.innerText = 'Campaign rejected by admin.';
            if (searchResultArea) {
                searchResultArea.innerHTML = `
                    <div class="campaign-pending-box" style="border-color: #ff4d4d;">
                        <p class="pending-title" style="color: #ff4d4d;">Campaign Rejected</p>
                        <p class="pending-subtitle">Your campaign was rejected by the admin. Please try submitting with new details.</p>
                        <button onclick="handleLogout()" class="btn-switch-danger">Sign Out / Try Again</button>
                    </div>
                `;
            }
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
                let diffSecs = Math.max(0, Math.floor((targetTime - currentTime) / 1000));
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
                <div class="campaign-list-box">
                    <p class="list-status-approved">Status: APPROVED</p>
                    <p><b>Token:</b> #${tokenDisplay}</p>
                    <p><b>Brand:</b> ${cleanBrand}</p>
                    <p><b>Account:</b> ${session.user.email}</p>
                    <p class="list-active-title">Active Slots:</p>
            `;
            runsList.forEach((run, idx) => {
                let runTimeObj = parseIstSlotTimeToDate(run.slot_time);
                let localFormattedTime = formatDateTimeToLocalUserTime(runTimeObj);
                let isCompleted = runTimeObj < now;
                let runClass = isCompleted ? 'slot-item-completed' : 'slot-item-upcoming';
                let runLabel = isCompleted ? 'Completed' : 'Upcoming';
                html += `<p class="slot-item-text ${runClass}">Slot ${idx + 1}: ${localFormattedTime} [${runLabel}]</p>`;
            });
            html += `<div class="text-center mt-12"><button onclick="handleLogout()" class="btn-switch-danger">Sign Out</button></div></div>`;
            searchResultArea.innerHTML = html;
        }
    } catch (err) { }
}

async function handleLogout() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    localStorage.removeItem('my_latest_campaign_id');
    alert('Signed out successfully.');
    location.reload();
}

async function updateAvailableSecondsCounter() {
    if (!supabaseClient) return;
    let remainingEl = document.getElementById('remainingSecondsCount');
    if (!remainingEl) return;
    let { data: records } = await supabaseClient.from('buysecond_records').select('duration_second').eq('status', 'approved');
    let booked = records ? records.reduce((t, r) => t + (parseInt(r.duration_second) || 0), 0) : 0;
    let avail = TOTAL_DAILY_SECONDS - booked;
    remainingEl.innerText = avail < 0 ? 0 : avail;
}

function getCountdownElement() { return document.getElementById('timer-text'); }

async function renderAdOnBillboard(ad, onComplete) {
    const billboardBox = document.getElementById('billboardBox');
    if (!billboardBox || !supabaseClient) return;

    // Keep the follow overlay intact if still needed, but render ad underneath/around it
    let duration = parseInt(ad.duration_second) || 10;
    let filePath = ad.file_url || ad.video_url || '';
    let targetUrl = ad.target_url || '#';

    let fileUrl = filePath;
    if (filePath && !filePath.startsWith('http') && !filePath.startsWith('blob:')) {
        let { data: signedData } = await supabaseClient.storage.from('ad-videos').createSignedUrl(filePath, duration + 30);
        if (signedData && signedData.signedUrl) fileUrl = signedData.signedUrl;
    }

    let lowerUrl = fileUrl.toLowerCase();
    let isVideo = lowerUrl.includes('.mp4') || lowerUrl.includes('video') || lowerUrl.includes('.mov') || lowerUrl.includes('token=');
    let isImage = lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.png') || lowerUrl.endsWith('.webp');
    if (isImage) isVideo = false;

    let isCompletedCalled = false;
    function triggerComplete() {
        if (isCompletedCalled) return;
        isCompletedCalled = true;
        if (globalTimerInterval) clearInterval(globalTimerInterval);
        if (typeof onComplete === 'function') onComplete();
    }

    // Preserve overlay element inside billboardBox
    const overlayHTML = document.getElementById('billboardFollowOverlay')?.outerHTML || '';

    if (isVideo) {
        billboardBox.innerHTML = `
            <div class="media-wrapper-flex">
                <video id="activeAdMedia" src="${fileUrl}" autoplay playsinline class="media-video-fill" onclick="window.open('${targetUrl}', '_blank')"></video>
            </div>
            ${overlayHTML}
        `;
        let mediaEl = document.getElementById('activeAdMedia');
        if (mediaEl) {
            applySmartNetworkOptimization(mediaEl);
            mediaEl.onended = triggerComplete;
            mediaEl.play().catch(() => { mediaEl.muted = true; mediaEl.play(); });
        }
    } else {
        billboardBox.innerHTML = `
            <div onclick="window.open('${targetUrl}', '_blank')" class="media-wrapper-bg">
                <img src="${fileUrl}" alt="Ad Image" class="media-img-fill">
            </div>
            ${overlayHTML}
        `;
    }

    let timerEl = getCountdownElement();
    if (globalTimerInterval) clearInterval(globalTimerInterval);

    let startTime = Date.now();
    globalTimerInterval = setInterval(() => {
        let elapsed = Math.floor((Date.now() - startTime) / 1000);
        let timeLeft = duration - elapsed;
        if (timerEl) timerEl.innerText = `${timeLeft > 0 ? timeLeft : 0}s`;
        if (timeLeft <= 0) {
            clearInterval(globalTimerInterval);
            triggerComplete();
        }
    }, 1000);
}

async function initLiveBillboardPlayer() {
    const billboardBox = document.getElementById('billboardBox');
    if (!billboardBox || !supabaseClient) return;

    function applyDefaultBanner() {
        const overlayHTML = document.getElementById('billboardFollowOverlay')?.outerHTML || '';
        billboardBox.innerHTML = overlayHTML;
        billboardBox.style.background = "url('buysecond.png') no-repeat center center";
        billboardBox.style.backgroundSize = "100% 100%";
        let timerEl = getCountdownElement();
        if (timerEl) timerEl.innerText = 'No Active Slots';

        // Re-apply follow state check after innerHTML reset
        handleUserFollowSyncAndUI();
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
            let currentTime = getSyncedCurrentTime();
            let currentPlayingAd = null;

            for (let i = 0; i < scheduledAds.length; i++) {
                let item = scheduledAds[i];
                if (currentTime >= item.start && currentTime < item.end) {
                    currentPlayingAd = item;
                    break;
                }
            }

            let timerEl = getCountdownElement();
            if (currentPlayingAd) {
                renderAdOnBillboard(currentPlayingAd.adRecord, () => {
                    setTimeout(checkAndPlaySchedule, 500);
                });
            } else {
                applyDefaultBanner();
                if (timerEl) timerEl.innerText = 'No Active Slots';
                setTimeout(initLiveBillboardPlayer, 10000);
            }
        }
        checkAndPlaySchedule();
    } catch (err) {
        applyDefaultBanner();
        setTimeout(initLiveBillboardPlayer, 15000);
    }
}