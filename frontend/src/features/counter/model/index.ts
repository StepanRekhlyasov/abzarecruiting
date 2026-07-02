import { createEvent, createStore } from 'effector'

export const increment = createEvent()
export const decrement = createEvent()

export const $counter = createStore(0)
  .on(increment, (value) => value + 1)
  .on(decrement, (value) => value - 1)
