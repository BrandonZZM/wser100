// Western States 100 - Course Record Balance Update
let distance = 0;
let coreTemp = 98.6; 
let stamina = 100;
let currentPace = 7.5; // Starts at an elite 7:30 min/mi
let currentSpeed = 60 / currentPace;
let powerHikeTimer = 0; 
let runCycle = 0; 

let gels = 6;
let maxGels = 6;
let nausea = 0; 

let rhythmMarker = 0; 
let elapsedMinutes = 0; 
let startOfRaceTime = 300; // 5:00 AM 
let raceStarted = false; 

// Easily tweak how dark the night gets (0 is bright, 255 is pitch black)
let maxDarkness = 140; 

const wsProfile = [
  { mile: 0, elev: 6200 },    
  { mile: 4, elev: 8700 },    
  { mile: 30, elev: 4000 },   
  { mile: 43, elev: 1500 },   
  { mile: 47, elev: 4600 },   
  { mile: 62, elev: 2500 },   
  { mile: 78, elev: 500 },    
  { mile: 100, elev: 1000 }   
];

const aidStations = [
  { name: "Lyon Ridge", mile: 10.3 },
  { name: "Red Star Ridge", mile: 15.8 },
  { name: "Duncan Canyon", mile: 24.4 },
  { name: "Robinson Flat", mile: 30.3 },
  { name: "Miller's Defeat", mile: 34.4 },
  { name: "Dusty Corners", mile: 38.0 },
  { name: "Last Chance", mile: 43.3 },
  { name: "Devil's Thumb", mile: 47.8 },
  { name: "El Dorado Creek", mile: 52.9 },
  { name: "Michigan Bluff", mile: 55.7 },
  { name: "Foresthill", mile: 62.0 },
  { name: "Dardanelles", mile: 65.7 },
  { name: "Peachstone", mile: 70.7 },
  { name: "Ford's Bar", mile: 73.0 },
  { name: "Rucky Chucky", mile: 78.0 },
  { name: "Green Gate", mile: 79.8 },
  { name: "Auburn Lake", mile: 85.2 },
  { name: "Quarry Rd", mile: 90.7 },
  { name: "Pointed Rocks", mile: 94.3 },
  { name: "Robie Point", mile: 98.9 }
];

function setup() {
  createCanvas(800, 400);
}

function getElevationAt(m) {
  if (m >= 100) return wsProfile[wsProfile.length-1].elev;
  for (let i = 0; i < wsProfile.length - 1; i++) {
    if (m >= wsProfile[i].mile && m < wsProfile[i+1].mile) {
      let pct = (m - wsProfile[i].mile) / (wsProfile[i+1].mile - wsProfile[i].mile);
      return lerp(wsProfile[i].elev, wsProfile[i+1].elev, pct);
    }
  }
  return 6200;
}

function getScreenY(m) {
  let elev = getElevationAt(m);
  let baseY = map(elev, 0, 9000, 380, 240);
  let texture = 0;
  if (m < 99.5) {
      texture = (noise(m * 20) - 0.5) * 15;
  }
  return baseY + texture;
}

