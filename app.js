import config from "./config.json" with { type: "json" };

let fileGroups = [];

async function uploadChunk(file, chunkData, chunkNumber, totalChunks) {
    let formData = new FormData();
    formData.append("file", chunkData, file.name);
    formData.append("chunk_number", chunkNumber);
    formData.append("total_chunks", totalChunks);
    formData.append("filename", file.name);

    try {
        let response = await fetch(`${config.API_URL}/upload/upload_chunk/`, {
            method: "POST",
            body: formData,
            headers: {
                "Authorization": config.AUTH_TOKEN
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        console.log(`Successfully uploaded chunk ${chunkNumber} of ${totalChunks} for ${file.name}`);
        return true;
    } catch (error) {
        console.error("Upload failed:", error);
        alert(`Upload failed: ${error.message}`);
        return false;
    }
}

async function finalizeUpload(filename, totalChunks) {
    let formData = new FormData();
    formData.append("filename", filename);
    formData.append("total_chunks", totalChunks);

    try {
        let response = await fetch(`${config.API_URL}/upload/finalize_upload/`, {
            method: "POST",
            body: formData,
            headers: {
                "Authorization": config.AUTH_TOKEN
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        console.log(`Finalized upload for ${filename}`);
        return true;
    } catch (error) {
        console.error("Finalize upload failed:", error);
        alert(`Finalize upload failed: ${error.message}`);
        return false;
    }
}

async function startUpload() {
    let files = document.getElementById("fileInput").files;
    let progressContainer = document.getElementById("progressContainer");

    for (let file of files) {
        let chunkSize = 50 * 1024 * 1024;
        let totalChunks = Math.ceil(file.size / chunkSize);
        let progressBar = document.createElement("progress");
        progressBar.max = totalChunks;
        progressBar.value = 0;
        progressContainer.appendChild(progressBar);

        for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
            let start = (chunkNumber - 1) * chunkSize;
            let end = Math.min(start + chunkSize, file.size);
            let chunkData = file.slice(start, end);

            let success = await uploadChunk(file, chunkData, chunkNumber, totalChunks);
            if (!success) {
                alert(`Failed to upload chunk ${chunkNumber} of ${file.name}`);
                return;
            }

            progressBar.value = chunkNumber;
        }

        let finalizeSuccess = await finalizeUpload(file.name, totalChunks);
        if (finalizeSuccess) {
            alert(`${file.name} uploaded successfully!`);
        } else {
            alert(`Failed to finalize ${file.name}`);
        }
    }
}

async function groupCSVs() {
    try {
        let response = await fetch(`${config.API_URL}/csv/group_csvs/`, {
            method: "GET",
            headers: { "Authorization": config.AUTH_TOKEN }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

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

        document.getElementById("output").innerHTML = output;
    } catch (error) {
        console.error("Error grouping CSV files:", error);
        alert(`Failed to group CSV files: ${error.message}`);
    }
}

let updatedJson = null;

async function dropAndCreateTables() {
    try {
        // Get the modified JSON from the form
        let groups = [];
        const groupElements = document.querySelectorAll("li");
        groupElements.forEach((element, index) => {
            const tableName = document.getElementById(`group_${index}`).value;
            const files = element.querySelector(".files").textContent.split(", ");
            const headers = element.querySelector(".headers").textContent.split(", ");

            groups.push({ group: tableName, files, headers });
        });

        updatedJson = { groups }; // ✅ Store the modified JSON for step 4

        console.log("Payload being sent to drop_and_create_table:", JSON.stringify(updatedJson));

        let response = await fetch(`${config.API_URL}/csv/drop_and_create_table/`, {
            method: "POST",
            headers: {
                "Authorization": config.AUTH_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedJson)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        let result = await response.json();
        alert(result.message);
    } catch (error) {
        console.error("Error dropping and creating tables:", error);
        alert(`Error: ${error.message}`);
    }
}

async function loadData() {
    try {
        if (!updatedJson) {
            alert("No data to load! Please complete the table creation step first.");
            return;
        }

        console.log("✅ Payload being sent to load_data:", JSON.stringify(updatedJson)); // ✅ Log the payload for verification

        let response = await fetch(`${config.API_URL}/csv/load_data/`, {
            method: "POST",
            headers: {
                "Authorization": config.AUTH_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedJson)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        let result = await response.json();
        alert(result.message);
    } catch (error) {
        console.error("Error loading data:", error);
        alert(`Error loading data: ${error.message}`);
    }
}

// Expose functions to global scope
window.startUpload = startUpload;
window.groupCSVs = groupCSVs;
window.dropAndCreateTables = dropAndCreateTables;
window.loadData = loadData;
