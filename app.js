import config from "./config.json" with { type: "json" };

let fileGroups = [];
let updatedJson = null;

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
    const groupButton = document.getElementById("groupButton");
    groupButton.disabled = true;
    groupButton.innerText = "Processing...";

    try {
        let response = await fetch(`${config.API_URL}/csv/group_csvs/`, {
            method: "GET",
            headers: {
                "Authorization": config.AUTH_TOKEN
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        let data = await response.json();
        console.log("Grouped CSV Payload:", data);
        fileGroups = data.groups;

        let output = "<h3>Data Definitions</h3><ul>";
        fileGroups.forEach((group, index) => {
            output += `
                <li>
                    <strong>Table Name:</strong>
                    <input type="text" id="group_${index}" value="${group.group}">
                    <br>
                    <strong>Files:</strong>
                    <ul>${group.files.map(file => `<li>${file}</li>`).join('')}</ul>
                    <strong>Columns:</strong>
                    <ul>${group.headers.map(header => `<li>${header}</li>`).join('')}</ul>
                    <br>
                </li>`;
        });
        output += "</ul>";

        document.getElementById("groupResults").innerHTML = output;
    } catch (error) {
        console.error("Error grouping CSV files:", error);
        alert(`Failed to group CSV files: ${error.message}`);
    } finally {
        groupButton.disabled = false;
        groupButton.innerText = "Group CSVs";
    }
}

async function createTablesAndLoadData() {
    const loadButton = document.getElementById("loadButton");
    const loadStatus = document.getElementById("loadStatus");
    loadButton.disabled = true;
    loadButton.innerText = "Loading...";
    loadStatus.innerText = "Creating tables and loading data...";

    try {
        const updatedGroups = fileGroups.map((group, index) => {
            const tableNameInput = document.getElementById(`group_${index}`);
            const tableName = tableNameInput ? tableNameInput.value : group.group;

            const cleanedHeaders = group.headers.map(header => header.replace(/^\uFEFF/, ""));

            return {
                group: tableName,
                files: group.files,
                headers: cleanedHeaders
            };
        });

        updatedJson = JSON.stringify({ groups: updatedGroups });
        console.log("Sending fileGroups to drop_and_create_table:", updatedJson);

        let createResponse = await fetch(`${config.API_URL}/csv/drop_and_create_table/`, {
            method: "POST",
            headers: {
                "Authorization": config.AUTH_TOKEN,
                "Content-Type": "application/json"
            },
            body: updatedJson
        });

        if (!createResponse.ok) {
            throw new Error(`Error creating tables: ${createResponse.status}`);
        }

        let loadResponse = await fetch(`${config.API_URL}/csv/load_data/`, {
            method: "POST",
            headers: {
                "Authorization": config.AUTH_TOKEN,
                "Content-Type": "application/json"
            },
            body: updatedJson
        });

        if (!loadResponse.ok) {
            throw new Error(`Error loading data: ${loadResponse.status}`);
        }

        const result = await loadResponse.json();
        console.log("Data loaded successfully:", result);
        loadStatus.innerText = "✅ Data loaded successfully!";
    } catch (error) {
        console.error("Error during table creation and data load:", error);
        loadStatus.innerText = `❌ Error: ${error.message}`;
    } finally {
        loadButton.disabled = false;
        loadButton.innerText = "Load Data";
    }
}

// Expose to global scope
window.startUpload = startUpload;
window.groupCSVs = groupCSVs;
window.createTablesAndLoadData = createTablesAndLoadData;

document.addEventListener("DOMContentLoaded", () => {
    const groupButton = document.getElementById("groupButton");
    groupButton.onclick = () => {
        if (confirm("This step may take several minutes depending on the number and size of your files. Do you want to proceed?")) {
            groupCSVs();
        }
    };
});
