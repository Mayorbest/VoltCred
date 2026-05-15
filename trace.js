// js/trace.js - VOLTCRED AI TRUST ENGINE

export class TrustEngine {
    constructor() {
        this.history = [];
        this.baseScore = 50; // Starting score for KYC verified users
        this.peakPower = 0;
        this.capitalMultiplier = 100; // ₦100 per Watt of proven power
    }

    analyzeLiveTelemetry(currentPower, currentScore) {
        let isAnomaly = false;
        let newScore = currentScore || this.baseScore;
        
        // Track the highest legitimate power draw to determine business size
        if (currentPower > this.peakPower) {
            this.peakPower = currentPower;
        }

        // Keep a rolling history of the last 10 readings (20 seconds)
        this.history.push(currentPower);
        if (this.history.length > 10) {
            this.history.shift();
        }

        // FRAUD DETECTION LOGIC (The Anomaly Filter)
        if (this.history.length >= 5) {
            const recent = this.history.slice(-5);
            const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
            
            // Check for variance (Real machines fluctuate, fake loads stay perfectly flat)
            const maxDiff = Math.max(...recent) - Math.min(...recent);
            
            if (avg > 10 && maxDiff < 0.5) {
                // FLAG: The power is suspiciously flat. Likely a dummy load.
                isAnomaly = true;
                newScore = Math.max(10, newScore - 5); // Tank the score quickly
            } 
            else if (avg > 10 && maxDiff >= 0.5) {
                // CLEAR: Healthy, fluctuating industrial load.
                isAnomaly = false;
                // Hackathon Demo Speed: Increase score visibly so judges can see it rise
                newScore = Math.min(100, newScore + 1); 
            }
            else {
                // System is off or disconnected. Slowly decay trust if inactive too long.
                isAnomaly = false;
            }
        }

        // CALCULATE MAXIMUM LOAN LIMIT
        // Formula: (Peak Power * Multiplier) * (Score / 100)
        let maxEligibleLoan = (this.peakPower * this.capitalMultiplier) * (newScore / 100);
        
        // Lock disbursal if score drops below the 80 threshold
        if (newScore < 80 || isAnomaly) {
            maxEligibleLoan = 0; 
        }

        return {
            isAnomaly: isAnomaly,
            updatedScore: Math.round(newScore),
            maxEligibleLoan: Math.round(maxEligibleLoan)
        };
    }
}