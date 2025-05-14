document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const messageInput = document.getElementById('messageInput');
    const imagePreview = document.getElementById('imagePreview');
    const encodeButton = document.getElementById('encodeMessage');
    const decodeButton = document.getElementById('decodeMessage');
    const downloadButton = document.getElementById('downloadImage');
    const generateHashButton = document.getElementById('generateHash');
    const decodedMessage = document.getElementById('decodedMessage');
    const sha256Result = document.getElementById('sha256Result');

    let originalImage = null;
    let encodedImage = null;

    // Preview the selected image
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                originalImage = e.target.result;
                encodedImage = null;
                decodedMessage.textContent = '';
                sha256Result.textContent = '';
            };
            reader.readAsDataURL(file);
        }
    });

    // Encode message into image
    encodeButton.addEventListener('click', () => {
        if (!originalImage) {
            alert('Please select an image first');
            return;
        }

        const message = messageInput.value;
        if (!message) {
            alert('Please enter a message to encode');
            return;
        }

        const img = new Image();
        img.onload = () => {
            try {
                // Use steganography.js to encode the message
                const encodedDataUrl = steg.encode(message, img);
                imagePreview.src = encodedDataUrl;
                encodedImage = encodedDataUrl;
                alert('Message encoded successfully!');
            } catch (error) {
                alert('Error encoding message: ' + error.message);
            }
        };
        img.src = originalImage;
    });

    // Decode message from image
    decodeButton.addEventListener('click', () => {
        const currentImage = encodedImage || originalImage;
        if (!currentImage) {
            alert('Please select an image first');
            return;
        }

        const img = new Image();
        img.onload = () => {
            try {
                // Use steganography.js to decode the message
                const message = steg.decode(img);
                // Only keep ASCII characters (0-9, a-z, A-Z, and basic punctuation)
                const cleanMessage = message.replace(/[^\x20-\x7E]/g, '');
                decodedMessage.textContent = cleanMessage || 'No hidden message found';
            } catch (error) {
                alert('Error decoding message: ' + error.message);
            }
        };
        img.src = currentImage;
    });

    // Download encoded image
    downloadButton.addEventListener('click', () => {
        if (!encodedImage) {
            alert('Please encode a message first');
            return;
        }

        const link = document.createElement('a');
        link.download = 'encoded_image.png';
        link.href = encodedImage;
        link.click();
    });

    // Generate hash for the current image
    generateHashButton.addEventListener('click', () => {
        const currentImage = encodedImage || originalImage;
        if (!currentImage) {
            alert('Please select an image first');
            return;
        }

        // Create SHA256 hash
        const SHA256 = new Hashes.SHA256;
        const hash = SHA256.hex(currentImage);
        sha256Result.textContent = hash;
    });
}); 