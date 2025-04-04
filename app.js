import config from "./config.json" with { type: "json" };

let fileGroups = [];
let updatedJson = null;

async function initializeUpload(file) {
    const formData = new FormData();
    formData.append("file", file);

    console.log("📡 Calling /initialize_upload/ with:", file.name);

    try {
        const response = await fetch(`${config.API_URL}/upload/initialize_upload/`, {
            method: "POST",
            body: formData,
            headers: {
                "Authorization": config.AUTH_TOKEN
            }
        });

        const data = await response.json();
        console.log("📦 /initialize_upload/ response:", data);

        if (!response.ok || !data.session_token) {
            throw new Error(data.detail || "Failed to initialize upload session.");
        }

        sessionStorage.setItem("session_token", data.session_token);
        console.log("✅ session_token set:", data.session_token);
        return data.session_token;
    } catch (error) {
        console.error("❌ Session initialization failed:", error);
        alert(`Upload session error: ${error.message}`);
        return null;
    }
}

async function uploadChunk(file, chunkData, chunkNumber, totalChunks) {
    const session_token = sessionStorage.getItem("session_token");
    if (!session_token) {
        alert("❌ No session token available. Aborting upload.");
        return false;
    }

    const formData = new FormData();
    formData.append("file", chunkData, file.name);
    formData.append("chunk_number", Number(chunkNumber));
    formData.append("total_chunks", Number(totalChunks));
    formData.append("filename", file.name);
    formData.append("session_token", session_token);

    console.log("📤 Sending chunk:", {
        chunk_number: chunkNumber,
        total_chunks: totalChunks,
        filename: file.name,
        session_token
    });

    try {
        const response = await fetch(`${config.API_URL}/upload/upload_chunk/`, {
            method: "POST",
            body: formData,
            headers: {
                "Authorization": config.AUTH_TOKEN
            }
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Status ${response.status}: ${err}`);
        }

        console.log(`✅ Uploaded chunk ${chunkNumber}/${totalChunks} for ${file.name}`);
        return true;
    } catch (error) {
        console.error("❌ Upload failed:", error);
        alert(`Upload failed: ${error.message}`);
        return false;
    }
}

async function finalizeUpload(filename, totalChunks) {
    const session_token = sessionStorage.getItem("session_token");
    if (!session_token) {
        alert("❌ No session token available. Aborting finalize.");
        return false;
    }

    const formData = new FormData();
    formData.append("filename", filename);
    formData.append("total_chunks", Number(totalChunks));
    formData.append("session_token", session_token);

    try {
        const response = await fetch(`${config.API_URL}/upload/finalize_upload/`, {
            method: "POST",
            body: formData,
            headers: {
                "Authorization": config.AUTH_TOKEN
            }
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Status ${response.status}: ${err}`);
        }

        console.log(`✅ Finalized upload for ${filename}`);
        return true;
    } catch (error) {
        console.error("❌ Finalize upload failed:", error);
        alert(`Finalize upload failed: ${error.message}`);
        return false;
    }
}

async function startUpload() {
    console.log("🚀 Starting upload...");
    const files = document.getElementById("fileInput").files;
    const progressContainer = document.getElementById("progressContainer");
    progressContainer.innerHTML = "";

    if (!files.length) {
        alert("Please select files to upload.");
        return;
    }

    console.log("📁 Files selected:", files);

    const session_token = await initializeUpload(files[0]);
    if (!session_token) {
        alert("❌ Upload session could not be initialized. Aborting.");
        return;
    }

    console.log("✅ Upload session ready. Token:", session_token);

    for (let file of files) {
        const chunkSize = 50 * 1024 * 1024;
        const totalChunks = Math.ceil(file.size / chunkSize);
        const progressBar = document.createElement("progress");
        progressBar.max = totalChunks;
        progressBar.value = 0;
        progressContainer.appendChild(progressBar);

        for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
            const start = (chunkNumber - 1) * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunkData = file.slice(start, end);

            const success = await uploadChunk(file, chunkData, chunkNumber, totalChunks);
            if (!success) return;

            progressBar.value = chunkNumber;
        }

        const finalized = await finalizeUpload(file.name, totalChunks);
        if (finalized) {
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

        const createResponse = await fetch(`${config.API_URL}/csv/drop_and_create_table/`, {
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

        const loadResponse = await fetch(`${config.API_URL}/csv/load_data/`, {
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

// Expose public functions
window.startUpload = startUpload;
window.groupCSVs = groupCSVs;
window.createTablesAndLoadData = createTablesAndLoadData;
