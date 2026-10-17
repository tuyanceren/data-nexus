import { router, type Href } from 'expo-router';

export function open(path: string) {
  router.push(path as Href);
}
