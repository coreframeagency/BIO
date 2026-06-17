import { Router } from 'express';
import * as controller from '../controllers/admin.controller';
import * as examBoards from '../controllers/examBoards.controller';
import * as subjects from '../controllers/subjects.controller';
import * as grades from '../controllers/grades.controller';
import * as units from '../controllers/units.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', controller.getStats);
router.get('/teachers', controller.listTeachers);
router.post('/teachers', controller.createTeacher);
router.delete('/teachers/:id', controller.softDeleteTeacher);
router.get('/students', controller.listStudents);
router.post('/students', controller.createStudent);
router.get('/users', controller.listUsers);
router.get('/teachers/pending', controller.listPendingTeachers);
router.post('/teachers/:id/approve', controller.approveTeacher);
router.get('/content', controller.listContent);
router.post('/content/:id/approve', controller.approveContent);
router.post('/students/grant-access', controller.grantFreeAccess);
router.get('/subscriptions', controller.listAllSubscriptions);
router.get('/schools', controller.listSchools);
router.post('/schools', controller.createSchool);
router.get('/announcements', controller.listAnnouncements);
router.post('/announcements', controller.createAnnouncement);
router.get('/exam-boards', controller.manageExamBoards);
router.get('/subjects', controller.manageSubjects);
router.get('/grades', controller.manageGrades);
router.get('/units', controller.manageUnits);
router.post('/exam-boards', examBoards.createExamBoard);
router.post('/subjects', controller.createSubject);
router.post('/grades', grades.createGrade);
router.post('/units', units.createUnit);
router.post('/pricing', controller.upsertPricing);
router.patch('/subjects/:id/toggle', controller.toggleSubjectAvailability);
router.delete('/announcements/:id', controller.deleteAnnouncement);
router.get('/pricing-overview', controller.getPricingOverview);
router.post('/pricing/category', controller.upsertCategoryPricing);
router.delete('/students/:id', controller.softDeleteStudent);
router.delete('/subjects/:id', controller.softDeleteSubject);
router.patch('/content/:id/archive', controller.archiveLesson);
router.get('/feedback', controller.listFeedback);

export default router;
