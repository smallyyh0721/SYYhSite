import test from 'node:test';
import assert from 'node:assert/strict';
import { diamondTargets, orbitPoint, slotFor, touchDecision } from '../src/lib/world-orbit.mjs';
test('diamond slots stay unique with a centered foreground for every selected island', () => {
  for (let focused = 0; focused < 4; focused++) {
    assert.equal(slotFor(focused, focused), 'front');
    assert.equal(new Set([0,1,2,3].map(i => slotFor(i, focused))).size, 4);
  }
  for (const [width,height,viewport,compact] of [[1440,600,900,false],[390,534,844,true],[320,430,740,true]]) {
    const p = diamondTargets(width,height,viewport,compact);
    assert.equal(p.front.x, width/2); assert.equal(p.back.x, width/2);
    assert.ok(Math.abs(p.left.x + p.right.x - width) < .001);
    assert.ok(Math.abs(p.left.y - (p.back.y+p.front.y)/2) < .001);
    assert.ok(p.front.size > p.left.size);
  }
});
test('orbital motion has exact endpoints, curvature and continuous retargeting', () => {
  const from={x:230,y:320,size:270},to={x:720,y:450,size:486};
  assert.deepEqual(orbitPoint(from,to,0),from); assert.deepEqual(orbitPoint(from,to,1),to);
  const mid=orbitPoint(from,to,.5);
  assert.ok(Math.abs(mid.y-(from.y+to.y)/2)>10);
  assert.deepEqual(orbitPoint(mid,{x:1200,y:320,size:270},0),mid);
  for(let n=0;n<=100;n++) assert.ok(Object.values(orbitPoint(from,to,n/100)).every(Number.isFinite));
});
test('mobile first selection, repeat entry and transition safety', () => {
  const tap={target:'sky',focused:'sky',armed:null,moving:false,distance:0};
  assert.equal(touchDecision(tap),'select');
  assert.equal(touchDecision({...tap,armed:'sky'}),'enter');
  assert.equal(touchDecision({...tap,target:'home',armed:'sky'}),'select');
  assert.equal(touchDecision({...tap,armed:'sky',moving:true}),'select');
  assert.equal(touchDecision({...tap,armed:'sky',distance:35}),'cancel');
});
