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

function groupCSVsStream() {
    const statusBox = document.getElementById("groupStatus");
    statusBox.innerHTML = "<p>🔄 Grouping CSV files...</p>";

    const eventSource = new EventSource(`${config.API_URL}/csv/group_csvs_stream/?token=${encodeURIComponent(config.AUTH_TOKEN)}`);

    eventSource.addEventListener("start", function (event) {
        statusBox.innerHTML += `<p>🚀 ${event.data}</p>`;
    });

    eventSource.addEventListener("progress", function (event) {
        statusBox.innerHTML += `<p>${event.data}</p>`;
    });

    eventSource.addEventListener("complete", function (event) {
        const data = JSON.parse(event.data);
        fileGroups = data.groups;
        displayGroupResults(data.groups);
        statusBox.innerHTML += "<p>✅ Grouping complete. Ready for next step.</p>";
        eventSource.close();
    });

    eventSource.onerror = function (event) {
        console.error("❌ SSE connection error:", event);
        statusBox.innerHTML += "<p>❌ Error while grouping files.</p>";
        eventSource.close();
    };
}

function displayGroupResults(groups) {
    let output = "<h3>Grouped CSV Files</h3><ul>";
    groups.forEach((group, index) => {
        output += `
            <li>
                <strong>Table Name:</strong>
                <input type="text" id="group_${index}" value="${group.group}">
                <br>
                <strong>Files:</strong> ${group.files.join(", ")}
                <br>
                <strong>Headers:</strong> ${group.headers.join(", ")}
                <br>
                <strong>Total Rows:</strong> ${group.total_row_count}
                <br><br>
            </li>`;
    });
    output += "</ul>";
    document.getElementById("groupResults").innerHTML = output;
}

async function dropAndCreateTables() {
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

        console.log("Payload being sent:", JSON.stringify({ groups: updatedGroups }, null, 2));

        let response = await fetch(`${config.API_URL}/csv/drop_and_create_table/`, {
            method: "POST",
            headers: {
                "Authorization": config.AUTH_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ groups: updatedGroups })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        updatedJson = JSON.stringify({ groups: updatedGroups });

        let data = await response.json();
        console.log("Tables dropped and created:", data);
        alert("Tables dropped and created successfully!");
    } catch (error) {
        console.error("Error:", error);
        alert(`Error: ${error.message}`);
    }
}

async function loadData() {
    try {
        console.log("Sending fileGroups:", updatedJson);

        const response = await fetch(`${config.API_URL}/csv/load_data/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": config.AUTH_TOKEN
            },
            body: updatedJson
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Data loaded successfully:", result);
        alert("Data loaded successfully!");
    } catch (error) {
        console.error("Error loading data:", error);
        alert(`Error loading data: ${error.message}`);
    }
}

window.startUpload = startUpload;
window.groupCSVsStream = groupCSVsStream;
window.dropAndCreateTables = dropAndCreateTables;
window.loadData = loadData;
