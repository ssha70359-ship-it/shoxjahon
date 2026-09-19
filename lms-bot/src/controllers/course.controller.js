import CourseModel from '../models/course.model.js';
import { toPositiveInt, NotFoundError } from '../utils/validate.js';

/** Kurs kartasini Mini App kutadigan ko'rinishga keltiradi */
function present(course, seatsLeft) {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    direction: course.direction,
    level: course.level,
    durationWeeks: course.durationWeeks,
    lessonsPerWeek: course.lessonsPerWeek,
    price: course.price,
    oldPrice: course.oldPrice,
    coverUrl: course.coverUrl,
    startDate: course.startDate,
    seats: course.seats,
    ...(seatsLeft === undefined ? {} : { seatsLeft }),
    teacher: course.teacher
      ? {
          fullName: course.teacher.fullName,
          expertise: course.teacher.expertise,
          photoUrl: course.teacher.photoUrl,
          bio: course.teacher.bio,
        }
      : null,
  };
}

export const courseController = {
  /** GET /api/courses?direction=Dasturlash */
  async list(req, res) {
    const courses = await CourseModel.findActive({ direction: req.query.direction });

    res.json({ ok: true, courses: courses.map((course) => present(course)) });
  },

  /** GET /api/courses/directions */
  async directions(req, res) {
    res.json({ ok: true, directions: await CourseModel.directions() });
  },

  /** GET /api/courses/:id */
  async detail(req, res) {
    const id = toPositiveInt(req.params.id, { field: 'id' });
    const course = await CourseModel.findById(id);

    if (!course || !course.isActive) throw new NotFoundError('Kurs topilmadi');

    const seatsLeft = await CourseModel.seatsLeft(course.id);

    res.json({ ok: true, course: present(course, seatsLeft) });
  },
};

export default courseController;
