
class SoundService {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicOsc: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;
  private isMusicPlaying = false;

  private init() {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.connect(this.audioCtx.destination);
    this.masterGain.gain.value = 0.5;
  }

  public async resume() {
    this.init();
    if (this.audioCtx?.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  public playJump() {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.1);
  }

  public playDeath() {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(20, this.audioCtx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.5);
  }

  public playMilestone() {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, this.audioCtx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.50, this.audioCtx.currentTime + 0.2); // C6
    
    gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.3);
  }

  public startMusic() {
    if (!this.audioCtx || this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    
    const playNote = (freq: number, time: number, duration: number) => {
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0.03, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
      
      // Simple lowpass filter for synth feel
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, time);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(time);
      osc.stop(time + duration);
    };

    const notes = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83]; // A, A, C, D, A, A, E, D
    let nextNoteTime = this.audioCtx.currentTime;
    
    const scheduleNotes = () => {
      while (nextNoteTime < this.audioCtx!.currentTime + 2) {
        notes.forEach((freq, i) => {
          playNote(freq, nextNoteTime + i * 0.25, 0.2);
        });
        nextNoteTime += 2;
      }
    };

    const interval = setInterval(() => {
      if (!this.isMusicPlaying) {
        clearInterval(interval);
        return;
      }
      scheduleNotes();
    }, 1000);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
  }
}

export const soundService = new SoundService();
