// netlify/functions/squadPayout.js

exports.handler = async (event) => {
    // 1. Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 2. Grab your hidden secret key
    const SQUAD_SECRET = process.env.SQUAD_SECRET_KEY;

    // 3. Parse the data sent from your admin.html dashboard
    const data = JSON.parse(event.body);
    const amountStr = data.amount.toString(); 
    const targetAccount = data.accountNumber;
    const bankCode = data.bankCode || "058"; // Default to GTB for testing

    // Generate a unique transaction reference
    const txnRef = "VOLT_" + Math.floor(Math.random() * 1000000000);

    try {
        // 4. Make the secure API call to Squad 3.0 Transfer Endpoint
        const response = await fetch("https://sandbox-api-d.squadco.com/payout/transfer", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${SQUAD_SECRET}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                remark: "VoltCred Working Capital Disbursal",
                bank_code: bankCode,
                currency_id: "NGN",
                amount: amountStr,
                account_number: targetAccount,
                transaction_reference: txnRef,
                account_name: "VoltCred Vendor" // Optional in sandbox, required in prod
            })
        });

        const result = await response.json();

        // 5. Send the result back to your frontend
        if (result.status === 200) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: "Disbursal Successful", data: result.data })
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: result.message || "Transfer Failed" })
            };
        }

    } catch (error) {
        console.error("Squad API Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: "Internal Server Error" })
        };
    }
};