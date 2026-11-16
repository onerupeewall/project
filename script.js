const SUPABASE_URL = "https://vsdunnvqtteqotjuinki.supabase.co";
const SUPABASE_KEY = "sb_publishable_xLAX65yZ4ozYB2MkUYDDFA_fwxFLX-p";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async function () {

    const overlay = document.getElementById("popupOverlay");
    const title = document.getElementById("popupTitle");
    const closeButton = document.getElementById("popupClose");
    const loginSection = document.getElementById("loginSection");
    const bookingFormContainer = document.getElementById("bookingFormContainer");
    const googleLoginBtn = document.getElementById("googleLoginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const userEmailDisplay = document.getElementById("userEmailDisplay");

    if (!overlay || !title || !closeButton) return;

    function updateAuthUI(session) {
        if (session) {
            if (loginSection) loginSection.style.display = "none";
            if (bookingFormContainer) bookingFormContainer.style.display = "block";
            if (userEmailDisplay) userEmailDisplay.textContent = "Logged in as: " + session.user.email;
        } else {
            if (loginSection) loginSection.style.display = "block";
            if (bookingFormContainer) bookingFormContainer.style.display = "none";
        }
    }

    // Google Login Trigger
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener("click", async function () {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.href
                }
            });
            if (error) {
                alert("Login Error: " + error.message);
            }
        });
    }

    // Logout Trigger
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async function () {
            await supabaseClient.auth.signOut();
            updateAuthUI(null);
        });
    }

    // OPEN POPUP
    async function openPopup(name) {
        title.textContent = name;

        if (name === "Buy Your Slot") {
            const { data: { session } } = await supabaseClient.auth.getSession();
            updateAuthUI(session);
        } else {
            // Hide login and form for other popups (Terms, Privacy, etc.)
            if (loginSection) loginSection.style.display = "none";
            if (bookingFormContainer) bookingFormContainer.style.display = "none";
        }

        overlay.style.display = "flex";
    }

    function closePopup() {
        overlay.style.display = "none";
    }

    // Navigation triggers
    document.querySelectorAll(".nav a").forEach(function (link) {
        if (link.textContent.trim() === "Terms & Conditions") {
            link.addEventListener("click", function (e) {
                e.preventDefault();
                openPopup("Terms & Conditions");
            });
        }
        if (link.textContent.trim() === "Privacy Policy") {
            link.addEventListener("click", function (e) {
                e.preventDefault();
                openPopup("Privacy Policy");
            });
        }
    });

    const activeLink = document.querySelector(".active-link");
    if (activeLink) {
        activeLink.addEventListener("click", function (e) {
            e.preventDefault();
            openPopup("My Active Campaign");
        });
    }

    const buyButton = document.querySelector(".buy-button");
    if (buyButton) {
        buyButton.addEventListener("click", function (e) {
            e.preventDefault();
            openPopup("Buy Your Slot");
        });
    }

    closeButton.addEventListener("click", closePopup);
    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closePopup();
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closePopup();
    });

    // SAVE BOOKING TO EXISTING `buysecond_records` TABLE
    const paymentButton = document.querySelector(".payment-button");
    if (paymentButton) {
        paymentButton.addEventListener("click", async function () {
            const inputs = document.querySelectorAll(".booking-input");
            const agreement = document.getElementById("bookingAgreement");

            if (!agreement.checked) {
                alert("Please agree to the policy first.");
                return;
            }

            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) {
                alert("Please login first!");
                return;
            }

            const slotTime = inputs[0].value;
            const mediaFile = inputs[1].files[0] ? inputs[1].files[0].name : "";
            const targetUrl = inputs[2].value;
            const durationSec = parseInt(inputs[3].value) || 10;
            const brandName = inputs[4].value;
            const unifiedToken = 'TOKEN-' + Math.floor(100000 + Math.random() * 900000);
            const userId = session.user.id;
            const userEmail = session.user.email;

            const { error } = await supabaseClient
                .from("buysecond_records")
                .insert([
                    {
                        slot_time: slotTime,
                        file_url: mediaFile,
                        target_url: targetUrl,
                        duration_second: durationSec,
                        brand_name: brandName,
                        unified_token: unifiedToken,
                        user_id: userId,
                        user_email: userEmail,
                        status: "pending"
                    }
                ]);

            if (error) {
                alert("Error saving data: " + error.message);
            } else {
                alert("Booking saved successfully in database!");
                closePopup();
            }
        });
    }
});