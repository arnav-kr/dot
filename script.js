
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('gameContainer');

const dotSize = 5, bodyThickness = 10, groundY = 500;
const stickmanParts = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
let animationState = 'dot', frame = 0, animationSpeed = 2;

let character = {
  x: 200, y: groundY - dotSize, vx: 0, vy: 0,
  bounceHeight: 30, walkSpeed: 1, walkDirection: 1, handWave: 0, walkCycle: 0
};

const timeline = {
  dot: { duration: 300, narration: "Once upon a time, there was a lonely dot, bouncing around in the world..." },
  firstLeg: { duration: 200, narration: "The dot grew tired of being round and decided to stretch into a line..." },
  secondLeg: { duration: 200, narration: "A second leg appeared, giving balance and stability..." },
  torso: { duration: 200, narration: "A body emerged, giving the legs something to support..." },
  firstHand: { duration: 150, narration: "An arm appeared, ready to wave hello to the world..." },
  secondHand: { duration: 150, narration: "A second arm joined, making the figure complete..." },
  head: { duration: 200, narration: "Finally, a head comes in and a full stickman was born!" },
  walking: { duration: 300, narration: "The stickman enjoyed his new form, walking proudly..." },
  danger: { duration: 200, narration: "But a sudden danger approached it..." },
  hangman: { duration: 100, narration: "Help! Guess the word to save the stickman!" }
};
let currentScene = 'dot', timer = 0, sceneQueue = ['firstLeg', 'secondLeg', 'torso', 'firstHand', 'secondHand', 'head', 'walking', 'danger', 'hangman'];

const words = ['JAVASCRIPT', 'CANVAS', 'ANIMATION', 'STICKMAN', 'EVOLUTION', 'BOUNCING', 'ADVENTURE'];
let currentWord = '', guessedLetters = [], wrongGuesses = 0, maxWrongGuesses = 6, gameActive = false, gameWon = false, gameLost = false;
let gallowsProgress = 0, ropeLength = 0, stickmanHanging = false;

let resetting = false;
let shrinkingHeadRadius = null;
let shrinkingHeadX = null, shrinkingHeadY = null;
let moveToStart = false;
let endingPause = false;

function drawLine(x1, y1, x2, y2, color = '#000', width = bodyThickness) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawCircle(x, y, r, color = '#000', fill = false, width = bodyThickness) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}
function drawGround() { drawLine(0, groundY, canvas.width, groundY, '#000', 1); }

function drawDot() { drawCircle(character.x, character.y, dotSize, '#000', true); }

function drawLeg(side = 1) {
  let offset = Math.sin(character.walkCycle * 0.1) * 15 * side;
  drawLine(character.x, character.y, character.x + 20 * side + offset, character.y + 40);
}

function drawLegs() { drawLeg(-1); drawLeg(1); }

function drawTorso() { drawLegs(); drawLine(character.x, character.y - dotSize, character.x, character.y - dotSize / 2 - 40); }

function drawHand(side = 1, waving = false) {
  let torsoLen = 40, armLen = 35, armY = character.y - dotSize - torsoLen * 0.35;
  let waveOffset = waving ? Math.sin(character.handWave * 0.2) * 20 : 0;
  drawLine(character.x, armY, character.x + armLen * side, armY - waveOffset * (side > 0 ? 1 : 0));
}

function drawHands(both = false) { drawTorso(); drawHand(1, true); if (both) drawHand(-1); }

function drawHead() { drawHands(true); let torsoLen = 40, headRadius = 25, headY = character.y - dotSize - torsoLen - headRadius; drawCircle(character.x, headY, headRadius); }

function drawGallows() {
  let x = 600, y = groundY, postH = 150, beamW = 100;
  if (gallowsProgress > 0) drawLine(x - 30, y, x + 30, y, '#8B4513', 8);
  if (gallowsProgress > 1) drawLine(x, y, x, y - postH, '#8B4513', 8);
  if (gallowsProgress > 2) drawLine(x, y - postH, x + beamW, y - postH, '#8B4513', 8);
  if (gallowsProgress > 3) drawLine(x + beamW, y - postH, x + beamW, y - postH + ropeLength, '#8B4513', 4);
}

