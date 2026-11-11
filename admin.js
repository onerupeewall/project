const SUPABASE_URL = 'https://swndqwcujyepctncxfhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bmRxd2N1anllcGN0bmN4ZmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzczNDQsImV4cCI6MjEwNTkxMzM0NH0.FcoPIUbbpIfUzxLOxUhMXiTirW2-j5Fw5dnfl9tqx2o';

const secureClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let currentActiveTab = 'pending';

async function verifyAccessPassword() {
    let val = document.getElementById('authPassInput').value.trim();
    if (!val) {
        alert('Please enter password!');
        return;
    }

    let { data, error } = await secureClient.rpc('verify_admin_login', { p_pass: val });

    if (!error && data === true) {
        document.getElementById('authLoginModal').style.display = 'none';
        sessionStorage.setItem('secure_session_active', 'true');
        loadMaintenanceStatus();
        loadSecureRecords();
    } else {
        alert('Incorrect Password!');
        document.getElementById('authPassInput').value = '';
    }
}

async function loginWithGoogleAdmin() {
    const { error } = await secureClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) {
        alert('Google Admin login failed: ' + error.message);
    }
}

function adminLogout() {
    sessionStorage.removeItem('secure_session_active');
    secureClient.auth.signOut();
    window.location.reload();
}

async function triggerMaintenance(enable) {
    let scope = document.getElementById('maintScope').value;
    let mins = parseInt(document.getElementById('maintDuration').value) || 30;
    let expiresAt = new Date(Date.now() + (mins * 60000)).toISOString();

    let { error } = await secureClient.from('site_maintenance').upsert({
        id: 1,
        scope: scope,
        is_active: enable,
        expires_at: expiresAt
    });

    if (error) {
        alert('Failed to update maintenance: ' + error.message);
    } else {
        alert(enable ? `Maintenance Enabled for ${scope} (${mins} mins)!` : 'Maintenance Turned Off. System Resumed!');
        loadMaintenanceStatus();
    }
}

async function loadMaintenanceStatus() {
    if (!secureClient) return;
    let { data } = await secureClient.from('site_maintenance').select('*').eq('id', 1).single();
    let statusText = document.getElementById('maintenanceStatusText');
    if (data && data.is_active) {
        statusText.style.color = '#ef4444';
        statusText.innerText = `Under Maintenance [Scope: ${data.scope.toUpperCase()}]`;
    } else {
        statusText.style.color = '#10B981';
        statusText.innerText = 'System Active (Live)';
    }
}

function switchTab(tabName) {
    currentActiveTab = tabName;
    document.getElementById('pendingTabBtn').className = tabName === 'pending' ? 'tab-btn active' : 'tab-btn';
    document.getElementById('campaignsTabBtn').className = tabName === 'campaigns' ? 'tab-btn active' : 'tab-btn';
    document.getElementById('livePlayTabBtn').className = tabName === 'livePlay' ? 'tab-btn active' : 'tab-btn';
    document.getElementById('userRecordsTabBtn').className = tabName === 'userRecords' ? 'tab-btn active' : 'tab-btn';
    loadSecureRecords();
}

