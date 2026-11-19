import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { effectiveCareSlots, shiftsOnDate, validShift } from './hyatt-shifts';

test('30-minute boundaries and invalid shifts', () => {
  assert.equal(validShift(14.5,20),true);
  assert.equal(validShift(14.25,20),false);
  assert.equal(validShift(20,20),false);
  assert.equal(validShift(-1,2),false);
});
test('date override removes and replaces weekly interval', () => {
  const weekly=[{day:4,start:10,end:18}];
  assert.deepEqual(shiftsOnDate('2026-11-26',weekly,[{date:'2026-11-26',start:10,end:18,off:true}]),[]);
  assert.deepEqual(shiftsOnDate('2026-11-26',weekly,[
    {date:'2026-11-26',start:10,end:18,off:true},
    {date:'2026-11-26',start:14.5,end:20}
  ]),[{day:4,start:14.5,end:20}]);
  assert.deepEqual(shiftsOnDate('2026-11-27',weekly,[]),[]);
});
test('Hyatt auto care fills only Unassigned; Sage remains unchanged', () => {
  assert.deepEqual(effectiveCareSlots([
    {start:8,end:10,carer:'Unassigned'},
    {start:10,end:16,carer:'Childcare'},
    {start:16,end:20,carer:'Unassigned'}
  ],[{start:10,end:18}]),[
    {start:8,end:10,carer:'Unassigned'},
    {start:10,end:16,carer:'Childcare'},
    {start:16,end:18,carer:'Lach',auto:true},
    {start:18,end:20,carer:'Unassigned'}
  ]);
});
test('manual care beats Hyatt auto care', () => {
  assert.deepEqual(effectiveCareSlots([{start:8,end:20,carer:'Youn'}],[{start:10,end:18}]),
    [{start:8,end:20,carer:'Youn'}]);
});
