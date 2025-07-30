function clearBase64Image() {
    base64ImageGlobal = null;
}

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadPrompt = document.getElementById('upload-prompt');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const classifyBtn = document.getElementById('classify-btn');
const classificationResultText = document.getElementById('classification-result-text');
const resultImage = document.getElementById('result-image');
const confidenceText = document.getElementById('confidence-text');
const confidenceValue = document.getElementById('confidence-value');
const classificationDetails = document.getElementById('classification-details');
const benignInfo = document.getElementById('benign-info');
const malignantInfo = document.getElementById('malignant-info');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFiles, false);

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    dropZone.classList.add('drag-over');
}

function unhighlight(e) {
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles({ target: { files: files } });
}

let base64ImageGlobal = null;

function handleFiles(e) {
    const files = e.target.files;
    if (files.length) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();

            reader.onload = function (e) {
                const base64 = e.target.result;

                // Validasi: harus mengandung data:image
                if (!base64.startsWith("data:image")) {
                    alert("File bukan gambar yang valid.");
                    clearBase64Image();
                    removeImage();
                    return;
                }

                previewImage.onerror = null;
                previewImage.src = '';
                previewImage.src = base64;

                base64ImageGlobal = base64;
                uploadPrompt.style.display = 'none';
                previewContainer.style.display = 'block';
                classifyBtn.textContent = 'Klasifikasi';
                classifyBtn.disabled = false;

                resetClassificationResults();
            };

            reader.onerror = () => {
                alert('Gagal membaca file. Mohon coba lagi.');
                clearBase64Image();
                removeImage();
            };

            reader.readAsDataURL(file);
        } else {
            alert('Mohon upload file gambar yang valid (JPG, PNG, dll).');
            clearBase64Image();
            removeImage();
        }
    }
}

function resetClassificationResults() {
    classificationResultText.textContent = 'Menunggu Klasifikasi...';
    resultImage.src = 'placeholder.svg';
    confidenceText.style.display = 'none';
    confidenceValue.textContent = '';
    classificationDetails.style.display = 'none';
    benignInfo.style.display = 'none';
    malignantInfo.style.display = 'none';
}

function removeImage() {
    uploadPrompt.style.display = 'flex';
    previewContainer.style.display = 'none';
    previewImage.src = '';
    fileInput.value = '';
    classifyBtn.textContent = 'Pilih Gambar';
    classifyBtn.disabled = true;
    clearBase64Image();
    resetClassificationResults();
}

async function classifyImage() {
    if (!base64ImageGlobal) {
        alert("Pilih gambar terlebih dahulu.");
        return;
    }

    classifyBtn.disabled = true;
    classifyBtn.textContent = 'Memproses...';

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64ImageGlobal })
        });

        const data = await response.json();
        console.log("Response:", data);

        if (response.ok && data.status === 'success') {
            const resultText = data.prediction === 0 ? 'Benign' : 'Malignant';
            classificationResultText.textContent = resultText;
            confidenceText.style.display = "block";
            confidenceValue.textContent = `${data.confidence}%`;
            resultImage.src = previewImage.src;

            classificationDetails.style.display = 'block';
            benignInfo.style.display = data.prediction === 0 ? 'block' : 'none';
            malignantInfo.style.display = data.prediction === 1 ? 'block' : 'none';
        } else {
            throw new Error(data.message || 'Kesalahan dari server');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
        classifyBtn.disabled = false;
        classifyBtn.textContent = 'Klasifikasi';
    }
}

previewImage.onerror = function () {
    alert('Gagal memuat gambar. Pastikan file yang diupload adalah gambar yang valid.');
    clearBase64Image();
    removeImage();
};

classifyBtn.addEventListener('click', classifyImage);
