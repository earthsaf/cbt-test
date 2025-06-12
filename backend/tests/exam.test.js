const examController = require('../src/controllers/examController');

test('listExams returns exams', async () => {
  const req = {};
  const res = { json: jest.fn() };
  await examController.listExams(req, res);
  expect(res.json).toHaveBeenCalled();
}); 