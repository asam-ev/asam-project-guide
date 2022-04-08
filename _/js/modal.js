// Get the modal

var modalImageZoom = 1.0;

function changeZoom(direction) {
	if (direction === "+") {
		modalImageZoom = Math.min(10.0,modalImageZoom + 0.1);
		setModalImageZoom();
	}
	else if (direction === "-") {
		modalImageZoom = Math.max(modalImageZoom-0.1,0.1);
		setModalImageZoom();
	}
}

function setModalImageZoom() {
	modalImg.height = modalImg.naturalHeight * modalImageZoom;
	modalImg.width = modalImg.naturalWidth * modalImageZoom;
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
    var img =block.getElementsByTagName("img")[0]

    img.onclick = function(){
        var imageSize = [img.naturalWidth,img.naturalHeight]
		var zoom = 1.0;
		modal.style.display = "block";
        modalImg.src = this.src;
		modalImg.naturalHeight	= img.naturalHeight;
		modalImg.naturalWidth	= img.naturalWidth;
		setModalImageZoom();
    }
}
