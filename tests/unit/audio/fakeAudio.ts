/** A minimal fake BaseAudioContext: enough of the Web Audio surface for the engine to build and schedule. */
export class FakeParam {
  value = 0;
  readonly events: [string, number, number][] = [];
  maxValue = 0;
  private note(kind: string, v: number, t: number): this {
    if (!Number.isFinite(v) || !Number.isFinite(t)) throw new Error(`non-finite ${kind} ${v} @ ${t}`);
    if (kind === 'exp' && v <= 0) throw new Error('exponential ramp to <= 0');
    this.events.push([kind, v, t]);
    this.maxValue = Math.max(this.maxValue, v);
    return this;
  }
  setValueAtTime(v: number, t: number) { return this.note('set', v, t); }
  linearRampToValueAtTime(v: number, t: number) { return this.note('lin', v, t); }
  exponentialRampToValueAtTime(v: number, t: number) { return this.note('exp', v, t); }
  setTargetAtTime(v: number, t: number, _tc: number) { return this.note('target', v, t); }
  cancelScheduledValues(_t: number) { return this; }
}

export class FakeNode {
  readonly outs: FakeNode[] = [];
  constructor(readonly ctx: FakeContext, readonly kind: string) { ctx.nodes.push(this); }
  connect(n: FakeNode | FakeParam) { if (n instanceof FakeNode) this.outs.push(n); return n; }
  disconnect() { this.outs.length = 0; }
}
class Gain extends FakeNode { gain = new FakeParam(); }
class Osc extends FakeNode {
  type = 'sine'; frequency = new FakeParam(); detune = new FakeParam(); started = -1;
  start(t = 0) { this.started = t; } stop(_t = 0) {}
}
class Src extends FakeNode { buffer: unknown = null; loop = false; start(_t = 0, _o = 0) {} stop(_t = 0) {} }
class Biquad extends FakeNode { type = 'lowpass'; frequency = new FakeParam(); Q = new FakeParam(); }
class Shaper extends FakeNode { curve: Float32Array | null = null; oversample = 'none'; }
class Comp extends FakeNode { threshold = new FakeParam(); knee = new FakeParam(); ratio = new FakeParam(); attack = new FakeParam(); release = new FakeParam(); }
class Conv extends FakeNode { buffer: unknown = null; }
class Analyser extends FakeNode { fftSize = 2048; getFloatTimeDomainData(a: Float32Array) { a.fill(0.25); } }
class Buffer {
  private readonly ch: Float32Array[];
  constructor(n: number, readonly length: number, readonly sampleRate: number) { this.ch = Array.from({ length: n }, () => new Float32Array(length)); }
  get numberOfChannels() { return this.ch.length; }
  getChannelData(i: number) { return this.ch[i] as Float32Array; }
}

export class FakeContext {
  readonly nodes: FakeNode[] = [];
  currentTime = 0;
  readonly sampleRate = 8000;
  readonly destination = new FakeNode(this, 'destination');
  createGain() { return new Gain(this, 'gain'); }
  createOscillator() { return new Osc(this, 'osc'); }
  createBufferSource() { return new Src(this, 'src'); }
  createBiquadFilter() { return new Biquad(this, 'biquad'); }
  createWaveShaper() { return new Shaper(this, 'shaper'); }
  createDynamicsCompressor() { return new Comp(this, 'comp'); }
  createConvolver() { return new Conv(this, 'conv'); }
  createAnalyser() { return new Analyser(this, 'analyser'); }
  createBuffer(n: number, len: number, sr: number) { return new Buffer(n, len, sr); }
  count(kind: string) { return this.nodes.filter((n) => n.kind === kind).length; }
}

/** Cast helper: the engine takes a BaseAudioContext. */
export const asCtx = (f: FakeContext): BaseAudioContext => f as unknown as BaseAudioContext;
