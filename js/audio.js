document.addEventListener('DOMContentLoaded', function() {
    // Ambil elemen input file
    const audioInput = document.getElementById('audioInput');
    // Ambil elemen audio untuk pratinjau
    const previewAudio = document.getElementById('previewAudio');
    // Ambil elemen untuk menampilkan nama file
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    // Ambil tombol "Compress"
    const compressButton = document.getElementById('compressButton');

    // Tambahkan event listener untuk perubahan input file
    audioInput.addEventListener('change', function(event) {
        // Ambil file yang dipilih
        const file = event.target.files[0];
        // Buat URL objek untuk file
        const fileURL = URL.createObjectURL(file);
        // Atur sumber audio untuk pratinjau
        previewAudio.src = fileURL;
        // Tampilkan nama file
        fileNameDisplay.textContent = file.name;
    });

    // Tambahkan event listener ke tombol "Compress"
    compressButton.addEventListener('click', function() {
        // Ambil file yang dipilih
        const file = audioInput.files[0];
        if (file) {
            // Hitung ukuran file
            const fileSizeMb = file.size / BYTES_PER_MEGABYTE;
            console.log(`File size: ${fileSizeMb.toFixed(2)} MB`);

            // Sesuaikan kompresi berdasarkan ukuran file
            compressAudioFile(file, fileSizeMb);
        } else {
            console.error('No file selected.');
        }
    });
});

// Constants
const BITS_PER_BYTE = 8;
const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * 1024;
const MIN_FRAME_RATE = 1;
const SAFETY_FACTOR = 0.95;

/**
 * Compresses an audio file to a target size and triggers a download.
 * @param {File} file - The audio file to compress.
 * @param {number} originalSizeMb - The original file size in megabytes.
 */
async function compressAudioFile(file, originalSizeMb) {
    // Calculate the target size for compression (e.g., reduce by 20%)
    const targetSizeMb = originalSizeMb * 0.8; // Adjust this factor as needed

    try {
        // Create an audio context
        const audioContext = new(window.AudioContext || window.webkitAudioContext)();

        // Read the file as array buffer
        const fileData = await file.arrayBuffer();

        // Decode the audio data
        const audioBuffer = await audioContext.decodeAudioData(fileData);

        // Calculate new frame rate
        const currentFrameRate = audioBuffer.sampleRate;
        const currentSizeKb = calculateFileSizeInKb(
            currentFrameRate,
            16, // Assuming 16-bit depth, replace with actual bit depth if different
            audioBuffer.numberOfChannels,
            audioBuffer.duration
        );
        const newFrameRate = calculateNewFrameRate(
            currentFrameRate,
            targetSizeMb,
            currentSizeKb
        );
        console.log(`New frame rate calculated: ${newFrameRate} Hz`);

        // Modify the audio data to reduce the sample rate
        const newAudioBuffer = await changeSampleRate(audioBuffer, newFrameRate);

        // Encode the modified audio data back into a WAV file format
        const processedWavBlob = encodeAudioBufferToWav(newAudioBuffer);

        // Create a download link for the processed WAV file
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(processedWavBlob);
        downloadLink.download = file.name.replace('.mp3', '_compressed.mp3');
        document.body.appendChild(downloadLink); // Append to body to make it clickable
        downloadLink.click();
        document.body.removeChild(downloadLink); // Clean up the DOM
        URL.revokeObjectURL(downloadLink.href); // Clean up the URL object

        console.log(
            `Compressed and downloaded ${file.name} with new frame rate: ${newFrameRate} Hz`
        );
    } catch (e) {
        console.error(`Error processing file: ${e}`);
    }
}

/**
 * Calculates the file size of a WAV audio in kilobytes.
 * @param {number} frameRate - The frame rate of the audio.
 * @param {number} bitDepth - The bit depth of the audio.
 * @param {number} channels - The number of audio channels.
 * @param {number} durationSec - The duration of the audio in seconds.
 * @return {number} The file size in kilobytes.
 */
