// app.js
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

        document.getElementById("groupResults").innerHTML = output;
    } catch (error) {
        console.error("Error grouping CSV files:", error);
        alert(`Failed to group CSV files: ${error.message}`);
    }
}

async function createTablesAndLoadData() {
    const button = document.getElementById("loadButton");
    const statusDiv = document.getElementById("loadStatus");
    button.disabled = true;
    statusDiv.innerHTML = "<p>⏳ Starting table creation and data load...</p>";

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

        const payload = JSON.stringify({ groups: updatedGroups });
        updatedJson = payload;

        statusDiv.innerHTML += "<p>🛠️ Creating tables...</p>";
        const createResponse = await fetch(`${config.API_URL}/csv/drop_and_create_table/`, {
            method: "POST",
            headers: {
                "Authorization": config.AUTH_TOKEN,
                "Content-Type": "application/json"
            },
            body: payload
        });

        if (!createResponse.ok) {
            throw new Error(`Table creation failed. Status: ${createResponse.status}`);
        }
        statusDiv.innerHTML += "<p>✅ Tables created successfully.</p>";

        statusDiv.innerHTML += "<p>📤 Loading data into tables...</p>";
        const loadResponse = await fetch(`${config.API_URL}/csv/load_data/`, {
            method: "POST",
            headers: {
                "Authorization": config.AUTH_TOKEN,
                "Content-Type": "application/json"
            },
            body: payload
        });

        if (!loadResponse.ok) {
            throw new Error(`Data load failed. Status: ${loadResponse.status}`);
        }

        const result = await loadResponse.json();
        statusDiv.innerHTML += `<p>🎉 All data loaded successfully: ${result.message}</p>`;
    } catch (error) {
        console.error("❌ Error during table creation and data load:", error);
        statusDiv.innerHTML += `<p style="color:red;">❌ ${error.message}</p>`;
    } finally {
        button.disabled = false;
    }
}

// Expose functions
window.startUpload = startUpload;
window.groupCSVs = groupCSVs;
window.createTablesAndLoadData = createTablesAndLoadData;