import { API_URL, AUTH_TOKEN } from "./config.js";

let fileGroups = [];

async function groupCSVs() {
    let response = await fetch(`${API_URL}/csv/group_csvs/`, {
        method: "GET",
        headers: { "Authorization": AUTH_TOKEN }
    });

    if (response.ok) {
        let data = await response.json();
        fileGroups = data.groups;

        let output = "<h3>Grouped CSV Files</h3><ul>";
        fileGroups.forEach((group, index) => {
            output += `
                <li>
                    <strong>Table Name:</strong> 
                    <input type="text" id="group_${index}" value="${group.group}">
                    <br>
                    <strong>Files:</strong> ${group.files.join(", ")}
                    <br>
                    <strong>Headers:</strong> ${group.headers.join(", ")}
                    <br><br>
                </li>`;
        });
        output += "</ul>";

        document.getElementById("groupResults").innerHTML = output;
    } else {
        document.getElementById("groupResults").innerHTML = "<p>❌ Failed to group CSV files.</p>";
    }
}

async function submitUpdatedGroups() {
    let updatedGroups = fileGroups.map((group, index) => ({
        group: document.getElementById(`group_${index}`).value.trim(),
        files: group.files,
        headers: group.headers
    }));

    let requestData = JSON.stringify({ groups: updatedGroups });

    console.log("Submitting JSON:", requestData);

    let outputDiv = document.getElementById("progressOutput");
    outputDiv.innerHTML = "<strong>Processing...</strong><br>";

    try {
        let response = await fetch(`${API_URL}/csv/analyze_and_load/`, {
            method: "POST",
            headers: {
                "Authorization": AUTH_TOKEN,
                "Content-Type": "application/json"
            },
            body: requestData
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

        outputDiv.innerHTML += "<br><strong>✅ Process Completed</strong>";

    } catch (error) {
        console.error("Error:", error);
        outputDiv.innerHTML += "<br><strong>❌ Failed to analyze and load CSVs.</strong>";
    }
}