function calculateFileSizeInKb(frameRate, bitDepth, channels, durationSec) {
    const sizeInBits = frameRate * bitDepth * channels * durationSec;
    return sizeInBits / (BITS_PER_BYTE * BYTES_PER_KILOBYTE);
}

/**
 * Calculates the new frame rate to achieve the target file size in megabytes.
 * @param {number} currentFrameRate - The current frame rate of the audio.
 * @param {number} targetSizeMb - The target file size in megabytes.
 * @param {number} currentSizeKb - The current file size in kilobytes.
 * @return {number} The new frame rate.
 */
function calculateNewFrameRate(currentFrameRate, targetSizeMb, currentSizeKb) {
    const targetSizeKb = targetSizeMb * BYTES_PER_MEGABYTE / BYTES_PER_KILOBYTE;
    let reductionFactor = targetSizeKb / currentSizeKb;
    reductionFactor *= SAFETY_FACTOR;
    return Math.max(
        Math.floor(currentFrameRate * reductionFactor),
        MIN_FRAME_RATE
    );
}

/**
 * Changes the sample rate of an audio buffer.
 * @param {AudioBuffer} audioBuffer - The original audio buffer.
 * @param {number} newSampleRate - The new sample rate to apply.
 * @return {AudioBuffer} The audio buffer with the new sample rate.
 */
async function changeSampleRate(audioBuffer, newSampleRate) {
    // Create an offline context with the new sample rate.
    const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        (audioBuffer.length * newSampleRate) / audioBuffer.sampleRate,
        newSampleRate
    );

    // Create a buffer source for the existing audioBuffer.
    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = audioBuffer;

    // Connect the source to the offline context.
    bufferSource.connect(offlineContext.destination);

    // Start the source.
    bufferSource.start();

    // Render the audio from the offline context.
    const renderedBuffer = await offlineContext.startRendering();

    console.log(`Sample rate changed to ${newSampleRate} Hz`);
    return renderedBuffer;
}

/**
 * Encodes an audio buffer into a WAV file blob.
 * @param {AudioBuffer} audioBuffer - The audio buffer to encode.
 * @return {Blob} The WAV file blob.
 */
function encodeAudioBufferToWav(audioBuffer) {
    // Create a WAV file using the built-in functions and encode it into a Blob
    const bufferLength = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const bitsPerSample = 16; // Typical value for WAV files

    // Create a DataView with a buffer the size needed for the WAV file
    const wavHeaderSize = 44; // 44 bytes for the WAV header
    const wavBufferSize =
        (bufferLength * numberOfChannels * bitsPerSample) / 8 + wavHeaderSize;
    const wavBuffer = new ArrayBuffer(wavBufferSize);
    const view = new DataView(wavBuffer);

    // Write the WAV container headers
    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + bufferLength * numberOfChannels * 2, true);
    writeString(view, 8, 'WAVE');
    // FMT sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, (sampleRate * numberOfChannels * bitsPerSample) / 8, true); // ByteRate
    view.setUint16(32, (numberOfChannels * bitsPerSample) / 8, true); // BlockAlign
    view.setUint16(34, bitsPerSample, true);
    // Data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, bufferLength * numberOfChannels * 2, true);

    // Write the PCM samples
    let offset = 44;
    for (let i = 0; i < bufferLength; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = Math.max(
                -1,
                Math.min(1, audioBuffer.getChannelData(channel)[i])
            ); // Clamp the sample to -1, 1
            const intSample = sample < 0 ? sample * 32768 : sample * 32767; // Convert to 16-bit integer
            view.setInt16(offset, intSample, true);
            offset += 2;
        }
    }

    // Create and return the Blob with the WAV file data
    const wavBlob = new Blob([view], {
        type: 'audio/wav'
    });
    console.log('WAV file encoding complete.');
    return wavBlob;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}