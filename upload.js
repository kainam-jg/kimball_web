import { API_URL, AUTH_TOKEN } from "./config.js";

export async function startUpload() {
    let files = document.getElementById("fileInput").files;
    let progressContainer = document.getElementById("progressContainer");

    for (let file of files) {
        let chunkSize = 50 * 1024 * 1024; // 50MB
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

async function uploadChunk(file, chunkData, chunkNumber, totalChunks) {
    let formData = new FormData();
    formData.append("file", chunkData, file.name);
    formData.append("chunk_number", chunkNumber);
    formData.append("total_chunks", totalChunks);
    formData.append("filename", file.name);

    try {
        let response = await fetch(`${API_URL}/upload/upload_chunk/`, {
            method: "POST",
            body: formData,
            headers: {
                "Authorization": AUTH_TOKEN
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        console.log(`✅ Successfully uploaded chunk ${chunkNumber} of ${totalChunks} for ${file.name}`);
        return true;
    } catch (error) {
        console.error("❌ Upload failed:", error);
        alert(`❌ Upload failed: ${error.message}`);
        return false;
    }
}

async function finalizeUpload(filename, totalChunks) {
    let formData = new FormData();
    formData.append("filename", filename);
    formData.append("total_chunks", totalChunks);

    try {
        let response = await fetch(`${API_URL}/upload/finalize_upload/`, {
            method: "POST",
            body: formData,
            headers: {
                "Authorization": AUTH_TOKEN
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        console.log(`✅ Finalized upload for ${filename}`);
        return true;
    } catch (error) {
        console.error("❌ Finalize upload failed:", error);
        alert(`❌ Finalize upload failed: ${error.message}`);
        return false;
    }
}
