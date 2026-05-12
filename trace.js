export class TrustEngine {
    constructor() {
        this.baselinePower = 0;
        this.varianceThreshold = 5; // A real machine fluctuates. If variance is below this, it's a fake load (like a heater).
        this.readings = [];
    }

    analyzeLiveTelemetry(powerData) {
        this.readings.push(powerData);
        if (this.readings.length > 20) this.readings.shift(); // Keep last 20 readings

        // Calculate variance
        const avg = this.readings.reduce((a, b) => a + b, 0) / this.readings.length;
        const variance = this.readings.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / this.readings.length;

        // Anomaly Detection: Is it a flatline fake load?
        if (this.readings.length === 20 && variance < this.varianceThreshold && avg > 100) {
            return {
                isAnomaly: true,
                flagReason: "Artificial Load Detected (Flatline Power Signature)",
                trustScorePenalty: -20
            };
        }

        return {
            isAnomaly: false,
            flagReason: "Clear",
            trustScorePenalty: 0
        };
    }
}
export class TrustEngine {
    constructor() {
        this.baselinePower = 0;
        this.varianceThreshold = 5; // A real machine fluctuates. If variance is below this, it's a fake load (like a heater).
        this.readings = [];
    }

    analyzeLiveTelemetry(powerData) {
        this.readings.push(powerData);
        if (this.readings.length > 20) this.readings.shift(); // Keep last 20 readings

        // Calculate variance
        const avg = this.readings.reduce((a, b) => a + b, 0) / this.readings.length;
        const variance = this.readings.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / this.readings.length;

        // Anomaly Detection: Is it a flatline fake load?
        if (this.readings.length === 20 && variance < this.varianceThreshold && avg > 100) {
            return {
                isAnomaly: true,
                flagReason: "Artificial Load Detected (Flatline Power Signature)",
                trustScorePenalty: -20
            };
        }

        return {
            isAnomaly: false,
            flagReason: "Clear",
            trustScorePenalty: 0
        };
    }
}