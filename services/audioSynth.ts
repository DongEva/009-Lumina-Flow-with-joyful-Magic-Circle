
export class AudioSynth {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.connect(this.ctx.destination);
      this.gainNode.gain.value = 0.3; // Master volume
    } catch (e) {
      console.warn("Web Audio API not supported");
    }
  }

  resume = async () => {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // Plays a random sparkle/chime sound
  playSparkle = () => {
    if (!this.ctx || !this.gainNode) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Random high frequency for sparkle
    const freq = 800 + Math.random() * 1200;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.type = 'sine';
    
    // Envelope
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.gainNode);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  // Plays a deeper drone/hum while drawing
  playDrawHum = (active: boolean) => {
    // Implementing a continuous drone would require keeping track of the oscillator
    // For this simple version, we'll just rely on sparkles for feedback
    if (active) {
       this.playSparkle();
    }
  }

  // The "Cast Spell" sound effect
  playCastEffect = () => {
    if (!this.ctx || !this.gainNode) return;
    
    const t = this.ctx.currentTime;
    
    // 1. Low Boom
    const oscLow = this.ctx.createOscillator();
    const gainLow = this.ctx.createGain();
    oscLow.frequency.setValueAtTime(100, t);
    oscLow.frequency.exponentialRampToValueAtTime(0.01, t + 2.0);
    oscLow.type = 'triangle';
    gainLow.gain.setValueAtTime(0.5, t);
    gainLow.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
    oscLow.connect(gainLow);
    gainLow.connect(this.gainNode);
    oscLow.start();
    oscLow.stop(t + 2);

    // 2. High Chime Chord
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.1 + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 4.0);
      
      osc.connect(gain);
      gain.connect(this.gainNode);
      osc.start();
      osc.stop(t + 4);
    });
  }
}

export const audioSynth = new AudioSynth();
