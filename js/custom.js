// Function to handle image upload
function handleFileSelect(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = document.getElementById('uploadedImage');
        img.src = event.target.result;
        img.style.display = 'block';
    }
    reader.readAsDataURL(file);
}

// Function to resize image
function resizeImage() {
    const width = document.getElementById('width').value;
    const height = document.getElementById('height').value;
    const lockAspectRatio = document.getElementById('lockAspectRatio').checked;
    const img = document.getElementById('uploadedImage');
    if (lockAspectRatio) {
        const aspectRatio = img.width / img.height;
        img.style.width = width + 'px';
        img.style.height = (width / aspectRatio) + 'px';
    } else {
        img.style.width = width + 'px';
        img.style.height = height + 'px';
    }
}

// Function to blur image
// Function to blur image while maintaining applied color filter
function blurImage() {
    const img = document.getElementById('uploadedImage');
    const appliedFilter = img.style.filter;
    if (img.style.display !== 'none') {
        img.style.filter = 'blur(5px) ' + appliedFilter;
    }
}


// Function to rotate image
function rotateImage() {
    const img = document.getElementById('uploadedImage');
    const currentRotation = (parseInt(img.getAttribute('data-rotation')) || 0) + 90;
    img.setAttribute('data-rotation', currentRotation);
    img.style.transform = `rotate(${currentRotation}deg)`;
}

// Function to download image
function dowloadImage() {
    const img = document.getElementById('uploadedImage');
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions to match the image
    canvas.width = img.width;
    canvas.height = img.height;

    // Apply rotation
    const rotation = parseInt(img.getAttribute('data-rotation')) || 0;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    
    // Apply filter (if any)
    const appliedFilters = img.style.filter;
    ctx.filter = appliedFilters;

    // Draw the image onto the canvas (applying filters)
    ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);

    // Convert the canvas to a data URL
    const dataURL = canvas.toDataURL('image/jpeg'); // Change to 'image/jpeg' for JPEG format

    // Create a link element to trigger the download
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'modified_image.jpg'; // Change extension to '.jpg' for JPEG format

    // Simulate click on the link to trigger the download
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
}




// Function to reload the page
function reloadPage() {
    location.reload();
}

// Function to apply selected filter to the image
function applyFilter() {
    const selectElement = document.querySelector('.filter-select');
    const selectedFilter = selectElement.value;
    const img = document.getElementById('uploadedImage');
    
    // Get current applied filters
    let appliedFilters = img.style.filter;

    // Remove previously applied blur filter
    appliedFilters = appliedFilters.replace(/blur\(.*?\)/g, '').trim();

    // Apply selected filter
    switch (selectedFilter) {
        case 'grayscale':
            appliedFilters += ' grayscale(100%)';
            break;
        case 'sepia':
            appliedFilters += ' sepia(100%)';
            break;
        case 'invert':
            appliedFilters += ' invert(100%)';
            break;
        default:
            appliedFilters = ''; // Remove all filters to revert to original state
            break;
    }

    // Apply filters to the image
    img.style.filter = appliedFilters;
}


// Event listener for filter selection change
document.querySelector('.filter-select').addEventListener('change', applyFilter);


// Event listener for file input change
document.getElementById('fileInput').addEventListener('change', handleFileSelect);

// Add this JavaScript to your existing script

const themeToggler = document.querySelector('.theme-toggler');

themeToggler.addEventListener('click', function() {
  document.documentElement.classList.toggle('dark-mode');
});
