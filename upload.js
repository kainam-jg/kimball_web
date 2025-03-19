// Import API configuration
import { API_URL, AUTH_TOKEN } from "./config.js";

async function uploadChunk(file, chunkData, chunkNumber, totalChunks) {
    let formData = new FormData();
    formData.append("file", chunkData, file.name);
    formData.append("chunk_number", chunkNumber);
    formData.append("total_chunks", totalChunks);
    formData.append("filename", file.name);

    let response = await fetch(`${API_URL}/upload/upload_chunk/`, {
        method: "POST",
        body: formData,
        headers: { "Authorization": AUTH_TOKEN }
    });

    return response.ok;
}

async function finalizeUpload(filename, totalChunks) {
    let formData = new FormData();
    formData.append("filename", filename);
    formData.append("total_chunks", totalChunks);

    let response = await fetch(`${API_URL}/upload/finalize_upload/`, {
        method: "POST",
        body: formData,
        headers: { "Authorization": AUTH_TOKEN }
    });

    return response.ok;
}

async function startUpload() {
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
            alert(`✅ ${file.name} uploaded successfully!`);
        } else {
            alert(`❌ Failed to finalize ${file.name}`);
        }
    }
}
