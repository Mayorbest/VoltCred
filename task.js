import { listenToNode } from './auth.js';
import { TrustEngine } from './trace.js';

const engine = new TrustEngine();

// Hardcoded for the hackathon demo
let currentVendorId = "user_001";
let currentDeviceId = "ESP32_A1B2";

// --- DOM Elements (Borrower UI) ---
const profileImgEl = document.getElementById('profile-img');
const businessNameEl = document.getElementById('business-name');
const ownerNameEl = document.getElementById('owner-name');
const businessLocationEl = document.getElementById('business-location');
const businessPhoneEl = document.getElementById('business-phone');
const homeAddressEl = document.getElementById('home-address');
const trustIndicatorEl = document.getElementById('trust-indicator');
const requestLoanBtn = document.getElementById('btn-request-loan');

// --- DOM Elements (Admin UI) ---
const adminProfileImg = document.getElementById('admin-profile-img');
const adminBusinessName = document.getElementById('admin-business-name');
const adminOwnerName = document.getElementById('admin-owner-name');
const adminPhone = document.getElementById('admin-phone');
const adminLocation = document.getElementById('admin-location');
const adminSquadAcc = document.getElementById('admin-squad-acc');
const kycStatus = document.getElementById('kyc-status');
const liveV = document.getElementById('live-v');
const liveI = document.getElementById('live-i');
const liveW = document.getElementById('live-w');
const aiFlagStatus = document.getElementById('ai-flag-status');


function loadDashboardData(vId, dId) {
    // 1. Fetch User Profile & KYC Data
    listenToNode(`users/${vId}`, (user) => {
        if (user && user.profile) {
        const p = user.profile;
        
        // Populate Borrower Page if elements exist
        if (businessNameEl) {
            profileImgEl.src = p.profilePicUrl;
            businessNameEl.innerText = p.businessName;
            ownerNameEl.innerText = p.ownerName;
            businessLocationEl.innerText = p.location;
            businessPhoneEl.innerText = p.phone;
            homeAddressEl.innerText = p.homeAddress;
            
            const score = user.trustMetrics.score;
            if (score >= 80) {
                trustIndicatorEl.style.borderColor = "var(--trust-green)";
                trustIndicatorEl.innerText = "Capital Unlocked";
                requestLoanBtn.disabled = false;
            } else {
                trustIndicatorEl.style.borderColor = "var(--warning-red)";
                trustIndicatorEl.innerText = "Building Trust";
                requestLoanBtn.disabled = true;
            }
        }

        // Populate Admin Page if elements exist
        if (adminBusinessName) {
            adminProfileImg.src = p.profilePicUrl;
            adminBusinessName.innerText = p.businessName;
            adminOwnerName.innerText = p.ownerName;
            adminPhone.innerText = p.phone;
            adminLocation.innerText = p.location;
            adminSquadAcc.innerText = user.financials.squadVirtualAccount;

            // Handle KYC UI Status
            if (p.kycVerified) {
                kycStatus.innerText = "Verified";
                kycStatus.className = "kyc-badge kyc-verified";
            } else {
                kycStatus.innerText = "Pending";
                kycStatus.className = "kyc-badge kyc-pending";
            }
        }
    }
    });

    // 2. Fetch Live Hardware Telemetry
    listenToNode(`devices/${dId}/liveData`, (data) => {
       if (data) {
        // Update Admin telemetry
        if (liveV && liveI && liveW) {
            liveV.innerText = `${data.voltage} V`;
            liveI.innerText = `${data.current} A`;
            liveW.innerText = `${data.power} W`;
        }

        // Run Anomaly AI
        const analysis = engine.analyzeLiveTelemetry(data.power);
        
        if (analysis.isAnomaly) {
            if (aiFlagStatus) {
                aiFlagStatus.innerText = "FLAGGED";
                aiFlagStatus.style.color = "var(--warning-red)";
            }
            if (trustIndicatorEl) {
                trustIndicatorEl.style.borderColor = "var(--warning-red)";
                trustIndicatorEl.innerText = "Score Paused";
            }
        } else {
            if (aiFlagStatus) {
                aiFlagStatus.innerText = "Clear";
                aiFlagStatus.style.color = "var(--trust-green)";
            }
        }
    }
    });
}

// Immediately call the function when the page loads with the default user
loadDashboardData(currentVendorId, currentDeviceId);


// 3. UI Testing Mode: Squad API Mock
const disburseBtn = document.getElementById('btn-admin-disburse');
if (disburseBtn) {
    disburseBtn.addEventListener('click', () => {
        const originalText = disburseBtn.innerText;
        disburseBtn.innerText = "Processing...";
        disburseBtn.disabled = true;

        setTimeout(() => {
            alert(`UI TEST: Capital Disbursed Successfully to account ${adminSquadAcc.innerText}!`);
            disburseBtn.innerText = originalText;
            disburseBtn.disabled = false;
        }, 1500);
    });
}

import { db } from './auth.js'; // Ensure db is exported from firebase.js
import { ref, set } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

const onboardForm = document.getElementById('onboard-form');

