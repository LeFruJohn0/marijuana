import Locale from 'locale';
import { ResourceContext } from './resource';

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms, null));
}

export function getRandomInt(min = 0, max = 9) {
  if (min > max)
    [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getDistance(a: [number, number, number], b: [number, number, number]): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}