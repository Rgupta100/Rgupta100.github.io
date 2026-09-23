import test from 'node:test';
import assert from 'node:assert/strict';
import {storyProgress,activeChapter} from '../src/scripts/story.ts';
const tops=[0,1000,2600,4200,5500];
test('holds a chapter during long reading regions',()=>{assert.equal(storyProgress(1000,tops,800),1);assert.equal(storyProgress(1600,tops,800),1);});
test('direct deep links resolve without earlier animation playback',()=>{assert.equal(storyProgress(4200,tops,800),3);assert.equal(activeChapter(4200,tops,800),3);});
test('transitions monotonically and bounds overscroll',()=>{let previous=0;for(let y=-100;y<7000;y+=10){const next=storyProgress(y,tops,800);assert.ok(next>=previous&&next<=4);previous=next;}assert.equal(previous,4);});
test('viewport-dependent transitions retain exact chapter poses',()=>{for(const h of [390,720,1080])for(let i=0;i<tops.length;i++)assert.equal(storyProgress(tops[i],tops,h),i);});