function draw() {
  if (raceStarted) elapsedMinutes += 0.1; 
  
  let currentDayMinutes = (startOfRaceTime + elapsedMinutes) % 1440;
  let todHours = currentDayMinutes / 60;

  let darkness = 0;
  if (todHours < 6) { 
      darkness = map(todHours, 4, 6, maxDarkness, 0); 
  } else if (todHours >= 6 && todHours < 19) { 
      darkness = 0;
  } else if (todHours >= 19 && todHours < 21) { 
      darkness = map(todHours, 19, 21, 0, maxDarkness); 
  } else { 
      darkness = maxDarkness; 
  }
  darkness = constrain(darkness, 0, maxDarkness);

  let currentElev = getElevationAt(distance);
  let heatIntensity = map(coreTemp, 98.6, 105, 0, 255);
  background(220 + heatIntensity, 180 - heatIntensity/2, 150 - heatIntensity);

  drawMountains();
  drawTrail();
  drawEnvironment(currentElev); 

  fill(0, 0, 30, darkness);
  rect(0, 0, width, height);

  drawAidStation(darkness);
  drawTrackAndFinish();

  let elevAhead = getElevationAt(distance + 0.5);
  let grade = elevAhead - currentElev; 

  if (raceStarted) {
      nausea = max(0, nausea - 0.05);
      if (nausea > 75) stamina -= 0.02;

      // RE-BALANCED PACE ENGINE
      currentPace = 7.5; // Elite base pace
      currentPace += (gels * 0.03); // Minimal weight penalty
      
      let staminaPenalty = map(stamina, 100, 0, 0, 4); // Max +4 min/mi fatigue
      currentPace += max(0, staminaPenalty);
      
      if (coreTemp > 100) {
         let heatFactor = map(coreTemp, 100, 106, 0, 1);
         currentPace += (heatFactor * heatFactor) * 5; // Max +5 min/mi heat penalty
      }
      
      if (grade > 0) {
         let hillPenalty = grade / 40; // Less punishing climbs
         if (powerHikeTimer > 0) {
            hillPenalty *= 0.2; 
         }
         currentPace += hillPenalty;
      } else if (grade < 0) {
         let downHillBonus = grade / 60; // Smoother downhill bonus
         currentPace += downHillBonus; 
      }
      
      currentPace = constrain(currentPace, 4.0, 30.0);
      currentSpeed = 60 / currentPace; 
  }

  if (powerHikeTimer > 0) {
      powerHikeTimer--;
      fill(0, 255, 0); stroke(0); strokeWeight(2); textSize(12);
      text("FLOW STATE!", 100, getScreenY(distance) - 70);
      noStroke();
  }

  let isMoving = keyIsDown(RIGHT_ARROW);

  if (isMoving && !raceStarted) raceStarted = true;

  if (isMoving && raceStarted) {
    distance += 0.1 / currentPace; 
    
    let animationSpeed = constrain(currentSpeed * 0.03, 0.05, 0.25);
    runCycle += animationSpeed;

    let effort = map(grade, -500, 500, 0.01, 0.08); 
    if (powerHikeTimer > 0) effort *= 0.5; 
    stamina -= effort;
    
    nausea = max(0, nausea - 0.015); 
    
    let ambientHeat = map(currentElev, 1000, 9000, 1.5, 0.2);
    if (darkness > 50) ambientHeat *= 0.5; 
    coreTemp += (currentSpeed * 0.0005) * ambientHeat; 
  } else if (raceStarted) {
    nausea = max(0, nausea - 0.04); 
    coreTemp = max(98.6, coreTemp - 0.01);
    stamina = min(100, stamina + 0.05);
  }

  let groundY = getScreenY(distance);
  drawRunner(100, groundY, isMoving, currentSpeed, grade, darkness);

  let atAidStation = false;
  let activeStationName = "";
  for (let i = 0; i < aidStations.length; i++) {
     if (abs(distance - aidStations[i].mile) < 0.8) {
         atAidStation = true;
         activeStationName = aidStations[i].name;
         break;
     }
  }

  if (atAidStation) {
    fill(255); stroke(0); strokeWeight(2); textAlign(CENTER); textSize(16);
    text(`[${activeStationName}] HOLD 'S' TO SPONGE | HOLD 'F' TO RESTOCK`, width/2, 130);
    noStroke();
    
    if (isMoving && (keyIsDown(83) || keyIsDown(70))) {
        fill(255, 50, 50); stroke(0); strokeWeight(2); text("STOP RUNNING TO USE AID STATION!", width/2, 150); noStroke();
    } else {
        if (keyIsDown(83)) { 
          fill(100, 150, 255); stroke(0); strokeWeight(2); text("COOLING DOWN...", width/2, 150); noStroke();
          coreTemp = max(98.6, coreTemp - 0.03); 
          stamina = min(100, stamina + 0.05);  
          nausea = max(0, nausea - 0.08);  
        }
        if (keyIsDown(70)) { 
          fill(50, 255, 50); stroke(0); strokeWeight(2); text("GRABBING GELS...", width/2, 170); noStroke();
          if (frameCount % 10 === 0) gels = min(maxGels, gels + 1);
        }
    }
    textAlign(LEFT);
  }

  if (grade > 100 && raceStarted) displayRhythmBar();

  displayHUD(currentElev, currentDayMinutes);
  
  if (!raceStarted) {
    fill(0, 0, 0, 150); 
    rect(0, 0, width, height);
    fill(255); stroke(0); strokeWeight(3); textAlign(CENTER); textSize(40);
    text("WESTERN STATES 100", width/2, height/2 - 20);
    textSize(20); strokeWeight(2);
    text("Hold RIGHT ARROW to begin.", width/2, height/2 + 30);
    textAlign(LEFT); noStroke();
  }

  if (coreTemp > 106) drawDNF("HEAT STROKE");
  else if (stamina < 0) drawDNF("BONKED - OUT OF ENERGY");
  else if (nausea >= 100) drawDNF("STOMACH REVOLTED");
  else if (distance >= 100.02) { 
    fill(0, 255, 0); stroke(0); strokeWeight(2); textSize(32); textAlign(CENTER);
    text("SILVER BUCKLE EARNED!", width/2, height/2 - 20);
    let h = floor(elapsedMinutes / 60); let m = floor(elapsedMinutes % 60);
    text(`Official Time: ${nf(h, 2)}:${nf(m, 2)}`, width/2, height/2 + 20);
    drawRestartButton(); 
    noLoop(); 
  }
}

