// 🔄 New: Initialize session and get session_token
async function initializeUpload(file) {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(`${config.API_URL}/upload/initialize_upload/`, {
            method: "POST",
            body: formData,
            headers: {
                "Authorization": config.AUTH_TOKEN
            }
        });

        const data = await response.json();

        if (!response.ok || !data.session_token) {
            throw new Error(data.detail || "Failed to initialize upload session.");
        }

        sessionStorage.setItem("session_token", data.session_token);
        return data.session_token;
    } catch (error) {
        console.error("Session initialization failed:", error);
        alert(`Upload session error: ${error.message}`);
        return null;
    }
}

async function uploadChunk(file, chunkData, chunkNumber, totalChunks) {
    const session_token = sessionStorage.getItem("session_token");

    const formData = new FormData();
    formData.append("file", chunkData, file.name);
    formData.append("chunk_number", chunkNumber);
    formData.append("total_chunks", totalChunks);
    formData.append("filename", file.name);
    formData.append("session_token", session_token);

    try {
        const response = await fetch(`${config.API_URL}/upload/upload_chunk/`, {
            method: "POST",
            body: formData,
            headers: {
                "Authorization": config.AUTH_TOKEN
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error("Upload failed:", error);
        alert(`Upload failed: ${error.message}`);
        return false;
    }
}

async function finalizeUpload(filename, totalChunks) {
    const session_token = sessionStorage.getItem("session_token");

    const formData = new FormData();
    formData.append("filename", filename);
    formData.append("total_chunks", totalChunks);
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
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error("Finalize upload failed:", error);
        alert(`Finalize upload failed: ${error.message}`);
        return false;
    }
}

// 🔄 Updated main upload handler
async function startUpload() {
    const files = document.getElementById("fileInput").files;
    const progressContainer = document.getElementById("progressContainer");

    if (!files.length) {
        alert("Please select files to upload.");
        return;
    }

    // 🔄 Initialize session with first file
    const session_token = await initializeUpload(files[0]);
    if (!session_token) return;

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
