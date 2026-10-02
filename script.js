// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://swndqwcujyepctncxfhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bmRxd2N1anllcGN0bmN4ZmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzczNDQsImV4cCI6MjEwNTkxMzM0NH0.FcoPIUbbpIfUzxLOxUhMXiTirW2-j5Fw5dnfl9tqx2o';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TOTAL_DAILY_SECONDS = 50400; // 14 Hours = 50,400 Seconds

let isPlayingPastRecord = false;
let globalTimerInterval = null;

// Page load hone par saare elements aur modals ko bind karein
window.addEventListener('DOMContentLoaded', () => {
    initVisitorCounter();
    updateAvailableSecondsCounter();
    initLiveBillboardPlayer();
    manageUserTokenDisplay(); // Yeh ab database se bhi verify karega

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

    // --- COUNTRY DROPDOWN ---
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

    // --- DURATION & AMOUNT ---
    const durationInput = document.getElementById('durationInput');
    const totalAmount = document.getElementById('totalAmount');
    if (durationInput && totalAmount) {
        durationInput.addEventListener('input', () => {
            let val = parseInt(durationInput.value) || 0;
            totalAmount.innerText = '₹' + (val * 10);
        });
    }

    // --- EXECUTE SEARCH BUTTON LISTENER ---
    const executeSearchBtn = document.getElementById('executeSearchBtn');
    const searchResultArea = document.getElementById('searchResultArea');

    if (executeSearchBtn) {
        executeSearchBtn.addEventListener('click', async () => {
            let tokenInput = document.getElementById('searchTokenInput').value.trim();

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

    // --- FORM SUBMISSION ---
    const slotForm = document.getElementById('slotForm');
    if (slotForm) {
        slotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const durationInputEl = document.getElementById('durationInput');
            const duration = parseInt(durationInputEl ? durationInputEl.value : 10) || 10;
            const targetUrl = document.getElementById('targetUrl').value;
            const adTitle = document.getElementById('adTitle').value;

            const fileInput = document.getElementById('adFile');
            const submitBtn = slotForm.querySelector('button[type="submit"]');
            let originalText = submitBtn.innerText;
            submitBtn.innerText = 'Uploading Media...';
            submitBtn.disabled = true;

            try {
                let publicFileUrl = '';

                if (fileInput && fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = Date.now() + '_' + Math.random().toString(36).substring(2) + '.' + fileExt;
                    const filePath = fileName;

                    // Mobile aur desktop dono ke liye contentType zaroori hai
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

                submitBtn.innerText = 'Booking Slot...';
                let slotInfo = await calculateNextQueueSlot(duration);

                const { data, error } = await supabaseClient
                    .from('buysecond_records')
                    .insert([
                        {
                            brand_name: adTitle,
                            target_url: targetUrl,
                            file_url: publicFileUrl,
                            duration_second: duration,
                            slot_time: slotInfo.formatted_time,
                            status: 'pending'
                        }
                    ]);

                if (error) throw error;

                // Naye insert kiye gaye record ki exact ID fetch karein taaki token clear tracking sahi rahe
                let { data: latestRec } = await supabaseClient
                    .from('buysecond_records')
                    .select('id')
                    .order('id', { ascending: false })
                    .limit(1);

                let realTokenId = latestRec && latestRec.length > 0 ? latestRec[0].id : slotInfo.queue_number;

                let successBox = document.getElementById('successMsgBox');
                if (!successBox) {
                    successBox = document.createElement('div');
                    successBox.id = 'successMsgBox';
                    successBox.style.cssText = 'background: #10B981; color: white; padding: 10px; margin-bottom: 10px; border-radius: 6px; text-align: center; font-weight: bold;';
                    slotForm.prepend(successBox);
                }
                successBox.innerHTML = '✅ Booking Successful! Token: #' + realTokenId + ' | Time: ' + slotInfo.formatted_time;

                await updateAvailableSecondsCounter();
                manageUserTokenDisplay(realTokenId, slotInfo.date_str, slotInfo.time_str);

                setTimeout(() => {
                    slotModal.style.display = 'none';
                    slotForm.reset();
                    if (totalAmount) totalAmount.innerText = '₹100';
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

async function manageUserTokenDisplay(tokenNo, dateStr, timeStr) {
    let tokenSection = document.getElementById('userTokenSection');
    let displayTokenVal = document.getElementById('displayTokenVal');
    let displayDateVal = document.getElementById('displayDateVal');
    let displayTimeVal = document.getElementById('displayTimeVal');

    if (!tokenSection) return;

    if (tokenNo && dateStr && timeStr) {
        displayTokenVal.innerText = '#' + tokenNo;
        displayDateVal.innerText = dateStr;
        displayTimeVal.innerText = timeStr;
        tokenSection.style.display = 'block';

        localStorage.setItem('buysecond_token', tokenNo);
        localStorage.setItem('buysecond_date', dateStr);
        localStorage.setItem('buysecond_time', timeStr);
    } else {
        let savedToken = localStorage.getItem('buysecond_token');
        let savedDate = localStorage.getItem('buysecond_date');
        let savedTime = localStorage.getItem('buysecond_time');

        if (savedToken && savedDate && savedTime) {
            // Check karein ki kya yeh token abhi bhi Supabase mein exist karta hai ya admin ne delete kar diya
            try {
                let { data, error } = await supabaseClient
                    .from('buysecond_records')
                    .select('id')
                    .eq('id', savedToken);

                if (error || !data || data.length === 0) {
                    // Agar admin ne delete kar diya hai, toh local storage clear karke section hide kar do
                    localStorage.removeItem('buysecond_token');
                    localStorage.removeItem('buysecond_date');
                    localStorage.removeItem('buysecond_time');
                    tokenSection.style.display = 'none';
                    return;
                }
            } catch (e) {
                console.error(e);
            }

            displayTokenVal.innerText = '#' + savedToken;
            displayDateVal.innerText = savedDate;
            displayTimeVal.innerText = savedTime;
            tokenSection.style.display = 'block';
        } else {
            tokenSection.style.display = 'none';
        }
    }
}

function getCountdownElement() {
    return document.getElementById('timer-text');
}

function renderAdOnBillboard(ad, onComplete) {
    const billboardBox = document.getElementById('billboardBox');
    if (!billboardBox) return;

    // Jaise hi ad play ho, saved token clear kar do taaki screen se hat jaye
    let savedToken = localStorage.getItem('buysecond_token');
    if (savedToken && String(ad.id) === String(savedToken)) {
        localStorage.removeItem('buysecond_token');
        localStorage.removeItem('buysecond_date');
        localStorage.removeItem('buysecond_time');
        let tokenSection = document.getElementById('userTokenSection');
        if (tokenSection) tokenSection.style.display = 'none';
    }

    let duration = parseInt(ad.duration_second) || 10;
    let fileUrl = ad.file_url || ad.video_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop';
    let isVideo = fileUrl.endsWith('.mp4') || fileUrl.includes('video') || fileUrl.includes('.mov');

    let mediaHTML = isVideo
        ? '<video src="' + fileUrl + '" autoplay muted style="width: 100%; height: 100%; object-fit: contain; max-height: 270px; border-radius: 6px;"></video>'
        : '<img src="' + fileUrl + '" alt="' + (ad.brand_name || '') + '" style="width: 100%; height: 100%; object-fit: contain; max-height: 270px; border-radius: 6px;">';

    let buttonText = ad.target_url && ad.target_url.toLowerCase().includes('shop') ? 'Shop Now' : 'Tap Link';

    billboardBox.innerHTML =
        '<div style="background: #0b0f17; color: #fff; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 10px; text-align: center; border-radius: 10px; box-sizing: border-box;">' +
        '<div style="font-size: 15px; font-weight: 700; color: #10B981;">📢 ' + (ad.brand_name || 'Featured Ad') + '</div>' +
        '<div style="width: 100%; flex-grow: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; margin: 4px 0;">' +
        mediaHTML +
        '</div>' +
        '<a href="' + (ad.target_url || '#') + '" target="_blank" style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 5px 18px; border-radius: 20px; text-decoration: none; font-size: 13px; font-weight: 600; box-shadow: 0 4px 12px rgba(37,99,235,0.4);">' + buttonText + ' →</a>' +
        '</div>';

    if (globalTimerInterval) clearInterval(globalTimerInterval);
    let timeLeft = duration;
    let timerEl = getCountdownElement();

    if (timerEl) timerEl.innerText = 'Next Video in: ' + timeLeft + ' Sec';

    globalTimerInterval = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.innerText = 'Next Video in: ' + timeLeft + ' Sec';

        if (timeLeft <= 0) {
            clearInterval(globalTimerInterval);
            if (onComplete) onComplete();
        }
    }, 1000);
}

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
            let timerEl = getCountdownElement();
            if (timerEl) timerEl.innerText = 'Next Video in: 0 Sec';
            return;
        }

        let approvedAds = queueRecords.filter(ad => ad.status === 'approved');

        if (approvedAds.length === 0) {
            billboardBox.innerHTML = defaultBannerHTML;
            let timerEl = getCountdownElement();
            if (timerEl) timerEl.innerText = 'Next Video in: 0 Sec';
            return;
        }

        let currentIndex = 0;

        function playNextApprovedAd() {
            if (isPlayingPastRecord) return;

            if (currentIndex >= approvedAds.length) {
                currentIndex = 0;
            }

            let currentAd = approvedAds[currentIndex];
            currentIndex++;

            renderAdOnBillboard(currentAd, () => {
                playNextApprovedAd();
            });
        }

        playNextApprovedAd();

    } catch (err) {
        console.error('Billboard Player Error:', err);
        billboardBox.innerHTML = defaultBannerHTML;
    }
}

async function calculateNextQueueSlot(durationSeconds) {
    let targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);

    let dayStartHour = 8; // Subah 8 baje se start

    let { data: existingSlots, error } = await supabaseClient
        .from('buysecond_records')
        .select('duration_second')
        .order('id', { ascending: true });

    let nextQueueNo = 1;
    let totalBookedSecondsBeforeThis = 0;

    if (existingSlots && existingSlots.length > 0) {
        nextQueueNo = existingSlots.length + 1;
        totalBookedSecondsBeforeThis = existingSlots.reduce((sum, rec) => sum + (parseInt(rec.duration_second) || 0), 0);
    }

    let startTime = new Date(targetDate);
    startTime.setHours(dayStartHour, 0, 0, 0);
    startTime.setSeconds(startTime.getSeconds() + totalBookedSecondsBeforeThis);

    // Proper date format with day, month and year (e.g., 03 October 2026)
    let options = { day: '2-digit', month: 'long', year: 'numeric' };
    let dateStr = startTime.toLocaleDateString('en-US', options);
    let timeStr = startTime.toLocaleTimeString();

    return {
        queue_number: nextQueueNo,
        formatted_time: dateStr + ' at ' + timeStr,
        date_str: dateStr,
        time_str: timeStr
    };
}