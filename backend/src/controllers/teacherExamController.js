const { Exam, Class, Subject } = require('../models');

// List exams created by the logged-in teacher
exports.listTeacherExams = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const exams = await Exam.findAll({
      where: { createdBy: teacherId },
      include: [Class, Subject],
      order: [['createdAt', 'DESC']],
    });
    res.json(exams);
  } catch (error) {
    console.error('Error listing teacher exams:', error);
    res.status(500).json({ error: 'Failed to list exams' });
  }
};

// Delete exam (only creator, and must not be active)
exports.deleteExam = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;
    const exam = await Exam.findByPk(id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (exam.createdBy !== teacherId) return res.status(403).json({ error: 'Not allowed' });
    if (exam.status === 'active') return res.status(400).json({ error: 'Cannot delete an active exam' });
    await exam.destroy();
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
};
