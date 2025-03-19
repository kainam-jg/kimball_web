import { API_URL, AUTH_TOKEN } from "./config.js";

async function loadData() {
    let outputDiv = document.getElementById("progressOutput");
    outputDiv.innerHTML = "<strong>Loading Data...</strong><br>";

    try {
        let response = await fetch(`${API_URL}/csv/load_data/`, {  // ✅ New API Endpoint
            method: "POST",
            headers: {
                "Authorization": AUTH_TOKEN,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            outputDiv.innerHTML += decoder.decode(value) + "<br>";
        }

        outputDiv.innerHTML += "<br><strong>✅ Data Loaded Successfully</strong>";

    } catch (error) {
        console.error("Error:", error);
        outputDiv.innerHTML += "<br><strong>❌ Failed to load data.</strong>";
    }
}
