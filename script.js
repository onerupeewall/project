/* =======================================================
   🛡️ MTB LOCK HUB - SELF-PUBLISH OWNER ENGINE (SEQUENCE 5) 🛡️
   ======================================================= */

// 🚨 ग्लोबल वेरिएबल: ओनर्स द्वारा पब्लिश किए गए ब्रांड्स को रीयल-टाइम में स्टोर करने के लिए तिजोरी
let localBrandDatabase = {};

// 1. $1 का भुगतान होते ही पुराना ताला और गेटवे स्क्रीन से हमेशा के लिए गायब करना
function processUnlockPayment() {
    alert("⚡ Secure Payment Approved! Unlocking the Global Oracle...");

    const lockGate = document.getElementById('mtbLockGate');
    if (lockGate) {
        lockGate.remove(); // पुराना ताला और बॉर्डर जड़ से डिलीट भाई
    }

    const activeSearch = document.getElementById('mtbActiveSearch');
    if (activeSearch) {
        activeSearch.style.display = 'flex'; // सिर्फ क्लीन सर्च बार राज करेगा
    }
}

// 2. सर्च बार हैंडलर - जो सीधे ओनर द्वारा भरे गए डेटा को लाइव खींच कर लाएगा
function triggerAiBrandSearch() {
    const inputField = document.getElementById('brandSearchInput');
    const query = inputField ? inputField.value.trim() : "";

    if (!query) {
        alert("Rai Sahab, please enter a brand name first!");
        return;
    }

    const upperQuery = query.toUpperCase();

    // 🔍 चेक करना कि क्या यह ब्रांड किसी ओनर ने खुद पब्लिश किया है या नहीं
    if (localBrandDatabase[upperQuery]) {
        // अगर डेटा मिल गया, तो सीधे ओनर का असली डेटा दिखाना
        renderPublishedBrandCard(localBrandDatabase[upperQuery]);
    } else {
        // अगर ब्रांड अभी तक किसी ने रजिस्टर नहीं किया है, तो उसे खुद जोड़ने का मौका देना
        alert(`ℹ️ "${query}" is not registered yet. Open the form to add it, Rai Sahab!`);
        openBrandRegistrationForm(query);
    }
}

// 3. 📝 ओनर का "Add/Claim My Brand" का शाही फ़ॉर्म विंडो
function openBrandRegistrationForm(suggestedName = "") {
    const overlay = document.getElementById('globalModalOverlay');
    const content = document.getElementById('dynamicModalContent');

    content.innerHTML = `
        <div class="search-result-modal" style="position: relative; background: #ffffff; padding: 25px; border-radius: 16px; width: 440px; max-width: 90%; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.3); height: auto !important; display: flex; flex-direction: column; align-items: center; color: #000;">
            
            <span style="position: absolute; top: 12px; right: 18px; color: #888; font-size: 28px; cursor: pointer; font-weight: bold; line-height: 1;" onclick="closeGlobalModal()">×</span>
            
            <h3 style="margin: 5px 0 15px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.5px;">👑 Register Your Official Brand</h3>
            <p style="font-size: 12px; color: #6b7280; font-weight: 700; margin-bottom: 20px;">Fill your official business details to publish on the global stage.</p>
            
            <!-- फ़ॉर्म इनपुट्स -->
            <div style="width: 100%; text-align: left; display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                <div>
                    <label style="font-size: 11px; font-weight: 800; color: #4b5563; text-transform: uppercase;">Brand Name</label>
                    <input type="text" id="regBrandName" value="${suggestedName}" placeholder="e.g. Taste King, Nike..." style="width: 100%; padding: 10px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 14px; font-weight: 700; margin-top: 4px; text-transform: uppercase;">
                </div>
                <div>
                    <label style="font-size: 11px; font-weight: 800; color: #4b5563; text-transform: uppercase;">Official Owner / CEO Name</label>
                    <input type="text" id="regOwnerName" placeholder="e.g. Karan Rai, Ratan Tata..." style="width: 100%; padding: 10px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 14px; font-weight: 700; margin-top: 4px;">
                </div>
                <div>
                    <label style="font-size: 11px; font-weight: 800; color: #4b5563; text-transform: uppercase;">Active City Branches (Comma Separated)</label>
                    <input type="text" id="regCities" placeholder="e.g. Varanasi, Lucknow, Delhi..." style="width: 100%; padding: 10px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 4px;">
                </div>
            </div>

            <!-- पब्लिश बटन -->
            <button onclick="saveAndPublishBrand()" style="background: linear-gradient(180deg, #1e3a8a 0%, #0d1b3e 100%); color: #fff; border: 1px solid #1e40af; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 900; cursor: pointer; width: 100%; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(30,58,138,0.2);">
                Publish Brand Data Live ➔
            </button>
        </div>
    `;

    overlay.style.display = 'flex';
}

// 4. ओनर के डेटा को तिजोरी में लाइव पब्लिश (Save) करने वाला फंक्शन
function saveAndPublishBrand() {
    const bName = document.getElementById('regBrandName').value.trim();
    const oName = document.getElementById('regOwnerName').value.trim();
    const citiesInput = document.getElementById('regCities').value.trim();

    if (!bName || !oName || !citiesInput) {
        alert("Rai Sahab, please fill all fields to publish successfully!");
        return;
    }

    const upperKey = bName.toUpperCase();

    // शहरों की स्ट्रिंग को एरे (List) में बदलना भाई
    const branchesArray = citiesInput.split(',').map(city => city.trim()).filter(city => city !== "");

    // 🚨 ओनर द्वारा दिए गए डेटा का लाइव ऑब्जेक्ट पैक
    localBrandDatabase[upperKey] = {
        brandName: bName.toUpperCase(),
        ownerName: oName,
        branches: branchesArray
    };

    alert(`🎉 Success! "${bName.toUpperCase()}" has been published live on the platform.`);
    closeGlobalModal();
}

