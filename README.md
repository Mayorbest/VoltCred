# VoltCred ⚡

**Hardware-Backed Microfinance Trust Engine**
*Built for the Squad Hackathon 3.0*

![VoltCred Architecture](https://via.placeholder.com/800x400.png?text=VoltCred+IoT+%2B+Fintech+Architecture) 
*(Note: Replace this placeholder with an actual screenshot of your Admin dashboard before the pitch)*

## 🛑 The Problem
Microfinance institutions and fintech lenders face massive risks when providing working capital to unverified vendors. Traditional credit scores don't work for the informal sector, leading to high default rates and fraud. Lenders have no way to verify if a business is actively operating or just a shell.

## 💡 The VoltCred Solution
VoltCred bridges IoT hardware with the Squad 3.0 API to create an unbreakable Trust Engine. 

By deploying a smart energy node (ESP32 + PZEM-004T) to the vendor's equipment (e.g., sewing machines, refrigerators), VoltCred monitors real-time power consumption. Our AI engine analyzes the telemetry to verify genuine business activity, generates a dynamic Trust Score, and safely automates capital disbursal through Squad. 

If a vendor defaults, the system can physically cut power to their equipment via a remote Kill Switch.

## ⚙️ How It Works
1. **Hardware Telemetry:** An ESP32 pushes live Voltage, Current, and Wattage data to the cloud every 2 seconds.
2. **AI Anomaly Detection:** The system analyzes the power signature. Artificial, flat-line loads are flagged as fraudulent.
3. **Smart Disbursal:** If the Trust Score is high (Eligible), the loan officer can instantly disburse funds to the vendor's virtual account via the **Squad 3.0 Transfer API**.
4. **Repayment & Control:** Vendors track their active loans via the Borrower Portal. Defaulting triggers UI warnings and enables the Admin Kill Switch.

## 🛠️ Tech Stack
* **Frontend:** HTML5, CSS3 (CSS Grid, Glassmorphism), ES6 JavaScript
* **Database:** Firebase Realtime Database
* **Backend:** Node.js (Netlify Serverless Functions)
* **Financial API:** Squad 3.0 Sandbox (Payouts/Transfers)
* **Hardware:** ESP32 Microcontroller, PZEM-004T AC Energy Sensor, 5V Relay Module

## 🚀 Local Development Setup
To run this project locally and test the Squad integration:

1. Clone the repository:
   ```bash
   git clone [https://github.com/mayorbest/VoltCred.git](https://github.com/mayorbest/VoltCred.git)