function drawRestartButton() {
  push();
  fill(220);
  stroke(0);
  strokeWeight(2);
  rectMode(CENTER);
  rect(width/2, height/2 + 80, 200, 40, 5);
  
  fill(0);
  noStroke();
  textAlign(CENTER);
  textSize(18);
  textStyle(BOLD);
  text("RESTART RACE", width/2, height/2 + 86);
  pop();
}

function mousePressed() {
  let isGameOver = (coreTemp > 106 || stamina < 0 || nausea >= 100 || distance >= 100.02);
  
  if (isGameOver) {
    let btnX = width/2;
    let btnY = height/2 + 80;
    if (mouseX > btnX - 100 && mouseX < btnX + 100 && mouseY > btnY - 20 && mouseY < btnY + 20) {
      resetGame();
    }
  }
}

function resetGame() {
  distance = 0;
  coreTemp = 98.6; 
  stamina = 100;
  currentPace = 7.5; 
  currentSpeed = 60 / currentPace;
  powerHikeTimer = 0; 
  runCycle = 0; 
  gels = 6;
  nausea = 0; 
  elapsedMinutes = 0; 
  raceStarted = false; 
  
  loop(); 
}

function drawMountains() {
  push();
  noStroke();

  let highCountryFar = color(200, 210, 220);
  let highCountryMid = color(150, 160, 170);
  let canyonFar = color(160, 110, 70);
  let canyonMid = color(120, 80, 50);
  let foothillFar = color(90, 110, 80);
  let foothillMid = color(60, 80, 50);

  let farColor, midColor;

  if (distance < 30) {
    let amt = distance / 30;
    farColor = lerpColor(highCountryFar, canyonFar, amt);
    midColor = lerpColor(highCountryMid, canyonMid, amt);
  } else if (distance < 78) {
    let amt = (distance - 30) / 48;
    farColor = lerpColor(canyonFar, foothillFar, amt);
    midColor = lerpColor(canyonMid, foothillMid, amt);
  } else {
    farColor = foothillFar;
    midColor = foothillMid;
  }

  fill(farColor);
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width; x += 10) {
    let m = distance * 0.05 + map(x, 0, width, 0, 10); 
    let y = noise(m * 0.2) * 150 + 80;
    vertex(x, y);
  }
  vertex(width, height);
  endShape(CLOSE);

  fill(midColor);
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width; x += 10) {
    let m = distance * 0.15 + map(x, 0, width, 0, 10); 
    let y = noise(m * 0.5 + 100) * 150 + 120;
    vertex(x, y);
  }
  vertex(width, height);
  endShape(CLOSE);

  pop();
}

function drawRunner(x, y, isMoving, speed, grade, darkness) {
  push();
  translate(x, y);

  let stride = 0;
  let bob = 0;
  let lean = 0;

  if (isMoving) {
    stride = sin(runCycle); 
    bob = abs(sin(runCycle)) * 4;
    lean = map(grade, -200, 200, -10, 15); 
  }

  translate(0, -bob);
  rotate(radians(lean));

  if (darkness > 50 && raceStarted) {
    push();
    let beamStrength = map(darkness, 50, maxDarkness, 0, 180);
    fill(255, 255, 200, beamStrength); 
    noStroke();
    beginShape();
    vertex(8, -52);   
    vertex(220, -5);  
    vertex(70, 15);   
    endShape(CLOSE);
    pop();
  }

  let skin = color(255, 200, 150);
  let shirt = color(40, 200, 40);
  let shortsColor = color(30); 
  let shoes = color(255, 50, 50);
  let pack = color(100, 150, 200);

  stroke(skin); strokeWeight(5); strokeCap(ROUND);
  line(0, -25, -sin(stride) * 15, -5); 
  noStroke(); fill(shoes);
  ellipse(-sin(stride) * 15, -2, 10, 6);

  stroke(skin); strokeWeight(5);
  line(0, -25, sin(stride) * 15, -5);
  noStroke(); fill(shoes);
  ellipse(sin(stride) * 15, -2, 10, 6);

  stroke(skin); strokeWeight(4);
  line(0, -40, sin(stride) * 15, -25);

  noStroke();
  fill(shirt); rect(-6, -45, 12, 20, 3);
  fill(pack);
  rect(-10, -45, 5, 15, 2); 
  rect(4, -42, 3, 10); 

  noStroke();
  fill(shortsColor); 
  rect(-7, -28, 14, 12, 2); 

  stroke(skin); strokeWeight(4);
  line(0, -40, -sin(stride) * 15, -25);

  noStroke(); fill(skin); circle(0, -52, 14);
  fill(255);
  arc(0, -54, 16, 16, PI, 0); 
  rect(0, -54, 12, 3); 

  pop();
}

