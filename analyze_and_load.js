const API_URL = "http://34.122.71.71:8000";
const AUTH_TOKEN = "Bearer r_mKmvKvsqvZncXY7-XoVzRIeBaXiKypxe6AyRR8xO8";

async function startAnalysisAndLoad() {
    let storedGroups = localStorage.getItem("groupedCSVs");
    if (!storedGroups) {
        alert("⚠️ No grouped CSVs found. Please complete grouping first.");
        return;
    }

    let groups = JSON.parse(storedGroups);
    let eventSource = new EventSource(`${API_URL}/csv/analyze_and_load/`, {
        headers: {
            "Authorization": AUTH_TOKEN,
            "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({ groups })
    });

    let outputDiv = document.getElementById("progressOutput");
    outputDiv.innerHTML = "<strong>Processing...</strong><br>";

    eventSource.onmessage = function (event) {
        outputDiv.innerHTML += event.data + "<br>";
    };

    eventSource.onerror = function () {
        eventSource.close();
        outputDiv.innerHTML += "<br><strong>✅ Process Completed</strong>";
    };
}
