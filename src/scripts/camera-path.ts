import { clamp, smooth } from './story.ts';

// The camera changes both elevation and azimuth, revealing the sides and underside.
const shots = [
  { yaw: .48, pitch: .23, distance: 12.4 },
  { yaw: 1.12, pitch: .10, distance: 12.8 },
  { yaw: .22, pitch: .20, distance: 19.5 },
  { yaw: -.58, pitch: .49, distance: 14.6 },
  { yaw: .48, pitch: .23, distance: 12.4 },
];
export function cameraPose(progress: number) {
  const p=clamp(progress,0,4), i=Math.min(3,Math.floor(p)), t=smooth(p-i);
  const a=shots[i],b=shots[i+1];
  return {yaw:a.yaw+(b.yaw-a.yaw)*t,pitch:a.pitch+(b.pitch-a.pitch)*t,distance:a.distance+(b.distance-a.distance)*t};
}



