(function() {
  'use strict';

  /* ------------------ CANVAS SETUP ------------------ */
  var wrap = document.getElementById("sketch-wrapper");
  var imageCanvas = document.getElementById("imageLayer");
  var floatingCanvas = document.getElementById("floatingLayer");
  var gridCanvas = document.getElementById("gridLayer");
  var bufferCanvas = document.getElementById("bufferLayer");
  var drawCanvas = document.getElementById("drawingLayer");

  var imageCtx = imageCanvas.getContext("2d");
  var floatingCtx = floatingCanvas.getContext("2d");
  var gridCtx = gridCanvas.getContext("2d");
  var bufferCtx = bufferCanvas.getContext("2d");
  var drawCtx = drawCanvas.getContext("2d");

  function resize(w, h) {
    wrap.style.width = w + "px";
    wrap.style.height = h + "px";
    imageCanvas.width = w;
    imageCanvas.height = h;
    floatingCanvas.width = w;
    floatingCanvas.height = h;
    gridCanvas.width = w;
    gridCanvas.height = h;
    bufferCanvas.width = w;
    bufferCanvas.height = h;
    drawCanvas.width = w;
    drawCanvas.height = h;
  }
  resize(900, 600);

  /* ------------------ STATE ------------------ */
  var currentTool = "pencil";
  var currentColor = "#000000";
  var currentThickness = 2;
  var drawing = false;
  var startX = 0;
  var startY = 0;
  var bgImage = null;
  var charcoalOpacity = 0.3;
  var charcoalPath = [];

  var history = [];
  var redoStack = [];

  function saveState() {
    history.push(bufferCanvas.toDataURL());
    redoStack = [];
  }

  function restoreState() {
    bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    if (history.length === 0) return;
    var img = new Image();
    img.onload = function() {
      bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
      bufferCtx.drawImage(img, 0, 0);
    };
    img.src = history[history.length - 1];
  }

  /* ------------------ FLOATING IMAGES ------------------ */
  var floatingImages = [];
  var selectedFloating = null;

  function addFloatingImage(imgElement) {
    var canvasW = floatingCanvas.width;
    var canvasH = floatingCanvas.height;
    var maxDim = Math.min(canvasW, canvasH) * 0.3;
    
    var w = imgElement.width;
    var h = imgElement.height;
    var scale = Math.min(maxDim / w, maxDim / h);
    w *= scale;
    h *= scale;

    floatingImages.push({
      img: imgElement,
      x: canvasW / 2,
      y: canvasH / 2,
      width: w,
      height: h,
      rotation: 0,
      scale: 1
    });
    
    updateFloatingSelect();
    renderFloatingImages();
  }

  function updateFloatingSelect() {
    var select = document.getElementById("floatingSelect");
    select.innerHTML = '<option value="">Select Image...</option>';
    
    for (var i = 0; i < floatingImages.length; i++) {
      var opt = document.createElement("option");
      opt.value = i;
      opt.textContent = "Image " + (i + 1);
      select.appendChild(opt);
    }
    
    if (floatingImages.length > 0) {
      select.style.display = "block";
    } else {
      select.style.display = "none";
      document.getElementById("floatingControls").classList.remove("active");
    }
  }

  function renderFloatingImages() {
    floatingCtx.clearRect(0, 0, floatingCanvas.width, floatingCanvas.height);
    
    for (var i = 0; i < floatingImages.length; i++) {
      var fi = floatingImages[i];
      floatingCtx.save();
      floatingCtx.translate(fi.x, fi.y);
      floatingCtx.rotate(fi.rotation);
      floatingCtx.scale(fi.scale, fi.scale);
      floatingCtx.drawImage(fi.img, -fi.width/2, -fi.height/2, fi.width, fi.height);
      floatingCtx.restore();

      // Draw selection indicator
      if (selectedFloating === i) {
        var hw = fi.width * fi.scale / 2;
        var hh = fi.height * fi.scale / 2;
        
        floatingCtx.save();
        floatingCtx.translate(fi.x, fi.y);
        floatingCtx.rotate(fi.rotation);
        floatingCtx.strokeStyle = "#0a84ff";
        floatingCtx.lineWidth = 3;
        floatingCtx.strokeRect(-hw, -hh, hw*2, hh*2);
        floatingCtx.restore();
      }
    }
  }

  // Floating image selection
  document.getElementById("floatingSelect").addEventListener("change", function(e) {
    var val = e.target.value;
    if (val === "") {
      selectedFloating = null;
      document.getElementById("floatingControls").classList.remove("active");
    } else {
      selectedFloating = parseInt(val, 10);
      document.getElementById("floatingControls").classList.add("active");
    }
    renderFloatingImages();
  });

  // Click to select floating image
  floatingCanvas.addEventListener("click", function(e) {
    if (drawing) return;
    
    var rect = floatingCanvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (floatingCanvas.width / rect.width);
    var y = (e.clientY - rect.top) * (floatingCanvas.height / rect.height);
    
    var found = null;
    for (var i = floatingImages.length - 1; i >= 0; i--) {
      var fi = floatingImages[i];
      var hw = fi.width * fi.scale / 2;
      var hh = fi.height * fi.scale / 2;
      
      var dx = x - fi.x;
      var dy = y - fi.y;
      var cos = Math.cos(-fi.rotation);
      var sin = Math.sin(-fi.rotation);
      var lx = dx * cos - dy * sin;
      var ly = dx * sin + dy * cos;
      
      if (Math.abs(lx) <= hw && Math.abs(ly) <= hh) {
        found = i;
        break;
      }
    }
    
    if (found !== null) {
      selectedFloating = found;
      document.getElementById("floatingSelect").value = found;
      document.getElementById("floatingControls").classList.add("active");
      renderFloatingImages();
    }
  });

  // Floating image controls
  document.getElementById("btnMoveUp").addEventListener("click", function() {
    if (selectedFloating !== null) {
      floatingImages[selectedFloating].y -= 10;
      renderFloatingImages();
    }
  });

  document.getElementById("btnMoveDown").addEventListener("click", function() {
    if (selectedFloating !== null) {
      floatingImages[selectedFloating].y += 10;
      renderFloatingImages();
    }
  });

  document.getElementById("btnMoveLeft").addEventListener("click", function() {
    if (selectedFloating !== null) {
      floatingImages[selectedFloating].x -= 10;
      renderFloatingImages();
    }
  });

  document.getElementById("btnMoveRight").addEventListener("click", function() {
    if (selectedFloating !== null) {
      floatingImages[selectedFloating].x += 10;
      renderFloatingImages();
    }
  });

  document.getElementById("btnRotateLeft").addEventListener("click", function() {
    if (selectedFloating !== null) {
      floatingImages[selectedFloating].rotation -= 5 * Math.PI / 180;
      renderFloatingImages();
    }
  });

  document.getElementById("btnRotateRight").addEventListener("click", function() {
    if (selectedFloating !== null) {
      floatingImages[selectedFloating].rotation += 5 * Math.PI / 180;
      renderFloatingImages();
    }
  });

  document.getElementById("btnScaleUp").addEventListener("click", function() {
    if (selectedFloating !== null) {
      floatingImages[selectedFloating].scale *= 1.1;
      renderFloatingImages();
    }
  });

  document.getElementById("btnScaleDown").addEventListener("click", function() {
    if (selectedFloating !== null) {
      floatingImages[selectedFloating].scale *= 0.9;
      renderFloatingImages();
    }
  });

  document.getElementById("btnDelete").addEventListener("click", function() {
    if (selectedFloating !== null) {
      floatingImages.splice(selectedFloating, 1);
      selectedFloating = null;
      document.getElementById("floatingSelect").value = "";
      document.getElementById("floatingControls").classList.remove("active");
      updateFloatingSelect();
      renderFloatingImages();
    }
  });

  /* ------------------ GRID + VP ------------------ */
  var gridMode = "none";
  var vp1 = {x: 400, y: 300};
  var vp2 = {x: 700, y: 300};
  var vp3 = {x: 500, y: 80};
  var draggingVP = null;
  var ox = 0;
  var oy = 0;

  function drawVPs() {
    var existingDots = document.querySelectorAll(".vp-dot");
    for (var i = 0; i < existingDots.length; i++) {
      existingDots[i].remove();
    }
    
    var list = [];
    if (gridMode === "1p") list = [vp1];
    if (gridMode === "2p") list = [vp1, vp2];
    if (gridMode === "3p") list = [vp1, vp2, vp3];
    
    for (var i = 0; i < list.length; i++) {
      var v = list[i];
      var d = document.createElement("div");
      d.className = "vp-dot";
      d.style.left = (v.x - 6) + "px";
      d.style.top  = (v.y - 6) + "px";
      wrap.appendChild(d);

      (function(vp) {
        function startDrag(e) {
          if (e.type.indexOf("touch") === 0) e.preventDefault();
          var clientX = e.clientX || e.touches[0].clientX;
          var clientY = e.clientY || e.touches[0].clientY;
          draggingVP = vp;
          var r = wrap.getBoundingClientRect();
          ox = clientX - (r.left + vp.x);
          oy = clientY - (r.top + vp.y);
          e.stopPropagation();
        }
        d.addEventListener("mousedown", startDrag);
        d.addEventListener("touchstart", startDrag);
      })(v);
    }
  }

  function drawGrid() {
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    if (gridMode === "none") { 
      drawVPs(); 
      return; 
    }
    
    gridCtx.strokeStyle = "#00aaff";
    gridCtx.lineWidth = 1;
    
    if (gridMode === "1p") {
      for (var i = 0; i < 360; i += 10) {
        var a = i * Math.PI/180;
        gridCtx.beginPath();
        gridCtx.moveTo(vp1.x, vp1.y);
        gridCtx.lineTo(vp1.x + 2000*Math.cos(a), vp1.y + 2000*Math.sin(a));
        gridCtx.stroke();
      }
    }
    
    if (gridMode === "2p") {
      gridCtx.beginPath();
      gridCtx.moveTo(vp1.x, vp1.y);
      gridCtx.lineTo(vp2.x, vp2.y);
      gridCtx.stroke();
    }
    
    if (gridMode === "3p") {
      gridCtx.beginPath();
      gridCtx.moveTo(vp1.x, vp1.y);
      gridCtx.lineTo(vp2.x, vp2.y);
      gridCtx.lineTo(vp3.x, vp3.y);
      gridCtx.closePath();
      gridCtx.stroke();
    }
    
    drawVPs();
  }

  function moveVP(e) {
    if (!draggingVP) return;
    if (e.type.indexOf("touch") === 0) e.preventDefault(); 
    
    var clientX = e.clientX || e.touches[0].clientX;
    var clientY = e.clientY || e.touches[0].clientY;
    var r = wrap.getBoundingClientRect();
    
    draggingVP.x = clientX - r.left - ox;
    draggingVP.y = clientY - r.top - oy;
    draggingVP.x = Math.max(0, Math.min(bufferCanvas.width, draggingVP.x));
    draggingVP.y = Math.max(0, Math.min(bufferCanvas.height, draggingVP.y));
    
    drawGrid();
  }

  function endVP() {
    draggingVP = null;
  }

  document.addEventListener("mousemove", moveVP);
  document.addEventListener("touchmove", moveVP, { passive: false });
  document.addEventListener("mouseup", endVP);
  document.addEventListener("touchend", endVP);
  document.addEventListener("touchcancel", endVP);

  /* ------------------ SNAP ------------------ */
  function snap(dx, dy) {
    var ang = Math.atan2(dy, dx) * 180 / Math.PI;
    if (ang < 0) ang += 360;
    
    var snapAngles = [0, 90, 180, 270];
    for (var i = 0; i < snapAngles.length; i++) {
      if (Math.abs(ang - snapAngles[i]) <= 3) { 
        ang = snapAngles[i]; 
        break; 
      }
    }
    
    var len = Math.sqrt(dx*dx + dy*dy);
    var rad = ang * Math.PI/180;
    
    return { 
      x: startX + len * Math.cos(rad), 
      y: startY + len * Math.sin(rad) 
    };
  }

  /* ------------------ DRAWING ------------------ */
  function getPos(canvas, e) {
    var r = canvas.getBoundingClientRect();
    var clientX = e.clientX !== undefined ? e.clientX : e.touches[0].clientX;
    var clientY = e.clientY !== undefined ? e.clientY : e.touches[0].clientY;
    
    return {
      x: (clientX - r.left) * (canvas.width / r.width),
      y: (clientY - r.top)  * (canvas.height / r.height)
    };
  }

  function drawStart(e) {
    if (e.type.indexOf("touch") === 0) e.preventDefault();
    
    if (e.button === 0 || e.type === "touchstart") { 
      var p = getPos(drawCanvas, e);
      drawing = true;
      startX = p.x; 
      startY = p.y;

      if (currentTool === "pencil" || currentTool === "eraser") {
        bufferCtx.beginPath();
        bufferCtx.moveTo(startX, startY);
      } else if (currentTool === "charcoal") {
        charcoalPath = [{x: startX, y: startY}];
      }
    }
  }

  drawCanvas.addEventListener("mousedown", drawStart);
  drawCanvas.addEventListener("touchstart", drawStart);

  function drawMove(e) {
    if (!drawing) return;
    if (e.type.indexOf("touch") === 0) e.preventDefault(); 
    
    var p = getPos(drawCanvas, e);

    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawCtx.lineCap = "round";
    drawCtx.lineWidth = currentThickness;
    drawCtx.globalCompositeOperation = "source-over";
    drawCtx.strokeStyle = currentColor;

    if (currentTool === "pencil") {
      bufferCtx.lineCap = "round";
      bufferCtx.lineWidth = currentThickness;
      bufferCtx.strokeStyle = currentColor;
      bufferCtx.globalCompositeOperation = "source-over";
      bufferCtx.lineTo(p.x, p.y);
      bufferCtx.stroke();
    }
    else if (currentTool === "charcoal") {
      charcoalPath.push({x: p.x, y: p.y});
      
      drawCtx.drawImage(bufferCanvas, 0, 0);
      
      var r = parseInt(currentColor.substr(1, 2), 16);
      var g = parseInt(currentColor.substr(3, 2), 16);
      var b = parseInt(currentColor.substr(5, 2), 16);
      
      drawCtx.lineCap = "round";
      drawCtx.lineWidth = currentThickness;
      drawCtx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + charcoalOpacity + ")";
      drawCtx.beginPath();
      drawCtx.moveTo(charcoalPath[0].x, charcoalPath[0].y);
      for (var i = 1; i < charcoalPath.length; i++) {
        drawCtx.lineTo(charcoalPath[i].x, charcoalPath[i].y);
      }
      drawCtx.stroke();
    }
    else if (currentTool === "eraser") {
      bufferCtx.globalCompositeOperation = "destination-out";
      bufferCtx.lineWidth = currentThickness;
      bufferCtx.lineTo(p.x, p.y);
      bufferCtx.stroke();
      bufferCtx.globalCompositeOperation = "source-over";
    }
    else if (currentTool === "line") {
      drawCtx.drawImage(bufferCanvas, 0, 0);
      var s = snap(p.x - startX, p.y - startY);
      drawCtx.beginPath();
      drawCtx.moveTo(startX, startY);
      drawCtx.lineTo(s.x, s.y);
      drawCtx.stroke();
    }
    else if (currentTool === "rectangle") {
      drawCtx.drawImage(bufferCanvas, 0, 0);
      var width = p.x - startX;
      var height = p.y - startY;
      drawCtx.strokeRect(startX, startY, width, height);
    }
    else if (currentTool === "oval") {
      drawCtx.drawImage(bufferCanvas, 0, 0);
      var radiusX = Math.abs(p.x - startX) / 2;
      var radiusY = Math.abs(p.y - startY) / 2;
      var centerX = startX + (p.x - startX) / 2;
      var centerY = startY + (p.y - startY) / 2;
      
      drawCtx.beginPath();
      drawCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      drawCtx.stroke();
    }
  }

  drawCanvas.addEventListener("mousemove", drawMove);
  drawCanvas.addEventListener("touchmove", drawMove, { passive: false });

  function drawEnd(e) {
    if (!drawing) return;
    drawing = false;

    var p;
    if (e.changedTouches && e.changedTouches.length > 0) {
      p = getPos(drawCanvas, { touches: e.changedTouches });
    } else {
      p = getPos(drawCanvas, e);
    }

    if (currentTool === "line") {
      var s = snap(p.x - startX, p.y - startY);
      bufferCtx.lineCap = "round";
      bufferCtx.lineWidth = currentThickness;
      bufferCtx.strokeStyle = currentColor;
      bufferCtx.beginPath();
      bufferCtx.moveTo(startX, startY);
      bufferCtx.lineTo(s.x, s.y);
      bufferCtx.stroke();
    }
    else if (currentTool === "charcoal") {
      if (charcoalPath.length > 0) {
        var r = parseInt(currentColor.substr(1, 2), 16);
        var g = parseInt(currentColor.substr(3, 2), 16);
        var b = parseInt(currentColor.substr(5, 2), 16);
        
        bufferCtx.lineCap = "round";
        bufferCtx.lineWidth = currentThickness;
        bufferCtx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + charcoalOpacity + ")";
        bufferCtx.beginPath();
        bufferCtx.moveTo(charcoalPath[0].x, charcoalPath[0].y);
        for (var i = 1; i < charcoalPath.length; i++) {
          bufferCtx.lineTo(charcoalPath[i].x, charcoalPath[i].y);
        }
        bufferCtx.stroke();
        charcoalPath = [];
      }
    }
    else if (currentTool === "rectangle") {
      var width = p.x - startX;
      var height = p.y - startY;
      bufferCtx.lineCap = "round";
      bufferCtx.lineWidth = currentThickness;
      bufferCtx.strokeStyle = currentColor;
      bufferCtx.strokeRect(startX, startY, width, height);
    }
    else if (currentTool === "oval") {
      var radiusX = Math.abs(p.x - startX) / 2;
      var radiusY = Math.abs(p.y - startY) / 2;
      var centerX = startX + (p.x - startX) / 2;
      var centerY = startY + (p.y - startY) / 2;
      
      bufferCtx.lineCap = "round";
      bufferCtx.lineWidth = currentThickness;
      bufferCtx.strokeStyle = currentColor;
      bufferCtx.beginPath();
      bufferCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      bufferCtx.stroke();
    }

    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    saveState();
  }

  drawCanvas.addEventListener("mouseup", drawEnd);
  drawCanvas.addEventListener("touchend", drawEnd);
  drawCanvas.addEventListener("touchcancel", drawEnd);
  drawCanvas.addEventListener("mouseleave", function() { 
    drawing = false; 
  });

  /* ------------------ CONTROLS ------------------ */
  document.getElementById("tool").onchange = function(e) { 
    currentTool = e.target.value;
    var charcoalControl = document.getElementById("charcoalControl");
    if (currentTool === "charcoal") {
      charcoalControl.style.display = "flex";
    } else {
      charcoalControl.style.display = "none";
    }
  };

  document.getElementById("charcoalOpacity").addEventListener("input", function(e) {
    charcoalOpacity = parseInt(e.target.value, 10) / 100;
    document.getElementById("opacityValue").textContent = e.target.value + "%";
  });

  document.getElementById("color").onchange = function(e) { 
    currentColor = e.target.value; 
  };

  document.getElementById("thickness").onchange = function(e) { 
    currentThickness = parseInt(e.target.value, 10); 
  };

  document.getElementById("gridMode").onchange = function(e) { 
    gridMode = e.target.value;
    drawGrid();
  };

  document.getElementById("undo").onclick = function() {
    if (history.length > 1) {
      redoStack.push(history.pop());
      restoreState();
    } else if (history.length === 1) {
      redoStack.push(history.pop());
      bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
      drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    }
  };

  document.getElementById("redo").onclick = function() {
    if (redoStack.length) {
      history.push(redoStack.pop());
      restoreState();
    }
  };

  document.getElementById("clear").onclick = function() {
    bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    history = [];
    redoStack = [];
    saveState();
  };

  document.getElementById("export").addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      var format = document.getElementById("exportFormat").value;
      var out = document.createElement("canvas");
      out.width = drawCanvas.width;
      out.height = drawCanvas.height;
      var o = out.getContext("2d");
      
      // For JPEG, fill white background first
      if (format === "jpeg") {
        o.fillStyle = "white";
        o.fillRect(0, 0, out.width, out.height);
      }
      
      if (bgImage && document.getElementById("toggleBgImage").checked) {
        o.drawImage(imageCanvas, 0, 0);
      }
      if (document.getElementById("toggleFloating").checked) {
        o.drawImage(floatingCanvas, 0, 0);
      }
      if (document.getElementById("toggleDrawing").checked) {
        o.drawImage(bufferCanvas, 0, 0);
      }
      
      var mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
      var extension = format === "jpeg" ? ".jpg" : ".png";
      var quality = 0.95;
      
      var dataURL = out.toDataURL(mimeType, quality);
      
      // Create and trigger download
      var a = document.createElement("a");
      a.href = dataURL;
      a.download = "sketch" + extension;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      console.log("Export successful: sketch" + extension);
    } catch(err) {
      console.error("Export error:", err);
      alert("Export failed. Please try again.");
    }
  });

  document.getElementById("uploadBg").onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    
    var r = new FileReader();
    r.onload = function(ev) {
      bgImage = new Image();
      bgImage.onload = function() {
        resize(bgImage.width, bgImage.height);
        imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        imageCtx.drawImage(bgImage, 0, 0);
        bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        history = []; 
        redoStack = [];
        saveState();
        drawGrid();
        renderFloatingImages();
      };
      bgImage.src = ev.target.result;
    };
    r.readAsDataURL(file);
  };

  document.getElementById("uploadFloating").onchange = function(e) {
    var files = e.target.files;
    if (!files || files.length === 0) return;
    
    for (var i = 0; i < files.length; i++) {
      (function(file) {
        var r = new FileReader();
        r.onload = function(ev) {
          var img = new Image();
          img.onload = function() {
            addFloatingImage(img);
          };
          img.src = ev.target.result;
        };
        r.readAsDataURL(file);
      })(files[i]);
    }
  };

  document.getElementById("toggleBgImage").onchange = function(e) {
    imageCanvas.style.display = e.target.checked ? "block" : "none";
  };

  document.getElementById("toggleFloating").onchange = function(e) {
    floatingCanvas.style.display = e.target.checked ? "block" : "none";
  };

  document.getElementById("toggleDrawing").onchange = function(e) {
    bufferCanvas.style.display = e.target.checked ? "block" : "none";
  };

  /* ------------------ INIT ------------------ */
  saveState();
  drawGrid();

})();
