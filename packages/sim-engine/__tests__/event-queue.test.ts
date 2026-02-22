import { describe, it, expect } from 'vitest';
import { EventQueue } from '../src/event-queue.js';
import type { SimEvent } from '../src/types.js';

function makeEvent(time: number, priority = 0): SimEvent {
  return {
    time,
    type: 'ENTITY_CREATED',
    entityId: `e-${time}`,
    nodeId: 'n1',
    priority,
  };
}

describe('EventQueue', () => {
  it('dequeues events in time order', () => {
    const q = new EventQueue();
    q.enqueue(makeEvent(5));
    q.enqueue(makeEvent(1));
    q.enqueue(makeEvent(3));
    q.enqueue(makeEvent(2));
    q.enqueue(makeEvent(4));

    const times: number[] = [];
    while (!q.isEmpty) {
      times.push(q.dequeue()!.time);
    }
    expect(times).toEqual([1, 2, 3, 4, 5]);
  });

  it('breaks ties by priority', () => {
    const q = new EventQueue();
    q.enqueue(makeEvent(1, 3));
    q.enqueue(makeEvent(1, 1));
    q.enqueue(makeEvent(1, 2));

    const priorities: number[] = [];
    while (!q.isEmpty) {
      priorities.push(q.dequeue()!.priority);
    }
    expect(priorities).toEqual([1, 2, 3]);
  });

  it('dequeue on empty queue returns null', () => {
    const q = new EventQueue();
    expect(q.dequeue()).toBeNull();
  });

  it('peek returns the next event without removing it', () => {
    const q = new EventQueue();
    q.enqueue(makeEvent(10));
    q.enqueue(makeEvent(5));
    expect(q.peek()!.time).toBe(5);
    expect(q.size).toBe(2);
  });

  it('clear empties the queue', () => {
    const q = new EventQueue();
    q.enqueue(makeEvent(1));
    q.enqueue(makeEvent(2));
    q.clear();
    expect(q.isEmpty).toBe(true);
    expect(q.size).toBe(0);
  });
});
