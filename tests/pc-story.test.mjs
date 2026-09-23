import test from 'node:test';
import assert from 'node:assert/strict';
import {pcStoryProgress, pcActiveChapter, pcCameraPose} from '../src/scripts/pc-story.ts';

const markers = [{top:0,value:0},{top:1100,value:.25},{top:3100,value:.5},{top:4100,value:.6},{top:6500,value:.75},{top:8200,value:1}];
test('PC story resolves anchors, reading holds and reverse jumps absolutely', () => {
  for (const height of [390, 720, 1080]) for (const marker of markers) assert.equal(pcStoryProgress(marker.top, markers, height), marker.value);
  assert.equal(pcStoryProgress(2000, markers, 800), .25);
  assert.equal(pcStoryProgress(4700, markers, 800), .6);
  assert.equal(pcStoryProgress(8200, markers, 800), 1);
  assert.equal(pcStoryProgress(1100, markers, 800), .25);
  assert.equal(pcStoryProgress(-100, markers, 800), 0);
  assert.equal(pcActiveChapter(6500,[0,1100,3100,6500,8200],800),3);
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