function drawHangman(showHead = false) {
  if (!stickmanHanging && !showHead) return;
  let x = 700, y = groundY - 120, r = 25, torsoLen = 40, armLen = 35, legLen = 40, spread = 20;
  let parts = maxWrongGuesses - wrongGuesses;
  if (parts > 0 || showHead) drawCircle(x, y, r);
  if (parts > 1) { drawLine(x, y + r, x, y + r + torsoLen); drawCircle(x, y + r + torsoLen - dotSize, dotSize, '#000', true); }
  if (parts > 2) drawLine(x, y + r + torsoLen * 0.35, x - armLen, y + r + torsoLen * 0.35);
  if (parts > 3) drawLine(x, y + r + torsoLen * 0.35, x + armLen, y + r + torsoLen * 0.35);
  if (parts > 4) drawLine(x, y + r + torsoLen, x - spread, y + r + torsoLen + legLen);
  if (parts > 5) drawLine(x, y + r + torsoLen, x + spread, y + r + torsoLen + legLen);
}

function updateCharacterMovement() {
  if (!['danger', 'hangman'].includes(currentScene)) character.walkCycle++;

  if (currentScene === 'dot') {
    character.vy += 0.5;
    character.y += character.vy;
    if (character.y > groundY - dotSize) {
      character.y = groundY - dotSize;
      character.vy = -8;
    }
    character.x += character.walkSpeed * character.walkDirection;
    if (character.x < 50 || character.x > canvas.width - 50) character.walkDirection *= -1;
  } else if ({
    'firstLeg': 1, 'secondLeg': 1, 'torso': 1, 'firstHand': 1, 'secondHand': 1, 'head': 1, 'walking': 1
  }[currentScene]) {
    character.x += character.walkSpeed * character.walkDirection;
    if (character.x < 100 || character.x > 500) character.walkDirection *= -1;
    character.y = groundY - dotSize - 40;
  }
  if (['firstHand', 'secondHand'].includes(currentScene)) character.handWave++;
}

let narration = timeline[currentScene].narration;
let showNarration = false;
let narrationTimer = null;

function updateNarration(text) {
  narration = text;
  showNarration = true;
  if (narrationTimer) clearTimeout(narrationTimer);
  narrationTimer = setTimeout(() => { showNarration = false; }, 3000);
}

function drawNarration() {
  if (!showNarration || !narration) return;
  ctx.save();
  ctx.font = '20px Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#000';
  let x = canvas.width - 30, y = 30;
  ctx.fillText(narration, x, y);
  ctx.restore();
}

function nextScene() {
  if (sceneQueue.length > 0) {
    currentScene = sceneQueue.shift();
    timer = 0;
    if (timeline[currentScene]) updateNarration(timeline[currentScene].narration);
    if (currentScene === 'danger') gallowsProgress = ropeLength = 0;
    if (currentScene === 'hangman') startHangman();
  }
}

function startHangman() {
  currentWord = words[Math.floor(Math.random() * words.length)];
  guessedLetters = [];
  wrongGuesses = 0;
  gameActive = true;
  gameWon = gameLost = false;
  character.x = 700; character.y = groundY - 120; stickmanHanging = true;
  setTimeout(() => { gameContainer.style.display = 'block'; setupGame(); }, 1000);
}

function setupGame() {
  updateWordDisplay();
  const alphabetDiv = document.getElementById('alphabet');
  alphabetDiv.innerHTML = '';
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i);
    const btn = document.createElement('button');
    btn.className = 'letter-btn';
    btn.textContent = letter;
    btn.onclick = () => guessLetter(letter);
    alphabetDiv.appendChild(btn);
  }
}

function updateWordDisplay() {
  const wordDiv = document.getElementById('wordDisplay');
  wordDiv.textContent = currentWord.split('').map(l => guessedLetters.includes(l) ? l : '_').join(' ');
}

