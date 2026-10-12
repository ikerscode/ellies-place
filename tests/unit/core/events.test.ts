import { describe, expect, it } from 'vitest';
import { createEventBus } from '../../../src/core/events';

interface TestEvents {
  ping: { n: number };
  hello: string;
}

describe('event bus', () => {
  it('delivers typed payloads and unsubscribes', () => {
    const bus = createEventBus<TestEvents>();
    const got: number[] = [];
    const off = bus.on('ping', (p) => got.push(p.n));
    bus.emit('ping', { n: 1 });
    off();
    bus.emit('ping', { n: 2 });
    expect(got).toEqual([1]);
  });

  it('a handler removing itself during emit does not skip others', () => {
    const bus = createEventBus<TestEvents>();
    const got: string[] = [];
    const off = bus.on('hello', () => {
      got.push('a');
      off();
    });
    bus.on('hello', (s) => got.push(s));
    bus.emit('hello', 'b');
    bus.emit('hello', 'c');
    expect(got).toEqual(['a', 'b', 'c']);
  });

  it('clear drops every handler', () => {
    const bus = createEventBus<TestEvents>();
    let count = 0;
    bus.on('hello', () => count++);
    bus.clear();
    bus.emit('hello', 'x');
    expect(count).toBe(0);
  });
});