function drawDNF(reason) {
    fill(255, 0, 0); stroke(0); strokeWeight(2); textSize(32); textAlign(CENTER);
    text("DNF", width/2, height/2 - 20);
    textSize(24); text(reason, width/2, height/2 + 20);
    drawRestartButton(); 
    noLoop(); 
}

function drawTrail() {
  fill(100, 80, 60);
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width; x += 10) {
    let screenMile = distance + map(x, 100, width, 0, 10);
    let y = getScreenY(screenMile);
    vertex(x, y);
  }
  vertex(width, height);
  endShape(CLOSE);
}

function drawTrackAndFinish() {
  if (distance + 10 > 99.5) {
    let startX = map(99.5, distance, distance + 10, 100, width);
    let drawStartX = max(0, startX);

    push();
    noStroke();
    fill(180, 50, 50); 
    beginShape();
    vertex(drawStartX, height);
    for (let x = drawStartX; x <= width; x += 10) {
       let screenMile = distance + map(x, 100, width, 0, 10);
       if (screenMile >= 99.5) {
          vertex(x, getScreenY(screenMile));
       } else {
          vertex(x, getScreenY(99.5)); 
       }
    }
    vertex(width, height);
    endShape(CLOSE);

    stroke(255); strokeWeight(2); noFill();
    for (let laneOffset = 5; laneOffset <= 25; laneOffset += 10) {
        beginShape();
        for (let x = drawStartX; x <= width; x += 20) {
           let screenMile = distance + map(x, 100, width, 0, 10);
           if (screenMile >= 99.5) {
              vertex(x, getScreenY(screenMile) + laneOffset);
           }
        }
        endShape();
    }

    if (100 >= distance && 100 <= distance + 10) {
       let archX = map(100, distance, distance + 10, 100, width);
       let archY = getScreenY(100);

       noStroke();
       fill(200); 
       rect(archX - 40, archY - 120, 15, 120);
       rect(archX + 25, archY - 120, 15, 120);

       fill(255, 200, 0); 
       rect(archX - 50, archY - 140, 100, 40);

       fill(0); textAlign(CENTER); textSize(12); textStyle(BOLD);
       text("WESTERN", archX, archY - 125);
       text("STATES", archX, archY - 110);
       textStyle(NORMAL);
    }
    pop();
  }
}

function drawEnvironment(currentElev) {
  let canopyColor = color(40, map(currentElev, 1500, 8000, 80, 150), 40);
  let trunkColor = color(100, 70, 40);

  push();
  noStroke();
  
  let startMile = floor((distance - 2) * 5) / 5; 
  let endMile = distance + 11; 
  
  for (let m = startMile; m <= endMile; m += 0.2) {
    if (m >= 99.5) continue; 
    
    let treeSeed = m * 100;
    if (noise(treeSeed) > 0.4) {
      let x = map(m, distance, distance + 10, 100, width);
      let groundY = getScreenY(m);
      
      let treeSize = map(noise(treeSeed + 50), 0, 1, 20, 60); 
      
      fill(trunkColor);
      rect(x, groundY - treeSize * 1.5, treeSize / 4, treeSize * 1.5, 2);
      
      fill(canopyColor);
      let tY = groundY - treeSize * 0.5;
      for (let i = 0; i < 3; i++) {
        let currentWidth = treeSize - (i * (treeSize * 0.25));
        triangle(x + treeSize/8, tY - treeSize * 1.2 - (i * treeSize * 0.4), x - currentWidth/2 + treeSize/8, tY - (i * treeSize * 0.4), x + currentWidth/2 + treeSize/8, tY - (i * treeSize * 0.4));
      }
    }
  }
  pop();
}

