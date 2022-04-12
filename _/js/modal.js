// Get the modal

var modalImageZoom = 1.0;
const zoomStepSize = 0.2;
const maxZoom = 10.0;
const minZoom = 0.1;
var startWidth = 100;
var startHeight = 100;

function changeZoom(direction) {
	if (direction === "+") {
		modalImageZoom = Math.min(maxZoom,modalImageZoom + zoomStepSize);
		setModalImageZoom();
	}
	else if (direction === "-") {
		modalImageZoom = Math.max(modalImageZoom-zoomStepSize,minZoom);
		setModalImageZoom();
	}
}

function setModalImageZoom() {
	modalImg.height = startHeight * modalImageZoom;
	modalImg.width = startWidth * modalImageZoom;
}

function openImageModal(img){
    modal.style.display = "block";
	modalImg.src = img.src;
	startWidth = window.innerWidth;
	startHeight = modalImg.naturalHeight / modalImg.naturalWidth * startWidth;
	setModalImageZoom();
}

var modal = document.createElement('div');
modal.className = "modal";
modal.id = "imageModal";
var modalImg = document.createElement('img');
modalImg.id = "modalContentImg";
modalImg.className = "modal-content";
modal.appendChild(modalImg);
var closeButton = document.createElement('span');
closeButton.className = "close";
closeButton.onclick = function() {
	modal.style.display = "none";
	modalImageZoom = 1.0;
}
closeButton.appendChild(document.createTextNode("\u00D7"));
var zoomInButton = document.createElement('button')
zoomInButton.id = "modalZoomIn";
zoomInButton.className = "modalZoomIn"
zoomInButton.innerHTML = "+"
zoomInButton.setAttribute("onclick","changeZoom('+');");
modal.appendChild(zoomInButton)
var zoomOutButton = document.createElement('button')
zoomOutButton.id = "modalZoomOut";
zoomOutButton.className = "modalZoomOut"
zoomOutButton.innerHTML = "-"
zoomOutButton.setAttribute("onclick","changeZoom('-');");
modal.appendChild(zoomOutButton)

modal.appendChild(closeButton);
document.body.appendChild(modal);

// Get the image and insert it inside the modal - use its "alt" text as a caption
var imgBlocks = document.getElementsByClassName("imageblock")
for (var block of imgBlocks) {
    var img = block.getElementsByTagName("img")[0];
    if (img) {
		img.setAttribute("onclick","openImageModal(this);");
    }
}
