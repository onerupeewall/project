// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://swndqwcujyepctncxfhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bmRxd2N1anllcGN0bmN4ZmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzczNDQsImV4cCI6MjEwNTkxMzM0NH0.FcoPIUbbpIfUzxLOxUhMXiTirW2-j5Fw5dnfl9tqx2o';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TOTAL_DAILY_SECONDS = 50400; // 14 Hours = 50,400 Seconds

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

    // --- CHECK RECORD MODAL MANAGEMENT (10 Years History Search) ---
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

    // --- INSTANT FILE VALIDATION (Max 30 Seconds Check before submit) ---
    const adFileInput = document.getElementById('adFile');
    const fileErrorMsg = document.getElementById('fileErrorMsg');
    const submitBtn = document.querySelector('#slotForm button[type="submit"]');

    if (adFileInput) {
        adFileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            fileErrorMsg.style.display = 'none';
            fileErrorMsg.innerText = '';
            if (submitBtn) submitBtn.disabled = false;

            if (!file) return;

            if (file.type.startsWith('video/')) {
                const videoElement = document.createElement('video');
                videoElement.preload = 'metadata';
                videoElement.onloadedmetadata = function () {
                    window.URL.revokeObjectURL(videoElement.src);
                    if (videoElement.duration > 30.5) {
                        fileErrorMsg.innerText = '⚠️ Error: Video duration is ' + Math.round(videoElement.duration) + 's. Maximum 30 seconds allowed!';
                        fileErrorMsg.style.display = 'block';
                        if (submitBtn) submitBtn.disabled = true;
                        adFileInput.value = '';
                    }
                }
                videoElement.src = URL.createObjectURL(file);
            }
        });
    }

    // --- DURATION & AMOUNT ---
    const durationInput = document.getElementById('durationInput');
    const totalAmount = document.getElementById('totalAmount');
    if (durationInput && totalAmount) {
        durationInput.addEventListener('input', () => {
            let val = parseInt(durationInput.value) || 0;
            if (val > 30) {
                val = 30;
                durationInput.value = 30;
            }
            if (val < 1) val = 1;
            totalAmount.innerText = '₹' + (val * 10);
        });
    }

    // --- EXECUTE SEARCH BUTTON LISTENER (10-Year Record Search) ---
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

            let cleanToken = tokenInput.replace('#', '');
            searchResultArea.innerHTML = 'Searching record...';

            try {
                let { data, error } = await supabaseClient
                    .from('buysecond_records')
                    .select('*')
                    .eq('id', cleanToken);

                if (error || !data || data.length === 0) {
                    searchResultArea.innerHTML = '<span style="color: #ef4444;">Is Token Number ka koi record nahi mila.</span>';
                    return;
                }

                let record = data[0];

                if (searchDay || searchMonth || searchYear) {
                    let slotTimeStr = record.slot_time || '';
                    let matchesDate = true;
                    if (searchDay && !slotTimeStr.includes(searchDay)) matchesDate = false;
                    if (searchMonth && !slotTimeStr.includes(searchMonth)) matchesDate = false;
                    if (searchYear && !slotTimeStr.includes(searchYear)) matchesDate = false;

                    if (!matchesDate) {
                        searchResultArea.innerHTML = '<span style="color: #ef4444;">Token number match hua, lekin chuni gayi date se record match nahi ho raha!</span>';
                        return;
                    }
                }

                searchResultArea.innerHTML =
                    '<div style="background: #121824; padding: 14px; border-radius: 6px; border: 1px solid #1f293d; margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">' +
                    '<p><b>Brand / Ad Name:</b> ' + record.brand_name + '</p>' +
                    '<p><b>Slot Time:</b> ' + record.slot_time + '</p>' +
                    '<p><b>Duration:</b> ' + record.duration_second + ' Seconds</p>' +
                    '<button id="playSearchedAdBtn" style="margin-top: 5px; background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%;">Play Video Now</button>' +
                    '</div>';

                document.getElementById('playSearchedAdBtn').addEventListener('click', () => {
                    checkRecordModal.style.display = 'none';
                    isPlayingPastRecord = true;

                    renderAdOnBillboard(record, () => {
                        isPlayingPastRecord = false;
                        initLiveBillboardPlayer();
                    });
                });

            } catch (err) {
                console.error(err);
                searchResultArea.innerHTML = '<span style="color: #ef4444;">Search karne mein error aayi hai.</span>';
            }
        });
    }

    // --- FORM SUBMISSION (Instant Non-Stuck Upload & Date-Wise Token Reset #1) ---
    const slotForm = document.getElementById('slotForm');
    if (slotForm) {
        slotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const durationInputEl = document.getElementById('durationInput');
            let duration = parseInt(durationInputEl ? durationInputEl.value : 10) || 10;

            if (duration > 30) {
                alert('Maximum 30 seconds allowed.');
                return;
            }

            const targetUrl = document.getElementById('targetUrl').value;
            const adTitle = document.getElementById('adTitle').value;
            const fileInput = document.getElementById('adFile');
            const selectedDateVal = document.getElementById('bookingDateInput').value; // YYYY-MM-DD

            const submitBtn = slotForm.querySelector('button[type="submit"]');
            let originalText = submitBtn.innerText;
            submitBtn.innerText = 'Uploading & Booking...';
            submitBtn.disabled = true;

            try {
                // Calculate queue & check 50400 quota + date-wise token reset to 1
                let slotInfo = await calculateCustomQueueSlot(duration, selectedDateVal);

                if (slotInfo.quota_exceeded) {
                    alert('⚠️ Is date ki 50,400 seconds ki seat full ho chuki hai! Kripya kisi aage ki date ke liye booking karein.');
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                    return;
                }

                let publicFileUrl = '';

                if (fileInput && fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = Date.now() + '_' + Math.random().toString(36).substring(2) + '.' + fileExt;
                    const filePath = fileName;

                    let { data: uploadData, error: uploadError } = await supabaseClient.storage
                        .from('ad-videos')
                        .upload(filePath, file, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: file.type
                        });

                    if (uploadError) throw uploadError;

                    const { data: publicUrlData } = supabaseClient.storage
                        .from('ad-videos')
                        .getPublicUrl(filePath);

                    publicFileUrl = publicUrlData.publicUrl;
                }

                const { data, error } = await supabaseClient
                    .from('buysecond_records')
                    .insert([
                        {
                            brand_name: adTitle,
                            target_url: targetUrl,
                            file_url: publicFileUrl,
                            duration_second: duration,
                            slot_time: slotInfo.formatted_time,
                            status: 'approved'
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
                successBox.innerHTML = '✅ Booking Successful! Token: #' + slotInfo.daily_token_number + ' | Date: ' + slotInfo.date_str;

                await updateAvailableSecondsCounter();
                manageUserTokenDisplay(slotInfo.daily_token_number, slotInfo.date_str, slotInfo.time_str);

                setTimeout(() => {
                    slotModal.style.display = 'none';
                    slotForm.reset();
                    if (totalAmount) totalAmount.innerText = '₹100';
                    if (successBox) successBox.remove();
                    initLiveBillboardPlayer();
                }, 2500);

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

async function updateAvailableSecondsCounter() {
    let remainingEl = document.getElementById('remainingSecondsCount');
    if (!remainingEl) return;

    try {
        let tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        let options = { day: '2-digit', month: 'long', year: 'numeric' };
        let tomorrowDateStr = tomorrow.toLocaleDateString('en-US', options);

        let { data: records, error } = await supabaseClient
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

async function manageUserTokenDisplay(tokenNo, dateStr, timeStr) {
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

        localStorage.setItem('buysecond_token', tokenNo);
        localStorage.setItem('buysecond_date', dateStr);
        localStorage.setItem('buysecond_time', timeStr);
    } else {
        let savedToken = localStorage.getItem('buysecond_token');
        let savedDate = localStorage.getItem('buysecond_date');
        let savedTime = localStorage.getItem('buysecond_time');

        if (savedToken && savedDate && savedTime) {
            displayTokenVal.innerText = '#' + savedToken;
            displayDateVal.innerText = savedDate;
            displayTimeVal.innerText = savedTime;
            tokenSection.style.display = 'block';
            if (reminderEl) reminderEl.style.display = 'block';
        } else {
            tokenSection.style.display = 'none';
            if (reminderEl) reminderEl.style.display = 'none';
        }
    }
}

function getCountdownElement() {
    return document.getElementById('timer-text');
}

// --- SMART BILLBOARD RENDERING (Cinematic Blur for Vertical, Auto-fit for Horizontal) ---
function renderAdOnBillboard(ad, onComplete) {
    const billboardBox = document.getElementById('billboardBox');
    if (!billboardBox) return;

    let duration = parseInt(ad.duration_second) || 10;
    let fileUrl = ad.file_url || ad.video_url || '';

    let isVideo = fileUrl.endsWith('.mp4') || fileUrl.includes('.mp4') || fileUrl.includes('video') || fileUrl.includes('.mov');

    let mediaHTML = '';
    if (fileUrl) {
        if (isVideo) {
            mediaHTML =
                '<div style="position: absolute; inset: 0; overflow: hidden; z-index: 1;">' +
                '<video src="' + fileUrl + '" autoplay muted loop playsinline style="width: 100%; height: 100%; object-fit: cover; filter: blur(15px); opacity: 0.6;"></video>' +
                '</div>' +
                '<div style="position: relative; z-index: 2; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">' +
                '<video src="' + fileUrl + '" autoplay muted playsinline style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; border-radius: 6px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);"></video>' +
                '</div>';
        } else {
            mediaHTML =
                '<div style="position: absolute; inset: 0; overflow: hidden; z-index: 1;">' +
                '<img src="' + fileUrl + '" style="width: 100%; height: 100%; object-fit: cover; filter: blur(15px); opacity: 0.6;">' +
                '</div>' +
                '<div style="position: relative; z-index: 2; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">' +
                '<img src="' + fileUrl + '" alt="' + (ad.brand_name || '') + '" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; border-radius: 6px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">' +
                '</div>';
        }
    } else {
        mediaHTML = '<div style="color: #9ca3af; font-size: 13px; z-index: 2; position: relative;">No Media Provided</div>';
    }

    let buttonText = ad.target_url && ad.target_url.toLowerCase().includes('shop') ? 'Shop Now' : 'Tap Link';

    billboardBox.innerHTML =
        '<div style="background: #0b0f17; color: #fff; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 10px; text-align: center; border-radius: 10px; box-sizing: border-box; position: relative; overflow: hidden;">' +
        '<div style="font-size: 15px; font-weight: 700; color: #10B981; z-index: 3; position: relative; background: rgba(0,0,0,0.6); padding: 2px 10px; border-radius: 4px;">📢 ' + (ad.brand_name || 'Ad') + '</div>' +
        mediaHTML +
        '<a href="' + (ad.target_url || '#') + '" target="_blank" style="z-index: 3; position: relative; background: #2563eb; color: white; padding: 6px 16px; border-radius: 20px; text-decoration: none; font-size: 13px; font-weight: bold; box-shadow: 0 4px 10px rgba(37,99,235,0.4);">' + buttonText + ' →</a>' +
        '</div>';

    let timeLeft = duration;
    let timerEl = getCountdownElement();

    if (globalTimerInterval) clearInterval(globalTimerInterval);

    globalTimerInterval = setInterval(() => {
        if (timerEl) timerEl.innerText = `Playing Ad... (${timeLeft}s left)`;
        timeLeft--;
        if (timeLeft < 0) {
            clearInterval(globalTimerInterval);
            if (typeof onComplete === 'function') onComplete();
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

        if (error || !queueRecords || queueRecords.length === 0) {
            billboardBox.innerHTML = '';
            return;
        }

        let today = new Date();
        let optionsCheck = { day: '2-digit', month: 'long', year: 'numeric' };
        let todayDateStr = today.toLocaleDateString('en-US', optionsCheck);

        let todaysApprovedAds = queueRecords.filter(ad => {
            return ad.status === 'approved' && ad.slot_time && ad.slot_time.includes(todayDateStr);
        });

        if (todaysApprovedAds.length === 0) {
            billboardBox.innerHTML = '';
            let timerEl = getCountdownElement();
            if (timerEl) timerEl.innerText = 'Next Video in: 0 Sec';
            return;
        }

        let currentIndex = 0;

        function playNextApprovedAd() {
            if (isPlayingPastRecord) return;

            if (currentIndex >= todaysApprovedAds.length) {
                currentIndex = 0;
            }

            let currentAd = todaysApprovedAds[currentIndex];
            currentIndex++;

            renderAdOnBillboard(currentAd, () => {
                playNextApprovedAd();
            });
        }

        playNextApprovedAd();

    } catch (err) {
        console.error('Billboard Player Error:', err);
        billboardBox.innerHTML = '';
    }
}

// --- DATE-WISE TOKEN RESET (#1 per day) & 50,400s QUOTA CALCULATION ---
async function calculateCustomQueueSlot(durationSeconds, selectedDateStr) {
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

    // Check if 50400 quota is full for this date
    if (totalBookedSecondsBeforeThis + durationSeconds > TOTAL_DAILY_SECONDS) {
        return { quota_exceeded: true };
    }

    // Date-wise token number resets and starts from 1 each day
    let dailyTokenNumber = targetDateSlots.length + 1;

    let startTime = new Date(targetDate);
    startTime.setHours(dayStartHour, 0, 0, 0);
    startTime.setSeconds(startTime.getSeconds() + totalBookedSecondsBeforeThis);

    let dateStr = startTime.toLocaleDateString('en-US', optionsCheck);
    let timeStr = startTime.toLocaleTimeString();

    return {
        quota_exceeded: false,
        daily_token_number: dailyTokenNumber,
        formatted_time: dateStr + ' at ' + timeStr,
        date_str: dateStr,
        time_str: timeStr
    };
}