async function loadSecureRecords() {
    const container = document.getElementById('tableContainer');
    if (!container) return;

    if (!secureClient) {
        container.innerHTML = `<p style="color: #ef4444; text-align: center;">Supabase client failed to load.</p>`;
        return;
    }

    container.innerHTML = '<p style="color: #9ca3af; text-align: center;">Loading campaigns...</p>';

    if (currentActiveTab === 'livePlay') {
        loadLiveScreenPlayView(container);
        return;
    }

    if (currentActiveTab === 'userRecords') {
        loadUserRecordsView(container);
        return;
    }

    let statusQuery = currentActiveTab === 'pending' ? 'pending' : 'approved';
    let { data, error } = await secureClient
        .from('buysecond_records')
        .select('*')
        .eq('status', statusQuery)
        .order('id', { ascending: true });

    if (error) {
        container.innerHTML = `<p style="color: #ef4444; text-align: center;">Error: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `<p style="color: #9ca3af; text-align: center;">No ${currentActiveTab} campaigns found.</p>`;
        return;
    }

    let validData = data.filter(record => record.slot_time && record.brand_name);

    if (validData.length === 0) {
        container.innerHTML = `<p style="color: #9ca3af; text-align: center;">No valid campaigns found.</p>`;
        return;
    }

    let campaignGroups = {};
    validData.forEach(record => {
        let cleanBrand = (record.brand_name || '').replace(/\s*\(Run \d+\/\d+\)/g, '').trim();
        let key = cleanBrand + '_' + (record.file_url || record.video_url || '');
        if (!campaignGroups[key]) campaignGroups[key] = [];
        campaignGroups[key].push(record);
    });

    let html = '';
    let groupIndex = 1;
    for (let key in campaignGroups) {
        let slots = campaignGroups[key];
        let masterRecord = slots[0];
        let displayToken = masterRecord.unified_token ? `#${masterRecord.unified_token}` : `#${groupIndex}`;
        let statusClass = masterRecord.status === 'approved' ? 'status-approved' : 'status-pending';
        let statusText = masterRecord.status === 'approved' ? 'APPROVED' : 'PENDING';

        let firstDateStr = slots[0].slot_time ? slots[0].slot_time.split(' at ')[0] : 'N/A';
        let lastDateStr = slots[slots.length - 1].slot_time ? slots[slots.length - 1].slot_time.split(' at ')[0] : 'N/A';
        let freqCount = slots.filter(s => s.slot_time && s.slot_time.includes(firstDateStr)).length;
        let scheduleInfo = (firstDateStr === lastDateStr) ? `${firstDateStr} (${freqCount}x/day)` : `${firstDateStr} to ${lastDateStr} (${freqCount}x/day)`;

        let thirdColumnHeader = currentActiveTab === 'pending' ? 'Schedule (Date Range & Freq)' : 'Total Runs';
        let thirdColumnValue = currentActiveTab === 'pending' ? scheduleInfo : `${slots.length} Runs Total`;

        let actionButtons = currentActiveTab === 'pending' ? `
            <button class="btn-action btn-approve" onclick="approveCampaignGroup(${JSON.stringify(slots.map(s => s.id))})">Approve</button>
            <button class="btn-action btn-reject" onclick="updateGroupStatus(${JSON.stringify(slots.map(s => s.id))}, 'rejected')">Reject</button>
            <button class="btn-action btn-delete" onclick="deleteCampaignGroup(${JSON.stringify(slots.map(s => s.id))}, '${masterRecord.file_url || ''}')">Delete</button>
        ` : `
            <button class="btn-action btn-reject" onclick="updateGroupStatus(${JSON.stringify(slots.map(s => s.id))}, 'rejected')">Reject</button>
            <button class="btn-action btn-delete" onclick="deleteCampaignGroup(${JSON.stringify(slots.map(s => s.id))}, '${masterRecord.file_url || ''}')">Delete</button>
        `;
        let recordJson = encodeURIComponent(JSON.stringify(masterRecord));

        html += `
            <div class="campaign-card">
                <table>
                    <thead>
                        <tr>
                            <th>Token (#ID)</th>
                            <th>Brand / Title</th>
                            <th>${thirdColumnHeader}</th>
                            <th>Duration</th>
                            <th>Target URL</th>
                            <th>Media File</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><b>${displayToken}</b></td>
                            <td>${(masterRecord.brand_name || '').replace(/\s*\(Run \d+\/\d+\)/g, '')}</td>
                            <td>${thirdColumnValue}</td>
                            <td>${masterRecord.duration_second || 10}s</td>
                            <td><a href="${masterRecord.target_url}" target="_blank" class="media-link">Visit Link</a></td>
                            <td><button class="btn-preview" onclick="previewOnBillboard('${recordJson}')">View Media 📺</button></td>
                            <td><span class="${statusClass}">${statusText}</span></td>
                            <td>${actionButtons}</td>
                        </tr>
                    </tbody>
                </table>
        `;

        if (currentActiveTab === 'campaigns') {
            html += `
                    <div class="runs-scroll-box">
                        <table>
                            <tbody>
            `;

            let lastDateRow = '';
            slots.forEach((slot, idx) => {
                if (!slot.slot_time) return;
                let datePart = slot.slot_time.split(' at ')[0];
                if (datePart !== lastDateRow) {
                    if (lastDateRow !== '') {
                        html += `<tr><td colspan="8" style="padding:0;"><hr class="day-divider-line"></td></tr>`;
                    }
                    html += `
                        <tr class="sub-row">
                            <td colspan="8" style="color: #38bdf8; font-weight: bold; background: #090d16;">📅 Date: ${datePart}</td>
                        </tr>
                    `;
                    lastDateRow = datePart;
                }
                html += `
                    <tr class="sub-row">
                        <td colspan="2" style="padding-left: 25px; color: #10B981;">✅ Run ${idx + 1} of ${slots.length}</td>
                        <td colspan="6"><b>Timing:</b> ${slot.slot_time}</td>
                    </tr>
                `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
            `;
        }

        html += `
            </div>
        `;
        groupIndex++;
    }

    container.innerHTML = html;
}

async function loadUserRecordsView(container) {
    let { data, error } = await secureClient.from('buysecond_records').select('*').order('id', { ascending: false });
    if (error || !data || data.length === 0) {
        container.innerHTML = `<p style="color: #9ca3af; text-align: center;">No user records found.</p>`;
        return;
    }

    let usersMap = {};
    data.forEach(record => {
        let userKey = record.user_email || record.user_phone || record.user_id || 'Unknown / Guest';
        if (!usersMap[userKey]) {
            usersMap[userKey] = {
                records: [],
                email: record.user_email || 'Google User'
            };
        }
        usersMap[userKey].records.push(record);
    });

    let html = `
        <div class="campaign-card">
            <table>
                <thead>
                    <tr>
                        <th style="width: 80px;">S.No.</th>
                        <th>User Account (Email / ID)</th>
                        <th>Total Booked Records</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let idx = 1;
    for (let userKey in usersMap) {
        let userInfo = usersMap[userKey];
        html += `
            <tr>
                <td><b>#${idx}</b></td>
                <td><span style="color:#38bdf8; font-weight:bold;">📧 ${userInfo.email}</span></td>
                <td>${userInfo.records.length} Total Slots</td>
                <td><button class="btn-preview" onclick="openUserPopup('${userKey}')">View Summary 📂</button></td>
            </tr>
        `;
        idx++;
    }

    html += `
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
}
async function openUserPopup(userKey) {
    const modal = document.getElementById('userPopupModal');
    const title = document.getElementById('popupUserTitle');
    const content = document.getElementById('popupUserContent');

    title.innerText = `📂 Campaigns Summary for Account`;
    content.innerHTML = '<p style="color:#9ca3af; text-align:center;">Loading campaigns...</p>';
    modal.style.display = 'flex';

    let query = secureClient.from('buysecond_records').select('*');
    if (userKey.includes('@')) {
        query = query.eq('user_email', userKey);
    } else {
        query = query.eq('user_id', userKey);
    }

    let { data, error } = await query.order('id', { ascending: true });

    if (error || !data || data.length === 0) {
        content.innerHTML = '<p style="color:#ef4444; text-align:center;">No records found for this account.</p>';
        return;
    }

    let userCampaignGroups = {};
    data.forEach(record => {
        if (!record.brand_name) return;
        let cleanBrand = record.brand_name.replace(/\s*\(Run \d+\/\d+\)/g, '').trim();
        let key = cleanBrand + '_' + (record.file_url || record.video_url || '');
        if (!userCampaignGroups[key]) userCampaignGroups[key] = [];
        userCampaignGroups[key].push(record);
    });

    let html = '';
    let campIdx = 1;

    for (let key in userCampaignGroups) {
        let slots = userCampaignGroups[key];
        let master = slots[0];
        let tokenText = master.unified_token ? `#${master.unified_token}` : 'Pending Token';
        let statusColor = master.status === 'approved' ? '#10B981' : (master.status === 'pending' ? '#f59e0b' : '#ef4444');
        let cleanBrandName = master.brand_name ? master.brand_name.replace(/\s*\(Run \d+\/\d+\)/g, '') : 'N/A';

        let firstDateStr = slots[0].slot_time ? slots[0].slot_time.split(' at ')[0] : 'N/A';
        let lastDateStr = slots[slots.length - 1].slot_time ? slots[slots.length - 1].slot_time.split(' at ')[0] : 'N/A';
        let freqCount = slots.filter(s => s.slot_time && s.slot_time.includes(firstDateStr)).length;
        let dateRangeInfo = (firstDateStr === lastDateStr) ? firstDateStr : `${firstDateStr} to ${lastDateStr}`;

        html += `
            <div style="background:#0b0f17; border:1px solid #1f293d; padding:14px; border-radius:6px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #161e2e; padding-bottom:6px;">
                    <span style="color:#38bdf8; font-weight:bold; font-size:15px;">#${campIdx}. ${cleanBrandName}</span>
                    <span style="color:${statusColor}; font-weight:bold; font-size:12px; text-transform:uppercase;">${master.status}</span>
                </div>
                <div style="font-size:13px; color:#9ca3af; display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                    <p><b>Token:</b> ${tokenText}</p>
                    <p><b>Account:</b> <span style="color:#38bdf8;">${master.user_email || 'Google User'}</span></p>
                    <p><b>Duration:</b> ${master.duration_second}s per run</p>
                    <p><b>Date Range:</b> ${dateRangeInfo}</p>
                    <p><b>Frequency:</b> ${freqCount} Runs / Day</p>
                    <p><b>Total Runs:</b> ${slots.length} Runs</p>
                    <p><b>Target URL:</b> <a href="${master.target_url}" target="_blank" style="color:#38bdf8; text-decoration:underline;">Visit Link</a></p>
                </div>
            </div>
        `;
        campIdx++;
    }

    content.innerHTML = html;
}

async function loadLiveScreenPlayView(container) {
    let { data: approvedRecords, error } = await secureClient
        .from('buysecond_records')
        .select('*')
        .eq('status', 'approved')
        .order('id', { ascending: true });

    if (error || !approvedRecords || approvedRecords.length === 0) {
        container.innerHTML = `<p style="color: #9ca3af; text-align: center;">No active live screen play records found.</p>`;
        return;
    }

    let now = new Date();
    let optionsCheck = { day: '2-digit', month: 'long', year: 'numeric' };
    let todayDateStr = now.toLocaleDateString('en-US', optionsCheck);

    let todayAds = approvedRecords.filter(rec => rec.slot_time && rec.slot_time.includes(todayDateStr));
    if (todayAds.length === 0) {
        container.innerHTML = `<p style="color: #f59e0b; text-align: center;">No approved ads scheduled for today (${todayDateStr}).</p>`;
        return;
    }

    let dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    let timelineItems = [];
    todayAds.forEach(ad => {
        if (!ad.slot_time || !ad.slot_time.includes(' at ')) return;
        let timePart = ad.slot_time.split(' at ')[1];
        if (!timePart) return;
        let [timeStr, modifier] = timePart.split(' ');
        let [hrs, mins, secs] = timeStr.split(':').map(Number);
        if (modifier === 'PM' && hrs < 12) hrs += 12;
        if (modifier === 'AM' && hrs === 12) hrs = 0;

        let adStart = new Date(dayStart);
        adStart.setHours(hrs, mins, secs);
        let dur = parseInt(ad.duration_second) || 10;
        let adEnd = new Date(adStart.getTime() + (dur * 1000));
        timelineItems.push({ record: ad, start: adStart, end: adEnd, duration: dur });
    });

    let currentTime = new Date();
    let html = `
        <div class="campaign-card">
            <table>
                <thead>
                    <tr>
                        <th>Token</th>
                        <th>Brand Name</th>
                        <th>Scheduled Time</th>
                        <th>Duration</th>
                        <th>Live Status</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let activeFound = false;
    timelineItems.forEach((item) => {
        let cleanBrand = item.record.brand_name ? item.record.brand_name.replace(/\s*\(Run \s*\d+\/\d+\)/g, '') : 'N/A';
        let token = item.record.unified_token ? `#${item.record.unified_token}` : `#${item.record.id}`;
        let timeOnly = item.record.slot_time.split(' at ')[1] || '';

        if (currentTime > item.end) return;

        let statusBadge = '';
        if (!activeFound && currentTime >= item.start && currentTime <= item.end) {
            statusBadge = `<span style="background: #10B981; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 11px;">📺 PLAYING NOW</span>`;
            activeFound = true;
        } else if (!activeFound) {
            statusBadge = `<span style="background: #3b82f6; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 11px;">NEXT UP ⏳</span>`;
            activeFound = true;
        } else {
            statusBadge = `<span style="color: #9ca3af; font-size: 12px;">Upcoming</span>`;
        }

        html += `
            <tr>
                <td><b>${token}</b></td>
                <td>${cleanBrand}</td>
                <td>${timeOnly}</td>
                <td>${item.duration}s</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
}

async function previewOnBillboard(encodedJson) {
    let record = JSON.parse(decodeURIComponent(encodedJson));
    let filePath = record.file_url || record.video_url;
    if (!filePath) {
        alert('Media file not found!');
        return;
    }

    let fileUrl = filePath;
    if (!filePath.startsWith('http') && !filePath.startsWith('blob:')) {
        let { data: signedData, error } = await secureClient.storage.from('ad-videos').createSignedUrl(filePath, 300);
        if (!error && signedData && signedData.signedUrl) {
            fileUrl = signedData.signedUrl;
        }
    }
    window.open(fileUrl, '_blank');
}

async function approveCampaignGroup(idsArray) {
    try {
        let { data: approvedRecords } = await secureClient.from('buysecond_records').select('unified_token').eq('status', 'approved');
        let maxToken = 0;
        if (approvedRecords && approvedRecords.length > 0) {
            approvedRecords.forEach(r => {
                let t = parseInt(r.unified_token) || 0;
                if (t > maxToken) maxToken = t;
            });
        }
        let nextToken = maxToken + 1;

        let { error } = await secureClient.from('buysecond_records').update({ status: 'approved', unified_token: nextToken }).in('id', idsArray);
        if (error) throw error;

        switchTab('campaigns');
    } catch (err) {
        alert('Approval failed: ' + err.message);
    }
}

async function updateGroupStatus(idsArray, newStatus) {
    let { error } = await secureClient.from('buysecond_records').update({ status: newStatus }).in('id', idsArray);
    if (error) alert('Error: ' + error.message);
    else loadSecureRecords();
}

async function deleteCampaignGroup(idsArray, fileUrl) {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
        if (fileUrl && fileUrl.includes('/storage/v1/object/public/ad-videos/')) {
            let filePath = fileUrl.split('/storage/v1/object/public/ad-videos/')[1];
            if (filePath) await secureClient.storage.from('ad-videos').remove([decodeURIComponent(filePath)]);
        }
        let { error } = await secureClient.from('buysecond_records').delete().in('id', idsArray);
        if (error) throw error;
        loadSecureRecords();
    } catch (err) {
        alert('Delete failed: ' + err.message);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await secureClient.auth.getSession();
    if (session || sessionStorage.getItem('secure_session_active') === 'true') {
        document.getElementById('authLoginModal').style.display = 'none';
        sessionStorage.setItem('secure_session_active', 'true');
        loadMaintenanceStatus();
        loadSecureRecords();
    }
});

setInterval(() => {
    if (sessionStorage.getItem('secure_session_active') === 'true' && currentActiveTab === 'livePlay') {
        loadSecureRecords();
    }
}, 5000);