import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionSubmission,
  calculateDepartmentProgress,
  consolidateOfficialAgenda,
  carryOverDeferredTopic
} from './workflowLogic.ts';

test('Department head cannot submit if already Under Review or Approved', () => {
  const result = canTransitionSubmission('Under Review', 'Submitted', 'dept_head');
  assert.equal(result.allowed, false);

  const approvedResult = canTransitionSubmission('Approved', 'Draft', 'dept_head');
  assert.equal(approvedResult.allowed, false);
});

test('Department head can submit from Draft or Changes Requested', () => {
  const fromDraft = canTransitionSubmission('Draft', 'Submitted', 'dept_head');
  assert.equal(fromDraft.allowed, true);

  const fromChangesRequested = canTransitionSubmission('Changes Requested', 'Submitted', 'dept_head');
  assert.equal(fromChangesRequested.allowed, true);
});

test('Management can approve or request changes on Submitted items', () => {
  const approve = canTransitionSubmission('Submitted', 'Approved', 'management');
  assert.equal(approve.allowed, true);

  const requestChanges = canTransitionSubmission('Submitted', 'Changes Requested', 'management');
  assert.equal(requestChanges.allowed, true);

  const underReview = canTransitionSubmission('Submitted', 'Under Review', 'management');
  assert.equal(underReview.allowed, true);
});

test('Department progress correctly maps all departments including Not Started', () => {
  const departments = [
    { id: 'dept-hr', name: 'HR' },
    { id: 'dept-fin', name: 'Finance' },
    { id: 'dept-it', name: 'IT' },
    { id: 'dept-visa', name: 'Visa' }
  ];

  const submissions = [
    { departmentId: 'dept-hr', status: 'Submitted' as const, itemCount: 2, followUpCount: 1 },
    { departmentId: 'dept-fin', status: 'Under Review' as const, itemCount: 3, followUpCount: 2 },
    { departmentId: 'dept-it', status: 'Draft' as const, itemCount: 1, followUpCount: 0 }
  ];

  const progress = calculateDepartmentProgress(departments, submissions);
  assert.equal(progress.length, 4);

  const visa = progress.find(p => p.departmentName === 'Visa');
  assert.ok(visa);
  assert.equal(visa.status, 'Not Started');
  assert.equal(visa.itemCount, 0);

  const hr = progress.find(p => p.departmentName === 'HR');
  assert.ok(hr);
  assert.equal(hr.status, 'Submitted');
  assert.equal(hr.itemCount, 2);
});

test('Official agenda consolidation orders by critical priority and assigns sequential numbers', () => {
  const items = [
    { id: '1', departmentName: 'HR', topic: 'Policy Review', priority: 'Medium', status: 'Approved' },
    { id: '2', departmentName: 'Finance', topic: 'Emergency Cash Flow', priority: 'Critical', status: 'Approved' },
    { id: '3', departmentName: 'IT', topic: 'Server Migration', priority: 'High', status: 'Approved' },
    { id: '4', departmentName: 'Visa', topic: 'Draft Idea', priority: 'Low', status: 'Draft' }
  ];

  const consolidated = consolidateOfficialAgenda(items);
  // Only Approved items (3 total)
  assert.equal(consolidated.length, 3);
  // Critical item should come first
  assert.equal(consolidated[0].priority, 'Critical');
  assert.equal(consolidated[0].officialAgendaNumber, 1);
  assert.equal(consolidated[1].priority, 'High');
  assert.equal(consolidated[1].officialAgendaNumber, 2);
  assert.equal(consolidated[2].priority, 'Medium');
  assert.equal(consolidated[2].officialAgendaNumber, 3);
});

test('Deferred topic carries forward without losing department and original attributes', () => {
  const original = {
    id: 'item-99',
    topic: 'Visa Quota Expansion',
    description: 'Require ministry clearance for 50 additional site workers',
    departmentId: 'dept-visa',
    departmentName: 'Visa',
    priority: 'High',
    createdByName: 'Tariq (Visa Head)'
  };

  const carried = carryOverDeferredTopic(original, 'meeting-next', 'sub-next', 'Time exceeded in session');
  assert.equal(carried.carriedForwardFromId, 'item-99');
  assert.equal(carried.meetingId, 'meeting-next');
  assert.equal(carried.submissionId, 'sub-next');
  assert.equal(carried.departmentName, 'Visa');
  assert.match(carried.topic, /Visa Quota Expansion/);
  assert.match(carried.reason, /Time exceeded in session/);
});