// 5. 🌐 ओनर द्वारा खुद भरे गए डेटा के हिसाब से ऑटो-हाइट कार्ड रेंडर करना
function renderPublishedBrandCard(brandData) {
    const overlay = document.getElementById('globalModalOverlay');
    const content = document.getElementById('dynamicModalContent');

    // ओनर के ब्रांड नाम के हिसाब से ऑटो-जनरेटेड वैलिडेटेड लोगो बॉक्स (नो हार्डकोडिंग भाई!)
    let officialLogo = `
        <div style="font-size: 16px; font-weight: 900; color: #1e3a8a; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 12px 20px; border-radius: 12px; border: 2px solid #16a34a; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(22,163,74,0.1); width: 100%;">
            ✅ ${brandData.brandName} OFFICIAL
        </div>
    `;

    // 📍 शहरों की लिस्ट और ऑटो-हाइट एडजस्टमेंट (2 ब्रांच तो छोटा, 10 ब्रांच तो बड़ा कार्ड)
    let branchesHTML = '';
    for (let i = 0; i < brandData.branches.length; i++) {
        branchesHTML += `
            <div class="branch-list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #fff; margin-bottom: 6px; border-radius: 6px; border: 1px solid #e5e7eb; width: 100%;">
                <div style="display: flex; align-items: center; gap: 8px; color: #333;">
                    <span style="font-size: 11px; color: #888; font-weight: bold;">0${i + 1}.</span> 
                    <span style="color: #2563eb; font-size: 13px;">📍</span> 
                    <span style="font-weight: 700; font-size: 12px; color: #111;">${brandData.branches[i]}</span>
                </div>
                <a href="#" style="color: #2563eb; text-decoration: none; font-weight: 800; font-size: 12px;" onclick="alert('Accessing branch server logs for ${brandData.brandName}...')">Click Here &rarr;</a>
            </div>
        `;
    }

    content.innerHTML = `
        <div class="search-result-modal" style="position: relative; background: #ffffff; padding: 25px; border-radius: 16px; width: 420px; max-width: 90%; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.3); height: auto !important; display: flex; flex-direction: column; align-items: center;">
            
            <!-- Close Button -->
            <span style="position: absolute; top: 12px; right: 18px; color: #888; font-size: 28px; cursor: pointer; font-weight: bold; line-height: 1;" onclick="closeGlobalModal()">×</span>
            
            <!-- Official Brand Logo Box -->
            <div style="margin: 5px auto 15px; display: flex; justify-content: center; align-items: center; min-height: 60px; width: 100%;">
                ${officialLogo}
            </div>

            <!-- Brand Details Box (ओनर का असली डेटा यहाँ लोड हो रहा है भाई) -->
            <div style="background: #f8f9fa; border: 1px solid #e5e7eb; padding: 12px 14px; border-radius: 10px; margin-bottom: 15px; text-align: left; width: 100%;">
                <p style="color: #4b5563; margin: 0 0 6px 0; font-size: 11px;">🎯 Registered Trademark: <br><span style="color: #111827; font-size: 13px; font-weight: 900;">${brandData.brandName}</span></p>
                <p style="color: #4b5563; margin: 0 0 6px 0; font-size: 11px;">👑 Legal Owner / Proprietor: <br><span style="color: #111827; font-size: 13px; font-weight: 900;">${brandData.ownerName}</span></p>
                <p style="color: #4b5563; margin: 0; font-size: 11px;">📊 Active Outlets Network: <span style="color: #2563eb; font-weight: 800;">${brandData.branches.length} Branches</span></p>
            </div>

            <!-- Branch List (यह ओनर के शहरों की गिनती के हिसाब से खुद छोटी-बड़ी होगी भाई) -->
            <div style="display: flex; flex-direction: column; width: 100%; margin-bottom: 15px; max-height: 220px; overflow-y: auto;">
                ${branchesHTML}
            </div>

            <!-- Free Blue Tick Verification Section -->
            <div style="border-top: 2px dashed #e5e7eb; padding-top: 12px; margin-top: 5px; width: 100%;">
            Claim your Lifetime Blue Tick Verification Badge.Get Verified Blue Tick (Free) ➔Secured by MTB Instant Oracle | Karan Rai`; overlay.style.display = 'flex';
}// ६. ३ वीआईपी हीरों के लिए एस्क्रो फॉर्मfunction openEscrowForm(tierName, priceText) {const overlay = document.getElementById('globalModalOverlay');const content = document.getElementById('dynamicModalContent');content.innerHTML = `×${tierName}Value: ${priceText}🔒 Secured Bank-to-Bank Wire Transfer Lock enabled via Escrow vault.Initiate Escrow Process`;overlay.style.display = 'flex';}// ७. यूनिवर्सल क्लोज Funciónfunction closeGlobalModal() {const overlay = document.getElementById('globalModalOverlay');if (overlay) {overlay.style.display = 'none';}}