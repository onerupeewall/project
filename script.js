// SUPABASE CONNECTION
const SUPABASE_URL = "https://vsdunnvqtteqotjuinki.supabase.co";
const SUPABASE_KEY = "sb_publishable_xLAX65yZ4ozYB2MkUYDDFA_fwxFLX-p";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", function () {

    const overlay = document.getElementById("popupOverlay");
    const title = document.getElementById("popupTitle");
    const closeButton = document.getElementById("popupClose");
    const popupContent = document.querySelector(".popup-content");

    if (!overlay || !title || !closeButton || !popupContent) {
        return;
    }

    // OPEN POPUP
    function openPopup(name) {

        title.textContent = name;

        // SHOW BOOKING FORM ONLY IN BUY YOUR SLOT
        if (name === "Buy Your Slot") {
            popupContent.style.display = "block";
        } else {
            popupContent.style.display = "none";
        }

        overlay.style.display = "flex";
    }

    // CLOSE POPUP
    function closePopup() {
        overlay.style.display = "none";
    }

    // TERMS & CONDITIONS
    document.querySelectorAll(".nav a").forEach(function (link) {

        if (link.textContent.trim() === "Terms & Conditions") {

            link.addEventListener("click", function (e) {
                e.preventDefault();
                openPopup("Terms & Conditions");
            });

        }

    });

    // PRIVACY POLICY
    document.querySelectorAll(".nav a").forEach(function (link) {

        if (link.textContent.trim() === "Privacy Policy") {

            link.addEventListener("click", function (e) {
                e.preventDefault();
                openPopup("Privacy Policy");
            });

        }

    });

    // MY ACTIVE CAMPAIGN
    const activeLink = document.querySelector(".active-link");

    if (activeLink) {

        activeLink.addEventListener("click", function (e) {
            e.preventDefault();
            openPopup("My Active Campaign");
        });

    }

    // BUY YOUR SLOT
    const buyButton = document.querySelector(".buy-button");

    if (buyButton) {

        buyButton.addEventListener("click", function (e) {
            e.preventDefault();
            openPopup("Buy Your Slot");
        });

    }

    // CLOSE BUTTON
    closeButton.addEventListener("click", closePopup);

    // BACKGROUND CLICK
    overlay.addEventListener("click", function (e) {

        if (e.target === overlay) {
            closePopup();
        }

    });

    // ESCAPE KEY
    document.addEventListener("keydown", function (e) {

        if (e.key === "Escape") {
            closePopup();
        }

    });

    // SAVE BOOKING DATA TO SUPABASE
    const paymentButton = document.querySelector(".payment-button");

    if (paymentButton) {

        paymentButton.addEventListener("click", async function () {

            const inputs = document.querySelectorAll(".booking-input");
            const agreement = document.getElementById("bookingAgreement");

            if (!agreement.checked) {
                alert("Please agree to the policy first.");
                return;
            }

            const slotTime = inputs[0].value;
            const mediaFile = inputs[1].files[0] ? inputs[1].files[0].name : "";
            const targetUrl = inputs[2].value;
            const durationSec = parseInt(inputs[3].value) || 10;
            const brandName = inputs[6].value;
            const unifiedToken = 'TOKEN-' + Math.floor(100000 + Math.random() * 900000);

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