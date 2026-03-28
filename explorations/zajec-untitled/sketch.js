/* 
Part of the ReCode Project (http://recodeproject.com)
Based on "Untitled" by Edward Zajec
Originally published in "Computer Graphics and Art" v2n4, 1977
Copyright (c) 2013 Alonso Araujo - OSI/MIT license (http://recodeproject/license).
*/

function setup() {
  let canvas = createCanvas(500, 650, SVG);
  canvas.parent('sketch-container');
  ellipseMode(CENTER);
  rectMode(CENTER);

  setupDownloadButton();
}

let isPreparingDownload = false;
const DOWNLOAD_DELAY_MS = 10000; // wait ~10 seconds so the image fully renders

function setupDownloadButton() {
  const btn = document.getElementById('download-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (isPreparingDownload) return;
    isPreparingDownload = true;

    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Preparing download...';

    setTimeout(() => {
      // Save the current canvas as an SVG after the delay
      save('untitled-after-zajec.svg');

      btn.disabled = false;
      btn.textContent = originalLabel;
      isPreparingDownload = false;
    }, DOWNLOAD_DELAY_MS);
  });
}

/* 
Each one of the figures in this piece is drawn by a separate function, 
that way we could customize their behavior in the future.
Each one of the figures were previously studied to be the more accurate possible 
to the original piece.
At the beginning of each one of the functions are defined the different values
used to create the figures.
*/
function draw() {
  
  drawCenterEllipse();
  drawCenterRectangle();
  drawUpperRectangle();
  drawUpperCircle();
  drawBottomCircle();
  drawTriangle();

  // Draw the scene only once so the SVG doesn't accumulate layers
  noLoop();
}

function drawCenterEllipse(){
  
  let diameterMax = 460;
  let diameterMin = 30;
  let positionX = 205;
  let positionY = 205;
  
  stroke(0);          // dark stroke
  strokeWeight(2);
  noFill();
  
  for(let d = diameterMin; d < diameterMax; d = d + 33){
    ellipse(positionX, positionY, d, d);
  }
  
}


function drawCenterRectangle(){
  
  let diameterMax = 250;
  let diameterMin = 15;
  let positionX = 317;
  let positionY = 460;
  push();
  translate(positionX,positionY);
  rotate(0.6);
  
  stroke(0);          // dark stroke
  strokeWeight(1.2);
  noFill();
  
  for(let d = diameterMin; d < diameterMax; d = d + 10){
    if(d + 10 < diameterMax)
      rect(0, 0, d, d,3);
    else
      rect(0, 0, d, d);
  }
  pop();
  
}

function drawUpperRectangle(){
  
  let diameterMax = 150;
  let diameterMin = 15;
  let positionX = 288;
  let positionY = 180;
  push();
  translate(positionX,positionY);
  rotate(0.6);
  
  stroke(0);          // dark stroke
  strokeWeight(1.2);
  noFill();
  
  for(let d = diameterMin; d < diameterMax; d = d + 10){
    if(d + 10 < diameterMax)
      rect(0, 0, d, d,3);
    else
      rect(0, 0, d, d);
  }
  pop();
  
   
}

function drawUpperCircle(){

  let diameterMax = 124;
  let diameterMin = 1;
  let positionX = 375;
  let positionY = 250;
  
  stroke(0);          // dark stroke
  strokeWeight(2);
  noFill();
  
  for(let d = diameterMin; d < diameterMax; d = d + 6){
    ellipse(positionX, positionY, d, d);
  }
  
}

function drawBottomCircle(){

  let diameterMax = 240;
  let diameterMin = 5;
  let positionX = 470;
  let positionY = 525;
  
  stroke(0);          // dark stroke
  strokeWeight(2);
  noFill();
  
  for(let d = diameterMin; d < diameterMax; d = d + 10){
    ellipse(positionX, positionY, d, d);
  }
  
}

function drawTriangle(){

  let x1 = 10;
  let y1 = 32;
  let x2 = 116;
  let y2 = 92;
  let x3 = 116;
  let y3 = -33;
  let maxTriangles = 70;
  
  stroke(0);          // dark stroke
  strokeWeight(2);
  noFill();
  
  for(let i = 0; i < maxTriangles; i = i + 5){
    triangle(x1 + i, y1, x2 - i/2, y2 - i, x3 - i/2, y3 + i);
  }
  
} 