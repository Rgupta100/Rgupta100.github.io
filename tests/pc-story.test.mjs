import test from 'node:test';
import assert from 'node:assert/strict';
import {pcStoryProgress, pcActiveChapter, pcCameraPose} from '../src/scripts/pc-story.ts';

const markers = [{top:0,value:0},{top:2400,value:.25},{top:6400,value:.5},{top:8400,value:.6},{top:12400,value:.75},{top:16400,value:1}];
test('PC story resolves anchors, reading holds and reverse jumps absolutely', () => {
  for (const height of [390, 720, 1080]) for (const marker of markers) assert.equal(pcStoryProgress(marker.top, markers, height), marker.value);
  assert.equal(pcStoryProgress(3400, markers, 800), .25);
  assert.equal(pcStoryProgress(9400, markers, 800), .6);
  assert.equal(pcStoryProgress(16400, markers, 800), 1);
  assert.equal(pcStoryProgress(2400, markers, 800), .25);
  assert.equal(pcStoryProgress(-100, markers, 800), 0);
  assert.equal(pcActiveChapter(12400,[0,2400,6400,12400,16400],800),3);
});

test('major PC transformations spread across a longer scroll interval without overshoot', () => {
  const height = 800;
  const longChapter = [{top:0,value:0},{top:5000,value:.25}];
  // At 1.7 viewports before the next chapter, separation should already be
  // underway; concentrating the entire change in the last viewport feels rushed.
  assert.ok(pcStoryProgress(5000 - height * 1.7, longChapter, height) > 0);
  assert.ok(pcStoryProgress(5000 - height * .2, longChapter, height) < .25);
  let previous = 0;
  for (let y = 0; y <= 5200; y += 100) {
    const current = pcStoryProgress(y, longChapter, height);
    assert.ok(current >= previous && current <= .25, 'forward progress stays bounded and monotonic');
    assert.ok(current - previous < .03, 'one 100px scroll step must not rush through the assembly');
    previous = current;
  }
  for (const y of [4800,3900,5100,3000,4500,0]) {
    const value = pcStoryProgress(y, longChapter, height);
    assert.ok(value >= 0 && value <= .25, 'reverse and interrupted jumps remain absolute');
  }
});
test('PC camera varies framing by chapter while retaining exact target poses', () => {
  assert.ok(pcCameraPose(0).x >= .6);
  assert.ok(pcCameraPose(.25).x < .35);
  assert.ok(pcCameraPose(.5).frameHeight > pcCameraPose(0).frameHeight);
  assert.ok(pcCameraPose(.75).frameHeight < pcCameraPose(0).frameHeight);
  for (let i=0;i<=100;i++) {
    const pose=pcCameraPose(i/100);
    assert.ok([pose.yaw,pose.elevation,pose.frameHeight,pose.x,pose.y,...pose.target].every(Number.isFinite));
    assert.equal(pcCameraPose(i/100,true).x,.5);
  }
});

test('PC narrow hero is centered and enlarged without tightening exploded inspection framing', () => {
  const aspect = 375 / 405;
  const desktop = pcCameraPose(0, false, aspect, false);
  const narrow = pcCameraPose(0, false, aspect, true);
  assert.equal(narrow.x, .5);
  assert.equal(narrow.y, .5);
  assert.ok(narrow.frameHeight < desktop.frameHeight);
  const wideInspection = pcCameraPose(.5, true, aspect, false);
  const narrowInspection = pcCameraPose(.5, true, aspect, true);
  assert.equal(narrowInspection.frameHeight, wideInspection.frameHeight);
  assert.equal(desktop.x, .62);
});
