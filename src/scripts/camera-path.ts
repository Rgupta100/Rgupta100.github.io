import { clamp, smooth } from './story.ts';

// The camera changes both elevation and azimuth, revealing the sides and underside.
const shots = [
  { yaw: .55, pitch: .30, distance: 11.8 },
  { yaw: .52, pitch: .12, distance: 12.3 },
  { yaw: .10, pitch: .20, distance: 18 },
  { yaw: -.62, pitch: .30, distance: 13.4 },
  { yaw: .55, pitch: .30, distance: 11.8 },
];
export function cameraPose(progress: number) {
  const p=clamp(progress,0,4), i=Math.min(3,Math.floor(p)), t=smooth(p-i);
  const a=shots[i],b=shots[i+1];
  return {yaw:a.yaw+(b.yaw-a.yaw)*t,pitch:a.pitch+(b.pitch-a.pitch)*t,distance:a.distance+(b.distance-a.distance)*t};
}



