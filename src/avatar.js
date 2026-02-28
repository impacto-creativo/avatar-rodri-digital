import * as THREE from 'three';

/**
 * Avatar: constructs and animates a humanoid figure using Three.js primitives.
 * Each body part is stored for individual animation.
 */
export class Avatar {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    // Animation state
    this.emotion = 'neutral';
    this.state = 'idle';
    this.isSpeaking = false;
    this.speakTimer = 0;
    this.idleTimer = 0;
    this.gestureTimer = 0;
    this.currentGesture = 'none';
    this.blinkTimer = Math.random() * 3;
    this._blinkTimeoutId = null;

    this._buildBody();
  }

  // ─── Construction ──────────────────────────────────────────────────────────

  _mat(color, options = {}) {
    return new THREE.MeshStandardMaterial({ color, ...options });
  }

  _buildBody() {
    const skinColor = 0xf5c5a3;
    const shirtColor = 0x2255aa;
    const pantsColor = 0x223366;
    const hairColor = 0x3d2b1f;

    // --- Torso ---
    const torsoGeo = new THREE.CylinderGeometry(0.38, 0.32, 1.0, 12);
    this.torso = new THREE.Mesh(torsoGeo, this._mat(shirtColor));
    this.torso.position.y = 0;
    this.group.add(this.torso);

    // --- Pelvis/Hips ---
    const hipsGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.3, 12);
    this.hips = new THREE.Mesh(hipsGeo, this._mat(pantsColor));
    this.hips.position.y = -0.65;
    this.group.add(this.hips);

    // --- Neck ---
    const neckGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.25, 10);
    this.neck = new THREE.Mesh(neckGeo, this._mat(skinColor));
    this.neck.position.y = 0.62;
    this.group.add(this.neck);

    // --- Head group (for nodding / emotion pivoting) ---
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.87;
    this.group.add(this.headGroup);

    // Head
    const headGeo = new THREE.SphereGeometry(0.28, 20, 20);
    this.head = new THREE.Mesh(headGeo, this._mat(skinColor));
    this.headGroup.add(this.head);

    // Hair
    const hairGeo = new THREE.SphereGeometry(0.3, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.55);
    this.hair = new THREE.Mesh(hairGeo, this._mat(hairColor));
    this.hair.position.y = 0.04;
    this.headGroup.add(this.hair);

    // Eyes (left & right from avatar's perspective)
    this._buildEyes(skinColor);

    // Mouth / expression
    this._buildMouth();

    // Eyebrows
    this._buildEyebrows(hairColor);

    // --- Arms ---
    this._buildArm('left', skinColor, shirtColor);
    this._buildArm('right', skinColor, shirtColor);

    // --- Legs ---
    this._buildLeg('left', skinColor, pantsColor);
    this._buildLeg('right', skinColor, pantsColor);

    // Position whole avatar slightly above ground
    this.group.position.y = 0;
  }

  _buildEyes() {
    const eyeWhiteGeo = new THREE.SphereGeometry(0.065, 12, 12);
    const eyeIrisGeo = new THREE.SphereGeometry(0.04, 10, 10);
    const eyePupilGeo = new THREE.SphereGeometry(0.022, 8, 8);

    const whiteM = this._mat(0xffffff);
    const irisM = this._mat(0x2266cc);
    const pupilM = this._mat(0x111111);

    // Eyelid geometry for blinking
    const lidGeo = new THREE.SphereGeometry(0.067, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const lidM = this._mat(0xf5c5a3);

    const positions = [
      { x: -0.10, side: 'L' },
      { x:  0.10, side: 'R' },
    ];

    this.eyes = {};
    positions.forEach(({ x, side }) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(x, 0.05, 0.24);

      const white = new THREE.Mesh(eyeWhiteGeo, whiteM.clone());
      const iris = new THREE.Mesh(eyeIrisGeo, irisM.clone());
      iris.position.z = 0.03;
      const pupil = new THREE.Mesh(eyePupilGeo, pupilM.clone());
      pupil.position.z = 0.055;

      const lid = new THREE.Mesh(lidGeo, lidM.clone());
      lid.rotation.x = Math.PI; // flip so it covers from top
      lid.position.y = 0.065;
      lid.scale.y = 0; // start open

      eyeGroup.add(white, iris, pupil, lid);
      this.headGroup.add(eyeGroup);
      this.eyes[side] = { group: eyeGroup, lid, iris, pupil };
    });
  }

  _buildMouth() {
    // Mouth line (neutral)
    const mouthGeo = new THREE.TorusGeometry(0.06, 0.012, 8, 20, Math.PI);
    this.mouth = new THREE.Mesh(mouthGeo, this._mat(0xc06060));
    this.mouth.position.set(0, -0.1, 0.26);
    this.mouth.rotation.z = Math.PI; // neutral flat
    this.headGroup.add(this.mouth);

    // Teeth (shown when speaking)
    const teethGeo = new THREE.BoxGeometry(0.1, 0.025, 0.01);
    this.teeth = new THREE.Mesh(teethGeo, this._mat(0xffffff));
    this.teeth.position.set(0, -0.095, 0.275);
    this.teeth.visible = false;
    this.headGroup.add(this.teeth);
  }

  _buildEyebrows(color) {
    const browGeo = new THREE.BoxGeometry(0.09, 0.015, 0.015);
    const browM = this._mat(color);

    this.eyebrows = {};
    [{ x: -0.10, side: 'L' }, { x: 0.10, side: 'R' }].forEach(({ x, side }) => {
      const brow = new THREE.Mesh(browGeo, browM.clone());
      brow.position.set(x, 0.135, 0.255);
      this.headGroup.add(brow);
      this.eyebrows[side] = brow;
    });
  }

  _buildArm(side, skinColor, shirtColor) {
    const dir = side === 'left' ? -1 : 1;
    const armGroup = new THREE.Group();
    armGroup.position.set(dir * 0.48, 0.3, 0);
    this.group.add(armGroup);

    // Upper arm
    const upperGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.5, 10);
    const upper = new THREE.Mesh(upperGeo, this._mat(shirtColor));
    upper.position.y = -0.25;
    armGroup.add(upper);

    // Forearm
    const foreGroup = new THREE.Group();
    foreGroup.position.y = -0.5;
    armGroup.add(foreGroup);

    const foreGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.42, 10);
    const fore = new THREE.Mesh(foreGeo, this._mat(skinColor));
    fore.position.y = -0.21;
    foreGroup.add(fore);

    // Hand
    const handGeo = new THREE.SphereGeometry(0.08, 10, 10);
    const hand = new THREE.Mesh(handGeo, this._mat(skinColor));
    hand.position.y = -0.46;
    foreGroup.add(hand);

    const key = side === 'left' ? 'L' : 'R';
    this[`arm${key}`] = { group: armGroup, fore: foreGroup, hand };
  }

  _buildLeg(side, skinColor, pantsColor) {
    const dir = side === 'left' ? -1 : 1;
    const legGroup = new THREE.Group();
    legGroup.position.set(dir * 0.17, -0.8, 0);
    this.group.add(legGroup);

    // Thigh
    const thighGeo = new THREE.CylinderGeometry(0.12, 0.10, 0.55, 10);
    const thigh = new THREE.Mesh(thighGeo, this._mat(pantsColor));
    thigh.position.y = -0.27;
    legGroup.add(thigh);

    // Shin group
    const shinGroup = new THREE.Group();
    shinGroup.position.y = -0.55;
    legGroup.add(shinGroup);

    const shinGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.5, 10);
    const shin = new THREE.Mesh(shinGeo, this._mat(skinColor));
    shin.position.y = -0.25;
    shinGroup.add(shin);

    // Foot
    const footGeo = new THREE.BoxGeometry(0.12, 0.08, 0.22);
    const foot = new THREE.Mesh(footGeo, this._mat(0x222222));
    foot.position.set(0, -0.54, 0.05);
    shinGroup.add(foot);

    const key = side === 'left' ? 'L' : 'R';
    this[`leg${key}`] = { group: legGroup, shin: shinGroup, foot };
  }

  // ─── Public control API ─────────────────────────────────────────────────────

  setEmotion(emotion) {
    this.emotion = emotion;
    this._applyEmotion(emotion);
  }

  speak(text, durationMs = 4000) {
    this.isSpeaking = true;
    this.speakTimer = durationMs / 1000;
    this.teeth.visible = true;
    this.state = 'speaking';
  }

  stopSpeaking() {
    this.isSpeaking = false;
    this.speakTimer = 0;
    this.teeth.visible = false;
    if (this.state === 'speaking') this.state = 'idle';
  }

  triggerGesture(gesture, durationMs = 2000) {
    this.currentGesture = gesture;
    this.gestureTimer = durationMs / 1000;
    this.state = gesture;
  }

  // ─── Emotion expressions ────────────────────────────────────────────────────

  _applyEmotion(emotion) {
    // Reset defaults
    this.mouth.rotation.z = Math.PI;
    this.mouth.scale.set(1, 1, 1);
    this.eyebrows.L.position.y = 0.135;
    this.eyebrows.R.position.y = 0.135;
    this.eyebrows.L.rotation.z = 0;
    this.eyebrows.R.rotation.z = 0;

    switch (emotion) {
      case 'happy':
        // Smile: flip torus so arc goes up
        this.mouth.rotation.z = 0;
        this.mouth.scale.set(1.2, 1.1, 1);
        this.eyebrows.L.position.y = 0.145;
        this.eyebrows.R.position.y = 0.145;
        break;
      case 'sad':
        // Mouth stays down (default), eyebrows angled down-inward
        this.mouth.scale.set(0.9, 0.8, 1);
        this.eyebrows.L.rotation.z =  0.3;
        this.eyebrows.R.rotation.z = -0.3;
        this.eyebrows.L.position.y = 0.12;
        this.eyebrows.R.position.y = 0.12;
        break;
      case 'surprised':
        this.mouth.scale.set(0.5, 1.5, 1);
        this.eyebrows.L.position.y = 0.16;
        this.eyebrows.R.position.y = 0.16;
        break;
      case 'angry':
        this.eyebrows.L.rotation.z = -0.35;
        this.eyebrows.R.rotation.z =  0.35;
        this.eyebrows.L.position.y = 0.12;
        this.eyebrows.R.position.y = 0.12;
        this.mouth.scale.set(0.85, 0.7, 1);
        break;
      case 'thinking':
        this.eyebrows.L.position.y = 0.145;
        this.eyebrows.R.position.y = 0.125;
        this.eyebrows.L.rotation.z = -0.1;
        this.mouth.scale.set(0.8, 0.9, 1);
        break;
      // neutral: already reset above
    }
  }

  // ─── Animation update loop ──────────────────────────────────────────────────

  update(dt) {
    this.idleTimer += dt;
    this.blinkTimer -= dt;

    // Idle breathing / subtle sway
    const breathe = Math.sin(this.idleTimer * 1.2) * 0.012;
    this.torso.scale.y = 1 + breathe;
    this.group.position.y = Math.sin(this.idleTimer * 0.8) * 0.008;

    // Idle arm swing
    this.armL.group.rotation.x = Math.sin(this.idleTimer * 0.8) * 0.06;
    this.armR.group.rotation.x = Math.sin(this.idleTimer * 0.8 + Math.PI) * 0.06;

    // Blinking
    if (this.blinkTimer <= 0) {
      this._blink();
      this.blinkTimer = 2.5 + Math.random() * 3;
    }

    // Speaking jaw animation
    if (this.isSpeaking) {
      this.speakTimer -= dt;
      const jawAngle = Math.abs(Math.sin(this.idleTimer * 12)) * 0.06;
      this.mouth.position.y = -0.1 - jawAngle;
      this.teeth.position.y = -0.095 - jawAngle * 0.5;
      if (this.speakTimer <= 0) this.stopSpeaking();
    } else {
      this.mouth.position.y = -0.1;
      this.teeth.position.y = -0.095;
    }

    // Gesture animations
    if (this.gestureTimer > 0) {
      this.gestureTimer -= dt;
      this._animateGesture(this.currentGesture, dt);
      if (this.gestureTimer <= 0) {
        this._resetGesture();
        this.currentGesture = 'none';
        this.state = 'idle';
      }
    } else {
      this._idleGesture();
    }

    // Head slight look-around
    this.headGroup.rotation.y = Math.sin(this.idleTimer * 0.3) * 0.08;
    this.headGroup.rotation.x = Math.sin(this.idleTimer * 0.4) * 0.03;
  }

  _blink() {
    clearTimeout(this._blinkTimeoutId);
    ['L', 'R'].forEach(side => { this.eyes[side].lid.scale.y = 1; });
    this._blinkTimeoutId = setTimeout(() => {
      ['L', 'R'].forEach(side => { this.eyes[side].lid.scale.y = 0; });
      this._blinkTimeoutId = null;
    }, 120);
  }

  dispose() {
    clearTimeout(this._blinkTimeoutId);
  }

  _animateGesture(gesture, dt) {
    switch (gesture) {
      case 'wave':
        this.armR.group.rotation.x = -1.2;
        this.armR.fore.rotation.z = Math.sin(this.idleTimer * 8) * 0.4;
        break;
      case 'nod':
        this.headGroup.rotation.x = Math.sin(this.idleTimer * 6) * 0.2;
        break;
      case 'shake_head':
        this.headGroup.rotation.y = Math.sin(this.idleTimer * 7) * 0.25;
        break;
      case 'thumbs_up':
        this.armR.group.rotation.x = -0.8;
        this.armR.fore.rotation.x = 0.5;
        break;
      case 'point':
        this.armR.group.rotation.x = -1.0;
        this.armR.fore.rotation.x = -0.3;
        break;
    }
  }

  _idleGesture() {
    // Soft return to rest
    const lerpFactor = 0.05;
    this.armL.group.rotation.x += (Math.sin(this.idleTimer * 0.8) * 0.06 - this.armL.group.rotation.x) * lerpFactor;
    this.armR.group.rotation.x += (Math.sin(this.idleTimer * 0.8 + Math.PI) * 0.06 - this.armR.group.rotation.x) * lerpFactor;
    this.armR.fore.rotation.z += (0 - this.armR.fore.rotation.z) * lerpFactor;
    this.armR.fore.rotation.x += (0 - this.armR.fore.rotation.x) * lerpFactor;
  }

  _resetGesture() {
    this.armR.group.rotation.x = 0;
    this.armR.fore.rotation.z = 0;
    this.armR.fore.rotation.x = 0;
    this.headGroup.rotation.x = 0;
  }
}
