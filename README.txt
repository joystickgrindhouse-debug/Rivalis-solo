Rivalis Solo Mode MVP (CDN-based)

Files (these .txt files contain the source — rename to correct extensions when saving):
- solo_index.txt -> rename to index.html
- solo_style.txt -> rename to solo.css
- solo_script.txt -> rename to solo.js
- firebase_config.txt -> rename to firebase.js
- manifest.txt -> optional app metadata
- README.txt -> this file

Instructions:
1. Create folder 'solo' and place assets/Solo.png in appropriate path.
2. Save each .txt file with the correct extension (see mapping above).
3. Host on HTTPS (Netlify/Replit) for camera access.
4. Open index.html, click 'Start Workout'. Allow camera permission.
5. The app will draw a card, use MediaPipe Pose to detect reps, bank dice every 30 total reps, and auto-draw next card when target reached.

Notes:
- The firebase file includes your provided credentials. Keep this private in production.
- The pose rep detection uses a basic elbow-angle method (arms). You can extend for squats/core with different keypoints.
