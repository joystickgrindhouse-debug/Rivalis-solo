/* solo_script.txt - save as solo.js when renaming. Depends on firebase_config.txt (firebase.js) being present as module */

import { auth, db } from './firebase_config.txt'; // when saving, rename to './firebase.js'
import { doc, getDoc, setDoc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const videoElement = document.getElementById('cameraFeed');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');
const startBtn = document.getElementById('startBtn');
const cardDisplay = document.getElementById('cardDisplay');
const repDisplay = document.getElementById('repDisplay');
const diceDisplay = document.getElementById('diceDisplay');

let repCount = 0;
let totalReps = 0;
let diceCount = 0;
let currentTarget = 0;
let currentExercise = '';
let lastPoseDown = false;
let poseActive = false;

// Utility: show toast
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(()=> t.style.display = 'none', 1800);
}

// Draw random card
function drawCard() {
  const suits = ['Arms','Legs','Core','Cardio'];
  const values = [5,8,10,12,15];
  const suit = suits[Math.floor(Math.random()*suits.length)];
  const value = values[Math.floor(Math.random()*values.length)];
  currentExercise = suit;
  currentTarget = value;
  repCount = 0;
  cardDisplay.innerHTML = `🃏 ${suit} — ${value} reps`;
  repDisplay.innerHTML = `Reps: ${repCount} / ${currentTarget}`;
}

// Save banked dice to Firestore
async function saveBankedDice() {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, 'users', user.uid, 'stats', 'progress');
  await setDoc(ref, {
    totalReps: totalReps,
    bankedDice: increment(0) // placeholder; we update below
  }, { merge: true });
  // increment properly
  await updateDoc(ref, { bankedDice: increment(0) }).catch(()=>{});
}

// Handle earned dice (increment in Firestore)
async function earnDice() {
  diceCount++;
  diceDisplay.innerHTML = `🎲 Dice Banked: ${diceCount}`;
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, 'users', user.uid, 'stats', 'progress');
  await updateDoc(ref, { bankedDice: increment(1), totalReps: totalReps }).catch(async (e)=>{
    // if doc missing create it
    await setDoc(ref, { bankedDice: diceCount, totalReps: totalReps }, { merge: true });
  });
  showToast('🎲 +1 Dice earned!');
}

// Calculate angle helper
function angle(a,b,c) {
  const AB = { x: b.x - a.x, y: b.y - a.y };
  const CB = { x: b.x - c.x, y: b.y - c.y };
  const dot = (AB.x*CB.x + AB.y*CB.y);
  const mag = Math.sqrt((AB.x*AB.x+AB.y*AB.y)*(CB.x*CB.x+CB.y*CB.y));
  if (mag === 0) return 0;
  const cos = dot/mag;
  return Math.acos(Math.min(1,Math.max(-1,cos))) * (180/Math.PI);
}

// MediaPipe results handler
function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0,0,canvasElement.width,canvasElement.height);
  if (results.image) canvasCtx.drawImage(results.image,0,0,canvasElement.width,canvasElement.height);
  if (!results.poseLandmarks) { canvasCtx.restore(); return; }

  // draw pose
  if (window.drawConnectors) {
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color:'#FF0044', lineWidth:2});
    drawLandmarks(canvasCtx, results.poseLandmarks, {color:'#FF0044', lineWidth:1});
  }

  // Simple rep detection logic: use shoulder-elbow-wrist angle for arms (push-up-ish)
  const lm = results.poseLandmarks;
  const leftShoulder = lm[11], leftElbow = lm[13], leftWrist = lm[15];
  const rightShoulder = lm[12], rightElbow = lm[14], rightWrist = lm[16];

  // average elbow angle
  const leftAngle = angle(leftShoulder, leftElbow, leftWrist);
  const rightAngle = angle(rightShoulder, rightElbow, rightWrist);
  const avgElbow = (leftAngle + rightAngle) / 2;

  // consider 'down' when elbow angle < 100, 'up' when > 160
  const isDown = avgElbow < 100;
  if (!poseActive) { canvasCtx.restore(); return; }

  if (isDown && !lastPoseDown) {
    lastPoseDown = true;
  } else if (!isDown && lastPoseDown) {
    // completed rep
    lastPoseDown = false;
    repCount++;
    totalReps++;
    repDisplay.innerHTML = `Reps: ${repCount} / ${currentTarget}`;
    if (totalReps % 30 === 0) {
      earnDice();
    }
    if (repCount >= currentTarget) {
      // card complete: quick surge + next card
      showToast('Card Complete! Drawing next...');
      setTimeout(()=> drawCard(), 900);
    }
  }

  canvasCtx.restore();
}

// Initialize MediaPipe pose + camera
async function initPoseAndCamera() {
  // show elements
  document.getElementById('cameraFeed').style.display = 'block';
  document.getElementById('output').style.display = 'block';
  // create pose
  const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });
  pose.onResults(onResults);

  const camera = new CameraUtils.Camera(videoElement, {
    onFrame: async () => await pose.send({ image: videoElement }),
    width: 640, height: 480
  });
  await camera.start();
  poseActive = true;
  document.getElementById('cameraStatus').innerText = '✅ Camera Active — start moving!';
}

// Start button
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  await initPoseAndCamera();
  drawCard();
  startBtn.style.display = 'none';
});
