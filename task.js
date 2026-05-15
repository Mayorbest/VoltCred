// 1. ALL IMPORTS AT THE TOP
import { listenToNode, db } from './auth.js'; 
import { ref, set, update } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";
import { TrustEngine } from './trace.js';

const engine = new TrustEngine();

// Global Variables
let currentVendorId = "user_001";
let currentDeviceId = "ESP32_A1B2";

// 2. DOM ELEMENTS
// Borrower UI
const profileImgEl = document.getElementById('profile-img');
const businessNameEl = document.getElementById('business-name');
const ownerNameEl = document.getElementById('owner-name');
const businessLocationEl = document.getElementById('business-location');
const businessPhoneEl = document.getElementById('business-phone');
const homeAddressEl = document.getElementById('home-address');
const trustIndicatorEl = document.getElementById('trust-indicator');
const requestLoanBtn = document.getElementById('btn-request-loan');
const borrowerTotalLoan = document.getElementById('borrower-total-loan');
const borrowerAmountPaid = document.getElementById('borrower-amount-paid');
const borrowerDailyDue = document.getElementById('borrower-daily-due');
const repaymentCard = document.getElementById('repayment-card');
const btnMockPay = document.getElementById('btn-mock-pay');
const adminTrustScore = document.getElementById('admin-trust-score');
const adminTrustStatus = document.getElementById('admin-trust-status');

// Admin UI
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
const adminOutstanding = document.getElementById('admin-outstanding-balance');
const adminLoanStatus = document.getElementById('admin-loan-status');
const disburseBtn = document.getElementById('btn-admin-disburse');
const loanAmountInput = document.getElementById('loan-amount-input');
const btnKillSwitch = document.getElementById('btn-kill-switch');
const onboardForm = document.getElementById('onboard-form');