function guessLetter(letter) {
  if (!gameActive || guessedLetters.includes(letter)) return;
  guessedLetters.push(letter);
  document.querySelectorAll('.letter-btn').forEach(btn => {
    if (btn.textContent === letter) btn.classList.add('used');
  });
  if (currentWord.includes(letter)) {
    updateWordDisplay();
    if (currentWord.split('').every(char => guessedLetters.includes(char))) {
      gameWon = true; gameActive = false;
      document.getElementById('gameStatus').innerHTML = '<h3 style="color: green;">You saved the stickman!</h3>';
      setTimeout(happyEnding, 2000);
    }
  } else {
    wrongGuesses++;
    if (wrongGuesses >= maxWrongGuesses) {
      gameLost = true; gameActive = false;
      sadEnding();
    }
  }
}
function happyEnding() {
  gameContainer.style.display = 'none';
  stickmanHanging = false;
  updateNarration("Thank you for saving me! I can continue my journey!");
  character.x = 200; character.y = groundY - dotSize - 40; currentScene = 'walking';
  setTimeout(() => updateNarration("And the Stickman lived happily ever after... THE END"), 3000);
}
function sadEnding() {
  gameContainer.style.display = 'none';
  shrinkingHeadRadius = 25;
  shrinkingHeadX = 700;
  shrinkingHeadY = groundY - 120;
  resetting = true;
  moveToStart = false;
  stickmanHanging = false;
}
function animateResetDot() {
  if (shrinkingHeadRadius > dotSize) {
    shrinkingHeadRadius -= 0.25;
    if (shrinkingHeadRadius < dotSize) shrinkingHeadRadius = dotSize;
  } else if (!moveToStart) {
    moveToStart = true;
  }
  if (moveToStart) {
    let dx = 200 - shrinkingHeadX;
    let dy = (groundY - dotSize) - shrinkingHeadY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    let speed = 2.5;
    if (dist > speed) {
      shrinkingHeadX += dx / dist * speed;
      shrinkingHeadY += dy / dist * speed;
    } else {
      shrinkingHeadX = 200;
      shrinkingHeadY = groundY - dotSize;
      resetting = false;
      endingPause = true;
      updateNarration("The stickman returns to his humble beginnings...");
      setTimeout(restartMovie, 1800);
      return;
    }
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();
  drawCircle(shrinkingHeadX, shrinkingHeadY, shrinkingHeadRadius, '#000', true);
}

function restartMovie() {
  endingPause = false;
  currentScene = 'dot'; timer = 0;
  sceneQueue = ['firstLeg', 'secondLeg', 'torso', 'firstHand', 'secondHand', 'head', 'walking', 'danger', 'hangman'];
  character = { x: 200, y: groundY - dotSize, vx: 0, vy: 0, bounceHeight: 30, walkSpeed: 1, walkDirection: 1, handWave: 0, walkCycle: 0 };
  gallowsProgress = ropeLength = 0; stickmanHanging = false;
  gameContainer.style.display = 'none';
  updateNarration(timeline[currentScene].narration);
}

function draw() {
  if (resetting) {
    animateResetDot();
    return;
  }
  if (endingPause) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGround();
    drawCircle(200, groundY - dotSize, dotSize, '#000', true);
    drawNarration();
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGround();
  switch (currentScene) {
    case 'dot': drawDot(); break;
    case 'firstLeg': drawLeg(1); break;
    case 'secondLeg': drawLegs(); break;
    case 'torso': drawTorso(); break;
    case 'firstHand': drawHands(); break;
    case 'secondHand': drawHands(true); break;
    case 'head': case 'walking': drawHead(); break;
    case 'danger':
      drawHead(); drawGallows();
      if (timer % 30 === 0 && gallowsProgress < 4) gallowsProgress++;
      if (gallowsProgress === 4) ropeLength = Math.min(ropeLength + 1, 50);
      break;
    case 'hangman':
      drawGallows();
      drawHangman();
      break;
  }
  drawNarration();
  updateCharacterMovement();
  timer++;
  if (timeline[currentScene] && timer >= timeline[currentScene].duration) nextScene();
}

function animate() { draw(); requestAnimationFrame(animate); }

updateNarration(timeline[currentScene].narration);
animate();