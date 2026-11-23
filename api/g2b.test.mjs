import test from 'node:test';import assert from 'node:assert/strict';import {validateWindow,buildRequest,parseResponse,dedupe,deadlineDays} from './g2b.js';
test('7일 범위 허용',()=>assert.equal(validateWindow('20261117','20261123'),true));
test('8일 범위 거부',()=>assert.throws(()=>validateWindow('20261116','20261123')));
test('유효하지 않은 날짜 거부',()=>assert.throws(()=>validateWindow('20260230','20260301')));
test('API 키 없으면 요청 거부',()=>assert.throws(()=>buildRequest({category:'용역',from:'20261117',to:'20261123'})));
test('용역 API 요청 경로 및 기간',()=>{const u=buildRequest({category:'용역',from:'20261117',to:'20261123',serviceKey:'test'});assert.match(u.pathname,/getBidPblancListInfoServc02$/);assert.equal(u.searchParams.get('inqryBgnDt'),'202611170000')});
test('응답 정규화',()=>{const x=parseResponse({response:{header:{resultCode:'00'},body:{items:{item:[{bidNtceNm:'교육 용역',bidNtceNo:'123',bidClseDt:'2026-11-30'}]}}}},'용역');assert.equal(x[0].title,'교육 용역');assert.equal(x[0].deadline,'2026-11-30')});
test('중복 제거',()=>assert.equal(dedupe([{number:'1'},{number:'1'},{number:'2'}]).length,2));
test('마감일 날짜 차이',()=>assert.equal(deadlineDays('2026-11-24',new Date('2026-11-23T12:00:00+09:00')),1));