// Setup the Live Graph
const ctx = document.getElementById('telemetryChart').getContext('2d');
const liveChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], // Time stamps go here
        datasets: [{
            label: 'Live Power Consumption (Watts)',
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            data: [], // Power numbers go here
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        animation: false, // Turn off animation for snappy live updates
        scales: {
            x: { display: false }, // Hide the messy timestamps
            y: { beginAtZero: true, grid: { color: '#1e293b' } }
        }
    }
});
// ==========================================
// 3. CORE DASHBOARD LOADER
// ==========================================
function loadDashboardData(vId, dId) {
    // A. Fetch User Profile & KYC Data
    listenToNode(`users/${vId}`, (user) => {
        if (user && user.profile) {
            const p = user.profile;
            
            // Populate Borrower Page
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

            // Populate Admin Page
            if (adminBusinessName) {
                adminProfileImg.src = p.profilePicUrl;
                adminBusinessName.innerText = p.businessName;
                adminOwnerName.innerText = p.ownerName;
                adminPhone.innerText = p.phone;
                adminLocation.innerText = p.location;
                adminSquadAcc.innerText = user.financials.squadVirtualAccount;

                if (p.kycVerified) {
                    kycStatus.innerText = "Verified";
                    kycStatus.className = "kyc-badge kyc-verified";
                } else {
                    kycStatus.innerText = "Pending";
                    kycStatus.className = "kyc-badge kyc-pending";
                }
                // Handle Admin Trust Score UI
                const score = user.trustMetrics.score;
                if (adminTrustScore) {
                    adminTrustScore.innerText = `${score} / 100`;
                    if (score >= 80) {
                        adminTrustScore.style.color = "var(--trust-green)";
                        adminTrustStatus.innerText = "Eligible";
                        adminTrustStatus.className = "kyc-badge kyc-verified";
                    } else {
                        adminTrustScore.style.color = "var(--warning-red)";
                        adminTrustStatus.innerText = "High Risk";
                        adminTrustStatus.className = "kyc-badge kyc-pending";
                    }
                }
            }
        }
    });

    // B. Fetch Live Hardware Telemetry
    listenToNode(`devices/${dId}/liveData`, (data) => {
        if (data) {
            if (liveV && liveI && liveW) {
                liveV.innerText = `${data.voltage} V`;
                liveI.innerText = `${data.current} A`;
                liveW.innerText = `${data.power} W`;
            }

            // --- NEW: UPDATE THE GRAPH ---
            const timeNow = new Date().toLocaleTimeString();
            liveChart.data.labels.push(timeNow);
            liveChart.data.datasets[0].data.push(data.power);

            // Keep the graph from getting too long (only show last 20 seconds)
            if (liveChart.data.labels.length > 10) {
                liveChart.data.labels.shift();
                liveChart.data.datasets[0].data.shift();
            }
            liveChart.update();
            
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

    // C. Fetch Repayment Data
    listenToNode(`users/${vId}/financials`, (finance) => {
        if (finance) {
            const active = Number(finance.activeLoan) || 0;
            const paid = Number(finance.amountPaid) || 0;
            const outstanding = active - paid;

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
}

// Immediately load default data
loadDashboardData(currentVendorId, currentDeviceId);

// ==========================================
// 4. HARDWARE ONBOARDING LOGIC
// ==========================================
if (onboardForm) {
    onboardForm.addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        const owner = document.getElementById('new-owner-name').value;
        const business = document.getElementById('new-business-name').value;
        const deviceId = document.getElementById('new-device-id').value;
        const newUserId = "user_" + Math.floor(Math.random() * 10000);

        set(ref(db, `users/${newUserId}`), {
            profile: {
                ownerName: owner,
                businessName: business,
                phone: "Pending",
                location: "Pending Installation",
                profilePicUrl: "https://i.pravatar.cc/150?img=47",
                kycVerified: false
            },
            assignedDevice: deviceId,
            trustMetrics: { score: 0, statusColor: "red", anomalyFlag: false },
            financials: { activeLoan: 0, amountPaid: 0, dailyTarget: 0, status: "on_track", squadVirtualAccount: "Pending" }
        }).then(() => {
            alert(`Vendor ${business} successfully registered and paired to ${deviceId}!`);
            
            // Switch Dashboard to new user instantly
            currentVendorId = newUserId;
            currentDeviceId = deviceId;
            loadDashboardData(currentVendorId, currentDeviceId);
            
            onboardForm.reset();
        }).catch((error) => {
            console.error("Registration failed:", error);
            alert("Error registering vendor.");
        });
    });
}

// ==========================================
// 5. LIVE SQUAD API INTEGRATION
// ==========================================
if (disburseBtn) {
    disburseBtn.addEventListener('click', async () => {
        const amount = loanAmountInput ? loanAmountInput.value : 0;
        const targetAccount = adminSquadAcc ? adminSquadAcc.innerText : "";

        if (!amount || amount <= 0) {
            alert("Please enter a valid loan amount.");
            return;
        }
        if (!targetAccount || targetAccount === "..." || targetAccount === "Pending") {
            alert("Waiting for valid target account from database...");
            return;
        }

        const originalText = disburseBtn.innerText;
        disburseBtn.innerText = "Initiating Transfer...";
        disburseBtn.disabled = true;

        try {
            const response = await fetch('/.netlify/functions/squadPayout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amount, 
                    accountNumber: targetAccount,
                    bankCode: "058" 
                })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log("Squad Transfer Success:", result.data);
                alert(`SUCCESS: ₦${amount} Disbursed to account ${targetAccount}!`);
                if(loanAmountInput) loanAmountInput.value = ''; 
                
                // Optional: Automatically update the active loan balance in Firebase here
                
            } else {
                console.error("Squad Transfer Failed:", result);
                alert(`FAILED: ${result.message}`);
            }
        } catch (error) {
            console.error("Network/Server Error:", error);
            alert("Network error occurred while contacting the server.");
        } finally {
            disburseBtn.innerText = originalText;
            disburseBtn.disabled = false;
        }
    });
}

// ==========================================
// 6. MOCK REPAYMENT BUTTON (BORROWER UI)
// ==========================================
if (btnMockPay) {
    btnMockPay.addEventListener('click', () => {
        const originalText = btnMockPay.innerText;
        btnMockPay.innerText = "Processing...";
        
        listenToNode(`users/${currentVendorId}/financials`, (finance) => {
            if(finance && btnMockPay.innerText === "Processing...") {
                const newTotalPaid = finance.amountPaid + finance.dailyTarget;
                
                update(ref(db, `users/${currentVendorId}/financials`), {
                    amountPaid: newTotalPaid,
                    status: "on_track" 
                }).then(() => {
                    alert(`Payment of ₦${finance.dailyTarget} successful!`);
                    btnMockPay.innerText = originalText;
                });
            }
        });
    });
}

// ==========================================
// 7. THE HARDWARE KILL SWITCH
// ==========================================
let isNodeActive = true; 

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
        const newState = isNodeActive ? 0 : 1; 
        const confirmMsg = isNodeActive ? "WARNING: Cut power to this vendor's equipment?" : "Restore power to this vendor?";
        
        if(confirm(confirmMsg)) {
            set(ref(db, `devices/${currentDeviceId}/relayState`), newState)
                .then(() => console.log("Command sent to hardware!"))
                .catch(err => alert("Failed to send command."));
        }
    });
}