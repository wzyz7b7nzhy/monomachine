// /static/js/sequencer.js
export class Sequencer {
    constructor(tracks = 6, steps = 16, patterns = 8) {
      this.tracks = tracks;
      this.steps = steps;
      this.currentStep = 0;
      this.isPlaying = false;
      this.tempo = 120;
      this.interval = null;
  
      // Initialize track data
      this.trackData = Array.from({ length: tracks }, () =>
        Array.from({ length: steps }, () => ({ active: false, freq: 440, volume: 0.5, oscType: 'sawtooth' }))
      );
  
      // Initialize pattern memory
      this.patternMemory = Array.from({ length: patterns }, () =>
        Array.from({ length: tracks }, () =>
          Array.from({ length: steps }, () => ({ active: false, freq: 440, volume: 0.5, oscType: 'sawtooth' }))
        )
      );
  
      this.currentPattern = 0;
      this.patternQueue = []; // for chaining multiple patterns
      this.onStepCallback = null;
    }
  
    toggleStep(trackIndex, stepIndex) {
      const step = this.trackData[trackIndex][stepIndex];
      step.active = !step.active;
    }
  
    setStepParameter(trackIndex, stepIndex, param, value) {
      if (this.trackData[trackIndex][stepIndex][param] !== undefined) {
        this.trackData[trackIndex][stepIndex][param] = value;
      }
    }
  
    setTempo(bpm) {
      this.tempo = bpm;
      if (this.isPlaying) {
        this.stop();
        this.start();
      }
    }
  
    start() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      const intervalMs = (60 / this.tempo) * 1000 / 4; // 16th notes
  
      this.interval = setInterval(() => {
        this.trackData.forEach((track, trackIndex) => {
          const step = track[this.currentStep];
          if (this.onStepCallback) this.onStepCallback(trackIndex, this.currentStep, step);
        });
  
        this.currentStep++;
  
        if (this.currentStep >= this.steps) {
          this.currentStep = 0;
  
          // If pattern queue exists, move to next pattern
          if (this.patternQueue.length > 0) {
            const nextPattern = this.patternQueue.shift();
            this.loadPattern(nextPattern);
          }
        }
      }, intervalMs);
    }
  
    stop() {
      this.isPlaying = false;
      clearInterval(this.interval);
      this.currentStep = 0;
    }
  
    reset() {
      this.trackData.forEach(track =>
        track.forEach(step => {
          step.active = false;
          step.freq = 440;
          step.volume = 0.5;
          step.oscType = 'sawtooth';
        })
      );
      this.currentStep = 0;
    }
  
    // Load a pattern from memory into trackData
    loadPattern(patternIndex) {
      if (patternIndex >= 0 && patternIndex < this.patternMemory.length) {
        this.trackData = JSON.parse(JSON.stringify(this.patternMemory[patternIndex]));
        this.currentPattern = patternIndex;
      }
    }
  
    // Save current trackData into a pattern memory slot
    savePattern(patternIndex) {
      if (patternIndex >= 0 && patternIndex < this.patternMemory.length) {
        this.patternMemory[patternIndex] = JSON.parse(JSON.stringify(this.trackData));
      }
    }
  
    // Queue patterns for chaining
    queuePatterns(patternIndices) {
      this.patternQueue = [...patternIndices];
    }
  }

  const sequencer = {
    isPlaying: false,
    currentStep: 0,
    tempo: 120,
    _interval: null,
    onStepCallback: null,
  
    start() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      const stepDuration = (60 / this.tempo) / 4 * 1000;
      this._interval = setInterval(() => {
        if (this.onStepCallback) this.onStepCallback(this.currentStep);
        this.currentStep = (this.currentStep + 1) % 16;
      }, stepDuration);
    },
  
    stop() {
      this.isPlaying = false;
      clearInterval(this._interval);
      this._interval = null;
      this.currentStep = 0;
    }
  };
  
  export { sequencer };