function drawAidStation(darkness) {
  for (let i = 0; i < aidStations.length; i++) {
    let station = aidStations[i];
    let m = station.mile;
    
    if (m >= distance - 2 && m <= distance + 10) {
      let stationX = map(m, distance, distance + 10, 100, width);
      let stationY = getScreenY(m);
      
      push();
      noStroke();
      
      let canopyColor = color(255);
      let coolerColor = color(0, 150, 255);

      if (darkness > 50) {
          canopyColor = color(255, 255, 200); 
          coolerColor = color(100, 200, 255); 
      }
      
      fill(canopyColor); 
      quad(stationX - 30, stationY - 30, stationX + 30, stationY - 30, stationX + 20, stationY - 45, stationX - 20, stationY - 45);
      
      fill(lerpColor(color(180), color(0, 0, 30, 200), (darkness > 50 ? 0.3 : 1))); 
      rect(stationX - 28, stationY - 30, 3, 30);
      rect(stationX + 25, stationY - 30, 3, 30);
      
      fill(100, 50, 30); 
      rect(stationX - 15, stationY - 15, 30, 15);
      fill(coolerColor); 
      rect(stationX - 5, stationY - 25, 15, 10, 2);

      fill(canopyColor);
      rect(stationX - 32, stationY - 30, 4, 30);
      rect(stationX + 28, stationY - 30, 4, 30);

      if (darkness > 50) {
          fill(255, 255, 100); 
      } else {
          fill(255); 
      }
      stroke(0); 
      strokeWeight(3); 
      
      textAlign(CENTER); 
      textSize(14); 
      text(station.name, stationX, stationY - 65); 
      
      textSize(12); 
      strokeWeight(2); 
      text(`Mile ${station.mile.toFixed(1)}`, stationX, stationY - 50); 
      
      pop();
    }
  }
}

function displayRhythmBar() {
  fill(50, 50, 50, 150); rect(width/2 - 100, 350, 200, 20);
  fill(0, 255, 0); rect(width/2 - 15, 350, 30, 20);
  rhythmMarker = (sin(frameCount * 0.07) * 90); 
  fill(255); ellipse(width/2 + rhythmMarker, 360, 10, 10);
  fill(255); stroke(0); strokeWeight(2); textAlign(CENTER);
  text("STEEP CLIMB: TAP SPACE ON GREEN TO GAIN MOMENTUM", width/2, 340);
  textAlign(LEFT); noStroke();
}

function displayHUD(currentElev, currentDayMinutes) {
  fill(255, 255, 255, 200); 
  noStroke();
  rect(0, 0, width, 75);

  fill(0); textSize(14);
  
  let h = floor(elapsedMinutes / 60); let m = floor(elapsedMinutes % 60);
  let todH = floor(currentDayMinutes / 60); let todM = floor(currentDayMinutes % 60);
  let ampm = todH >= 12 ? "PM" : "AM";
  let dispH = todH % 12;
  if (dispH === 0) dispH = 12;
  let clockStr = `${dispH}:${nf(todM, 2)} ${ampm}`;

  let currentPaceStr = "--:--";
  if (keyIsDown(RIGHT_ARROW) && raceStarted) {
      let paceM = floor(currentPace);
      let paceS = floor((currentPace % 1) * 60);
      currentPaceStr = paceM + ":" + nf(paceS, 2);
  }

  text(`Mile: ${(distance).toFixed(1)}`, 20, 25);
  text(`Official: ${nf(h, 2)}:${nf(m, 2)}`, 110, 25);
  text(`Clock: ${clockStr}`, 230, 25);
  text(`Pace: ${currentPaceStr} /mi`, 350, 25);
  text(`Elev: ${currentElev.toFixed(0)} ft`, 490, 25);

  if (coreTemp > 103) fill(255, 0, 0); 
  else if (coreTemp > 100) fill(255, 120, 0); 
  else fill(0); 
  text(`Temp: ${coreTemp.toFixed(1)}°F`, 610, 25);
  fill(0); 

  textSize(14);
  
  fill(0); text("Stamina", 20, 55);
  fill(200); rect(80, 43, 100, 12);
  fill(0, 200, 0); rect(80, 43, max(0, stamina), 12);

  fill(0); text("Nausea", 210, 55);
  fill(200); rect(270, 43, 100, 12);
  if (nausea > 75) fill(255, 0, 0); else fill(255, 165, 0); 
  rect(270, 43, min(100, nausea), 12);

  fill(0); text(`Gels: ${gels}/6 (Press 'G')`, 420, 55);
}

function keyPressed() {
  if (!raceStarted) return; 

  let currentElev = getElevationAt(distance);
  let grade = getElevationAt(distance + 0.5) - currentElev; 

  if (key === ' ' && grade > 100) {
    if (abs(rhythmMarker) < 15) {
      powerHikeTimer = 60; stamina = min(100, stamina + 2); 
    } else {
      stamina -= 5; powerHikeTimer = 0; 
    }
  }

  if (key === 'g' || key === 'G') {
    if (gels > 0 && nausea < 100) {
       gels--; stamina = min(100, stamina + 20); nausea += 35; 
    }
  }
}