if (onboardForm) {
    onboardForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Stop page refresh
        
        const owner = document.getElementById('new-owner-name').value;
        const business = document.getElementById('new-business-name').value;
        const deviceId = document.getElementById('new-device-id').value;
        
        // Generate a random User ID for the new vendor
        const newUserId = "user_" + Math.floor(Math.random() * 10000);

        // Push the new profile to Firebase
        set(ref(db, `users/${newUserId}`), {
            profile: {
                ownerName: owner,
                businessName: business,
                phone: "Pending",
                location: "Pending Installation",
                profilePicUrl: "https://via.placeholder.com/150",
                kycVerified: false
            },
            assignedDevice: deviceId,
            trustMetrics: { score: 0, statusColor: "red", anomalyFlag: false },
            financials: { activeLoan: 0, squadVirtualAccount: "Pending" }
        }).then(() => {
            alert(`Vendor ${business} successfully registered and paired to ${deviceId}!`);
            onboardForm.reset();
        }).catch((error) => {
            console.error("Registration failed:", error);
            alert("Error registering vendor.");
        });
    });
}

// 4. REPAYMENT & TRACKING LOGIC
const borrowerTotalLoan = document.getElementById('borrower-total-loan');
const borrowerAmountPaid = document.getElementById('borrower-amount-paid');
const borrowerDailyDue = document.getElementById('borrower-daily-due');
const repaymentCard = document.getElementById('repayment-card');
const btnMockPay = document.getElementById('btn-mock-pay');

const adminOutstanding = document.getElementById('admin-outstanding-balance');
const adminLoanStatus = document.getElementById('admin-loan-status');

// Fetch and display financial data
listenToNode(`users/${currentVendorId}/financials`, (finance) => {
    if (finance) {
        const outstanding = finance.activeLoan - finance.amountPaid;

        // Update Borrower UI
        if (borrowerTotalLoan) {
            borrowerTotalLoan.innerText = `₦${finance.activeLoan.toLocaleString()}`;
            borrowerAmountPaid.innerText = `₦${finance.amountPaid.toLocaleString()}`;
            borrowerDailyDue.innerText = `₦${finance.dailyTarget.toLocaleString()}`;
            
            if (finance.status === "default") {
                repaymentCard.style.borderTopColor = "var(--warning-red)";
                borrowerDailyDue.style.color = "var(--warning-red)";
            } else {
                repaymentCard.style.borderTopColor = "var(--accent-blue)";
                borrowerDailyDue.style.color = "white";
            }
        }

        // Update Admin UI
        if (adminOutstanding) {
            adminOutstanding.innerText = `₦${outstanding.toLocaleString()}`;
            
            if (finance.status === "default") {
                adminLoanStatus.innerText = "DEFAULTED";
                adminLoanStatus.className = "kyc-badge kyc-pending";
            } else {
                adminLoanStatus.innerText = "On Track";
                adminLoanStatus.className = "kyc-badge kyc-verified";
            }
        }
    }
});

// Simulate the borrower making a payment
if (btnMockPay) {
    btnMockPay.addEventListener('click', () => {
        const originalText = btnMockPay.innerText;
        btnMockPay.innerText = "Processing...";
        
        // Fetch current paid amount, add the daily target to it, and push to Firebase
        listenToNode(`users/${currentVendorId}/financials`, (finance) => {
            if(finance && btnMockPay.innerText === "Processing...") {
                const newTotalPaid = finance.amountPaid + finance.dailyTarget;
                
                // Update Firebase (this will instantly update both screens)
                update(ref(db, `users/${currentVendorId}/financials`), {
                    amountPaid: newTotalPaid,
                    status: "on_track" // Reset status if they were defaulted
                }).then(() => {
                    alert(`Payment of ₦${finance.dailyTarget} successful!`);
                    btnMockPay.innerText = originalText;
                });
            }
        });
    });
}

// ==========================================
// 5. THE HARDWARE KILL SWITCH
// ==========================================
const btnKillSwitch = document.getElementById('btn-kill-switch');
let isNodeActive = true; // Default state

// Listen for the current relay state from Firebase
listenToNode(`devices/${currentDeviceId}/relayState`, (state) => {
    if (btnKillSwitch) {
        if (state === 1) {
            isNodeActive = true;
            btnKillSwitch.innerText = "🛑 SHUT DOWN NODE";
            btnKillSwitch.style.backgroundColor = "var(--warning-red)";
        } else {
            isNodeActive = false;
            btnKillSwitch.innerText = "⚡ RESTORE POWER";
            btnKillSwitch.style.backgroundColor = "var(--trust-green)";
        }
    }
});

if (btnKillSwitch) {
    btnKillSwitch.addEventListener('click', () => {
        const newState = isNodeActive ? 0 : 1; // Toggle state
        const confirmMsg = isNodeActive ? "WARNING: Cut power to this vendor's equipment?" : "Restore power to this vendor?";
        
        if(confirm(confirmMsg)) {
            // Push the new command to Firebase
            import('https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js').then(({ ref, set }) => {
                set(ref(db, `devices/${currentDeviceId}/relayState`), newState)
                    .then(() => console.log("Command sent to hardware!"))
                    .catch(err => alert("Failed to send command."));
            });
        }
    });
}